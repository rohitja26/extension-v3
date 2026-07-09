# Onboarding and Verification Guide: AI Usage Tracker

This guide explains how to verify the functionality of the AI Usage Tracker browser extension and Node.js backend. It covers two scenarios:
1. **Before Deployment**: How developers and testers can verify the extension locally in a development environment.
2. **After Deployment**: How the IT team and system administrators can confirm the extension is successfully deployed and logging data in production.

---

## Part 1: Before Deployment (Local Development Verification)

To test the system locally, you will run the backend API on your development machine, load the browser extension in "unpacked" developer mode, and verify prompt logging.

### Step 1: Set Up and Run the Backend API
1. Open your terminal and change directories to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the necessary Node.js dependencies:
   ```bash
   npm install
   ```
3. Set up the local environment file:
   * Duplicate `env.example` and rename it to `.env`.
   * Open the `.env` file and configure the port (defaults to `3000` if left blank):
     ```env
     PORT=3000
     ```
   * *Note:* If you do not have downstream external API credentials, the console will show warning logs when forwarding fails, but the local Excel file will still be written successfully.
4. Start the backend server:
   ```bash
   npm run dev
   ```
   Confirm that the console displays: `Backend server start at port 3000`. Keep this terminal window open.

---

### Step 2: Load the Extension in Your Browser
You can test this in either **Microsoft Edge** or **Google Chrome**:
1. Open your browser.
2. Go to the extensions management page:
   * In **Microsoft Edge**: Navigate to `edge://extensions`
   * In **Google Chrome**: Navigate to `chrome://extensions`
3. In the top-right corner (Edge) or top-left menu (Chrome), toggle **Developer mode** to **On**.
4. Click the **Load unpacked** button.
5. In the file explorer, select the `extension` folder in your project directory.
6. Confirm that the extension **GitHub Copilot Tracker POC** now appears in your active extensions list.

---

### Step 3: Verify Prompt Capture & Local Storage Queuing
1. Open a new browser tab and navigate to either:
   * **GitHub Copilot Chat**: `https://github.com/copilot`
   * **Claude.ai**: `https://claude.ai`
2. Open the browser's developer tools (`F12` or right-click -> `Inspect`) and select the **Console** tab.
3. Type a test prompt in the chat box (e.g., "Hello, this is a local tracking test") and press Enter to send it.
4. Check the Extension background logs to verify prompt capture:
   * Go back to the extensions management tab (`chrome://extensions` or `edge://extensions`).
   * Locate the **GitHub Copilot Tracker POC** card.
   * Click the **service worker** link next to the "Inspect views" label. This opens a separate Developer Tools window for the extension's background script.
   * In the service worker console, run the following command to check if your prompt is stored in the local queue:
     ```javascript
     chrome.storage.local.get('queuedLogs', console.log);
     ```
   * You should see an array containing an object with your prompt text, the URL, a timestamp, and a conversation ID.

---

### Step 4: Verify Transmission and Excel File Generation
1. Keep the service worker console open. The extension is scheduled to flush logs to the backend every 30 seconds.
2. After 30 seconds, verify in the service worker console that the logs have been flushed:
   * Run the storage check again:
     ```javascript
     chrome.storage.local.get('queuedLogs', console.log);
     ```
   * The `queuedLogs` array should now be empty (or the previously sent items should be removed).
3. Check your backend terminal window. You should see incoming requests logged in the console.
4. Open the `backend` project folder on your computer and locate the `prompts.xlsx` file.
5. Open `prompts.xlsx` using Microsoft Excel or any spreadsheet reader. Verify that a row has been appended with your logged prompt, user login (`actorLogin` if parsed, or `unknown`), timestamp, and conversation ID.

---

## Part 2: After Deployment (Enterprise Production Verification)

Once the IT team roll out the browser extension and backend API to production, you can check that everything is working properly from a user device.

### Step 1: Verify IT Policy and Extension Installation
1. Log in to a company laptop that has completed the onboarding setup.
2. Open Microsoft Edge or Google Chrome.
3. Go to the extensions management page (`edge://extensions` or `chrome://extensions`).
4. Look for the **GitHub Copilot Tracker** extension.
5. Verify the following policy indicators:
   * The extension is **Enabled** and the toggle switch is grayed out/locked.
   * A **briefcase icon** or a message stating "Installed by your organization" is displayed.
   * This confirms that the IT department's **ExtensionInstallForcelist** group policy has successfully pushed the extension and users cannot disable or remove it.

---

### Step 2: Verify Log Storage in Production
1. Navigate to your corporate AI portal, GitHub Copilot Chat, or Claude.ai.
2. Submit a query related to your work.
3. To confirm that the telemetry log was successfully recorded:
   * **For Administrators**: Log in to the production database or view the centralized Excel file/downstream API logs. Verify that the user prompt was saved along with the correct corporate username (e.g. email or employee ID mapped to `actorLogin`) and timestamp.
   * **For Users**: Since the extension is designed to run silently without interfering with your workflow, you will see no popups or visual changes, ensuring a seamless user experience.
