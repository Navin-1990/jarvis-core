import subprocess

from app.core.logger import Logger


class TerminalTool:

    @staticmethod
    def run(command: str, cwd: str | None = None, timeout: int = 30) -> dict:
        Logger.step(f"Running: {command}")
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True,
                text=True, timeout=timeout, cwd=cwd,
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "return_code": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Command timed out after {timeout}s",
                "return_code": -1,
            }
        except Exception as e:
            return {
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "return_code": -1,
            }
