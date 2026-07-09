/**
 * EXTENSION FLOW - STEP 2 (Claude): Main World Interceptor (MAIN World)
 * 
 * Use Case:
 * Executed directly inside the context of Claude.ai pages. It overrides window.fetch
 * to intercept Claude completion calls. Once detected, it extracts prompt and
 * conversation ID, and dispatches a custom DOM event ('ClaudePromptCaptured')
 * containing the prompt details.
 */
(function() {
    const originalFetch = window.fetch;

    // Matches: /api/organizations/<uuid>/chat_conversations/<uuid>/completion
    const COMPLETION_URL_PATTERN = /\/api\/organizations\/[a-zA-Z0-9-]+\/chat_conversations\/([a-zA-Z0-9-]+)\/completion/;

    /**
     * Extracts Claude completion prompt and conversation ID from payload and URL.
     * 
     * @param {string} bodyString 
     * @param {string} urlStr 
     */
    function processPayload(bodyString, urlStr = '') {
        try {
            const match = urlStr.match(COMPLETION_URL_PATTERN);
            if (!match) {
                return; // Not a Claude completion request
            }

            const bodyJson = JSON.parse(bodyString);

            if (typeof bodyJson.prompt === 'string' && bodyJson.prompt.length > 0) {
                const conversationId = match[1]; // Extracted from the URL path

                const logData = {
                    timestamp: new Date().toISOString(),
                    prompt: bodyJson.prompt,
                    currentURL: window.location.href,
                    conversationId: conversationId,
                    actorLogin: 'claude-user' // Claude payload does not expose username; external API expects a User field
                };

                // Dispatch event to the content script running in the ISOLATED world
                window.dispatchEvent(new CustomEvent('ClaudePromptCaptured', {
                    detail: logData
                }));
            }
        } catch (e) {
            if (urlStr.match(COMPLETION_URL_PATTERN)) {
                console.error('[ClaudeTracker] Error parsing request body as JSON:', e, bodyString);
            }
        }
    }

    // Patch fetch to intercept POST requests with string payloads
    window.fetch = async function(...args) {
        const [resource, config] = args;

        if (config && config.method === 'POST' && config.body && typeof config.body === 'string') {
            processPayload(config.body, resource.toString());
        }

        return originalFetch.apply(this, args);
    };
})();
