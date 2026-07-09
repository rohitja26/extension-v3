// Centralized provider detection based on the URL the log came from.
// Keeping this in one place means adding a new provider (e.g. M365) later
// only requires a new branch here, not changes to every interceptor or writer.
function detectProvider(url) {
    if (!url) return '';
    if (url.includes('github.com')) return 'GitHub Copilot';
    if (url.includes('claude.ai')) return 'Claude';
    if (url.includes('office.com') || url.includes('microsoft365.com')) return 'M365'; // Placeholder: no M365 interceptor implemented yet
    return '';
}

module.exports = { detectProvider };
