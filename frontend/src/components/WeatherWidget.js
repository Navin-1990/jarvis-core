import React, { useState, useEffect, memo } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const WeatherWidget = memo(() => {
  const [weather, setWeather] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  // Format time
  const timeStr = currentTime.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format date
  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="weather-widget-container">
      {/* Time and Date */}
      <div className="time-display">
        <span className="time-greeting">{getGreeting()}</span>
        <span className="time-value">{timeStr}</span>
        <span className="date-value">{dateStr}</span>
      </div>
      
      {/* Weather */}
      {weather && !locationError && (
        <div className="weather-widget">
          <span className="weather-icon">🌤</span>
          <div className="weather-info">
            <span className="weather-city">{weather.city}</span>
            <span className="weather-temp">{Math.round(weather.temp)}°C</span>
          </div>
        </div>
      )}
    </div>
  );
});

WeatherWidget.displayName = 'WeatherWidget';
export default WeatherWidget;
