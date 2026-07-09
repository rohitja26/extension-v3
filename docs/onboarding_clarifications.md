# Onboarding and Deployment Clarifications Questionnaire

This document outlines the specific operational, technical, and organizational details required to complete the project onboarding documentation. These questions are based on an analysis of the existing codebase and represent information that cannot be resolved without input from the project owner.

---

## 1. IT & System Administrator Deployment

To document the automated rollout process for the IT team, we need to clarify the exact mechanism used to push the extension to user devices:

### A. Extension Force-Installation Method
* **Deployment Mechanism**: Which system management tool is used to force-install the extension on users' laptops during initial setup?
  * [ ] Microsoft Intune (MDM)
  * [ ] Active Directory Group Policy Objects (GPO)
  * [ ] Chrome Enterprise Cloud Management / Microsoft Edge Management Service
  * [ ] Other (please specify: ____________________)
* **Extension Distribution Channel**: How is the extension packaged and delivered?
  * [ ] Published privately on the Chrome Web Store / Edge Add-ons store (requires extension ID).
  * [ ] Self-hosted custom `.crx` file on an internal web server (requires update XML URL and extension ID).
  * [ ] Deployed locally as an unpacked directory via file-sharing/scripts (requires configuring developer mode/policies).
* **Configuration Parameters**: What are the specific registry paths, policy names, or JSON configurations the IT team needs to apply (e.g., `ExtensionInstallForcelist`)?

### B. Production Infrastructure & Environment Management
* **Backend API Hosting**: Where does the Node.js Express service run in production (e.g., AWS EC2, Azure App Services, Kubernetes, on-premise server)? What is its production base URL (replacing `http://localhost:3000`)?
* **Production Database / Downstream API**: What is the base URL and authentication details for the production downstream log API (configured via `LOGS_API_BASE_URL` in the environment)?
* **Secrets Management**: How should the IT team securely inject production secrets (like `LOGS_API_EMAIL`, `LOGS_API_PASSWORD`, and API tokens) into the Node.js container or server?
  * [ ] Environment files (`.env`) managed manually on the host.
  * [ ] Secrets manager service (e.g., AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).
  * [ ] Container orchestration tools (e.g., Kubernetes Secrets, Docker Compose secrets).

### C. Excel File Persistence (POC vs. Production)
* **Persistence Model**: The Node.js backend currently writes incoming prompts to a local Excel workbook (`prompts.xlsx`) and forwards them to the external API.
  * Is the Excel sheet persistence used in production, or is it strictly a Proof of Concept (POC) feature?
  * If used in production, how is the file persisted or backed up (e.g., persistent volume claims, network shared drives)?

---

## 2. Browser & Platform Scope

The POC design notes focus on Microsoft Edge (Manifest V3), but the codebase intercepts traffic on both GitHub Copilot (`github.com`) and Claude (`claude.ai`), using standard WebExtension APIs (`chrome.storage.local`, `chrome.alarms`, etc.).

* **Target Browsers**: Which browsers must the IT team configure and support?
  * [ ] Microsoft Edge only
  * [ ] Google Chrome only
  * [ ] Both Google Chrome and Microsoft Edge
  * [ ] Other (please specify: ____________________)

---

## 3. Audience Responsibilities & Workflows

To ensure each section of the onboarding guide is practical, we need to define the exact actions required by each user role:

### A. Stakeholder
* **Primary Contacts**: Who are the primary business/security stakeholders?
* **Responsibilities**: What are the stakeholders responsible for?
  * [ ] Reviewing usage metrics and audit reports generated from the logs.
  * [ ] Managing compliance and data privacy regulations (e.g., ensuring no PII is logged).
  * [ ] Approving tool updates or extension policy changes.

### B. Developer
* **Development Environment**: What credentials or sandbox environments do developers need to access to work on this project (e.g., developer accounts for the external log API)?
* **Local Tooling**: Are there any special code formatters, linters, or testing frameworks developers must run before committing code?

### C. Tester
* **Test Environments**: What URLs or mock pages do testers use to verify prompt capture?
  * Do they test against live GitHub Copilot and Claude.ai accounts, or is there a mocked web page/environment for verification?
* **Verification Scope**: What is the expected behavior for verification?
  * Should they check the local SQLite/SQL server database (future), the local Excel file, or verify output on the backend console logs?

### D. User
* **User Consent & Policy**: Do users need to perform any configuration steps (e.g., logging into the extension, granting permissions)?
* **Privacy Notifications**: Are users shown a disclosure/consent notification explaining that their prompts are tracked, or does the tool run silently in the background with zero user interaction?
