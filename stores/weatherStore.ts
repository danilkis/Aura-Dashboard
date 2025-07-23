import { create } from 'zustand';

interface WeatherData {
  description: string;
  temp: string;
  condition: string;
}

interface WeatherState {
  weather: WeatherData;
  fetchWeather: () => void;
}

const dummyWeather: WeatherData = {
  description: 'A beautiful sunny morning with a few fluffy clouds, temperature is 22°C.',
  temp: '22',
  condition: 'Sunny',
};

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: dummyWeather,
  fetchWeather: () => {
    // Simulate fetching new weather
    set({
      weather: dummyWeather,
    });
  },
})); 