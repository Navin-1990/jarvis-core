import subprocess
import sys

from app.core.logger import Logger


class BrowserTool:

    @staticmethod
    def open_url(url: str) -> dict:
        Logger.step(f"Opening URL: {url}")
        try:
            if sys.platform == "win32":
                subprocess.Popen(["start", url], shell=True)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", url])
            else:
                subprocess.Popen(["xdg-open", url])
            return {"success": True, "action": "open_url", "url": url}
        except Exception as e:
            return {"success": False, "error": str(e)}
