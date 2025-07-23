import React, { useState, useEffect, useCallback } from 'react';
import { generateBackgroundAndAccent } from '../services/geminiService';
import { Sparkles, Cloud, Sun, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { fetchWeather } from '../services/weatherService';

interface WeatherDisplayProps {
    onBackgroundGenerated: (data: { backgroundUrl: string; accentColor: string; errorType?: 'quota_exceeded' }) => void;
    style?: React.CSSProperties;
    modelName: string;
    imageGenerationEnabled: boolean;
}

const weatherIcons: Record<string, React.FC<{ className?: string }>> = {
    'Sunny': Sun,
    'Cloudy': Cloud,
    'Rainy': Cloud,
    // Add more mappings as needed
};

// Yandex condition codes: https://yandex.ru/dev/weather/doc/dg/concepts/forecast-info-docpage/#conditions
const conditionMap: Record<string, { icon: React.FC<{ className?: string }>, display: string }> = {
    'clear': { icon: Sun, display: 'Clear' },
    'partly-cloudy': { icon: Cloud, display: 'Partly Cloudy' },
    'cloudy': { icon: Cloud, display: 'Cloudy' },
    'overcast': { icon: Cloud, display: 'Overcast' },
    'drizzle': { icon: Cloud, display: 'Drizzle' },
    'light-rain': { icon: Cloud, display: 'Light Rain' },
    'rain': { icon: Cloud, display: 'Rain' },
    'moderate-rain': { icon: Cloud, display: 'Moderate Rain' },
    'heavy-rain': { icon: Cloud, display: 'Heavy Rain' },
    'continuous-heavy-rain': { icon: Cloud, display: 'Continuous Heavy Rain' },
    'showers': { icon: Cloud, display: 'Showers' },
    'wet-snow': { icon: Cloud, display: 'Wet Snow' },
    'light-snow': { icon: Cloud, display: 'Light Snow' },
    'snow': { icon: Cloud, display: 'Snow' },
    'snow-showers': { icon: Cloud, display: 'Snow Showers' },
    'hail': { icon: Cloud, display: 'Hail' },
    'thunderstorm': { icon: Cloud, display: 'Thunderstorm' },
    'thunderstorm-with-rain': { icon: Cloud, display: 'Thunderstorm with Rain' },
    'thunderstorm-with-hail': { icon: Cloud, display: 'Thunderstorm with Hail' },
};

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ onBackgroundGenerated, style, modelName, imageGenerationEnabled }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [weather, setWeather] = useState<any>(null);

    const fetchAndSetWeather = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchWeather();
            setWeather(data);
        } catch (err) {
            setError('Could not fetch weather data.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBackground = useCallback(async (desc: string) => {
        setLoading(true);
        setError(null);

        if (!imageGenerationEnabled) {
            onBackgroundGenerated({
                backgroundUrl: "https://picsum.photos/1280/720?grayscale&blur=2",
                accentColor: '#6366f1',
            });
            setError("Image generation is disabled.");
            setLoading(false);
            return;
        }

        try {
            const data = await generateBackgroundAndAccent(desc, modelName);
            onBackgroundGenerated(data);
            if (data.errorType === 'quota_exceeded') {
                setError("Image generation quota exceeded.");
            }
        } catch (err) {
            setError("Could not generate weather art.");
            onBackgroundGenerated({
                backgroundUrl: "https://picsum.photos/1920/1080?grayscale&blur=2",
                accentColor: '#EC4899'
            });
        } finally {
            setLoading(false);
        }
    }, [onBackgroundGenerated, modelName, imageGenerationEnabled]);

    useEffect(() => {
        fetchAndSetWeather();
    }, [fetchAndSetWeather]);

    useEffect(() => {
        if (weather) {
            fetchBackground(weather.description);
        }
    }, [weather, fetchBackground]);

    const handleRefresh = async () => {
        await fetchAndSetWeather();
    };

    let WeatherIcon = Sun;
    let displayCondition = weather?.condition || '';
    if (weather && weather.condition && conditionMap[weather.condition]) {
        WeatherIcon = conditionMap[weather.condition].icon;
        displayCondition = conditionMap[weather.condition].display;
    } else if (weather && weather.condition) {
        // Fallback: prettify unknown condition
        displayCondition = weather.condition.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    return (
        <div className="card-style relative w-full h-full min-h-[8rem] p-4 flex flex-col justify-end" style={style}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[--card-bg] z-20 rounded-2xl">
                    <Sparkles className="w-8 h-8 text-[--secondary-text-color] animate-pulse" />
                </div>
            )}
             {error && (
                <div className={`absolute top-4 left-4 right-4 bg-[--card-bg] backdrop-blur-sm rounded-lg flex items-center p-2 text-center text-xs z-10 shadow-lg border border-[--card-border-color]`}>
                    {error.includes('disabled') ?
                        <Info className="w-4 h-4 text-[--accent-color] mr-2 flex-shrink-0" /> :
                        <AlertTriangle className="w-4 h-4 text-[--danger-color] mr-2 flex-shrink-0" />
                    }
                    <p className="font-medium text-[--primary-text-color]">{error}</p>
                </div>
            )}
            {!loading && weather && (
                <>
                <button 
                    onClick={handleRefresh} 
                    className="absolute top-3 right-3 p-2 text-[--secondary-text-color] hover:text-[--primary-text-color] hover:bg-[--bg-hover-color] rounded-full transition-colors"
                    aria-label="Refresh weather background"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                 <div className="flex items-center space-x-3 text-[--thematic-text-color]" style={{textShadow: '0 1px 5px var(--card-shadow-color)'}}>
                    <WeatherIcon className="w-10 h-10 text-[--primary-text-color] drop-shadow-lg" />
                    <div className="flex items-baseline">
                        <p className="text-3xl font-bold text-[--primary-text-color]">{weather.temp}°</p>
                        <p className="text-lg font-medium text-[--secondary-text-color] ml-2">{displayCondition}</p>
                    </div>
                </div>
                </>
            )}
        </div>
    );
};

export default WeatherDisplay;