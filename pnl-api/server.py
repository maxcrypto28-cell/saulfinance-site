#!/usr/bin/env python3
"""Tiny public JSON feed for saulfinance.ca daily PNL. No secrets in responses."""
from __future__ import annotations

import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

PORT = int(os.environ.get("PORT", "10000"))
PUBLISH_TOKEN = os.environ.get("PNL_PUBLISH_TOKEN", "")
STATE_PATH = Path(os.environ.get("PNL_STATE_PATH", str(Path(__file__).resolve().parent / "state-daily-pnl.json")))
LOCK = threading.Lock()
DEFAULT = {
    "date": None,
    "price_as_of": None,
    "day_change_cad": None,
    "day_change_pct": None,
    "basis": "PLANNED model",
    "generated_at": None,
    "session": "closed",
    "delayed": False,
    "updated_et": None,
}


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            return json.loads(STATE_PATH.read_text())
        except Exception:
            pass
    return dict(DEFAULT)


def save_state(data: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(data, separators=(",", ":")) + "\n")


class Handler(BaseHTTPRequestHandler):
    server_version = "saul-pnl/1"

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        print("%s - %s" % (self.address_string(), fmt % args), file=sys_stderr)

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path in ("/daily-pnl.json", "/data/daily-pnl.json", "/"):
            with LOCK:
                body = json.dumps(load_state(), separators=(",", ":")).encode()
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/healthz":
            body = b'{"ok":true}'
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self._cors()
        self.end_headers()

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path not in ("/daily-pnl.json", "/data/daily-pnl.json"):
            self.send_response(404)
            self._cors()
            self.end_headers()
            return
        auth = self.headers.get("Authorization", "")
        expected = f"Bearer {PUBLISH_TOKEN}" if PUBLISH_TOKEN else ""
        if not PUBLISH_TOKEN or auth != expected:
            self.send_response(401)
            self._cors()
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8"))
            if not isinstance(data, dict):
                raise ValueError("object required")
        except Exception:
            self.send_response(400)
            self._cors()
            self.end_headers()
            return
        # Public-safe allowlist only
        allowed = {
            "date",
            "price_as_of",
            "day_change_cad",
            "day_change_pct",
            "basis",
            "generated_at",
            "session",
            "delayed",
            "updated_et",
        }
        clean = {k: data.get(k) for k in allowed}
        with LOCK:
            save_state(clean)
        body = json.dumps({"ok": True}).encode()
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)



def _apply_seed(data: dict, source: str) -> bool:
    """Write seed payload. Boot is single-threaded; do not take LOCK here."""
    if not isinstance(data, dict) or data.get("day_change_cad") is None:
        return False
    save_state({k: data.get(k) for k in DEFAULT.keys()})
    print("seeded from", source, flush=True)
    return True


def seed_state() -> None:
    """Best-effort seed so a fresh deploy is not empty until the box loop POSTs.

    Must never nest LOCK: threading.Lock is not reentrant, and holding LOCK
    while seeding previously deadlocked boot so Render never saw an open port.
    """
    local = Path(__file__).resolve().parent.parent / "data" / "daily-pnl.json"
    if local.exists():
        try:
            if _apply_seed(json.loads(local.read_text()), str(local)):
                return
        except Exception as e:
            print("local seed skipped:", e, flush=True)
    url = os.environ.get(
        "PNL_SEED_URL",
        "https://raw.githubusercontent.com/maxcrypto28-cell/saulfinance-site/pnl-data/data/daily-pnl.json",
    )
    try:
        req = __import__("urllib.request").request.Request(url, headers={"User-Agent": "saul-pnl-seed/1"})
        with __import__("urllib.request").request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        _apply_seed(data, url)
    except Exception as e:
        print("remote seed skipped:", e, flush=True)


def main() -> None:
    # Seed before binding; never hold LOCK across seed (non-reentrant Lock).
    if not STATE_PATH.exists():
        save_state(dict(DEFAULT))
        seed_state()
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"saul-pnl listening on :{PORT}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
