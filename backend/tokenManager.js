// Manages the bearer token used to authenticate with the external logs API.
// Logs in with email/password, caches the token in memory, and proactively
// refreshes it before it expires (based on the JWT's `exp` claim), so
// apiClient never has to send a request with a stale token.

const logger = require('./utils/logger');

const REFRESH_BUFFER_MS = 60 * 1000; // refresh 60s early to avoid edge-of-expiry failures

class TokenManager {
    constructor() {
        this.cachedToken = null;
        this.cachedRefreshToken = null; // stored in case a refresh-token flow is added later
        this.cachedExpiryMs = null; // epoch ms when the token expires, or null if unknown
    }

    // Decodes a JWT's payload (no signature verification - we only need the `exp`
    // claim to know when to refresh) and returns its expiry as epoch ms.
    _decodeJwtExpiry(token) {
        try {
            const payloadPart = token.split('.')[1];
            if (!payloadPart) return null;
            const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
            const payloadJson = Buffer.from(base64, 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson);

            if (typeof payload.exp === 'number') {
                return payload.exp * 1000; // exp is in seconds - convert to ms
            }
        } catch (err) {
            logger.error('[TokenManager] Could not decode JWT to read exp claim:', err.message);
        }
        return null;
    }

    async _login() {
        const loginUrl = process.env.LOGS_API_LOGIN_URL;
        const email = process.env.LOGS_API_EMAIL;
        const password = process.env.LOGS_API_PASSWORD;

        if (!loginUrl || !email || !password) {
            throw new Error('LOGS_API_LOGIN_URL, LOGS_API_EMAIL, and LOGS_API_PASSWORD must be set in the environment');
        }

        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const bodyText = await response.text().catch(() => '');

        if (!response.ok) {
            throw new Error(`Login failed with status ${response.status}: ${bodyText}`);
        }

        let parsed;
        try {
            parsed = JSON.parse(bodyText);
        } catch (err) {
            throw new Error(`Login response was not valid JSON: ${bodyText}`);
        }

        // Actual shape: { success, message, error, data: { token, refreshToken, expiresAt, ... } }
        if (!parsed.success || !parsed.data || !parsed.data.token) {
            throw new Error(`Login response did not contain a token: ${bodyText}`);
        }

        this.cachedToken = parsed.data.token;
        this.cachedRefreshToken = parsed.data.refreshToken || null;

        // The API tells us the expiry directly - prefer that over decoding the JWT,
        // since it's authoritative and doesn't depend on the token being a JWT at all.
        if (parsed.data.expiresAt) {
            this.cachedExpiryMs = new Date(parsed.data.expiresAt).getTime();
        } else {
            this.cachedExpiryMs = this._decodeJwtExpiry(this.cachedToken);
        }

        return this.cachedToken;
    }

    // Returns a valid (non-expired) token - logs in for the first time, or
    // refreshes if the cached token is missing or close to expiring.
    async getValidToken() {
        const isExpiringSoon = this.cachedExpiryMs !== null && Date.now() >= this.cachedExpiryMs - REFRESH_BUFFER_MS;

        if (!this.cachedToken || isExpiringSoon) {
            await this._login();
        }

        return this.cachedToken;
    }

    // Forces a fresh login, discarding any cached token. Used as a fallback when
    // a request gets a 401 despite the cached token appearing non-expired
    // (e.g. the API revoked it early, or clock drift between servers).
    async forceRefresh() {
        this.cachedToken = null;
        this.cachedRefreshToken = null;
        this.cachedExpiryMs = null;
        return this._login();
    }
}

const tokenManagerInstance = new TokenManager();

module.exports = {
    getValidToken: tokenManagerInstance.getValidToken.bind(tokenManagerInstance),
    forceRefresh: tokenManagerInstance.forceRefresh.bind(tokenManagerInstance)
};