import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`${API_URL}/weather`);
        const data = await res.json();
        if (!data.error) setWeather(data);
      } catch { /* ignore */ }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, []);

  if (!weather) return null;

  return (
    <div className="weather-widget">
      <div className="weather-city">{weather.city}</div>
      <div className="weather-temp">{Math.round(weather.temp)}&deg;C</div>
      <div className="weather-desc">{weather.description}</div>
      <div className="weather-details">
        <span>Feels {Math.round(weather.feels_like)}&deg;</span>
        <span>Humidity {weather.humidity}%</span>
        {weather.wind_speed && <span>Wind {weather.wind_speed} km/h</span>}
      </div>
    </div>
  );
};

export default WeatherWidget;
