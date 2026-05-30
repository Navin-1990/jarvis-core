import requests
import yt_dlp

from app.core import settings


_current_player = None
_current_track = None


def search_youtube(query: str) -> dict | None:
    api_key = settings.YOUTUBE_API_KEY
    if not api_key:
        return None

    base_url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 10,
        "key": api_key,
    }
    try:
        resp = requests.get(base_url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return None
        first = items[0]
        return {
            "video_id": first["id"]["videoId"],
            "title": first["snippet"]["title"],
            "channel": first["snippet"]["channelTitle"],
            "thumbnail": first["snippet"]["thumbnails"]["default"]["url"],
        }
    except Exception:
        return None


def search_youtube_list(query: str, max_results: int = 10) -> list[dict]:
    api_key = settings.YOUTUBE_API_KEY
    if not api_key:
        return []

    base_url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "key": api_key,
    }
    try:
        resp = requests.get(base_url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for item in data.get("items", []):
            results.append({
                "video_id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "channel": item["snippet"]["channelTitle"],
                "thumbnail": item["snippet"]["thumbnails"]["default"]["url"],
                "duration": item.get("contentDetails", {}).get("duration", ""),
            })
        return results
    except Exception as e:
        print(f"YouTube search error: {e}")
        return []


def get_audio_url(video_id: str) -> str | None:
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        "format": "bestaudio/best",
        "extractaudio": True,
        "quiet": True,
        "nocheckcertificate": True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if info and info.get("url"):
                return info.get("url")
            # Try to get from formats
            for f in info.get("formats", []):
                if f.get("ext") in ["m4a", "mp3", "webm"] and f.get("url"):
                    return f["url"]
            return info.get("url") if info else None
    except Exception as e:
        print(f"Audio extraction error: {e}")
        return None


def play_track(video_id: str, title: str = "") -> dict:
    global _current_player, _current_track

    audio_url = get_audio_url(video_id)
    if not audio_url:
        # Return with YouTube embed URL as fallback for browser playback
        _current_track = {
            "video_id": video_id,
            "title": title,
            "status": "playing",
            "audio_url": None,
            "embed_url": f"https://www.youtube.com/embed/{video_id}?autoplay=1",
        }
        return {
            "success": True,
            "message": f"Playing: {title}",
            "track": _current_track,
            "note": "Using YouTube embed for playback",
        }

    try:
        import vlc
        if _current_player:
            try:
                _current_player.stop()
            except:
                pass
        instance = vlc.MediaPlayer(audio_url)
        _current_player = instance
        _current_track = {
            "video_id": video_id,
            "title": title,
            "status": "playing",
            "audio_url": audio_url,
        }
        instance.play()
        return {"success": True, "message": f"Now playing: {title}", "track": _current_track}
    except ImportError:
        # VLC not available - return audio URL for browser playback
        _current_track = {
            "video_id": video_id,
            "title": title,
            "status": "playing",
            "audio_url": audio_url,
        }
        return {
            "success": True,
            "message": f"Playing: {title}",
            "track": _current_track,
        }
    except Exception as e:
        # Fallback to browser playback
        _current_track = {
            "video_id": video_id,
            "title": title,
            "status": "playing",
            "audio_url": audio_url,
        }
        return {
            "success": True,
            "message": f"Playing: {title}",
            "track": _current_track,
            "error": str(e),
        }


def stop_music() -> dict:
    global _current_player, _current_track
    if _current_player:
        try:
            _current_player.stop()
        except Exception:
            pass
    _current_player = None
    _current_track = None
    return {"success": True, "message": "Music stopped"}


def pause_music() -> dict:
    global _current_player, _current_track
    if _current_player:
        try:
            _current_player.pause()
            if _current_track:
                _current_track["status"] = "paused"
            return {"success": True, "message": "Music paused"}
        except Exception:
            pass
    if _current_track:
        _current_track["status"] = "paused"
        return {"success": True, "message": "Music paused"}
    return {"success": False, "message": "No music playing"}


def resume_music() -> dict:
    global _current_player, _current_track
    if _current_player:
        try:
            _current_player.play()
            if _current_track:
                _current_track["status"] = "playing"
            return {"success": True, "message": "Music resumed"}
        except Exception:
            pass
    if _current_track:
        _current_track["status"] = "playing"
        return {"success": True, "message": "Music resumed"}
    return {"success": False, "message": "No music to resume"}


def get_now_playing() -> dict | None:
    return _current_track
