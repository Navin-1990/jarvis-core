from datetime import datetime

from app.memory.database import get_connection


# ── Conversations ────────────────────────────────────────

def save_conversation(role: str, content: str, agent: str = "") -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO conversations (role, content, agent) VALUES (?, ?, ?)",
        (role, content, agent),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_conversations(limit: int = 50) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM conversations ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Reminders ────────────────────────────────────────────

def create_reminder(
    title: str, description: str = "", due_at: datetime | None = None,
    priority: str = "medium", recurring: str = "",
) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO reminders (title, description, due_at, priority, recurring)
           VALUES (?, ?, ?, ?, ?)""",
        (title, description, due_at or datetime.now(), priority, recurring),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_reminders(include_completed: bool = False) -> list[dict]:
    conn = get_connection()
    query = "SELECT * FROM reminders"
    if not include_completed:
        query += " WHERE completed = 0"
    query += " ORDER BY due_at ASC"
    rows = conn.execute(query).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_due_reminders() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """SELECT * FROM reminders
           WHERE completed = 0 AND due_at <= datetime('now')
           ORDER BY due_at ASC""",
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def complete_reminder(reminder_id: int) -> bool:
    conn = get_connection()
    conn.execute(
        "UPDATE reminders SET completed = 1 WHERE id = ?",
        (reminder_id,),
    )
    conn.commit()
    conn.close()
    return True


def advance_reminder(reminder_id: int, new_due_at: datetime) -> bool:
    """Advance a recurring reminder to the next occurrence."""
    conn = get_connection()
    conn.execute(
        "UPDATE reminders SET due_at = ? WHERE id = ?",
        (new_due_at.isoformat(), reminder_id),
    )
    conn.commit()
    conn.close()
    return True


def delete_reminder(reminder_id: int) -> bool:
    conn = get_connection()
    conn.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
    conn.commit()
    conn.close()
    return True


# ── Calendar Events ──────────────────────────────────────

def create_calendar_event(
    title: str, start_at: datetime, end_at: datetime | None = None,
    description: str = "", location: str = "",
) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO calendar_events (title, description, start_at, end_at, location)
           VALUES (?, ?, ?, ?, ?)""",
        (title, description, start_at, end_at, location),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_calendar_events(
    from_date: datetime | None = None, to_date: datetime | None = None,
) -> list[dict]:
    conn = get_connection()
    query = "SELECT * FROM calendar_events"
    params: list = []
    conditions = []
    if from_date:
        conditions.append("start_at >= ?")
        params.append(from_date.isoformat())
    if to_date:
        conditions.append("start_at <= ?")
        params.append(to_date.isoformat())
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY start_at ASC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_calendar_event(event_id: int) -> bool:
    conn = get_connection()
    conn.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()
    return True


# ── Health Logs ──────────────────────────────────────────

def log_health(category: str, value: str, notes: str = "") -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO health_logs (category, value, notes) VALUES (?, ?, ?)",
        (category, value, notes),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_health_logs(
    category: str | None = None, limit: int = 50,
) -> list[dict]:
    conn = get_connection()
    query = "SELECT * FROM health_logs"
    params: list = []
    if category:
        query += " WHERE category = ?"
        params.append(category)
    query += " ORDER BY logged_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_health_summary() -> dict:
    conn = get_connection()
    categories = conn.execute(
        "SELECT DISTINCT category FROM health_logs",
    ).fetchall()
    summary = {}
    for row in categories:
        cat = row["category"]
        latest = conn.execute(
            "SELECT * FROM health_logs WHERE category = ? ORDER BY logged_at DESC LIMIT 1",
            (cat,),
        ).fetchone()
        count = conn.execute(
            "SELECT COUNT(*) as cnt FROM health_logs WHERE category = ?",
            (cat,),
        ).fetchone()
        summary[cat] = {
            "latest": dict(latest) if latest else None,
            "total_entries": count["cnt"],
        }
    conn.close()
    return summary


# ── Tasks ────────────────────────────────────────────────

def create_task(title: str, description: str = "", agent: str = "") -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO tasks (title, description, agent) VALUES (?, ?, ?)",
        (title, description, agent),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def update_task(task_id: int, status: str, result: str = "") -> bool:
    conn = get_connection()
    conn.execute(
        "UPDATE tasks SET status = ?, result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (status, result, task_id),
    )
    conn.commit()
    conn.close()
    return True


def get_tasks(status: str | None = None) -> list[dict]:
    conn = get_connection()
    query = "SELECT * FROM tasks"
    params: list = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Alarms ───────────────────────────────────────────────

def create_alarm(label: str, time: str, repeat_days: str = "") -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO alarms (label, time, repeat_days) VALUES (?, ?, ?)",
        (label, time, repeat_days),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id


def get_alarms(enabled_only: bool = True) -> list[dict]:
    conn = get_connection()
    query = "SELECT * FROM alarms"
    if enabled_only:
        query += " WHERE enabled = 1"
    query += " ORDER BY time ASC"
    rows = conn.execute(query).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def delete_alarm(alarm_id: int) -> bool:
    conn = get_connection()
    conn.execute("DELETE FROM alarms WHERE id = ?", (alarm_id,))
    conn.commit()
    conn.close()
    return True


def toggle_alarm(alarm_id: int, enabled: bool) -> bool:
    conn = get_connection()
    conn.execute(
        "UPDATE alarms SET enabled = ? WHERE id = ?",
        (int(enabled), alarm_id),
    )
    conn.commit()
    conn.close()
    return True


# ── Agent History ────────────────────────────────────────

def log_agent_action(
    agent: str, action: str, input_data: str = "",
    output_data: str = "", success: bool = True,
) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """INSERT INTO agent_history (agent, action, input_data, output_data, success)
           VALUES (?, ?, ?, ?, ?)""",
        (agent, action, input_data, output_data, int(success)),
    )
    conn.commit()
    row_id = cursor.lastrowid
    conn.close()
    return row_id
