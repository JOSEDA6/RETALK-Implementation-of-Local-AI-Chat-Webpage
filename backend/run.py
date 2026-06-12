"""RETALK 打包后入口文件"""

from app.main import app
import uvicorn
import webbrowser
import threading


def _open_browser():
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    threading.Timer(1.5, _open_browser).start()
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
