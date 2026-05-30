import json

from fastapi import WebSocket

from app.core.events import event_bus
from app.core.models import WSEvent


class ConnectionManager:
    _instance: "ConnectionManager | None" = None

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    @classmethod
    def get(cls) -> "ConnectionManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event: WSEvent) -> None:
        data = json.loads(event.model_dump_json())
        dead: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)

    async def broadcast_json(self, data: dict) -> None:
        dead: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead.append(connection)
        for conn in dead:
            self.disconnect(conn)


ws_manager = ConnectionManager.get()


async def event_broadcaster() -> None:
    while True:
        event = await event_bus.get_event()
        await ws_manager.broadcast(event)
