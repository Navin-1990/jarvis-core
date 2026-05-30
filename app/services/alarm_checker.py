import asyncio
from datetime import datetime

from app.core.events import event_bus
from app.memory import long_term


_fired_alarms: set[int] = set()


async def alarm_check_loop():
    while True:
        try:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            alarms = long_term.get_alarms(enabled_only=True)
            for alarm in alarms:
                alarm_id = alarm["id"]
                alarm_time = alarm["time"][:5]
                if alarm_time == current_time and alarm_id not in _fired_alarms:
                    _fired_alarms.add(alarm_id)
                    await event_bus.emit_simple(
                        "alarm_triggered",
                        agent="assistant",
                        message=f"ALARM: {alarm['label']} ({alarm_time})",
                        data={"alarm": alarm},
                    )
                    repeat = alarm.get("repeat_days", "")
                    if not repeat:
                        long_term.toggle_alarm(alarm_id, enabled=False)

            stale = {aid for aid in _fired_alarms
                     if not any(a["id"] == aid and a["time"][:5] == current_time
                                for a in alarms)}
            _fired_alarms.difference_update(stale)
        except Exception:
            pass
        await asyncio.sleep(15)
