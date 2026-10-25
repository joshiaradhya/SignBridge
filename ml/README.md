# ISL model training

This is a real, local landmark-sequence classifier—not a motion heuristic. It is deliberately
small enough to run in the browser during a SignConnect call.

1. Obtain and review the terms for INCLUDE or INCLUDE-50. Do **not** commit source videos.
2. Arrange videos as `data/include50/<GLOSS>/<video-file>`.
3. Create an isolated environment and install dependencies: `python -m pip install -r ml/training-requirements.txt`.
4. Extract landmarks: `python ml/extract_isl_landmarks.py data/include50`.
5. Train and export the browser asset: `python ml/train_isl.py data/isl-landmarks.npz`.

The last step writes `public/models/isl-v1.json`. The app loads it automatically. Until that
artifact exists, the live transcript intentionally emits no guessed labels.

For production, validate on signers not used for training, inspect per-class precision/recall,
and only ship labels that match the app's ISL lesson vocabulary. ASL must be trained separately
from ASLLVD with a distinct `asl-v1.json` model; do not combine the languages.

## Vercel service

`ml/api/index.py` is a dependency-free internal Vercel service that exposes only a health and
model-status response. Training packages (MediaPipe, OpenCV) live in
`ml/training-requirements.txt` and must not be installed into the function — they push the
bundle over Vercel's 500 MB Python limit. The stub uses an empty `ml/api/requirements.txt` so
the builder does not walk up and pick the training file.

It intentionally does **not** receive camera video or run inference yet: the app continues to
classify landmarks in the browser. When a validated server-side model is ready, add a binding
from the `app` service and call the injected internal service URL only from server-side code.
