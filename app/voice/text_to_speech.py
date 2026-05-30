import pyttsx3

from app.core.logger import Logger


class TextToSpeech:

    def __init__(self) -> None:
        self.engine = pyttsx3.init()
        self._setup()

    def _setup(self) -> None:
        voices = self.engine.getProperty("voices")
        if voices:
            self.engine.setProperty("voice", voices[0].id)
        self.engine.setProperty("rate", 175)
        self.engine.setProperty("volume", 1.0)

    def speak(self, text: str) -> None:
        Logger.info(f"JARVIS: {text}")
        self.engine.say(text)
        self.engine.runAndWait()

    def set_rate(self, rate: int) -> None:
        self.engine.setProperty("rate", rate)

    def set_volume(self, volume: float) -> None:
        self.engine.setProperty("volume", max(0.0, min(1.0, volume)))
