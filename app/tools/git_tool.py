from app.tools.terminal_tool import TerminalTool


class GitTool:

    @staticmethod
    def init(path: str) -> dict:
        return TerminalTool.run("git init", cwd=path)

    @staticmethod
    def add_all(path: str) -> dict:
        return TerminalTool.run("git add -A", cwd=path)

    @staticmethod
    def commit(path: str, message: str) -> dict:
        return TerminalTool.run(f'git commit -m "{message}"', cwd=path)

    @staticmethod
    def status(path: str) -> dict:
        return TerminalTool.run("git status", cwd=path)

    @staticmethod
    def log(path: str, count: int = 10) -> dict:
        return TerminalTool.run(f"git log --oneline -n {count}", cwd=path)
