import json
import shutil
from pathlib import Path

from app.core.events import event_bus
from app.core.llm import LocalLLM
from app.core.logger import Logger
from app.memory import long_term


class FileAgent:

    def __init__(self) -> None:
        self.llm = LocalLLM()

    async def execute(self, user_request: str) -> dict:
        await event_bus.emit_simple(
            "agent_started", agent="file",
            message=f"Processing file command: {user_request}",
        )

        intent = self._parse_intent(user_request)
        action = intent.get("action", "")

        handlers = {
            "create_folder": self._create_folder,
            "delete_folder": self._delete_folder,
            "create_file": self._create_file,
            "read_file": self._read_file,
            "write_file": self._write_file,
            "move": self._move,
            "rename": self._rename,
            "list_dir": self._list_dir,
            "delete_file": self._delete_file,
        }

        handler = handlers.get(action)
        if not handler:
            result = {"success": False, "response": f"Unknown file action: {action}"}
        else:
            result = handler(intent)

        await event_bus.emit_simple(
            "agent_completed", agent="file",
            message=result.get("response", ""),
        )

        long_term.log_agent_action(
            agent="file", action=action,
            input_data=user_request,
            output_data=result.get("response", ""),
            success=result.get("success", True),
        )

        return result

    def _parse_intent(self, user_request: str) -> dict:
        prompt = f"""You are Jarvis File Manager. Parse the file operation.

User Request: {user_request}

Available actions:
- create_folder (path)
- delete_folder (path)
- create_file (path, content)
- read_file (path)
- write_file (path, content)
- move (source, destination)
- rename (path, new_name)
- list_dir (path)
- delete_file (path)

Return ONLY JSON.
Example:
{{"action": "create_folder", "path": "/home/user/documents/project"}}
{{"action": "create_file", "path": "hello.txt", "content": "Hello World"}}"""

        try:
            response = self.llm.ask(prompt)
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {"action": "list_dir", "path": "."}

    def _create_folder(self, intent: dict) -> dict:
        path = Path(intent.get("path", ""))
        path.mkdir(parents=True, exist_ok=True)
        Logger.success(f"Created folder: {path}")
        return {"success": True, "response": f"Folder created: {path}"}

    def _delete_folder(self, intent: dict) -> dict:
        path = Path(intent.get("path", ""))
        if path.exists():
            shutil.rmtree(path)
            Logger.success(f"Deleted folder: {path}")
            return {"success": True, "response": f"Folder deleted: {path}"}
        return {"success": False, "response": f"Folder not found: {path}"}

    def _create_file(self, intent: dict) -> dict:
        path = Path(intent.get("path", ""))
        content = intent.get("content", "")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        Logger.success(f"Created file: {path}")
        return {"success": True, "response": f"File created: {path}"}

    def _read_file(self, intent: dict) -> dict:
        path = Path(intent.get("path", ""))
        if path.exists():
            content = path.read_text(encoding="utf-8")
            return {"success": True, "response": content, "data": {"content": content}}
        return {"success": False, "response": f"File not found: {path}"}

    def _write_file(self, intent: dict) -> dict:
        path = Path(intent.get("path", ""))
        content = intent.get("content", "")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        Logger.success(f"Written to file: {path}")
        return {"success": True, "response": f"File updated: {path}"}

    def _move(self, intent: dict) -> dict:
        source = Path(intent.get("source", ""))
        dest = Path(intent.get("destination", ""))
        if source.exists():
            shutil.move(str(source), str(dest))
            Logger.success(f"Moved {source} → {dest}")
            return {"success": True, "response": f"Moved {source} to {dest}"}
        return {"success": False, "response": f"Source not found: {source}"}

    def _rename(self, intent: dict) -> dict:
        path = Path(intent.get("path", ""))
        new_name = intent.get("new_name", "")
        if path.exists() and new_name:
            new_path = path.parent / new_name
            path.rename(new_path)
            Logger.success(f"Renamed {path} → {new_path}")
            return {"success": True, "response": f"Renamed to {new_path}"}
        return {"success": False, "response": f"Cannot rename: {path}"}

    def _list_dir(self, intent: dict) -> dict:
        path = Path(intent.get("path", "."))
        if path.exists():
            items = sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name))
            listing = []
            for item in items:
                prefix = "📁" if item.is_dir() else "📄"
                listing.append(f"  {prefix} {item.name}")
            return {
                "success": True,
                "response": f"Contents of {path}:\n" + "\n".join(listing),
                "data": {"items": [str(i) for i in items]},
            }
        return {"success": False, "response": f"Directory not found: {path}"}

    def _delete_file(self, intent: dict) -> dict:
        path = Path(intent.get("path", ""))
        if path.exists():
            path.unlink()
            Logger.success(f"Deleted file: {path}")
            return {"success": True, "response": f"File deleted: {path}"}
        return {"success": False, "response": f"File not found: {path}"}
