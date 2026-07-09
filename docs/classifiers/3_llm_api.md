# Classifier Technique: Hosted LLM API (Structured Outputs)

This document details the Large Language Model (LLM) API classification technique, which sends prompts to a managed cloud LLM (such as Google Gemini or OpenAI GPT) and receives structured JSON classification reports.

---

## 1. What This Technique Does

This technique leverages a state-of-the-art hosted model (e.g., `gpt-4o-mini` or `gemini-1.5-flash`) via an API call to read the user prompt, interpret the query's deep context, and output a validated JSON classification schema.

It handles human nuance, technical code parsing, and mixed-intent prompts better than any local mathematical model.

---

## 2. How It Works

1. **Structured API Query**: When a batch of prompts is received, the backend sends a request to the LLM API using the **Structured Outputs** feature (JSON Schema validation).
2. **System Prompt Instruction**: A system prompt defines the exact classification categories and security rules. For example:
   ```
   You are an AI compliance classifier. For the given prompt, output a JSON object matching this schema:
   {
     "category": "Security Risk" | "Coding" | "Bug Fixing" | "Brainstorming" | "General Purpose",
     "riskScore": 0.0 to 1.0,
     "flaggedDataTypes": ["Credentials", "PII", "Confidential", "None"],
     "reasoning": "A short sentence explaining the classification"
   }
   ```
3. **Model Processing**: The LLM analyzes the text using its massive contextual knowledge, mapping terms and structure to the schema.
4. **Validation and Action**: The backend receives a pre-validated JSON response. If the `riskScore` exceeds a specific threshold (e.g., 0.8) or contains flagged data types, the system triggers alerts or logs the event under a "Critical" severity status.

---

## 3. Accuracy and Results

* **Overall Intent & Nuance**: **Extremely High Accuracy (90% - 95%+)**. LLMs easily understand complex, mixed-intent prompts, programming languages, code structures, and abstract human queries (such as a developer asking for an R&D architectural review or debugging a specific compiler error).
* **Structured Data**: **High Accuracy (85% - 90%)**. It can detect API keys and confidential leaks, but it may occasionally miss highly obscure, unstructured proprietary credentials if they do not resemble common keys.

---

## 4. Complexity, Timeline, and Prerequisites

| Metric | Details |
| :--- | :--- |
| **Implementation Complexity** | **Low**. Consists of standard API calls using official SDKs or HTTP libraries. No local model management or vector math required. |
| **Development Timeline** | **2 - 4 Days** to write prompt templates, configure the JSON schema, handle API error retries, and write integration tests. |
| **Prerequisites** | Developer account and API Key (OpenAI or Google Gemini), active billing setup, and outbound internet access from the backend server to the API endpoints. |

---

## 5. Cost Analysis

* **Financial Cost**: Token-based pricing.
  * Using **Google Gemini 1.5 Flash**: Input tokens cost $0.075 / million, output tokens cost $0.30 / million.
  * Using **OpenAI gpt-4o-mini**: Input tokens cost $0.15 / million, output tokens cost $0.60 / million.
  * **Sample Calculation**:
    * Average prompt size: 250 input tokens.
    * Classification output size: 50 output tokens.
    * Cost per prompt (gpt-4o-mini): $(250 \times 1.5 \times 10^{-7}) + (50 \times 6.0 \times 10^{-7}) = \$0.0000675$ per query.
    * Monthly cost for **10,000 prompts**: **~$0.68 / month**. Extremely low.
* **Server Overhead**: **Negligible**. The server only makes an HTTP call, requiring no heavy RAM or CPU cycles. The execution time depends on API network latency (~300 - 800 milliseconds).
