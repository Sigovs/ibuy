#!/usr/bin/env python3
"""
Сборка одностраничного превью: всё в одном файле.

Превью-хостинг режет любые внешние запросы (CSP): ни Google Fonts, ни отдельных
CSS/JS, ни картинок по ссылке. Поэтому здесь:

  · CSS  — вклеивается в <style>
  · JS   — три ES-модуля склеиваются в один классический скрипт
           (import/export вырезаются: без сервера модули не разрешатся)
  · шрифты — скачиваются с Google Fonts и вшиваются в @font-face как base64
  · картинки — пережимаются и вшиваются как data: URI

    python3 04-build/bundle.py
"""

import base64
import io
import re
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent
OUT = ROOT.parent / "03-design" / "preview.html"        # полный документ
ARTIFACT = ROOT.parent / "03-design" / "preview-embed.html"  # без обёрток, под хостинг

CSS = ["css/tokens.css", "css/base.css", "css/sections/hero.css",
       "css/sections/network.css", "css/sections/process.css"]

# Порядок важен: us-map отдаёт данные, network их использует, main всё запускает.
JS = ["js/us-map.js", "js/network.js", "js/main.js"]

# Ширина и качество, до которых ужимаем перед вшиванием.
# Оригиналы тяжёлые (герой — 1.75 МБ), а весь файл должен остаться шаримым.
IMG_MAX = {
    "assets/img/hero-lineup.jpg": (1280, 72),
    "assets/img/process/step-01-garage.jpg": (640, 74),
    "assets/img/process/step-02-driveway.jpg": (640, 74),
    "assets/img/process/step-03-collected.jpg": (640, 74),
}

FONT_CSS = ("https://fonts.googleapis.com/css2"
            "?family=Antonio:wght@400;600;700"
            "&family=Archivo:wght@400;500;600"
            "&family=JetBrains+Mono:wght@400;500"
            "&display=swap")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def fetch(url: str) -> bytes:
    return subprocess.run(
        ["curl", "-sL", "-A", UA, url], capture_output=True, check=True
    ).stdout


def data_uri(path: Path) -> str:
    """Картинка -> data: URI. Тяжёлые пережимаем."""
    rel = str(path.relative_to(ROOT))
    if rel in IMG_MAX:
        width, quality = IMG_MAX[rel]
        im = Image.open(path).convert("RGB")
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
        raw, mime = buf.getvalue(), "image/jpeg"
    else:
        raw = path.read_bytes()
        mime = "image/png" if path.suffix == ".png" else "image/jpeg"
        if path.suffix == ".svg":
            mime = "image/svg+xml"
    return f"data:{mime};base64," + base64.b64encode(raw).decode()


def inline_fonts() -> str:
    """@font-face с вшитыми woff2. Без этого превью останется без шрифтов."""
    css = fetch(FONT_CSS).decode()
    for url in sorted(set(re.findall(r"url\((https://[^)]+\.woff2)\)", css))):
        b64 = base64.b64encode(fetch(url)).decode()
        css = css.replace(url, f"data:font/woff2;base64,{b64}")
    return css


def main() -> None:
    html = (ROOT / "index.html").read_text()

    # --- шрифты + CSS ---
    styles = [inline_fonts()]
    for f in CSS:
        styles.append(f"/* ===== {f} ===== */\n" + (ROOT / f).read_text())

    html = re.sub(r'\s*<link rel="preconnect"[^>]*>', "", html)
    html = re.sub(r'\s*<link href="https://fonts\.googleapis[^>]*>', "", html)
    html = re.sub(r'\s*<link rel="stylesheet" href="css/[^"]+">', "", html)
    html = html.replace("</head>", "<style>\n" + "\n".join(styles) + "\n</style>\n</head>")

    # --- JS: три модуля -> один классический скрипт ---
    js = []
    for f in JS:
        src = (ROOT / f).read_text()
        src = re.sub(r"^\s*import .*?;\s*$", "", src, flags=re.M)   # импорты не разрешатся
        src = re.sub(r"^\s*export ", "", src, flags=re.M)           # export вне модуля — синтаксическая ошибка
        js.append(f"/* ===== {f} ===== */\n" + src)

    # Лямбда, а не строка: в коде есть \D, \d и прочие — re.sub принял бы их
    # за escape-последовательности в шаблоне замены и упал.
    bundle = "<script>\n" + "\n".join(js) + "\n</script>"
    html = re.sub(r'<script type="module" src="js/main\.js"></script>',
                  lambda _: bundle, html)

    # --- картинки ---
    for m in sorted(set(re.findall(r'src="(assets/img/[^"]+)"', html))):
        html = html.replace(f'src="{m}"', f'src="{data_uri(ROOT / m)}"')
    for m in sorted(set(re.findall(r'poster="(assets/img/[^"]+)"', html))):
        html = html.replace(f'poster="{m}"', f'poster="{data_uri(ROOT / m)}"')

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html)

    # --- версия под превью-хостинг ---
    # Он сам оборачивает файл в <!doctype><html><head></head><body>, поэтому
    # свои обёртки надо снять — иначе документ вложится в документ.
    # Содержимое <head> (title + вшитые стили) переносим в начало тела:
    # браузер поднимет <title> в head сам.
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)

    title = re.search(r"<title>.*?</title>", head, re.S).group(0)
    style = re.search(r"<style>.*?</style>", head, re.S).group(0)

    embed = ARTIFACT.write_text(f"{title}\n{style}\n{body}")
    print(f"{OUT}       —  {len(html)/1024:.0f} КБ  (полный документ)")
    print(f"{ARTIFACT}  —  {ARTIFACT.stat().st_size/1024:.0f} КБ  (под превью-хостинг)")

    left = re.findall(r'(?:src|href|poster)="(?!data:|#|tel:|/)([^"]+)"', html)
    print("внешних ссылок:", left or "нет")


if __name__ == "__main__":
    main()
