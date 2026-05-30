class Logger:

    @staticmethod
    def step(message):
        print(f"\n[STEP] {message}")

    @staticmethod
    def info(message):
        print(f"[INFO] {message}")

    @staticmethod
    def success(message):
        print(f"[SUCCESS] {message}")

    @staticmethod
    def error(message):
        print(f"[ERROR] {message}")