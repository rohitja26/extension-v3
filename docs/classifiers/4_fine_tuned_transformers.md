# Classifier Technique: Local Fine-Tuned Transformer (Transfer Learning)

This document details the Custom Fine-Tuned Transformer classification technique, which involves training a pre-trained language model (such as DistilBERT or MiniLM) on a custom dataset of developer prompts and running it locally.

---

## 1. What This Technique Does

Instead of using raw pre-trained vector representations and calculating distance math, this technique uses **Transfer Learning** to teach a model the exact definitions of your target categories (Coding, Bug Fixing, Brainstorming, General Purpose). 

You take a model that already understands English grammar and coding vocabulary, add a classification layer (head) on top, and train it further on a custom set of labeled prompts. The final model is exported to ONNX format and deployed directly to your Node.js backend.

---

## 2. How It Works

```
[ Step 1: Data Preparation ] ──> [ Step 2: Model Training ] ──> [ Step 3: Model Export ] ──> [ Step 4: Local Node.js Runtime ]
  • Label 500-1,000 prompts        • Add classification head.      • Convert PyTorch model     • Load model with ONNX Runtime.
  • Map to 4-5 target classes.     • Train model (Python/PyTorch)    to ONNX format via        • Run inference in CPU worker.
                                     on GPU (Google Colab).          optimum-cli.              • Directly output category probabilities.
```

1. **Dataset Assembly**: Collect a diverse sample of 500 to 1,000 prompts from historical developer activity and manually label them with their ground-truth categories.
2. **Model Customization (Python/PyTorch)**:
   * Load a base model in Python (e.g., `sentence-transformers/all-MiniLM-L6-v2` or `distilbert-base-uncased`).
   * Attach a linear classification head matching the number of target categories.
   * Fine-tune the model using the Hugging Face `Trainer` API for 3-5 epochs on a GPU.
3. **ONNX Compilation**:
   * Export the trained model to ONNX using `optimum-cli`:
     ```bash
     optimum-cli export onnx --model path/to/fine-tuned-model/ --task text-classification local_onnx_model/
     ```
4. **Node.js Local Inference**:
   * Place the ONNX model files in the backend workspace.
   * Load the model in your Node.js background thread using `@xenova/transformers`.
   * When a prompt is passed, the model directly returns a probability score for each category, for example:
     ```json
     {
       "Coding": 0.88,
       "Bug Fixing": 0.05,
       "Brainstorming": 0.04,
       "General Purpose": 0.03
     }
     ```
   * Assign the category with the highest probability.

---

## 3. Accuracy and Results

* **Semantic Categories (Coding vs. Brainstorming)**: **Extremely High Accuracy (90% - 95%+)**. Because the model has been directly optimized on your exact developer data, it learns the specific linguistic syntax and phrasing developers use for different tasks.
* **Structured Data (Credentials, PII, Cards)**: **Medium Accuracy (50% - 70%)**. While it can be trained to recognize the general pattern of secrets, it is still a statistical model and might occasionally hallucinate or fail to catch rare key formats. It must be paired with **Rule-Based Regex Scanning** for security compliance.

---

## 4. Complexity, Timeline, and Prerequisites

| Metric | Details |
| :--- | :--- |
| **Implementation Complexity** | **High**. Requires a hybrid developer workflow spanning Python (for training/evaluation) and Node.js (for runtime deployment). |
| **Development Timeline** | **1 - 2 Weeks**. Most of the time is spent gathering and labeling the training dataset, setting up the training script, and calibrating classification thresholds. |
| **Prerequisites** | A labeled dataset (500+ records), access to a GPU environment (like Google Colab, Kaggle, or a local GPU machine) for training, and Python libraries (`transformers`, `torch`, `optimum`). |

---

## 5. Cost Analysis

* **Financial Cost**: **$0.00**. Model training can be run for free on Google Colab or Kaggle GPU instances. Hugging Face models and libraries are open-source and free for commercial use.
* **Server Overhead**: **Medium**. 
  * ONNX models like MiniLM are small (~80MB) and require around **150MB of RAM** in Node.js.
  * Inference latency on a standard cloud CPU is **80 - 150 milliseconds** per prompt. Because execution is asynchronous in the background, this latency does not affect the client or cause bottlenecking.
