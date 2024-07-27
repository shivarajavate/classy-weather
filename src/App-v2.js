import React from "react";

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

class App extends React.Component {
  state = {
    location: "",
    isLoading: false,
    displayLocation: "",
    weather: {},
  };

  getWeather = async () => {
    if (this.state.location.length < 2) return this.setState({ weather: {} });
    try {
      this.setState({ isLoading: true });
      // 1) Getting location (geocoding)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${this.state.location}`
      );
      const geoData = await geoRes.json();
      console.log(geoData);

      if (!geoData.results) throw new Error("Location not found");

      const { latitude, longitude, timezone, name, country_code } =
        geoData.results.at(0);
      this.setState({
        displayLocation: `${name} ${convertToFlag(country_code)}`,
      });

      // 2) Getting actual weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
      );
      const weatherData = await weatherRes.json();
      this.setState({ weather: weatherData.daily });
    } catch (err) {
      console.error(err);
    } finally {
      this.setState({ isLoading: false });
    }
  };

  setLocation = (e) => this.setState({ location: e.target.value });

  // useEffect with [] dependency array
  componentDidMount() {
    // this.getWeather();
    this.setState({ location: localStorage.getItem("location") || "" });
  }

  // useEffect with [this.state.location] dependency array
  componentDidUpdate(prevProps, prevState) {
    if (prevState.location !== this.state.location) {
      this.getWeather();
      localStorage.setItem("location", this.state.location);
    }
  }

  render() {
    return (
      <div className="app">
        <h1>Classy Weather</h1>
        <Input
          location={this.state.location}
          onChangeLocation={this.setLocation}
        />
        {this.state.isLoading && <p className="loader"> Loading...</p>}
        {!this.state.isLoading && this.state.weather.weathercode && (
          <Weather
            weather={this.state.weather}
            location={this.state.displayLocation}
          />
        )}
      </div>
    );
  }
}

export default App;

class Input extends React.Component {
  render() {
    return (
      <div>
        <input
          type="text"
          placeholder="Enter location..."
          value={this.props.location}
          onChange={this.props.onChangeLocation}
        />
      </div>
    );
  }
}

class Weather extends React.Component {
  render() {
    const {
      temperature_2m_max: maxTempList,
      temperature_2m_min: minTempList,
      time: dateList,
      weathercode: weathercodeList,
    } = this.props.weather;
    return (
      <div>
        <h2>Weather for {this.props.location}</h2>
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
}

class Day extends React.Component {
  render() {
    const { date, maxTemp, minTemp, weathercode, isToday } = this.props;
    return (
      <li className="day">
        <span>{getWeatherIcon(weathercode)}</span>
        <p>{isToday ? "Today" : formatDay(date)}</p>
        <p>
          {Math.floor(minTemp)}°C &mdash;{" "}
          <strong>{Math.ceil(maxTemp)}°C</strong>
        </p>
      </li>
    );
  }
}
