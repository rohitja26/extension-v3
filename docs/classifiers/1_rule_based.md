# Classifier Technique: Rule-Based & Regex Pattern Matching

This document details the Rule-Based and Regular Expression (Regex) classification technique for analyzing user prompts intercepted from GitHub Copilot and Claude.ai.

---

## 1. What This Technique Does

This technique scans incoming prompt strings for specific text patterns, known sequences, and predefined keywords. It is highly deterministic: if a prompt matches a specific regular expression or contains a set of keywords, it is instantly assigned to that category.

It is best suited for detecting **Critical Information / Security Risks** (such as credit cards, API keys, database connection strings, and social security numbers) where patterns are standard and structured.

---

## 2. How It Works

1. **Pattern Matching**: When a prompt is received by the backend, it runs through a sequential pipeline of regular expressions.
   * *API Keys / Credentials*: Matches strings matching standard signatures (e.g., AWS Access Keys via `(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])`, GitHub tokens starting with `ghp_`, or standard JWT formats).
   * *Financial Data*: Matches credit card numbers using a regex pattern combined with the **Luhn Algorithm** validator (to filter out fake card numbers).
2. **Keyword Dictionary Scanning**: The prompt is tokenized, and the frequency of domain-specific keywords is calculated.
   * *Bug Fixing*: Looks for terms like `error`, `exception`, `bug`, `fail`, `stacktrace`, `undefined`, `null pointer`, `crash`.
   * *Coding*: Looks for terms like `function`, `class`, `implement`, `refactor`, `javascript`, `python`, `html`, `css`, `import`.
   * *General Purpose*: Looks for terms like `email`, `rewrite`, `format`, `summarize`, `grammar`.

---

## 3. Accuracy and Results

* **Structured Data (Credentials, PII, Cards)**: **Extremely High Accuracy (95%+ / Near-Zero False Positives)**. Standard tokens and card numbers follow strict formats that regex can capture reliably, especially when validated with utility checks like the Luhn algorithm.
* **Semantic Categories (Coding vs. Brainstorming)**: **Low Accuracy (40% - 50%)**. Human language is nuanced. A user typing *"Why does this function fail?"* contains the word "function" (Coding) and "fail" (Bug Fixing), leading to high rates of misclassification or overlap.

---

## 4. Complexity, Timeline, and Prerequisites

| Metric | Details |
| :--- | :--- |
| **Implementation Complexity** | **Very Low**. Can be written directly in native JavaScript/Node.js without external heavy dependencies. |
| **Development Timeline** | **1 - 2 Days** to compile regex patterns, implement keyword dictionaries, and write unit tests. |
| **Prerequisites** | A compiled list of credential patterns (e.g., adapted from open-source credential scanners like GitGuardian, TruffleHog, or Yelp Detect-Secrets rules). |

---

## 5. Cost Analysis

* **Financial Cost**: **$0.00**. No external APIs, subscription fees, or license costs are required.
* **Server Overhead**: **Negligible**. Scanning a string with regex patterns takes less than **1-2 milliseconds** on a single CPU core and uses almost zero memory, making it highly efficient.
