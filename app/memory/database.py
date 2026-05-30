import sqlite3
from pathlib import Path

DB_PATH = Path("data/jarvis.db")


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_database() -> None:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS conversations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            role        TEXT NOT NULL,
            content     TEXT NOT NULL,
            agent       TEXT DEFAULT '',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reminders (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT DEFAULT '',
            due_at      TIMESTAMP NOT NULL,
            priority    TEXT DEFAULT 'medium',
            recurring   TEXT DEFAULT '',
            completed   INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT DEFAULT '',
            start_at    TIMESTAMP NOT NULL,
            end_at      TIMESTAMP,
            location    TEXT DEFAULT '',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS health_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            category    TEXT NOT NULL,
            value       TEXT NOT NULL,
            notes       TEXT DEFAULT '',
            logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT DEFAULT '',
            agent       TEXT DEFAULT '',
            status      TEXT DEFAULT 'pending',
            result      TEXT DEFAULT '',
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_history (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            agent       TEXT NOT NULL,
            action      TEXT NOT NULL,
            input_data  TEXT DEFAULT '',
            output_data TEXT DEFAULT '',
            success     INTEGER DEFAULT 1,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS alarms (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            label       TEXT NOT NULL DEFAULT 'Alarm',
            time        TEXT NOT NULL,
            repeat_days TEXT DEFAULT '',
            enabled     INTEGER DEFAULT 1,
            created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    conn.commit()
    conn.close()
