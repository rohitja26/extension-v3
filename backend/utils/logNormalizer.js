const { detectProvider } = require('../providerUtils');

function normalizeLog(rawLog) {
    const log = rawLog && typeof rawLog === 'object' ? rawLog : {};
    const url = log.currentURL || log.url || '';

    return {
        timestamp: log.timestamp || new Date().toISOString(),
        user: log.actorLogin || log.user || 'Unknown',
        prompt: log.content || log.prompt || '',
        url,
        conversationId: log.conversationId || '',
        provider: log.provider || detectProvider(url)
    };
}

function normalizeLogs(logs) {
    const list = Array.isArray(logs) ? logs : [logs];
    return list.map(normalizeLog);
}

function hasInvalidLogShape(logs) {
    return logs.some((log) => !log || typeof log !== 'object' || Array.isArray(log));
}

module.exports = {
    normalizeLog,
    normalizeLogs,
    hasInvalidLogShape
};
