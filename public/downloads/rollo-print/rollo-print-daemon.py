#!/usr/bin/env python3
"""
Minimal local print relay for Rollo 3×2 on macOS.
Chrome window.print() cannot set CUPS media; lp can.

Health: GET http://127.0.0.1:3927/health
Print:  POST http://127.0.0.1:3927/print  { pngBase64, mediaSize? }
"""

from __future__ import annotations

import base64
import json
import os
import subprocess
import tempfile
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("ROLLO_PRINT_PORT", "3927"))
PRINTER_CACHE_TTL_SEC = 45

_printer_cache = ""
_printer_cache_at = 0.0


def default_printer(force_refresh: bool = False) -> str:
    global _printer_cache, _printer_cache_at
    now = time.monotonic()
    if (
        not force_refresh
        and _printer_cache
        and now - _printer_cache_at < PRINTER_CACHE_TTL_SEC
    ):
        return _printer_cache

    try:
        out = subprocess.check_output(["lpstat", "-d"], text=True)
        marker = "system default destination:"
        idx = out.lower().find(marker)
        if idx >= 0:
            _printer_cache = out[idx + len(marker) :].strip()
        else:
            _printer_cache = out.strip()
    except Exception:
        _printer_cache = ""

    _printer_cache_at = now
    return _printer_cache


def cups_media_args(media: str | None) -> list[str]:
    normalized = str(media or "3x2").strip().lower().replace(" ", "")
    if normalized in ("2x3", "2x3in"):
        return ["-o", "media=Custom.2x3in", "-o", "PageSize=Custom.2x3in"]
    return ["-o", "media=Custom.3x2in", "-o", "PageSize=Custom.3x2in"]


def print_png_file(file_path: str, media_size: str) -> None:
    printer = default_printer()
    args = [
        *cups_media_args(media_size),
        "-n",
        "1",
        "-o",
        "fit-to-page=false",
        "-o",
        "scaling=100",
    ]
    if printer:
        args.extend(["-d", printer])
    args.append(file_path)
    subprocess.check_call(["lp", *args])


class RolloHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path not in ("/", "/health"):
            self._json(404, {"ok": False, "error": "Not found"})
            return

        printer = default_printer(force_refresh=True)
        self._json(
            200,
            {
                "ok": True,
                "service": "rollo-print-daemon",
                "printer": printer or None,
                "port": PORT,
            },
        )

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        if path != "/print":
            self._json(404, {"ok": False, "error": "Not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        png_base64 = ""
        media_size = "3x2"

        try:
            data = json.loads(raw.decode("utf-8"))
            png_base64 = str(data.get("pngBase64", ""))
            media_size = str(data.get("mediaSize", "3x2"))
        except Exception:
            png_base64 = raw.decode("utf-8")

        if not png_base64:
            self._json(400, {"ok": False, "error": "pngBase64 required"})
            return

        temp_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as handle:
                handle.write(base64.b64decode(png_base64))
                temp_path = handle.name
            print_png_file(temp_path, media_size)
            self._json(200, {"ok": True})
        except Exception as err:
            self._json(500, {"ok": False, "error": str(err)})
        finally:
            if temp_path:
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass


def main() -> None:
    server = HTTPServer(("127.0.0.1", PORT), RolloHandler)
    print(f"Rollo print daemon listening on http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
