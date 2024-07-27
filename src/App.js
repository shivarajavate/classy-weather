import React, { useEffect, useState } from "react";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

function App() {
  const [location, setLocation] = useState("");
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isDefaultLocationLoading, setIsDefaultLocationLoading] =
    useState(false);
  const [error, setError] = useState("");
  const [displayLocation, setDisplayLocation] = useState("");
  const [weather, setWeather] = useState({});

  useEffect(() => {
    setLocation(localStorage.getItem("location") || "");
  }, []);

  useEffect(() => {
    setError("");
    setIsLocationLoading(false);
    setIsDefaultLocationLoading(false);

    async function getWeather() {
      if (location.length < 2) return setWeather({});
      try {
        setIsLocationLoading(true);

        // 1) Getting location (geocoding)
        const geoResult = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${location}`
        );
        const geoData = await geoResult.json();

        if (!geoData.results) throw new Error("Location not found");

        const [geoDataResult] = geoData.results;
        const { latitude, longitude, timezone, name, country_code } =
          geoDataResult;

        setDisplayLocation(`${name} ${convertToFlag(country_code)}`);

        // 2) Getting actual weather
        const weatherResult = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
        );
        const weatherData = await weatherResult.json();
        setWeather(weatherData.daily);
      } catch (error) {
        console.error(error);
        setError(error.message);
      } finally {
        setIsLocationLoading(false);
      }
    }

    async function getDefaultWeather() {
      if (!navigator.geolocation)
        return setError("Your browser does not support geolocation");

      setIsDefaultLocationLoading(true);

      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          // 1) Getting location (geocoding)
          const { latitude, longitude } = pos.coords;
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

          setDisplayLocation(``);

          // 2) Getting actual weather
          const weatherResult = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
          );
          const weatherData = await weatherResult.json();
          setWeather(weatherData.daily);
        } catch (error) {
          console.error(error);
          setError(error.message);
        } finally {
          setIsDefaultLocationLoading(false);
        }
      });
    }

    if (!location) getDefaultWeather();
    else getWeather();

    localStorage.setItem("location", location);
  }, [location]);

  return (
    <div className="app">
      <h1>Classy Weather</h1>
      <Input
        location={location}
        onChangeLocation={(e) => setLocation(e.target.value)}
      />
      {isLocationLoading && <p className="loader"> Loading...</p>}
      {isDefaultLocationLoading && <p className="loader"> Loading...</p>}
      {error && <p className="loader"> {error}</p>}
      {!isLocationLoading &&
        !isDefaultLocationLoading &&
        weather.weathercode && (
          <Weather weather={weather} location={displayLocation} />
        )}
    </div>
  );
}

export default App;

function Input({ location, onChangeLocation }) {
  return (
    <div>
      <input
        type="text"
        placeholder="Enter location..."
        value={location}
        onChange={onChangeLocation}
      />
    </div>
  );
}

function Weather({ location, weather }) {
  const {
    temperature_2m_max: maxTempList,
    temperature_2m_min: minTempList,
    time: dateList,
    weathercode: weathercodeList,
  } = weather;
  return (
    <div>
      <h2>{location ? `Weather for ${location}` : `Default Weather`}</h2>
      <ul className="weather">
        {dateList.map((date, index) => (
          <Day
            key={date}
            date={dateList.at(index)}
            maxTemp={maxTempList.at(index)}
            minTemp={minTempList.at(index)}
            weathercode={weathercodeList.at(index)}
            isToday={index === 0}
          />
        ))}
      </ul>
    </div>
  );
}

function Day({ date, maxTemp, minTemp, weathercode, isToday }) {
  return (
    <li className="day">
      <span>{getWeatherIcon(weathercode)}</span>
      <p>{isToday ? "Today" : formatDay(date)}</p>
      <p>
        {Math.floor(minTemp)}°C &mdash; <strong>{Math.ceil(maxTemp)}°C</strong>
      </p>
    </li>
  );
}
