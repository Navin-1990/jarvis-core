import speech_recognition as sr

from app.core.logger import Logger

WAKE_WORDS = ["jarvis", "hey jarvis", "ok jarvis"]


class WakeWordDetector:

    def __init__(self) -> None:
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()

    def wait_for_wake_word(self, timeout: int = 0) -> bool:
        with self.microphone as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                kwargs = {"phrase_time_limit": 3}
                if timeout > 0:
                    kwargs["timeout"] = timeout
                audio = self.recognizer.listen(source, **kwargs)
            except sr.WaitTimeoutError:
                return False

        try:
            text = self.recognizer.recognize_google(audio).lower()
            for wake_word in WAKE_WORDS:
                if wake_word in text:
                    Logger.success(f"Wake word detected: '{text}'")
                    return True
        except (sr.UnknownValueError, sr.RequestError):
            pass

        return False
