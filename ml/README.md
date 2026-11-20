# SignBridge ML Pipeline Architecture & Training Guide

SignBridge implements a production-grade, browser-based sign language recognition system supporting both **Indian Sign Language (ISL)** and **American Sign Language (ASL)**.

Inference runs locally in the user's browser using **ONNX Runtime Web** (WASM/WebGPU) and **MediaPipe Tasks Vision**, while all dataset processing, GPU training, evaluation, and ONNX export are executed on **Google Colab**.

---

## 1. Google Colab Notebooks

| # | Notebook | Purpose | Open in Colab |
|---|---|---|---|
| **01** | `01_dataset_preparation.ipynb` | Dataset ingestion (INCLUDE-50 & ASL Citizen), signer-independent manifest splitting, leakage verification. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/joshiaradhya/SignBridge/blob/main/notebooks/01_dataset_preparation.ipynb) |
| **02** | `02_yolo_detection.ipynb` | Frame sampling and fine-tuning lightweight YOLOv8n detector (`person`, `hand`, `face`). | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/joshiaradhya/SignBridge/blob/main/notebooks/02_yolo_detection.ipynb) |
| **03** | `03_mediapipe_extraction.ipynb` | Batch landmark extraction (Hands, Upper-Pose, Face Mesh) into normalized `.npz` feature sets. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/joshiaradhya/SignBridge/blob/main/notebooks/03_mediapipe_extraction.ipynb) |
| **04** | `04_temporal_training.ipynb` | BiLSTM with Temporal Attention training, resumable checkpoints, learning rate scheduling, test evaluation. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/joshiaradhya/SignBridge/blob/main/notebooks/04_temporal_training.ipynb) |
| **05** | `05_onnx_export_validation.ipynb` | ONNX model export, parity testing against PyTorch, latency benchmarking, metadata generation. | [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/joshiaradhya/SignBridge/blob/main/notebooks/05_onnx_export_validation.ipynb) |

---

## 2. Shared Versioned Feature Schema (`v2.0.0`)

SignBridge guarantees identical spatial representation across Python training scripts and the TypeScript browser client:

* **Landmarks per frame ($74$ points)**:
  * **Left Hand**: $21$ landmarks ($x, y, z$)
  * **Right Hand**: $21$ landmarks ($x, y, z$)
  * **Upper Pose**: $12$ keypoints (Left/Right Shoulders, Elbows, Wrists, Pinkies, Index, Hips)
  * **Face**: $20$ key non-manual landmarks (Eyebrows, Eyes, Nose, Lips contour)
* **Coordinates**: $3$ floats per landmark $(x, y, z)$.
* **Feature Dimension**: $74 \times 3 = 222$ floats per frame.
* **Temporal Sequence**: $32$ normalized frames sampled linearly.
* **Total Tensor Shape**: `[Batch, 32, 222]` ($7,104$ features).
* **Torso Normalization**:
  $$\text{Origin} = \frac{\mathbf{p}_{\text{left\_shoulder}} + \mathbf{p}_{\text{right\_shoulder}}}{2}, \quad \text{Scale} = \max\left(0.1, \|\mathbf{p}_{\text{left\_shoulder}} - \mathbf{p}_{\text{right\_shoulder}}\|\right)$$
  *(Falls back to wrist-centered normalization if shoulders are out of frame).*

---

## 3. Dataset Licensing & Signer Isolation

### Datasets
1. **INCLUDE / INCLUDE-50 (ISL)**:
   * AI4Bharat (IIT Madras).
   * License: Creative Commons Attribution 4.0 International (CC BY 4.0).
   * 50 canonical signs, multiple takes per signer.
2. **ASL Citizen (ASL)**:
   * Microsoft Research & Deaf accessibility research community (Desai et al.).
   * License: Academic Research Use.
   * Thousands of webcam recordings by Deaf signers in unconstrained real-world settings.

### Signer-Independent Splitting
To prevent data leakage and guarantee that models generalize to new users on webcam, the dataset is split strictly by **Signer ID**:
* **Train**: $70\%$ of signers
* **Validation**: $15\%$ of signers
* **Test**: $15\%$ of signers
`verify_signer_isolation()` automatically audits manifest files and fails if any signer appears in multiple splits.

---

## 4. Recognition Architecture: BiLSTM with Temporal Attention

* **Spatial Linear Projection**: $222 \to 128$ dimensions with LayerNorm and Dropout ($0.3$).
* **Bidirectional LSTM**: $2$ layers, hidden size $128$ ($256$ bidirectional output per time step).
* **Additive Temporal Attention**:
  $$u_t = \tanh(W_a h_t + b_a), \quad \alpha_t = \frac{\exp(u_t^\top v_a)}{\sum_\tau \exp(u_\tau^\top v_a)}, \quad c = \sum_{t=1}^{32} \alpha_t h_t$$
* **Classifier Head**: Linear projection to $C$ classes ($50$ for ISL, $40$ for ASL) with CrossEntropyLoss and label smoothing ($0.1$).
* **Model Footprint**: Under $1\text{M}$ parameters ($\approx 2.5\text{ MB}$ ONNX binary), providing $<15\text{ ms}$ inference latency on standard client laptops.

---

## 5. Deploying Exported Models to SignBridge

After running Notebook 5 in Google Colab, download `signbridge_onnx_models.zip` and copy the artifacts into `public/models/`:

```
public/models/
├── isl-metadata.json        # Class labels, thresholds, input shapes (ISL)
├── isl-bilstm-v1.onnx       # Binary ONNX model (kept out of Git)
├── asl-metadata.json        # Class labels, thresholds, input shapes (ASL)
├── asl-bilstm-v1.onnx       # Binary ONNX model (kept out of Git)
└── isl-v1.json              # Legacy nearest-centroid fallback (optional)
```

The web application automatically detects the presence of the ONNX models. If a user practices or calls before the ONNX weights are placed, the app gracefully falls back to the legacy centroid model or notifies the learner without breaking.

---

## 6. Vercel Serverless Function

`ml/api/index.py` is a dependency-free health and metadata handler deployed to Vercel Functions. Because Vercel has a $500\text{ MB}$ uncompressed package limit, heavy training dependencies (PyTorch, OpenCV, MediaPipe) are quarantined in `ml/colab-requirements.txt` and run exclusively on Google Colab.
