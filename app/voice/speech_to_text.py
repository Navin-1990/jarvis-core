import speech_recognition as sr

from app.core.logger import Logger


class SpeechToText:

    def __init__(self) -> None:
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()

    def listen(self, timeout: int = 10, phrase_limit: int = 15) -> str | None:
        Logger.info("Listening...")
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                audio = self.recognizer.listen(
                    source, timeout=timeout, phrase_time_limit=phrase_limit,
                )
            except sr.WaitTimeoutError:
                Logger.info("No speech detected")
                return None

        try:
            text = self.recognizer.recognize_google(audio)
            Logger.success(f"Heard: {text}")
            return text
        except sr.UnknownValueError:
            Logger.info("Could not understand audio")
            return None
        except sr.RequestError as e:
            Logger.error(f"Speech recognition error: {e}")
            return None

    def listen_once(self) -> str | None:
        return self.listen(timeout=5, phrase_limit=10)
