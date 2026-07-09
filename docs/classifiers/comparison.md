# Classifier Techniques Comparison & Recommendations

This document compares the three proposed classification techniques side-by-side and outlines a recommended hybrid architecture for the AI Usage Tracker project.

---

## 1. Comparison Matrix

| Feature / Metric | 1. Rule-Based & Regex | 2. Local Transformers | 3. Hosted LLM API |
| :--- | :--- | :--- | :--- |
| **Accuracy (Sensitive Data)** | **Extremely High (95%+)** | Low (10%-30%) | High (85%-90%) |
| **Accuracy (Semantic Intent)**| Low (40%-50%) | **High (75%-85%)** | **Extremely High (90%-95%+)** |
| **Data Privacy** | **100% Private (Local)** | **100% Private (Local)** | Data sent to cloud provider |
| **Implementation Complexity**| Very Low | Medium | Low |
| **Development Timeline** | 1 - 2 Days | 1 - 2 Weeks | 2 - 4 Days |
| **Execution Latency** | **1 - 2 milliseconds** | 50 - 200 milliseconds | 300 - 800 milliseconds (Network) |
| **Server Resources** | Negligible | Medium (150MB RAM + CPU) | Negligible |
| **Financial Cost** | **$0.00** | **$0.00** | Token-based (e.g., ~$0.68/10k prompts) |

---

## 2. Recommended Hybrid Architecture

To get the best of all three worlds (security, accuracy, cost-efficiency, and privacy), we recommend implementing a **Dual-Layer Classification Pipeline** on your Node.js backend:

```
                  [ Intercepted Prompt ]
                            │
                            ▼
               [ LAYER 1: Rule-Based Scanner ]
               • Run Regex/Luhn matching locally.
               • Detects Credentials, SSH keys, PII, Cards.
                            │
             ┌──────────────┴──────────────┐
             ▼ (Is Flagged?)               ▼ (No Match)
     [ Flag as Critical ]        [ LAYER 2: Semantic Intent Classifier ]
     • Redact sensitive values.  • Run Local Embedding (Sentence-BERT) OR
     • Skip Layer 2.             • Query Cloud LLM API (Structured JSON).
                                           │
                                           ▼
                                 [ Assign Intent Category ]
                                 (Coding, Bug Fixing, Brainstorming, etc.)
```

### Why This Hybrid Model Works:
1. **Security-First Redaction (Layer 1)**: By running the regex scanner first, you capture credit cards, passwords, and tokens *locally and instantly*. If a secret is detected, you can log it immediately and **redact the secret text** before it is saved or sent to any external API.
2. **Cost-Efficiency & Privacy (Layer 2 - Local Embedding option)**: For standard semantic intent classification (Coding vs. Brainstorming), using a local embedding model costs nothing in API calls and keeps all clean user prompt history completely private.
3. **High-Context Precision (Layer 2 - Cloud LLM option)**: If company policy permits sending clean, redacted prompts to an external API (like OpenAI or Gemini), the cloud LLM provides near-perfect categorizations and flags mixed-intent queries with minimal developer effort.
