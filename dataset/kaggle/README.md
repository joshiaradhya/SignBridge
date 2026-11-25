# SignBridge on Kaggle

Use Kaggle only after attaching the authorised INCLUDE-50 or ASL-Citizen dataset to the notebook. Kaggle input is read-only (`/kaggle/input`); outputs go to `/kaggle/working/signbridge`. GPU availability and weekly quota are not guaranteed: run `inspect`, `filter`, then `smoke` before any full training.

1. Create a Kaggle account, create a Notebook, attach the authorised dataset in the right panel, and select **Accelerator → GPU** if available.
2. Enable Internet only when installing dependencies or cloning the repository. Do not use it to bypass a dataset licence.
3. Clone and install:

```bash
!git clone https://github.com/joshiaradhya/SignBridge.git /kaggle/working/SignBridge
%cd /kaggle/working/SignBridge
!pip install -q -r ml/colab-requirements.txt
```

4. Discover the attachment, then filter it. Replace paths with those printed by `inspect`:

```bash
python dataset/kaggle/setup.py inspect --language ISL
python dataset/kaggle/setup.py filter --language ISL \
  --metadata /kaggle/input/your-dataset/metadata.csv \
  --archive /kaggle/input/your-dataset/videos.zip
python dataset/kaggle/setup.py prepare --language ISL \
  --source-dir /kaggle/working/signbridge/isl/raw \
  --metadata /kaggle/input/your-dataset/metadata.csv
python dataset/kaggle/setup.py landmarks --language ISL
python dataset/kaggle/setup.py smoke --language ISL
```

`smoke` validates the filtered manifest, landmark archive, split loaders, and one batch. It does **not** train. Only after it passes should you use a small, deliberate run:

```bash
python dataset/kaggle/setup.py train --language ISL --full-train --epochs 12 --batch-size 16
python dataset/kaggle/setup.py evaluate --language ISL \
  --checkpoint /kaggle/working/signbridge/isl/training/checkpoints/best_model.pt
python dataset/kaggle/setup.py export --language ISL \
  --checkpoint /kaggle/working/signbridge/isl/training/checkpoints/best_model.pt
```

If a checkpoint is attached, skip training: run `smoke`, `evaluate`, and `export` with that checkpoint. The exported ZIP is written to `/kaggle/working/signbridge_export/`; use **Save Version** to preserve it, then download the ZIP. Validate metadata labels against the existing `public/models/<language>-metadata.json` before replacing any deployed model. Never overwrite the deployed metadata or add an ONNX file to Git before that validation.

The old numbered notebooks map to: 01 preparation, 02 optional YOLO detection (not needed for landmark recognition), 03 landmarks, 04 training, and 05 evaluation/export. For the presentation, only the master Kaggle notebook plus an existing checkpoint (if supplied) is necessary.
