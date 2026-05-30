import json

from app.core.llm import LocalLLM


class Planner:

    def __init__(self) -> None:
        self.llm = LocalLLM()

    def create_plan(self, user_request: str) -> dict:

        prompt = f"""You are Jarvis Planner. Analyze the user request and pick the best agent.

User Request: {user_request}

Available Agents:
- assistant: Personal assistant (reminders, calendar, health tracking, daily summary, general chat, alarms)
- coding: Code generation, review, and testing
- device: Home automation (TV control, smart devices)
- file: File and folder operations (create, read, write, move, delete)
- website: Website generation from templates
- browser: Open URLs and web pages

Return ONLY JSON with the selected agent.

Example:
{{"agent": "assistant"}}
{{"agent": "device"}}
{{"agent": "coding"}}"""

        response = self.llm.ask(prompt)

        try:
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {"agent": "assistant"}
