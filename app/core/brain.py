from datetime import datetime


class JarvisBrain:

    def __init__(self):

        self.started_at = datetime.now()

        self.status = "online"

    async def think(self, command: str):

        command = command.lower()

        if "hello" in command:

            return {
                "success": True,
                "response": "Hello sir. Jarvis online."
            }

        if "status" in command:

            uptime = datetime.now() - self.started_at

            return {
                "success": True,
                "response": f"All systems operational. Uptime is {uptime}."
            }

        return {
            "success": True,
            "response": f"I understood your command: {command}"
        }