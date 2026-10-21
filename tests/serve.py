from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class CatalogHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        relative = path.lstrip('/') or 'index.html'
        target = (ROOT / relative).resolve()
        permitted = relative in ('index.html', 'style.css') or (
            relative.startswith('image/')
            and target.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico')
        )
        if not permitted or not target.is_relative_to(ROOT) or not target.is_file():
            self.send_error(404)
            return None
        return super().send_head()

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 18773), CatalogHandler).serve_forever()
