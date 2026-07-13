#!/usr/bin/env python3
"""
Дев-сервер для сборки iBuy.

Обычный `python3 -m http.server` не шлёт Cache-Control, и Chromium начинает
кэшировать по эвристике. ES-модули он держит особенно цепко: правишь network.js,
перезагружаешь — а в странице по-прежнему старый код. На это уже дважды ушло
время (сначала со стилями, потом с модулем карты).

Здесь на каждый ответ ставится no-store. Только для разработки.

    python3 04-build/serve.py [порт]
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # тишина в консоли


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    handler = partial(NoCacheHandler, directory=str(ROOT))
    print(f"iBuy dev — http://localhost:{port}  (no-store)")
    ThreadingHTTPServer(("", port), handler).serve_forever()
