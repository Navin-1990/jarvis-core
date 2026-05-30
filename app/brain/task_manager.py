from app.core.events import event_bus
from app.memory import long_term


class TaskManager:

    async def create_task(self, title: str, description: str = "", agent: str = "") -> dict:
        task_id = long_term.create_task(title=title, description=description, agent=agent)
        await event_bus.emit_simple(
            "task_created", agent=agent,
            message=f"Task created: {title}",
            data={"task_id": task_id},
        )
        return {"task_id": task_id, "title": title, "status": "pending"}

    async def update_task(self, task_id: int, status: str, result: str = "") -> dict:
        long_term.update_task(task_id, status=status, result=result)
        await event_bus.emit_simple(
            "task_updated", message=f"Task {task_id}: {status}",
            data={"task_id": task_id, "status": status},
        )
        return {"task_id": task_id, "status": status}

    def get_pending_tasks(self) -> list[dict]:
        return long_term.get_tasks(status="pending")

    def get_all_tasks(self) -> list[dict]:
        return long_term.get_tasks()
