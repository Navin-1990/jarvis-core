import json

from app.core.events import event_bus
from app.core.llm import LocalLLM
from app.core.logger import Logger
from app.devices.tv.sony_bravia import SonyBraviaTV
from app.memory import long_term


class DeviceAgent:

    def __init__(self) -> None:
        self.llm = LocalLLM()
        self.tv = SonyBraviaTV()

    async def execute(self, user_request: str) -> dict:
        await event_bus.emit_simple(
            "agent_started", agent="device",
            message=f"Processing device command: {user_request}",
        )

        intent = self._parse_intent(user_request)
        device = intent.get("device", "tv")
        action = intent.get("action", "")
        params = intent.get("params", {})

        if device == "tv":
            result = self._handle_tv(action, params)
        else:
            result = {"success": False, "response": f"Device '{device}' not yet supported."}

        await event_bus.emit_simple(
            "agent_completed", agent="device",
            message=result.get("response", str(result)),
            data=result,
        )

        long_term.log_agent_action(
            agent="device", action=f"{device}:{action}",
            input_data=user_request,
            output_data=json.dumps(result),
            success=result.get("success", True),
        )

        return result

    def _parse_intent(self, user_request: str) -> dict:
        prompt = f"""You are Jarvis Device Controller. Parse the device command.

User Request: {user_request}

Available devices: tv
Available TV actions: power_on, power_off, volume_up, volume_down, set_volume, mute,
  launch_netflix, launch_youtube, launch_app, home, press_button, get_apps, system_info, discover

Return ONLY JSON.
Examples:
{{"device": "tv", "action": "power_on", "params": {{}}}}
{{"device": "tv", "action": "volume_up", "params": {{"steps": 3}}}}
{{"device": "tv", "action": "set_volume", "params": {{"level": 25}}}}
{{"device": "tv", "action": "launch_netflix", "params": {{}}}}"""

        try:
            response = self.llm.ask(prompt)
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {"device": "tv", "action": "power_status", "params": {}}

    def _handle_tv(self, action: str, params: dict) -> dict:
        Logger.step(f"TV command: {action}")
        result = self.tv.execute(action, params)

        action_messages = {
            "power_on": "TV is now on, sir.",
            "power_off": "TV has been turned off.",
            "volume_up": f"Volume increased by {params.get('steps', 1)}.",
            "volume_down": f"Volume decreased by {params.get('steps', 1)}.",
            "set_volume": f"Volume set to {params.get('level', 20)}.",
            "mute": "TV muted.",
            "launch_netflix": "Netflix is now playing.",
            "launch_youtube": "YouTube is now open.",
            "home": "TV is back to home screen.",
        }

        result["response"] = action_messages.get(action, f"TV command '{action}' executed.")
        return result
