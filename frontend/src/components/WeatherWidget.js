import React, { useState, useEffect, memo } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const WeatherWidget = memo(() => {
  const [weather, setWeather] = useState(null);
  const [locationError, setLocationError] = useState(false);

  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      const res = await fetch(`${API_URL}/weather?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (!data.error) {
        setWeather(data);
        setLocationError(false);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Try browser geolocation first
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            async () => {
              // Fallback to IP-based location
              try {
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();
                if (ipData.city) {
                  const res = await fetch(`${API_URL}/weather?city=${ipData.city},${ipData.region}`);
                  const data = await res.json();
                  if (!data.error) {
                    setWeather(data);
                    setLocationError(false);
                  } else {
                    setLocationError(true);
                  }
                }
              } catch {
                setLocationError(true);
              }
            },
            { timeout: 5000 }
          );
        } else {
          // No geolocation - try IP fallback
          try {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            if (ipData.city) {
              const res = await fetch(`${API_URL}/weather?city=${ipData.city},${ipData.region}`);
              const data = await res.json();
              if (!data.error) {
                setWeather(data);
              }
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, []);

  if (!weather || locationError) return null;

  return (
    <div className="weather-widget">
      <span className="weather-icon">🌤</span>
      <div className="weather-info">
        <span className="weather-city">{weather.city}</span>
        <span className="weather-temp">{Math.round(weather.temp)}°C</span>
      </div>
    </div>
  );
});

WeatherWidget.displayName = 'WeatherWidget';
export default WeatherWidget;
