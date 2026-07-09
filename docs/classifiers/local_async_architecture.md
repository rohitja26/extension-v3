# System Design: Local Async Classification Pipeline

Based on the project constraints, the prompt classification system is designed to operate **100% locally**, run efficiently on **CPU-only hardware**, and perform all classifications **asynchronously** in the background without blocking client requests.

---

## 1. Selected Technology Stack

1. **Layer 1: Deterministic Scanner (Regex & Luhn)**
   * **Purpose**: Scan for credentials, API tokens, PII, and card data.
   * **Implementation**: Standard JavaScript regular expressions.
2. **Layer 2: Semantic Intent Classifier (ONNX Embeddings)**
   * **Purpose**: Classify the user prompt context (Coding, Bug Fixing, Brainstorming, General Purpose).
   * **Model**: `all-MiniLM-L6-v2` (ONNX format, ~80MB).
   * **Runtime**: `@xenova/transformers` (running ONNX Runtime Node).
3. **Execution Model: Background Queue with Worker Threads**
   * **Purpose**: Offload heavy embedding generation from the main Node.js event loop to prevent server lockups on CPU-only hardware.
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
   • Generates vector embeddings (Layer 2).
   • Computes cosine similarity to seed centroids.
       │
       ▼ (Post-Processing)
[ Database / Excel Storage ]
   • Writes final classified logs (including category and risk severity).
```

---

## 3. Node.js Background Queue & Worker Thread Blueprint

To ensure that CPU-bound vector computations do not block HTTP request processing, we offload inference to a separate CPU thread.

### A. Worker Thread Script (`utils/classifierWorker.js`)
This worker runs in a separate thread, loads the model once, and processes classification requests.

```javascript
const { parentPort } = require('worker_threads');
const { pipeline } = require('@xenova/transformers');
const { detectProvider } = require('../providerUtils');

let embedder = null;

// Seed Centroids for Cosine Similarity
const centroids = {
    'Coding': [/* 384-dimensional vector */],
    'Bug Fixing': [/* 384-dimensional vector */],
    'Brainstorming': [/* 384-dimensional vector */],
    'General Purpose': [/* 384-dimensional vector */]
};

async function initModel() {
    if (!embedder) {
        // Load MiniLM model from local ONNX runtime cache
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
}

// Cosine Similarity calculation
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

// Regex rules for sensitive data
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
                // Redact value for storage privacy
                cleanPrompt = log.prompt.replace(regex, '[REDACTED_SENSITIVE_DATA]');
            }
        }

        // Layer 2: Run Embedding check if not caught by Layer 1
        if (!isSensitive) {
            const output = await embedder(log.prompt, { pooling: 'mean', normalize: true });
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
   Since the server has no internet access in strict local environments, download the model files (`all-MiniLM-L6-v2` ONNX models) and place them in a local directory, then configure `@xenova/transformers` to read from the local cache:
   ```javascript
   const { env } = require('@xenova/transformers');
   env.localModelPath = '/path/to/local/models/';
   env.allowRemoteModels = false;
   ```
3. **Seed Vector Centroids**:
   Create a calibration script to generate and save the vector centroids in a JSON file (`centroids.json`) so the worker threads can read them instantly without recalculating category vectors during runtime.
