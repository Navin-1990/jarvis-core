from collections import deque

from app.core.models import ConversationEntry


class ShortTermMemory:

    def __init__(self, max_entries: int = 50):
        self._history: deque[ConversationEntry] = deque(maxlen=max_entries)

    def add(self, role: str, content: str, agent: str = "") -> None:
        self._history.append(
            ConversationEntry(role=role, content=content, agent=agent)
        )

    def get_context(self, last_n: int = 10) -> list[dict[str, str]]:
        entries = list(self._history)[-last_n:]
        return [
            {"role": e.role, "content": e.content}
            for e in entries
        ]

    def clear(self) -> None:
        self._history.clear()

    @property
    def size(self) -> int:
        return len(self._history)
