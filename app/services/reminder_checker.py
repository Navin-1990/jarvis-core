import asyncio
from datetime import datetime, timedelta
from typing import Set

from app.core.events import event_bus
from app.core.logger import Logger
from app.memory import long_term


class ReminderSystem:
    """Improved reminder system with proper scheduling and one-time notifications."""
    
    def __init__(self) -> None:
        self._triggered_today: Set[str] = set()  # Track daily reminders to prevent spam
        self._last_reset: datetime = datetime.now()
    
    def _should_trigger(self, reminder: dict) -> bool:
        """Determine if a reminder should trigger (prevents duplicate notifications)."""
        reminder_id = reminder.get('id')
        recurring = reminder.get('recurring', '')
        
        # For non-recurring reminders, mark as triggered
        if not recurring or recurring == 'once':
            return True
        
        # For daily reminders, only trigger once per day
        if recurring in ('daily', 'every_day'):
            today_key = f"{reminder_id}_{datetime.now().date()}"
            if today_key in self._triggered_today:
                return False
            self._triggered_today.add(today_key)
            return True
        
        # For weekly reminders, only trigger once per week
        if recurring in ('weekly', 'every_week'):
            week_key = f"{reminder_id}_{datetime.now().isocalendar()[1]}"
            if week_key in self._triggered_today:
                return False
            self._triggered_today.add(week_key)
            return True
        
        # For one-time reminders, trigger and mark complete
        return True
    
    def _advance_recurring(self, reminder: dict) -> None:
        """Advance the due_at time for recurring reminders."""
        reminder_id = reminder['id']
        recurring = reminder.get('recurring', '')
        current_due = datetime.fromisoformat(reminder['due_at']) if isinstance(reminder['due_at'], str) else reminder['due_at']
        
        new_due: datetime | None = None
        
        if recurring in ('daily', 'every_day'):
            new_due = current_due + timedelta(days=1)
        elif recurring in ('weekly', 'every_week'):
            new_due = current_due + timedelta(weeks=1)
        elif recurring == 'monthly':
            # Simple monthly advancement
            month = current_due.month + 1
            year = current_due.year
            if month > 12:
                month = 1
                year += 1
            try:
                new_due = current_due.replace(month=month, year=year)
            except ValueError:
                new_due = current_due + timedelta(days=30)
        
        if new_due:
            long_term.advance_reminder(reminder_id, new_due)
            Logger.info(f"Advanced reminder {reminder_id} to {new_due}")
    
    async def process_due_reminders(self) -> None:
        """Process all due reminders with proper scheduling."""
        try:
            due = long_term.get_due_reminders()
            
            for r in due:
                if not self._should_trigger(r):
                    continue
                
                # Build notification message
                reminder_data = {
                    'id': r['id'],
                    'title': r['title'],
                    'description': r.get('description', ''),
                    'priority': r.get('priority', 'medium'),
                    'recurring': r.get('recurring', ''),
                    'due_at': r.get('due_at'),
                    'triggered_at': datetime.now().isoformat(),
                }
                
                # Build announcement message
                recurring_text = ""
                if r.get('recurring'):
                    if r['recurring'] in ('daily', 'every_day'):
                        recurring_text = "Daily reminder: "
                    elif r['recurring'] in ('weekly', 'every_week'):
                        recurring_text = "Weekly reminder: "
                
                announcement = f"Sir, {recurring_text}{r['title']}"
                if r.get('description'):
                    announcement += f". {r['description']}"
                
                # Emit reminder event
                await event_bus.emit_simple(
                    "reminder_due",
                    agent="assistant",
                    message=f"REMINDER: {r['title']}",
                    data={"reminder": reminder_data, "announcement": announcement},
                )
                
                # Handle recurring reminders
                recurring = r.get('recurring', '')
                if recurring and recurring != 'once':
                    self._advance_recurring(r)
                else:
                    # Mark one-time reminders as completed
                    long_term.complete_reminder(r['id'])
                    Logger.info(f"Completed one-time reminder: {r['title']}")
                
        except Exception as e:
            Logger.error(f"Error processing reminders: {e}")
    
    def reset_daily_tracking(self) -> None:
        """Reset daily tracking at midnight."""
        now = datetime.now()
        if now.date() > self._last_reset.date():
            self._triggered_today.clear()
            self._last_reset = now
            Logger.info("Reset daily reminder tracking")


# Singleton instance
_reminder_system = ReminderSystem()


async def reminder_check_loop():
    """Main reminder check loop."""
    Logger.info("Reminder check loop started")
    
    while True:
        try:
            # Reset daily tracking if needed
            _reminder_system.reset_daily_tracking()
            
            # Process due reminders
            await _reminder_system.process_due_reminders()
            
        except Exception as e:
            Logger.error(f"Reminder check error: {e}")
        
        # Check every 30 seconds for responsiveness
        await asyncio.sleep(30)
