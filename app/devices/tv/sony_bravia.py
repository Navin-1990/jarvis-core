import socket
from typing import Any

import requests

from app.core import settings
from app.core.logger import Logger


class SonyBraviaTV:
    """Sony Bravia Smart TV control via REST API.

    Requires the TV to have:
    1. 'Remote Start' enabled in Settings > Network > Home Network > Remote Start
    2. 'IP Control' set to 'Simple' in Settings > Network > Home Network > IP Control
    3. Pre-Shared Key configured in Settings > Network > Home Network > IP Control > Pre-Shared Key
    """

    def __init__(
        self,
        ip: str | None = None,
        psk: str | None = None,
    ) -> None:
        self.ip = ip or settings.SONY_TV_IP
        self.psk = psk or settings.SONY_TV_PSK
        self.base_url = f"http://{self.ip}/sony"
        self.headers = {
            "Content-Type": "application/json",
            "X-Auth-PSK": self.psk,
        }

    def _send_command(
        self, service: str, method: str,
        params: list | None = None, version: str = "1.0",
    ) -> dict[str, Any]:
        url = f"{self.base_url}/{service}"
        payload = {
            "method": method,
            "id": 1,
            "params": params or [],
            "version": version,
        }
        try:
            resp = requests.post(
                url, headers=self.headers,
                json=payload, timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            Logger.error(f"TV command failed: {e}")
            return {"error": str(e)}

    def _send_ircc(self, code: str) -> dict[str, Any]:
        url = f"http://{self.ip}/sony/IRCC"
        body = (
            '<?xml version="1.0"?>'
            '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" '
            's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">'
            "<s:Body>"
            '<u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">'
            f"<IRCCCode>{code}</IRCCCode>"
            "</u:X_SendIRCC>"
            "</s:Body>"
            "</s:Envelope>"
        )
        headers = {
            "Content-Type": "text/xml; charset=UTF-8",
            "SOAPACTION": '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
            "X-Auth-PSK": self.psk,
        }
        try:
            resp = requests.post(url, headers=headers, data=body, timeout=10)
            return {"success": resp.status_code == 200}
        except requests.RequestException as e:
            return {"error": str(e)}

    # ── IRCC Codes ───────────────────────────────────────
    IRCC_CODES = {
        "power": "AAAAAQAAAAEAAAAVAw==",
        "power_off": "AAAAAQAAAAEAAAAvAw==",
        "input": "AAAAAQAAAAEAAAAlAw==",
        "mute": "AAAAAQAAAAEAAAAUAw==",
        "volume_up": "AAAAAQAAAAEAAAASAw==",
        "volume_down": "AAAAAQAAAAEAAAATAw==",
        "channel_up": "AAAAAQAAAAEAAAAQAw==",
        "channel_down": "AAAAAQAAAAEAAAARAw==",
        "up": "AAAAAQAAAAEAAAB0Aw==",
        "down": "AAAAAQAAAAEAAAB1Aw==",
        "left": "AAAAAQAAAAEAAAB2Aw==",
        "right": "AAAAAQAAAAEAAAB3Aw==",
        "confirm": "AAAAAQAAAAEAAABlAw==",
        "home": "AAAAAQAAAAEAAABgAw==",
        "back": "AAAAAgAAAJcAAAAjAw==",
        "play": "AAAAAgAAAJcAAAAaAw==",
        "pause": "AAAAAgAAAJcAAAAZAw==",
        "stop": "AAAAAgAAAJcAAAAYAw==",
        "netflix": "AAAAAgAAABoAAABqAw==",
        "youtube": "AAAAAgAAAMQAAAAZAw==",
    }

    # ── Power ────────────────────────────────────────────

    def power_on(self) -> dict:
        result = self._send_command("system", "setPowerStatus", [{"status": True}])
        if "error" in result:
            result = self._send_ircc(self.IRCC_CODES["power"])
        Logger.info("TV: Power ON")
        return {"success": True, "action": "power_on"}

    def power_off(self) -> dict:
        result = self._send_command("system", "setPowerStatus", [{"status": False}])
        Logger.info("TV: Power OFF")
        return {"success": "error" not in result, "action": "power_off"}

    def get_power_status(self) -> dict:
        result = self._send_command("system", "getPowerStatus")
        status = result.get("result", [{}])[0].get("status", "unknown") if "result" in result else "unknown"
        return {"power": status}

    # ── Volume ───────────────────────────────────────────

    def volume_up(self, steps: int = 1) -> dict:
        for _ in range(steps):
            self._send_ircc(self.IRCC_CODES["volume_up"])
        Logger.info(f"TV: Volume UP x{steps}")
        return {"success": True, "action": "volume_up", "steps": steps}

    def volume_down(self, steps: int = 1) -> dict:
        for _ in range(steps):
            self._send_ircc(self.IRCC_CODES["volume_down"])
        Logger.info(f"TV: Volume DOWN x{steps}")
        return {"success": True, "action": "volume_down", "steps": steps}

    def set_volume(self, level: int) -> dict:
        result = self._send_command(
            "audio", "setAudioVolume",
            [{"target": "speaker", "volume": str(level)}],
        )
        Logger.info(f"TV: Volume set to {level}")
        return {"success": "error" not in result, "action": "set_volume", "level": level}

    def mute(self) -> dict:
        self._send_ircc(self.IRCC_CODES["mute"])
        Logger.info("TV: Mute toggled")
        return {"success": True, "action": "mute"}

    def get_volume(self) -> dict:
        result = self._send_command("audio", "getVolumeInformation")
        if "result" in result:
            for info in result["result"][0]:
                if info.get("target") == "speaker":
                    return {"volume": info.get("volume", 0), "mute": info.get("mute", False)}
        return {"volume": "unknown", "mute": "unknown"}

    # ── Apps ─────────────────────────────────────────────

    def get_app_list(self) -> list[dict]:
        result = self._send_command("appControl", "getApplicationList")
        if "result" in result:
            return result["result"][0]
        return []

    def launch_app(self, uri: str) -> dict:
        result = self._send_command("appControl", "setActiveApp", [{"uri": uri}])
        Logger.info(f"TV: Launched app {uri}")
        return {"success": "error" not in result, "action": "launch_app", "uri": uri}

    def launch_netflix(self) -> dict:
        return self.launch_app("com.sony.dtv.com.netflix.ninja.com.netflix.ninja.MainActivity")

    def launch_youtube(self) -> dict:
        return self.launch_app("com.sony.dtv.com.google.android.youtube.tv.com.google.android.apps.youtube.tv.activity.ShellActivity")

    # ── Navigation ───────────────────────────────────────

    def press_button(self, button: str) -> dict:
        code = self.IRCC_CODES.get(button.lower())
        if not code:
            return {"success": False, "error": f"Unknown button: {button}"}
        self._send_ircc(code)
        return {"success": True, "action": "press_button", "button": button}

    def go_home(self) -> dict:
        return self.press_button("home")

    # ── System Info ──────────────────────────────────────

    def get_system_info(self) -> dict:
        result = self._send_command("system", "getSystemInformation")
        if "result" in result:
            return result["result"][0]
        return {}

    # ── Discovery ────────────────────────────────────────

    @staticmethod
    def discover(timeout: int = 5) -> list[str]:
        ssdp_request = (
            "M-SEARCH * HTTP/1.1\r\n"
            "HOST: 239.255.255.250:1900\r\n"
            'MAN: "ssdp:discover"\r\n'
            "MX: 3\r\n"
            "ST: urn:schemas-sony-com:service:ScalarWebAPI:1\r\n"
            "\r\n"
        )
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.settimeout(timeout)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.sendto(ssdp_request.encode(), ("239.255.255.250", 1900))

        found: list[str] = []
        try:
            while True:
                data, addr = sock.recvfrom(1024)
                if b"Sony" in data or b"sony" in data:
                    found.append(addr[0])
        except socket.timeout:
            pass
        finally:
            sock.close()

        return found

    # ── Unified Execute ──────────────────────────────────

    def execute(self, action: str, params: dict | None = None) -> dict:
        params = params or {}
        actions = {
            "power_on": self.power_on,
            "power_off": self.power_off,
            "power_status": self.get_power_status,
            "volume_up": lambda: self.volume_up(params.get("steps", 1)),
            "volume_down": lambda: self.volume_down(params.get("steps", 1)),
            "set_volume": lambda: self.set_volume(params.get("level", 20)),
            "mute": self.mute,
            "get_volume": self.get_volume,
            "launch_netflix": self.launch_netflix,
            "launch_youtube": self.launch_youtube,
            "launch_app": lambda: self.launch_app(params.get("uri", "")),
            "home": self.go_home,
            "back": lambda: self.press_button("back"),
            "up": lambda: self.press_button("up"),
            "down": lambda: self.press_button("down"),
            "left": lambda: self.press_button("left"),
            "right": lambda: self.press_button("right"),
            "confirm": lambda: self.press_button("confirm"),
            "channel_up": lambda: self.press_button("channel_up"),
            "channel_down": lambda: self.press_button("channel_down"),
            "netflix": self.launch_netflix,
            "youtube": self.launch_youtube,
            "prime": lambda: self.press_button("confirm"),
            "press_button": lambda: self.press_button(params.get("button", "")),
            "get_apps": self.get_app_list,
            "system_info": self.get_system_info,
            "discover": lambda: {"devices": self.discover()},
        }

        handler = actions.get(action)
        if not handler:
            return {"success": False, "error": f"Unknown TV action: {action}"}

        return handler()
