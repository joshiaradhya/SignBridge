# SignBridge selective dataset pipeline

`config/target_signs.json` is the shared vocabulary contract. It records the full Learn curriculum, language-specific labels, normalisation aliases, and the classes presently exposed by each browser recognition model. Do not add a class to training simply because its spelling resembles another label: ASL and ISL entries are language-scoped and may use different signs.

The two recognition sources are INCLUDE-50 (ISL, CC BY 4.0) and ASL-Citizen (ASL, academic research use). Their licensed provider downloads are not committed to Git. The pipeline deliberately requires an authorised local archive or source directory; it reads metadata first and extracts only video members whose labels match `trained_classes`.

## Colab quick start

```python
from google.colab import drive
drive.mount('/content/drive')
!git clone https://github.com/joshiaradhya/SignBridge.git /content/SignBridge
%cd /content/SignBridge
!pip install -q -r ml/colab-requirements.txt
```

Place the provider-authorised archive and metadata in Drive, then inspect before extracting:

```bash
python dataset/prepare_dataset.py inspect --language ISL \
  --metadata /content/drive/MyDrive/SignBridge_Data/include50/metadata.csv \
  --work-dir /content/drive/MyDrive/SignBridge_Data/processed

python dataset/prepare_dataset.py acquire --language ISL \
  --metadata /content/drive/MyDrive/SignBridge_Data/include50/metadata.csv \
  --archive /content/drive/MyDrive/SignBridge_Data/include50/official.zip \
  --source-dir /content/include50_selected \
  --work-dir /content/drive/MyDrive/SignBridge_Data/processed

python dataset/prepare_dataset.py all --language ISL \
  --metadata /content/drive/MyDrive/SignBridge_Data/include50/metadata.csv \
  --archive /content/drive/MyDrive/SignBridge_Data/include50/official.zip \
  --source-dir /content/include50_selected \
  --work-dir /content/drive/MyDrive/SignBridge_Data/processed
```

Run the same commands with `--language ASL` and ASL-Citizen's metadata. Use Colab's `/content` for selected raw video (fast temporary storage) and Drive for `processed/`, checkpoints, and exported models. `--incremental` documents the default restart-safe mode: `acquire` skips validated files already extracted; `extract` reuses a feature cache newer than the cleaned manifest; checkpoints are resumed by the trainer.

## Outputs and quality checks

For each language the pipeline writes `inspection.json`, signer-independent `manifest.json`, `manifest.cleaned.json`, compressed `landmarks.npz`, and `dataset_report.json`. Cleaning rejects absent, empty, duplicate (path/size/mtime fingerprint), and unreadable videos. Feature extraction rejects sequences with fewer than eight readable frames. Split assignment happens before augmentation and remains signer-independent.

The pipeline cannot selectively download from a provider that offers only a single opaque archive over HTTP; in that case it avoids extraction of unwanted members, but the archive itself must still be supplied. This is a provider limitation, not a reason to silently download the full corpus. No baseline storage, RAM, training time, or accuracy figures are claimed here because this repository contains no raw authorised dataset or trained ONNX weights to measure.

## Notebook order

1. `01_dataset_preparation.ipynb` — use this command first.
2. `02_yolo_detection.ipynb` — optional detector work, using only cleaned manifest videos.
3. `03_mediapipe_extraction.ipynb` — or `prepare_dataset.py extract`.
4. `04_temporal_training.ipynb` — cached landmarks, mixed precision on CUDA, resumable checkpoints.
5. `05_onnx_export_validation.ipynb` — export only after held-out evaluation.

`00_master_training_pipeline.ipynb` remains the convenient wrapper; it should point each stage at the same Drive `processed/` directory instead of downloading data again.
