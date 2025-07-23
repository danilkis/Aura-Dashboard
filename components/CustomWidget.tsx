import React, { useState, useEffect, useCallback } from 'react';
import { CustomWidgetConfig } from '../types';
import { getSimpleTextResponse } from '../services/geminiService';
import { RefreshCw, X, Lightbulb, Speaker, Loader2 } from 'lucide-react';

interface CustomWidgetProps {
    config: CustomWidgetConfig;
    onRemove: () => void;
    modelName: string;
    smartHomeState: {
        light: { on: boolean, setOn: (on: boolean) => void };
        speaker: { on: boolean, setOn: (on: boolean) => void };
    };
}

const CustomWidget: React.FC<CustomWidgetProps> = ({ config, onRemove, modelName, smartHomeState }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchGeminiContent = useCallback(async () => {
        if (config.type !== 'gemini' || !config.prompt) return;
        setIsLoading(true);
        const response = await getSimpleTextResponse(`As a wise assistant, provide a concise response for a small widget. The user's request is: "${config.prompt}"`, modelName);
        setContent(response);
        setIsLoading(false);
    }, [config.type, config.prompt, modelName]);

    useEffect(() => {
        if (config.type === 'gemini') {
            fetchGeminiContent();
        }
    }, [fetchGeminiContent, config.type]);

    const renderContent = () => {
        if (config.type === 'gemini') {
            return (
                <div className="flex-grow flex items-center justify-center text-center p-2">
                    {isLoading ? <Loader2 className="animate-spin text-[--secondary-text-color]" /> : <p className="text-[--primary-text-color] font-medium text-base italic">"{content}"</p>}
                </div>
            );
        }
        if (config.type === 'smarthome') {
            const isLight = config.device === 'light';
            const deviceState = isLight ? smartHomeState.light : smartHomeState.speaker;
            const Icon = isLight ? Lightbulb : Speaker;
            const statusText = isLight ? (deviceState.on ? "On" : "Off") : (deviceState.on ? "Playing" : "Paused");
            
            return (
                 <div className="flex flex-col items-center justify-center flex-grow cursor-pointer" onClick={() => deviceState.setOn(!deviceState.on)}>
                    <Icon className={`w-10 h-10 mb-2 transition-colors duration-300 ${deviceState.on ? 'text-[--accent-color]' : 'text-[--secondary-text-color]'}`} />
                    <p className={`font-bold text-lg transition-colors duration-300 ${deviceState.on ? 'text-[--primary-text-color]' : 'text-[--secondary-text-color]'}`}>{statusText}</p>
                 </div>
            );
        }
        return null;
    };

    return (
        <div className="card-style p-4 flex flex-col h-48 relative group min-w-[200px]">
             <div className="flex justify-between items-start flex-shrink-0">
                <h3 className="font-bold text-[--primary-text-color] pr-16 truncate">{config.title}</h3>
                <div className="absolute top-2 right-2 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {config.type === 'gemini' && !isLoading && (
                        <button onClick={fetchGeminiContent} className="p-1.5 rounded-full text-[--secondary-text-color] hover:bg-[--bg-hover-color] hover:text-[--primary-text-color]">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={onRemove} className="p-1.5 rounded-full text-[--secondary-text-color] hover:bg-[--bg-hover-color] hover:text-[--danger-color]">
                        <X className="w-4 h-4" />
                    </button>
                </div>
             </div>
             {renderContent()}
        </div>
    );
};

export default CustomWidget;
