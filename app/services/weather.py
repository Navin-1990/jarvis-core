import requests

from app.core import settings


def get_weather(city: str | None = None, lat: float | None = None, lon: float | None = None) -> dict:
    # Use coordinates if provided
    if lat is not None and lon is not None:
        return _get_weather_by_coords(lat, lon)
    
    # Fall back to city name
    city = city or settings.WEATHER_CITY
    api_key = settings.WEATHER_API_KEY

    if not api_key:
        return _get_weather_free(city)

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": api_key, "units": "metric"}
    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {
            "city": data["name"],
            "temp": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "wind_speed": data["wind"]["speed"],
        }
    except Exception as e:
        return {"error": str(e), "city": city}


def _get_weather_by_coords(lat: float, lon: float) -> dict:
    """Get weather by geographic coordinates."""
    api_key = settings.WEATHER_API_KEY
    
    if api_key:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {"lat": lat, "lon": lon, "appid": api_key, "units": "metric"}
        try:
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return {
                "city": data["name"],
                "temp": data["main"]["temp"],
                "feels_like": data["main"]["feels_like"],
                "humidity": data["main"]["humidity"],
                "description": data["weather"][0]["description"],
                "icon": data["weather"][0]["icon"],
                "wind_speed": data["wind"]["speed"],
            }
        except Exception as e:
            return {"error": str(e)}
    
    # Fallback to wttr.in which supports coordinates
    try:
        url = f"https://wttr.in/{lat},{lon}?format=j1"
        resp = requests.get(url, timeout=10, headers={"User-Agent": "jarvis/2.0"})
        resp.raise_for_status()
        data = resp.json()
        current = data["current_condition"][0]
        return {
            "city": data.get("nearest_area", [{}])[0].get("areaName", [{}])[0].get("value", f"{lat},{lon}"),
            "temp": float(current["temp_C"]),
            "feels_like": float(current["FeelsLikeC"]),
            "humidity": int(current["humidity"]),
            "description": current["weatherDesc"][0]["value"],
            "wind_speed": float(current["windspeedKmph"]),
        }
    except Exception as e:
        return {"error": str(e)}


def _get_weather_free(city: str) -> dict:
    try:
        url = f"https://wttr.in/{city}?format=j1"
        resp = requests.get(url, timeout=10, headers={"User-Agent": "jarvis/2.0"})
        resp.raise_for_status()
        data = resp.json()
        current = data["current_condition"][0]
        return {
            "city": city,
            "temp": float(current["temp_C"]),
            "feels_like": float(current["FeelsLikeC"]),
            "humidity": int(current["humidity"]),
            "description": current["weatherDesc"][0]["value"],
            "wind_speed": float(current["windspeedKmph"]),
        }
    except Exception as e:
        return {"error": str(e), "city": city}


def get_forecast(city: str | None = None) -> list[dict]:
    city = city or settings.WEATHER_CITY
    try:
        url = f"https://wttr.in/{city}?format=j1"
        resp = requests.get(url, timeout=10, headers={"User-Agent": "jarvis/2.0"})
        resp.raise_for_status()
        data = resp.json()
        forecast = []
        for day in data.get("weather", [])[:3]:
            forecast.append({
                "date": day["date"],
                "max_temp": day["maxtempC"],
                "min_temp": day["mintempC"],
                "description": day["hourly"][4]["weatherDesc"][0]["value"],
            })
        return forecast
    except Exception:
        return []
