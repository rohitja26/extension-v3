# GitHub Copilot Tracker (POC) - Implementation Timeline and Plan

## Objective
Build a Microsoft Edge extension (Manifest V3) that captures GitHub Copilot chat prompts and sends them to a Node.js API to be stored in an Excel file.

## Implementation Timeline (Step-by-Step)

### Phase 1: Project Initialization
- Create the basic folder structure (`extension/` and `backend/`).
- Initialize a Node.js project in `backend/` and install required dependencies (`express`, `cors`, `exceljs` for Excel manipulation).

### Phase 2: Backend API Development
- Setup an Express server.
- Create a storage service abstraction. This will currently use `exceljs` to append rows to an Excel file (`prompts.xlsx`), but it's designed so we can easily swap it with a SQL Server implementation later.
- Implement the `POST /api/copilot/log` endpoint.
  - Validate the incoming payload.
  - Pass the data to the storage service.
  - Return `{ "success": true }`.

### Phase 3: Extension Development
- **Manifest**: Create `manifest.json` (V3) requesting permissions for `storage`, `alarms`, and host permissions for `https://github.com/copilot/*` and the local API.
- **Content Script (`content.js`)**: 
  - Inject into `https://github.com/copilot/*`.
  - Listen for prompt submissions (e.g., pressing Enter in the chat textarea).
  - Extract the text, current URL, and send a message to the background script.
- **Background Script (`background.js`)**:
  - Listen for messages from the content script.
  - Parse the `conversationId` from the URL.
  - Store the payload (with a timestamp) in `chrome.storage.local`.
  - Setup a `chrome.alarms` timer that triggers every 30 seconds.
  - On alarm, read stored prompts, send them via `fetch` to `http://localhost:3000/api/copilot/log`.
  - If successful, remove the sent items from local storage.

### Phase 4: Testing & Verification
- Start the Node.js backend.
- Provide instructions on how to load the unpacked extension in Microsoft Edge.
- Verify that data is successfully logged in the Excel file when interacting with the mocked or actual GitHub Copilot URL.
