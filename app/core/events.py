import asyncio
from collections.abc import Callable
from typing import Any

from app.core.models import WSEvent


class EventBus:
    _instance: "EventBus | None" = None

    def __init__(self) -> None:
        self._listeners: dict[str, list[Callable]] = {}
        self._queue: asyncio.Queue[WSEvent] = asyncio.Queue()

    @classmethod
    def get(cls) -> "EventBus":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def on(self, event_type: str, callback: Callable) -> None:
        self._listeners.setdefault(event_type, []).append(callback)

    async def emit(self, event: WSEvent) -> None:
        await self._queue.put(event)
        for callback in self._listeners.get(event.type, []):
            try:
                result = callback(event)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                pass
        for callback in self._listeners.get("*", []):
            try:
                result = callback(event)
                if asyncio.iscoroutine(result):
                    await result
            except Exception:
                pass

    async def emit_simple(
        self, event_type: str, agent: str = "", message: str = "",
        data: dict[str, Any] | None = None,
    ) -> None:
        event = WSEvent(
            type=event_type, agent=agent, message=message,
            data=data or {},
        )
        await self.emit(event)

    async def get_event(self) -> WSEvent:
        return await self._queue.get()


event_bus = EventBus.get()
