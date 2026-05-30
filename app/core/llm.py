import time

import requests

from app.core import settings


class LocalLLM:

    def __init__(self):
        self.url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT

    def ask(self, prompt):
        start_time = time.time()

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "stream": False
        }

        try:
            response = requests.post(
                self.url,
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            elapsed = time.time() - start_time
            
            if elapsed > 5:
                print(f"[JARVIS] Response in {elapsed:.1f}s")
            
            return data["message"]["content"]
        except requests.exceptions.Timeout:
            return "I apologize, sir. The request took too long. Please try a simpler command."
        except Exception as e:
            print(f"[JARVIS] LLM Error: {e}")
            return "I apologize, sir. I'm experiencing technical difficulties. Please try again."
