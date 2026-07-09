# Onboarding and Operations Guide: AI Usage Tracker (Draft)

This document provides guidelines and instructions for different roles interacting with the AI Usage Tracker project. The tracker is a system designed to capture and log prompts submitted to AI assistants (specifically GitHub Copilot and Claude.ai) to monitor usage and compliance.

---

## 1. System Overview & Architecture

To understand how the system operates, it is helpful to look at its two main components:

```
[ User Browser ]
  ├── Web Extension (Manifest V3)
  │    ├── intercept.js / intercept-claude.js (Runs in MAIN world, patches window.fetch)
  │    ├── content.js (Runs in ISOLATED world, forwards events to background)
  │    └── background.js (Service Worker, queues logs in storage, flushes every 30s)
  │
  └── [ Node.js Backend Service (Express) ] ── (http://localhost:3000)
       ├── Local Storage: prompts.xlsx (Excel spreadsheet sync)
       └── Downstream API: External Logs Service (via Token Bearer Auth)
```

1. **The Browser Extension (Manifest V3)**:
   * **MAIN World Injection**: Page-level script patches `window.fetch` and `navigator.sendBeacon` to intercept prompt payloads sent to GitHub Copilot (`https://github.com/*`) and Claude.ai (`https://claude.ai/*`).
   * **ISOLATED World Script**: Listens for custom DOM events (`CopilotPromptCaptured` and `ClaudePromptCaptured`) dispatched by the patched fetch, and sends messages containing the prompts to the extension's background worker.
   * **Background Service Worker**: Receives logs, queues them in the local browser storage (`chrome.storage.local` under `queuedLogs`), and runs a 30-second alarm timer. When the alarm triggers, it flushes the queued logs to the backend service via a `POST` request.

2. **The Backend Service (Node.js & Express)**:
   * Serves a `POST /api/copilot/log` endpoint to receive batch payloads from the browser extension.
   * Normalizes the logs (extracting/mapping timestamp, user login, prompt text, target URL, conversation ID, and AI provider).
   * Persists logs to two destinations:
     1. **Excel Spreadsheet (`prompts.xlsx`)**: Appends records sequentially using a write queue to prevent file access conflicts.
     2. **External Logs API**: Forwards logs to a downstream REST endpoint using bearer tokens managed by an automatic auth refresh service.

---

## 2. Role-Based Workflows & Guidelines

---

### 💼 Stakeholder

* **Overview**: Stakeholders manage policy compliance, review usage logs, and coordinate the system's deployment goals.
* **Responsibilities**:
  * **[CONFIRMATION REQUIRED]**: Define who has access to the generated Excel logs and the external API dashboard.
  * **[CONFIRMATION REQUIRED]**: Review and approve compliance and data privacy disclosures for end-users regarding prompt tracking.

---

### 💻 Developer

* **Overview**: Developers write extension interceptors, maintain the Node.js API, and implement future storage integrations (such as migrating from Excel to SQL Server).
* **Prerequisites**:
  * Node.js (version 18 or higher recommended)
  * npm (installed with Node.js)
  * A local web browser (Google Chrome or Microsoft Edge)
* **Local Setup Instructions**:
  1. Open a terminal and navigate to the `backend/` directory:
     ```bash
     cd backend
     ```
  2. Install project dependencies:
     ```bash
     npm install
     ```
  3. Create your local environment configuration file:
     * Copy `env.example` to `.env`.
     * **[CONFIRMATION REQUIRED]**: Obtain credentials for the development instance of the downstream logs API to populate `LOGS_API_EMAIL`, `LOGS_API_PASSWORD`, and `LOGS_API_LOGIN_URL`.
  4. Start the backend in development mode (which automatically restarts on file changes using `nodemon`):
     ```bash
     npm run dev
     ```
     The service runs by default on `http://localhost:3000`.
* **Loading the Extension locally for testing**:
  1. Open Microsoft Edge or Google Chrome.
  2. Navigate to the extensions management page:
     * For Edge: Go to `edge://extensions`
     * For Chrome: Go to `chrome://extensions`
  3. Toggle the **Developer mode** switch in the top-right or sidebar.
  4. Click the **Load unpacked** button.
  5. Select the `extension/` folder from this repository.
  6. Go to `https://github.com/copilot` or `https://claude.ai` and test sending a prompt. Inspect the extension's background page console or the backend console to confirm interception.

---

### 🧪 Tester

* **Overview**: Testers verify that the extension captures prompt data reliably under normal and edge conditions without breaking the underlying AI applications.
* **Verification Checklist**:
  1. **Extension Loading**: Verify the extension loads without console errors on the `edge://extensions` page.
  2. **Interception (GitHub Copilot)**:
     * Go to GitHub Copilot Chat.
     * Submit a prompt.
     * Verify that `content.js` intercepts the request and that `background.js` caches it in `chrome.storage.local` under the `queuedLogs` key.
  3. **Interception (Claude.ai)**:
     * Go to Claude.ai.
     * Submit a prompt.
     * Verify that the prompt text is captured under the `ClaudePromptCaptured` event.
  4. **Flush Timing**:
     * Wait 30 seconds.
     * Verify that the logs are cleared from local browser storage and sent to the backend.
  5. **Backend Verification**:
     * Open the backend service folder.
     * Confirm that `prompts.xlsx` was created or updated with the exact prompt, timestamp, target URL, and conversation ID.
     * Verify that the Node.js console logs show successful entries.

---

### 👤 User

* **Overview**: Employees using AI tools (GitHub Copilot and Claude.ai) on corporate devices.
* **Setup**:
  * **[CONFIRMATION REQUIRED]**: Does the user need to manually sign in or click any buttons on the extension, or does it run fully automatically? (Currently, the extension operates silently without a UI).
* **Usage**:
  * Use GitHub Copilot and Claude.ai in your browser as usual. The extension will automatically handle prompt logging in the background.
  * **[CONFIRMATION REQUIRED]**: Is there a user disclosure popup or notice that must be acknowledged on first run?

---

### ⚙️ IT Team & System Administrator

* **Overview**: The IT team is responsible for hosting the Node.js API, managing environment variables, and force-installing the extension on corporate laptops during onboarding.

#### Backend Server Deployment
1. **Infrastructure**: Deploy the `backend/` Node.js application to your production environment (e.g., PM2, Docker, or Kubernetes).
2. **Environment Variables**: Populate the following values in the production environment:
   * `PORT`: Port for the API to listen on (defaults to `3000`).
   * `LOGS_API_BASE_URL`: Base URL of the downstream logging system.
   * `LOGS_API_LOGIN_URL`: The authentication endpoint of the downstream logging system.
   * `LOGS_API_EMAIL`: The corporate service account email used for auth.
   * `LOGS_API_PASSWORD`: The corporate service account password used for auth.
3. **Storage & Volumes**:
   * If keeping Excel storage in production, ensure the backend container has a persistent volume mounted to prevent losing the `prompts.xlsx` spreadsheet during server updates or redeployments.

#### Automated Extension Deployment (Onboarding)
* **Target Browsers**: **[CONFIRMATION REQUIRED]** (Edge only, Chrome only, or both?)
* **Force Install Policies**:
  * **[CONFIRMATION REQUIRED]**: How should the IT team configure the forced rollout policy (e.g., Microsoft Intune, Active Directory Group Policy, or Chrome Enterprise Cloud Management)?
  * **Registry Settings**:
    * **Edge (Windows)**:
      * Path: `HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Edge\ExtensionInstallForcelist`
      * Key: `1`
      * Value: **[CONFIRMATION REQUIRED]** (The extension ID and optional update URL, e.g., `[Extension_ID];https://clients2.google.com/service/update2/crx`)
    * **Chrome (Windows)**:
      * Path: `HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome\ExtensionInstallForcelist`
      * Key: `1`
      * Value: **[CONFIRMATION REQUIRED]**
