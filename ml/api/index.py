"""Internal Vercel service reserved for server-side ML inference.

Inference remains browser-local until a vetted trained model is available. Keeping this
endpoint dependency-free prevents the offline MediaPipe/OpenCV training stack from being
bundled into a Vercel Function before it is needed.
"""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        if self.path.rstrip("/") not in {"", "/health"}:
            self._respond(404, {"error": "Not found"})
            return
        self._respond(
            200,
            {
                "service": "signbridge-ml",
                "status": "ready",
                "inference": "browser-local",
                "model": "pending-training",
            },
        )

    def _respond(self, status: int, body: dict[str, str]) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
