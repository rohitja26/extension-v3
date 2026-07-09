# Classifier Techniques Comparison & Recommendations

This document compares the four proposed classification techniques side-by-side and outlines the recommended local hybrid architecture for the AI Usage Tracker project.

---

## 1. Comparison Matrix

| Feature / Metric | 1. Rule-Based & Regex | 2. Local Pre-trained Embeddings | 3. Local Fine-Tuned Transformer | 4. Hosted LLM API (Deprecated) |
| :--- | :--- | :--- | :--- | :--- |
| **Accuracy (Sensitive Data)** | **Extremely High (95%+)** | Low (10%-30%) | Medium (50%-70%) | High (85%-90%) |
| **Accuracy (Semantic Intent)**| Low (40%-50%) | High (75%-85%) | **Extremely High (90%-95%+)** | **Extremely High (90%-95%+)** |
| **Data Privacy** | **100% Private (Local)** | **100% Private (Local)** | **100% Private (Local)** | Data sent to cloud provider |
| **Implementation Complexity**| Very Low | Medium | High (Requires training dataset) | Low |
| **Development Timeline** | 1 - 2 Days | 1 - 2 Weeks | 1 - 2 Weeks | 2 - 4 Days |
| **Execution Latency** | **1 - 2 milliseconds** | 50 - 200 milliseconds | 80 - 150 milliseconds | 300 - 800 milliseconds (Network) |
| **Server Resources** | Negligible | Medium (150MB RAM + CPU) | Medium (150MB RAM + CPU) | Negligible |
| **Financial Cost** | **$0.00** | **$0.00** | **$0.00** | Token-based (e.g., ~$0.68/10k prompts) |

---

## 2. Recommended Hybrid Architecture (100% Local & CPU-Only)

Given the project requirements (**100% Local**, **CPU-Only**, and **Asynchronous processing**), the Hosted LLM API is ruled out. We recommend implementing a **Local Dual-Layer Classification Pipeline**:

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
     [ Flag as Critical ]        [ LAYER 2: Semantic Classifier ]
     • Redact sensitive values.  • Run Custom Fine-Tuned Transformer (ONNX)
     • Skip Layer 2.               to directly output category probabilities.
                                           │
                                           ▼
                                 [ Assign Intent Category ]
                                 (Coding, Bug Fixing, Brainstorming, etc.)
```

### Why This Hybrid Model Works:
1. **Security-First Redaction (Layer 1)**: By running the regex scanner first, you capture credit cards, passwords, and tokens *locally and instantly*. If a secret is detected, you can log it immediately and **redact the secret text** before it is stored.
2. **Context-Rich Semantic Accuracy (Layer 2)**: Using a **Custom Fine-Tuned Transformer** (trained on 500+ developer prompts and compiled to ONNX) provides maximum intent classification accuracy (90%+) without sending any employee data to cloud networks.
3. **No Event Loop Blocking**: Offloading inference to background **Worker Threads** ensures that the CPU overhead (~100ms) has zero impact on incoming HTTP log ingestion.

