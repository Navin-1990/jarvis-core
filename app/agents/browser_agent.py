import json

from app.core.events import event_bus
from app.core.llm import LocalLLM
from app.memory import long_term
from app.tools.browser_tool import BrowserTool


class BrowserAgent:

    def __init__(self) -> None:
        self.llm = LocalLLM()
        self.browser = BrowserTool()

    async def execute(self, user_request: str) -> dict:
        await event_bus.emit_simple(
            "agent_started", agent="browser",
            message=f"Processing: {user_request}",
        )

        intent = self._parse_intent(user_request)
        url = intent.get("url", "")

        if url:
            result = self.browser.open_url(url)
            response = f"Opening {url} in your browser."
        else:
            response = "I couldn't determine which URL to open."
            result = {"success": False}

        await event_bus.emit_simple(
            "agent_completed", agent="browser", message=response,
        )

        long_term.log_agent_action(
            agent="browser", action="open_url",
            input_data=user_request, output_data=response,
            success=result.get("success", False),
        )

        return {"success": result.get("success", False), "response": response}

    def _parse_intent(self, user_request: str) -> dict:
        prompt = f"""Extract the URL from this request. If no URL given, infer one.

User Request: {user_request}

Return ONLY JSON: {{"url": "https://..."}}"""

        try:
            response = self.llm.ask(prompt)
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {"url": ""}
