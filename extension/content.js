/**
 * EXTENSION FLOW - STEP 3: Content Script (ISOLATED World)
 * 
 * Use Case:
 * Bridges the gap between the page's MAIN world (where prompts are intercepted)
 * and the extension's background environment. It listens for custom DOM events 
 * dispatched by interceptor scripts and forwards the payloads to background.js 
 * using chrome.runtime.sendMessage.
 */

// intercept.js and intercept-claude.js are now injected natively into the MAIN world via manifest.json


function forwardCapturedPrompt(eventName, errorPrefix) {
    window.addEventListener(eventName, function(e) {
        const logData = e.detail;

        chrome.runtime.sendMessage({
            type: 'PROMPT_CAPTURED',
            payload: logData
        }, () => {
            if (chrome.runtime.lastError) {
                console.error(errorPrefix, chrome.runtime.lastError);
            }
        });
    });
}

forwardCapturedPrompt('CopilotPromptCaptured', '[CopilotTracker ContentScript] Error sending message to background script:');
forwardCapturedPrompt('ClaudePromptCaptured', '[ClaudeTracker ContentScript] Error sending message to background script:');
