# System Design: Local Async Classification Pipeline

Based on the project constraints, the prompt classification system is designed to operate **100% locally**, run efficiently on **CPU-only hardware**, and perform all classifications **asynchronously** in the background without blocking client requests.

---

## 1. Selected Technology Stack

1. **Layer 1: Deterministic Scanner (Regex & Luhn)**
   * **Purpose**: Scan for credentials, API tokens, PII, and card data.
   * **Implementation**: Standard JavaScript regular expressions.
2. **Layer 2: Semantic Intent Classifier (ONNX Embeddings or Fine-Tuned Classifier)**
   * **Purpose**: Classify the user prompt context (Coding, Bug Fixing, Brainstorming, General Purpose).
   * **Base Model**: `all-MiniLM-L6-v2` (ONNX format, ~80MB).
   * **Option A (Pre-trained)**: Zero-shot Cosine Similarity against category centroids.
   * **Option B (Fine-Tuned - Recommended)**: Load a custom-trained classification head ONNX model.
   * **Runtime**: `@xenova/transformers` (running ONNX Runtime Node).
3. **Execution Model: Background Queue with Worker Threads**
   * **Purpose**: Offload heavy classification math from the main Node.js event loop to prevent server lockups on CPU-only hardware.
   * **Implementation**: Node.js `worker_threads` module.

---

## 2. Process Flow & Architecture

```
[ Browser Extension ]
       │  (POST /api/copilot/log)
       ▼
[ Express Server (Main Thread) ]
   1. Receives payload.
   2. Validates & normalizes payload.
   3. Sends immediate { success: true } response.
   4. Pushes log data to background queue.
       │
       ▼ (Background Queue)
[ Worker Thread Pool ]
   • Worker 1, Worker 2, etc. (CPU-bound)
   • Runs Regex scans (Layer 1).
   • Option A: Computes embeddings & similarity (unsupervised).
   • Option B: Runs custom classification model (supervised, fine-tuned).
       │
       ▼ (Post-Processing)
[ Database / Excel Storage ]
   • Writes final classified logs (including category and risk severity).
```

---

## 3. Node.js Background Queue & Worker Thread Blueprint

To ensure that CPU-bound vector computations do not block HTTP request processing, we offload inference to a separate CPU thread.

### A. Worker Thread Script (`utils/classifierWorker.js`)
This script can support either the out-of-the-box similarity model (Option A) or the fine-tuned ONNX classifier (Option B).

```javascript
const { parentPort } = require('worker_threads');
const { pipeline } = require('@xenova/transformers');

let classifier = null;
const RUN_FINE_TUNED = true; // Set to false to use Option A (raw embeddings)

// --- Option A Config: Cosine Similarity centroids ---
const centroids = {
    'Coding': [/* 384-dimensional vector */],
    'Bug Fixing': [/* 384-dimensional vector */],
    'Brainstorming': [/* 384-dimensional vector */],
    'General Purpose': [/* 384-dimensional vector */]
};

// --- Model Initialization ---
async function initModel() {
    if (!classifier) {
        if (RUN_FINE_TUNED) {
            // Load your custom ONNX text classification model
            // This directly outputs probability classes
            classifier = await pipeline('text-classification', 'local-models/fine-tuned-tracker');
        } else {
            // Load raw embeddings pipeline
            classifier = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
    }
}

// Cosine Similarity calculation (Option A helper)
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Regex rules for sensitive data (Layer 1)
const SENSITIVE_REGEX = {
    AWS_KEY: /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/,
    GITHUB_TOKEN: /\bghp_[a-zA-Z0-9]{36}\b/,
    GENERIC_SECRET: /(password|passwd|db_password|api_key|client_secret)\s*=\s*['"][^\s'"]+['"]/i
};

parentPort.on('message', async (log) => {
    try {
        await initModel();
        
        let severity = 'low';
        let category = 'General Purpose';
        let cleanPrompt = log.prompt;

        // Layer 1: Run Regex checks
        let isSensitive = false;
        for (const [key, regex] of Object.entries(SENSITIVE_REGEX)) {
            if (regex.test(log.prompt)) {
                isSensitive = true;
                severity = 'critical';
                category = 'Security Risk';
                cleanPrompt = log.prompt.replace(regex, '[REDACTED_SENSITIVE_DATA]');
            }
        }

        // Layer 2: Run Classifier if not caught by Layer 1
        if (!isSensitive) {
            if (RUN_FINE_TUNED) {
                // --- Option B: Fine-Tuned Model Inference ---
                // Directly returns classified label and confidence score
                const results = await classifier(log.prompt);
                // Results shape: [{ label: 'Coding', score: 0.94 }]
                category = results[0].label;
                severity = category === 'Bug Fixing' ? 'medium' : 'low';
            } else {
                // --- Option A: Pre-trained Embeddings + Cosine Similarity ---
                const output = await classifier(log.prompt, { pooling: 'mean', normalize: true });
                const promptVector = Array.from(output.data);

                let maxSimilarity = -1;
                let bestCategory = 'General Purpose';

                for (const [catName, catVector] of Object.entries(centroids)) {
                    const sim = cosineSimilarity(promptVector, catVector);
                    if (sim > maxSimilarity) {
                        maxSimilarity = sim;
                        bestCategory = catName;
                    }
                }
                category = maxSimilarity > 0.4 ? bestCategory : 'General Purpose';
                severity = category === 'Bug Fixing' ? 'medium' : 'low';
            }
        }

        parentPort.postMessage({
            id: log.id,
            category,
            severity,
            prompt: cleanPrompt
        });
    } catch (err) {
        parentPort.postMessage({ error: err.message });
    }
});
```

---

## 4. Prerequisites & Setup for CPU-Only Local Execution

1. **Install Dependencies**:
   ```bash
   npm install @xenova/transformers onnxruntime-node
   ```
2. **Local Model Caching**:
   Since the server has no internet access in strict local environments, download the model files and place them in a local directory, then configure `@xenova/transformers` to read from the local cache:
   ```javascript
   const { env } = require('@xenova/transformers');
   env.localModelPath = 'local-models/';
   env.allowRemoteModels = false;
   ```
3. **If using Option A (Pre-trained Similarity)**:
   Create a calibration script to generate and save the vector centroids in a JSON file (`centroids.json`) so the worker threads can read them instantly without recalculating category vectors during runtime.
4. **If using Option B (Fine-Tuned Classifier)**:
   Place the compiled ONNX files inside `local-models/fine-tuned-tracker/` (including `model.onnx`, `config.json`, `tokenizer.json`, and `tokenizer_config.json` generated during python export).

