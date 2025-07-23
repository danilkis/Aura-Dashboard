import axios from 'axios';

const API_KEY = import.meta.env.VITE_YANDEX_WEATHER_API_KEY;
const LAT = import.meta.env.VITE_YANDEX_WEATHER_LAT;
const LON = import.meta.env.VITE_YANDEX_WEATHER_LON;
const CACHE_KEY = 'weather_cache';
const CACHE_TIME = 3 * 60 * 60 * 1000; // 3 hours in ms

function getCachedWeather() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_TIME) {
    return data;
  }
  return null;
}

function setCachedWeather(data: any) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

export const fetchWeather = async () => {
  const cached = getCachedWeather();
  if (cached) return cached;

  const url = `/yandex-weather/v2/forecast?lat=${LAT}&lon=${LON}`;
  const headers = { 'X-Yandex-Weather-Key': API_KEY };

  const response = await axios.get(url, { headers });
  const fact = response.data.fact;
  const weather = {
    description: response.data.info.tzinfo.name + ': ' + fact.condition,
    temp: fact.temp.toString(),
    condition: fact.condition,
  };
  setCachedWeather(weather);
  return weather;
}; 