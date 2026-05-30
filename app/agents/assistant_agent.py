import json
from datetime import datetime, timedelta

from app.core.events import event_bus
from app.core.llm import LocalLLM
from app.memory import long_term


class AssistantAgent:

    def __init__(self) -> None:
        self.llm = LocalLLM()

    async def execute(self, user_request: str) -> dict:
        await event_bus.emit_simple(
            "agent_started", agent="assistant",
            message=f"Processing: {user_request}",
        )

        intent = self._parse_intent(user_request)
        action = intent.get("action", "chat")

        handlers = {
            "set_reminder": self._handle_set_reminder,
            "list_reminders": self._handle_list_reminders,
            "complete_reminder": self._handle_complete_reminder,
            "add_calendar_event": self._handle_add_calendar,
            "list_calendar": self._handle_list_calendar,
            "log_health": self._handle_log_health,
            "health_summary": self._handle_health_summary,
            "daily_summary": self._handle_daily_summary,
            "chat": self._handle_chat,
        }

        handler = handlers.get(action, self._handle_chat)
        result = await handler(user_request, intent)

        await event_bus.emit_simple(
            "agent_completed", agent="assistant",
            message=result.get("response", ""),
        )

        long_term.log_agent_action(
            agent="assistant", action=action,
            input_data=user_request,
            output_data=result.get("response", ""),
            success=result.get("success", True),
        )

        return result

    def _parse_intent(self, user_request: str) -> dict:
        prompt = f"""You are Jarvis Assistant. Parse the user request into an action.

User Request: {user_request}

Available actions:
- set_reminder: Set a reminder (extract title, due_at as ISO format, priority)
- list_reminders: List all reminders
- complete_reminder: Mark a reminder as done (extract reminder_id)
- add_calendar_event: Add calendar event (extract title, start_at, end_at, location)
- list_calendar: List calendar events
- log_health: Log health data (extract category: food/exercise/weight/sleep/water/mood, value, notes)
- health_summary: Get health summary
- daily_summary: Get daily summary of all activities
- chat: General conversation

Return ONLY JSON. Example:
{{"action": "set_reminder", "title": "Team meeting", "due_at": "2025-01-15T10:00:00", "priority": "high"}}
{{"action": "log_health", "category": "food", "value": "Oatmeal with fruits", "notes": "Breakfast"}}
{{"action": "chat"}}"""

        try:
            response = self.llm.ask(prompt)
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {"action": "chat"}

    async def _handle_set_reminder(self, request: str, intent: dict) -> dict:
        title = intent.get("title", "Untitled Reminder")
        due_at_str = intent.get("due_at", "")
        priority = intent.get("priority", "medium")

        try:
            due_at = datetime.fromisoformat(due_at_str) if due_at_str else datetime.now() + timedelta(hours=1)
        except ValueError:
            due_at = datetime.now() + timedelta(hours=1)

        reminder_id = long_term.create_reminder(
            title=title,
            description=intent.get("description", ""),
            due_at=due_at,
            priority=priority,
        )

        await event_bus.emit_simple(
            "reminder_created", agent="assistant",
            message=f"Reminder set: {title}",
            data={"reminder_id": reminder_id, "due_at": due_at.isoformat()},
        )

        return {
            "success": True,
            "response": f"Reminder set: '{title}' due at {due_at.strftime('%B %d, %Y %I:%M %p')}.",
            "data": {"reminder_id": reminder_id},
        }

    async def _handle_list_reminders(self, request: str, intent: dict) -> dict:
        reminders = long_term.get_reminders()
        if not reminders:
            return {"success": True, "response": "You have no pending reminders."}

        lines = []
        for r in reminders:
            lines.append(
                f"  [{r['id']}] {r['title']} — due {r['due_at']} ({r['priority']})"
            )

        return {
            "success": True,
            "response": f"You have {len(reminders)} pending reminder(s):\n" + "\n".join(lines),
            "data": {"reminders": reminders},
        }

    async def _handle_complete_reminder(self, request: str, intent: dict) -> dict:
        reminder_id = intent.get("reminder_id")
        if not reminder_id:
            return {"success": False, "response": "Please specify which reminder to complete."}

        long_term.complete_reminder(int(reminder_id))
        return {
            "success": True,
            "response": f"Reminder {reminder_id} marked as completed.",
        }

    async def _handle_add_calendar(self, request: str, intent: dict) -> dict:
        title = intent.get("title", "Untitled Event")
        start_str = intent.get("start_at", "")
        end_str = intent.get("end_at", "")

        try:
            start_at = datetime.fromisoformat(start_str) if start_str else datetime.now() + timedelta(hours=1)
        except ValueError:
            start_at = datetime.now() + timedelta(hours=1)

        try:
            end_at = datetime.fromisoformat(end_str) if end_str else None
        except ValueError:
            end_at = None

        event_id = long_term.create_calendar_event(
            title=title,
            start_at=start_at,
            end_at=end_at,
            description=intent.get("description", ""),
            location=intent.get("location", ""),
        )

        await event_bus.emit_simple(
            "calendar_event_created", agent="assistant",
            message=f"Event added: {title}",
            data={"event_id": event_id},
        )

        return {
            "success": True,
            "response": f"Calendar event '{title}' added for {start_at.strftime('%B %d, %Y %I:%M %p')}.",
            "data": {"event_id": event_id},
        }

    async def _handle_list_calendar(self, request: str, intent: dict) -> dict:
        events = long_term.get_calendar_events()
        if not events:
            return {"success": True, "response": "No upcoming calendar events."}

        lines = []
        for e in events:
            loc = f" at {e['location']}" if e.get("location") else ""
            lines.append(f"  [{e['id']}] {e['title']} — {e['start_at']}{loc}")

        return {
            "success": True,
            "response": f"You have {len(events)} event(s):\n" + "\n".join(lines),
            "data": {"events": events},
        }

    async def _handle_log_health(self, request: str, intent: dict) -> dict:
        category = intent.get("category", "general")
        value = intent.get("value", request)
        notes = intent.get("notes", "")

        log_id = long_term.log_health(category=category, value=value, notes=notes)

        await event_bus.emit_simple(
            "health_logged", agent="assistant",
            message=f"Health logged: {category} — {value}",
            data={"log_id": log_id},
        )

        return {
            "success": True,
            "response": f"Logged {category}: {value}. {notes}".strip(),
            "data": {"log_id": log_id},
        }

    async def _handle_health_summary(self, request: str, intent: dict) -> dict:
        summary = long_term.get_health_summary()
        if not summary:
            return {"success": True, "response": "No health data logged yet."}

        lines = []
        for cat, info in summary.items():
            latest = info["latest"]
            lines.append(
                f"  {cat}: {latest['value']} (last logged: {latest['logged_at']}, "
                f"total entries: {info['total_entries']})"
            )

        return {
            "success": True,
            "response": "Health Summary:\n" + "\n".join(lines),
            "data": {"summary": summary},
        }

    async def _handle_daily_summary(self, request: str, intent: dict) -> dict:
        reminders = long_term.get_reminders()
        events = long_term.get_calendar_events()
        health = long_term.get_health_summary()
        tasks = long_term.get_tasks(status="pending")

        parts = [f"Good day, sir. Here is your daily summary for {datetime.now().strftime('%B %d, %Y')}:\n"]

        if reminders:
            parts.append(f"Reminders ({len(reminders)} pending):")
            for r in reminders[:5]:
                parts.append(f"  - {r['title']} (due: {r['due_at']})")

        if events:
            parts.append(f"\nCalendar ({len(events)} event(s)):")
            for e in events[:5]:
                parts.append(f"  - {e['title']} at {e['start_at']}")

        if health:
            parts.append("\nHealth:")
            for cat, info in health.items():
                parts.append(f"  - {cat}: {info['latest']['value']}")

        if tasks:
            parts.append(f"\nPending Tasks ({len(tasks)}):")
            for t in tasks[:5]:
                parts.append(f"  - {t['title']}")

        if len(parts) == 1:
            parts.append("No activities tracked yet. Start by setting reminders or logging your meals.")

        return {"success": True, "response": "\n".join(parts)}

    async def _handle_chat(self, request: str, intent: dict) -> dict:
        long_term.save_conversation(role="user", content=request, agent="assistant")

        response = self.llm.ask(
            f"""You are Jarvis, a helpful AI assistant inspired by Iron Man's JARVIS.
Be professional, concise, and helpful. Address the user as 'sir'.

User: {request}

Respond naturally."""
        )

        long_term.save_conversation(role="assistant", content=response, agent="assistant")

        return {"success": True, "response": response}
