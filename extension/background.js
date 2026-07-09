const API_URL = 'http://localhost:3000/api/copilot/log';
const ALARM_NAME = 'flushCopilotLogs';
const ALARM_PERIOD_MINUTES = 0.5; // 30 seconds

// Helper to initialize the log flush alarm
function setupAlarm() {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
}

// Setup the alarm when the extension is installed or starts
chrome.runtime.onInstalled.addListener(() => {
    setupAlarm();
});

chrome.runtime.onStartup.addListener(() => {
    setupAlarm();
});

// Listen for logs from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PROMPT_CAPTURED') {
        const logData = message.payload;
        
        // Retrieve existing logs and append the new one
        chrome.storage.local.get({ queuedLogs: [] }, (result) => {
            const updatedLogs = [...result.queuedLogs, logData];
            chrome.storage.local.set({ queuedLogs: updatedLogs });
        });

        // Always send a response back for message passing
        sendResponse({ received: true });
        return true; 
    }
});

// Listen for the alarm to flush logs
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        flushLogs().catch(error => {
            console.error('[CopilotTracker Background] Error flushing logs:', error);
        });
    }
});

/**
 * Flushes queued logs to the backend service.
 */
async function flushLogs() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get({ queuedLogs: [] }, async (result) => {
            const logs = result.queuedLogs;
            
            if (logs.length === 0) {
                return resolve(); // Nothing to send
            }

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(logs)
                });

                if (response.ok) {
                    // Safe removal of processed logs to prevent race conditions from concurrent updates
                    chrome.storage.local.get({ queuedLogs: [] }, (currentResult) => {
                        const remainingLogs = currentResult.queuedLogs.slice(logs.length);
                        chrome.storage.local.set({ queuedLogs: remainingLogs }, () => {
                            resolve();
                        });
                    });
                } else {
                    const statusText = `Status: ${response.status}`;
                    console.error('[CopilotTracker Background] Failed to send logs to backend.', statusText);
                    reject(new Error(`Failed to send logs. ${statusText}`));
                }
            } catch (error) {
                console.error('[CopilotTracker Background] Network error when sending logs to backend:', error);
                reject(error);
            }
        });
    });
}
