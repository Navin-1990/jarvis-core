import asyncio

from app.core.events import event_bus
from app.memory import long_term


async def reminder_check_loop():
    while True:
        try:
            due = long_term.get_due_reminders()
            for r in due:
                await event_bus.emit_simple(
                    "reminder_due",
                    agent="assistant",
                    message=f"REMINDER: {r['title']}",
                    data={"reminder": r},
                )
        except Exception:
            pass
        await asyncio.sleep(30)
