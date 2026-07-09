(function() {
    const originalFetch = window.fetch;
    const originalSendBeacon = navigator.sendBeacon;

    /**
     * Extracts telemetry info or conversation details from raw request payload.
     * 
     * @param {string} bodyString 
     * @param {string} urlStr 
     */
    function processPayload(bodyString, urlStr = '') {
        try {
            const bodyJson = JSON.parse(bodyString);
            
            // Attempt to extract actor_login from GitHub's telemetry events
            if (bodyJson.events && Array.isArray(bodyJson.events)) {
                for (const event of bodyJson.events) {
                    if (event.context && event.context.actor_login) {
                        window.__COPILOT_TRACKER_ACTOR_LOGIN = event.context.actor_login;
                        break;
                    }
                }
            }

            // Determine if this is a GitHub Copilot request by checking the payload properties
            if (bodyJson.content && bodyJson.intent === 'conversation') {
                let conversationId = 'root';
                
                // Extract conversation ID from URL path or fallback to responseMessageID
                const match = window.location.pathname.match(/\/copilot\/c\/([a-zA-Z0-9-]+)/);
                if (match && match[1]) {
                    conversationId = match[1];
                } else if (bodyJson.responseMessageID) {
                    conversationId = bodyJson.responseMessageID;
                }

                const logData = {
                    timestamp: new Date().toISOString(),
                    prompt: bodyJson.content,
                    currentURL: window.location.href,
                    conversationId: conversationId,
                    actorLogin: window.__COPILOT_TRACKER_ACTOR_LOGIN || 'unknown'
                };

                // Dispatch event to the content script running in the ISOLATED world
                window.dispatchEvent(new CustomEvent('CopilotPromptCaptured', {
                    detail: logData
                }));
            }
        } catch (e) {
            // Log JSON parsing errors only for relevant tracker endpoints
            if (urlStr.includes('copilot') || urlStr.includes('collect')) {
                console.error('[CopilotTracker] Error parsing request body as JSON:', e, bodyString);
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

    // Patch sendBeacon to intercept analytics logs
    navigator.sendBeacon = function(url, data) {
        if (data && typeof data === 'string') {
            processPayload(data, url.toString());
        }
        return originalSendBeacon.apply(this, arguments);
    };
})();