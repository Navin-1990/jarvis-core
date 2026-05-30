import asyncio

from app.core.events import event_bus
from app.core.logger import Logger
from app.voice.speech_to_text import SpeechToText
from app.voice.text_to_speech import TextToSpeech
from app.voice.wake_word import WakeWordDetector


class VoiceEngine:

    def __init__(self) -> None:
        self.stt = SpeechToText()
        self.tts = TextToSpeech()
        self.wake_detector = WakeWordDetector()
        self._running = False
        self._command_callback = None

    def set_command_callback(self, callback) -> None:
        self._command_callback = callback

    def speak(self, text: str) -> None:
        self.tts.speak(text)

    def listen(self) -> str | None:
        return self.stt.listen()

    async def start(self) -> None:
        self._running = True
        self.speak("Jarvis online. Awaiting your command, sir.")

        await event_bus.emit_simple(
            "voice_started", agent="voice",
            message="Voice engine started",
        )

        while self._running:
            Logger.info("Waiting for wake word...")
            if self.wake_detector.wait_for_wake_word(timeout=0):
                await event_bus.emit_simple(
                    "wake_word_detected", agent="voice",
                    message="Wake word detected",
                )
                self.speak("Yes, sir?")

                command = self.stt.listen()
                if command:
                    await event_bus.emit_simple(
                        "voice_command", agent="voice",
                        message=f"Command: {command}",
                        data={"command": command},
                    )

                    if self._command_callback:
                        result = await self._command_callback(command)
                        response = result.get("response", "Command processed.")
                        self.speak(response)
                    else:
                        self.speak("I heard you, but I have no handler configured.")

            await asyncio.sleep(0.1)

    def stop(self) -> None:
        self._running = False
        Logger.info("Voice engine stopped")
