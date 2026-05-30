import time

import requests

from app.core import settings


class LocalLLM:

    def __init__(self):
        self.url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT

    def ask(self, prompt):

        print("\n")
        print("=" * 60)
        print("[JARVIS] Sending request to Llama")
        print("=" * 60)

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

        response = requests.post(
            self.url,
            json=payload,
            timeout=self.timeout
        )

        response.raise_for_status()

        data = response.json()

        elapsed = time.time() - start_time

        print(f"[JARVIS] Response received in {elapsed:.2f} seconds")

        return data["message"]["content"]
