// Forwards logs to the existing external API, which is responsible for
// persisting them to the DB on its side. This module only handles the HTTP call.
// Auth is handled by tokenManager, which logs in and refreshes the token before it expires.

const tokenManager = require('./tokenManager');
const logger = require('./utils/logger');
const { normalizeLogs } = require('./utils/logNormalizer');

const LOG_ENDPOINT_PATH = '/api/ai-provider-conversation-logs';
const REQUEST_TIMEOUT_MS = Number(process.env.LOGS_API_TIMEOUT_MS) || 10000;

function getEndpointUrl() {
    const baseUrl = process.env.LOGS_API_BASE_URL;
    if (!baseUrl) {
        throw new Error('LOGS_API_BASE_URL is not set in the environment');
    }
    // Safely combine URL parts using global URL class
    try {
        const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        // Remove leading slash from path to correctly resolve relative to base
        const relativePath = LOG_ENDPOINT_PATH.replace(/^\/+/, '');
        const endpoint = new URL(relativePath, base);
        return endpoint.toString();
    } catch (err) {
        // Fallback to basic string parsing if URL constructor fails due to malformed base
        logger.warn('[ApiClient] Failed to parse URL with URL constructor, falling back to manual concatenation:', err.message);
        return `${baseUrl.replace(/\/+$/, '')}/${LOG_ENDPOINT_PATH.replace(/^\/+/, '')}`;
    }
}

async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

// Sends a single normalized log to the external API. Throws on non-2xx
// responses or network errors. isRetry guards against retrying forever if
// the API keeps returning 401 even with a freshly-issued token.
async function sendOne(normalizedLog, isRetry = false) {
    const url = getEndpointUrl();
    const token = await tokenManager.getValidToken();

    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(normalizedLog)
    });

    const bodyText = await response.text().catch(() => '');

    // The cached token can go stale earlier than its exp claim suggests
    // (server-side revocation, clock drift). If we get a 401, force a fresh
    // login and retry exactly once before giving up.
    if (response.status === 401 && !isRetry) {
        await tokenManager.forceRefresh();
        return sendOne(normalizedLog, true);
    }

    if (!response.ok) {
        throw new Error(`External logs API responded with ${response.status}: ${bodyText}`);
    }
}

// The endpoint accepts one log object per request (no batch/array support),
// so a "batch" here just means looping and sending them one at a time.
// Sent sequentially rather than in parallel to avoid multiple concurrent
// logins racing each other if the token happens to be expiring mid-batch.
// Throws only if ALL logs in the batch fail; individual failures are logged
// so one bad log doesn't sink the rest.
async function sendLogs(logs) {
    const normalizedLogs = normalizeLogs(logs);
    const errors = [];

    for (const normalizedLog of normalizedLogs) {
        try {
            await sendOne(normalizedLog);
        } catch (err) {
            logger.error(`[ApiClient] Failed to send log for conversationId ${normalizedLog.conversationId}:`, err.message);
            errors.push(err);
        }
    }

    if (errors.length === normalizedLogs.length && errors.length > 0) {
        throw errors[0];
    }
}

module.exports = { sendLogs };
