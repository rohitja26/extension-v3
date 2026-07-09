# GitHub Copilot Tracker (POC)

## Objective

Build a simple Microsoft Edge extension that captures GitHub Copilot
chat prompts and stores them for basic usage tracking.

This is only a **Proof of Concept (POC)**.

## Flow

1.  User submits a prompt in GitHub Copilot Chat.
2.  Extension captures the prompt and basic metadata.
3.  Extension stores the data in Local Storage.
4.  Every 30 seconds, the extension sends pending records to a Node.js
    API.
5.  The API appends the records to an Excel file.
6.  Later, only the API will change to store the data in SQL Server
    instead of Excel.

## Data to Capture

-   Timestamp
-   Prompt
-   Current URL
-   Conversation ID (parsed from URL)

## Tech Stack

### Extension

-   Microsoft Edge Extension (Manifest V3)
-   JavaScript

### Backend

-   Node.js
-   Express.js

### Storage

-   POC: Excel (.xlsx)
-   Future: SQL Server

## API

### POST /api/copilot/log

``` json
{
  "timestamp":"2026-07-03T12:00:00Z",
  "prompt":"Explain dependency injection",
  "currentUrl":"https://github.com/copilot/c/xxxxx",
  "conversationId":"xxxxx"
}
```

Response

``` json
{
  "success": true
}
```

## Folder Structure

``` text
extension/
backend/
```

## Notes

-   Keep the implementation simple.
-   No authentication.
-   No dashboard.
-   No analytics.
-   No database in the POC.
-   Design the API so Excel can later be replaced with SQL Server
    without changing the extension.
