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
