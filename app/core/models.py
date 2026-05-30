from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────

class AgentType(str, Enum):
    ASSISTANT = "assistant"
    WEBSITE = "website"
    CODING = "coding"
    FILE = "file"
    BROWSER = "browser"
    DEVICE = "device"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class DeviceType(str, Enum):
    TV = "tv"
    LIGHT = "light"
    SPEAKER = "speaker"


class ReminderPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ── API Models ───────────────────────────────────────────

class CommandRequest(BaseModel):
    command: str


class CommandResponse(BaseModel):
    success: bool
    response: str
    agent: str | None = None
    data: dict[str, Any] | None = None


# ── Reminder / Calendar ─────────────────────────────────

class ReminderCreate(BaseModel):
    title: str
    description: str = ""
    due_at: datetime
    priority: ReminderPriority = ReminderPriority.MEDIUM
    recurring: str = ""


class ReminderResponse(BaseModel):
    id: int
    title: str
    description: str
    due_at: datetime
    priority: ReminderPriority
    recurring: str
    completed: bool
    created_at: datetime


class CalendarEventCreate(BaseModel):
    title: str
    description: str = ""
    start_at: datetime
    end_at: datetime | None = None
    location: str = ""


class CalendarEventResponse(BaseModel):
    id: int
    title: str
    description: str
    start_at: datetime
    end_at: datetime | None
    location: str
    created_at: datetime


# ── Health Tracking ──────────────────────────────────────

class HealthLogCreate(BaseModel):
    category: str = Field(description="food, exercise, weight, sleep, water, mood")
    value: str
    notes: str = ""


class HealthLogResponse(BaseModel):
    id: int
    category: str
    value: str
    notes: str
    logged_at: datetime


# ── Device Models ────────────────────────────────────────

class DeviceCommand(BaseModel):
    device_type: DeviceType
    action: str
    params: dict[str, Any] = Field(default_factory=dict)


class DeviceStatus(BaseModel):
    device_type: DeviceType
    name: str
    online: bool
    state: dict[str, Any] = Field(default_factory=dict)


# ── Coding Agent ─────────────────────────────────────────

class CodingRequest(BaseModel):
    description: str
    language: str = "python"
    auto_fix: bool = True


class CodingResult(BaseModel):
    success: bool
    code: str
    output: str = ""
    errors: list[str] = Field(default_factory=list)
    iterations: int = 0


# ── WebSocket Events ─────────────────────────────────────

class WSEvent(BaseModel):
    type: str
    agent: str = ""
    message: str = ""
    data: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)


# ── Conversation Memory ─────────────────────────────────

class ConversationEntry(BaseModel):
    id: int | None = None
    role: str
    content: str
    agent: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
