const test = require('node:test');
const assert = require('node:assert');
const { detectProvider } = require('../providerUtils');
const { normalizeLog, normalizeLogs, hasInvalidLogShape } = require('../utils/logNormalizer'); // Wait, relative path from tests directory is '../utils/logNormalizer'

// Let's write tests for detectProvider
test('providerUtils - detectProvider', () => {
    assert.strictEqual(detectProvider('https://github.com/copilot'), 'GitHub Copilot');
    assert.strictEqual(detectProvider('https://claude.ai/chat'), 'Claude');
    assert.strictEqual(detectProvider('https://office.com/hub'), 'M365');
    assert.strictEqual(detectProvider('https://example.com'), '');
    assert.strictEqual(detectProvider(null), '');
});

// Let's write tests for logNormalizer
test('logNormalizer - normalizeLog', () => {
    const raw = {
        actorLogin: 'user123',
        content: 'hello copilot',
        url: 'https://github.com/copilot',
        conversationId: 'conv-abc',
        timestamp: '2026-07-09T12:00:00Z'
    };
    const normalized = normalizeLog(raw);
    assert.strictEqual(normalized.user, 'user123');
    assert.strictEqual(normalized.prompt, 'hello copilot');
    assert.strictEqual(normalized.url, 'https://github.com/copilot');
    assert.strictEqual(normalized.conversationId, 'conv-abc');
    assert.strictEqual(normalized.timestamp, '2026-07-09T12:00:00Z');
    assert.strictEqual(normalized.provider, 'GitHub Copilot');
});

test('logNormalizer - normalizeLog defaults', () => {
    const normalized = normalizeLog({});
    assert.strictEqual(normalized.user, 'Unknown');
    assert.strictEqual(normalized.prompt, '');
    assert.strictEqual(normalized.url, '');
    assert.strictEqual(normalized.conversationId, '');
    assert.strictEqual(normalized.provider, '');
    assert.ok(normalized.timestamp);
});

test('logNormalizer - hasInvalidLogShape', () => {
    assert.strictEqual(hasInvalidLogShape([{}]), false);
    assert.strictEqual(hasInvalidLogShape([null]), true);
    assert.strictEqual(hasInvalidLogShape(['string']), true);
    assert.strictEqual(hasInvalidLogShape([[]]), true);
});
