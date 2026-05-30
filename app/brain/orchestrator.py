from app.agents.assistant_agent import AssistantAgent
from app.agents.coding_agent import CodingAgent
from app.agents.device_agent import DeviceAgent
from app.agents.file_agent import FileAgent
from app.brain.planner import Planner
from app.core.events import event_bus
from app.core.logger import Logger
from app.memory import long_term
from app.memory.short_term import ShortTermMemory


class Orchestrator:

    def __init__(self) -> None:
        self.planner = Planner()
        self.memory = ShortTermMemory()

        self.agents = {
            "assistant": AssistantAgent(),
            "coding": CodingAgent(),
            "device": DeviceAgent(),
            "file": FileAgent(),
        }

    async def execute(self, user_request: str) -> dict:
        Logger.step(f"Processing: {user_request}")

        self.memory.add(role="user", content=user_request)
        long_term.save_conversation(role="user", content=user_request)

        await event_bus.emit_simple(
            "command_received", message=user_request,
        )

        plan = self.planner.create_plan(user_request)
        agent_name = plan.get("agent", "assistant")

        Logger.info(f"Planner selected agent: {agent_name}")
        await event_bus.emit_simple(
            "agent_selected", message=f"Selected: {agent_name}",
            data={"agent": agent_name, "plan": plan},
        )

        agent = self.agents.get(agent_name)
        if not agent:
            agent = self.agents["assistant"]
            agent_name = "assistant"

        try:
            result = await agent.execute(user_request)
        except Exception as e:
            Logger.error(f"Agent error: {e}")
            result = {
                "success": False,
                "response": f"I encountered an error: {e}",
            }

        result["agent"] = agent_name
        response = result.get("response", "")
        self.memory.add(role="assistant", content=response, agent=agent_name)
        long_term.save_conversation(role="assistant", content=response, agent=agent_name)

        await event_bus.emit_simple(
            "command_completed", agent=agent_name,
            message=response,
        )

        return result
