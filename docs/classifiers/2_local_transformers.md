# Classifier Technique: Local Transformer Model (Semantic Embeddings)

This document details the Local Transformer Model classification technique, which uses a lightweight, pre-trained machine learning model running on the Node.js server to classify prompts based on semantic meaning.

---

## 1. What This Technique Does

This technique analyzes the *semantic intent* of a prompt rather than matching exact keywords. By converting the prompt text into a numerical vector (embedding), it measures how close the prompt is to representative categories (e.g., Coding, Bug Fixing, Brainstorming, General Purpose).

It runs entirely locally on your Node.js backend server, ensuring that employee prompts never leave your private infrastructure.

---

## 2. How It Works

1. **Text Embedding**: When a prompt is logged, the backend passes the string to a lightweight local model (such as `all-MiniLM-L6-v2` running via ONNX Runtime in Node.js). The model outputs a dense vector (e.g., 384 dimensions) representing the prompt's meaning.
2. **Category Vectors (Centroids)**: During development, you generate "average vectors" for each target category by embedding 10-20 sample sentences for each (e.g., *"draft a response to this email"* for General Purpose, or *"help me debug this stack overflow"* for Bug Fixing).
3. **Similarity Calculation**: The server calculates the **Cosine Similarity** between the incoming prompt vector and each of the category centroid vectors:
   $$\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
4. **Classification**: The prompt is assigned to the category that returns the highest similarity score. If the highest score is below a certain threshold (e.g., 0.35), the prompt is classified as "Unknown" or "Uncategorized".

---

## 3. Accuracy and Results

* **Semantic Categories (Coding vs. Brainstorming)**: **High Accuracy (75% - 85%)**. Because Sentence-BERT is trained on large natural language datasets, it understands that *"how do I restructure this module"* is semantically similar to programming/development, even if the user didn't write the word "code".
* **Structured Data (Credentials, PII, Cards)**: **Low Accuracy (10% - 30%)**. Embeddings represent abstract meaning rather than exact text structures. A prompt with a credit card number looks semantically similar to general numerical entries or transactions and will likely not trigger security flags unless explicitly combined with pattern scanners.

---

## 4. Complexity, Timeline, and Prerequisites

| Metric | Details |
| :--- | :--- |
| **Implementation Complexity** | **Medium**. Requires loading the ONNX runtime library in Node.js, caching the model in memory, and writing a math utility to compute vector similarities. |
| **Development Timeline** | **1 - 2 Weeks** to write embedding scripts, seed the reference category samples, test vector boundary thresholds, and verify latency performance. |
| **Prerequisites** | `@xenova/transformers` (or `@huggingface/transformers`) package installed in the Node.js backend. A dataset of 20-30 reference prompts per category to calculate the initial vector centroids. |

---

## 5. Cost Analysis

* **Financial Cost**: **$0.00**. Hugging Face models (like MiniLM) are open-source and free for commercial use.
* **Server Overhead**: **Medium**. 
  * The model file is small (~80MB) and uses about **150MB of RAM** once cached in memory.
  * Inference (generating the vector) takes **50 - 200 milliseconds** per prompt on a standard cloud CPU, which is fast enough for background processing (where a 30-second delay is acceptable).
