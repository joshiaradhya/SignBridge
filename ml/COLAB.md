# Google Colab setup

Run this before importing the dataset helpers. It deliberately imports the
repository's local `ml` package, rather than a similarly named third-party
package that may already be installed in Colab.

```python
!git clone https://github.com/joshiaradhya/SignBridge.git /content/SignBridge
%cd /content/SignBridge
!pip install -r ml/requirements.txt

import sys
sys.path.insert(0, "/content/SignBridge")

from pathlib import Path
from ml.signbridge.datasets import prepare_include_manifest, verify_signer_isolation
```

Place extracted source videos outside Git at `data/include50/`. For a true
signer-independent evaluation, put a `metadata.csv` in that directory with
these columns:

```csv
video_path,label,signer_id
HELLO/signer_01_take_1.mp4,HELLO,01
```

Then build the manifest:

```python
include_dir = Path("data/include50")
manifest = prepare_include_manifest(include_dir, val_ratio=0.15, test_ratio=0.15)
valid, message = verify_signer_isolation(manifest)
print(message)
assert valid
manifest.save(Path("data/manifests/include50_manifest.json"))
```
