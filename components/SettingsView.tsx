

import React from 'react';

interface SettingsViewProps {
    modelName: string;
    setModelName: (model: string) => void;
    imageGenerationEnabled: boolean;
    setImageGenerationEnabled: (enabled: boolean) => void;
}

const availableModels = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'The latest, fastest, and most capable model.', disabled: false },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'A powerful, next-generation model for complex tasks.', disabled: false },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'A fast and versatile model from the Gemini 2.0 family.', disabled: false },
    { id: 'gemini-2.5-flash-lite-preview-06-17', name: 'Gemini 2.5 Flash Lite (Preview)', description: 'A lightweight preview version of the 2.5 flash model.', disabled: false },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'A lightweight and fast model from the Gemini 2.0 family.', disabled: false },
];


const SettingsView: React.FC<SettingsViewProps> = ({ modelName, setModelName, imageGenerationEnabled, setImageGenerationEnabled }) => {
    return (
        <div className="p-4 md:p-8 h-full text-[--primary-text-color]">
            <h1 className="text-3xl font-bold mb-8 drop-shadow-lg text-[--primary-text-color]">Settings</h1>

            <div className="max-w-2xl mx-auto">
                <div className="card-style p-6">
                    <h2 className="text-xl font-bold mb-1 text-[--primary-text-color]">Model Configuration</h2>
                    <p className="text-[--secondary-text-color] mb-6">Select the AI model for text generation. Using different models may affect response speed and quality.</p>

                    <div className="space-y-4">
                        {availableModels.map(model => (
                            <div
                                key={model.id}
                                onClick={() => !model.disabled && setModelName(model.id)}
                                className={`
                                    p-4 rounded-xl border-2 transition-all flex items-center
                                    ${modelName === model.id ? 'border-[--accent-color] bg-[--bg-hover-color]' : 'border-[--card-border-color] hover:border-[--secondary-text-color]'}
                                    ${model.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                <div className="flex-grow">
                                    <h3 className="font-bold text-lg text-[--primary-text-color]">{model.name}</h3>
                                    <p className="text-[--secondary-text-color] text-sm">{model.description}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ml-6 flex items-center justify-center transition-all duration-200 ${
                                    modelName === model.id ? 'border-[--accent-color]' : 'border-[--secondary-text-color]'
                                }`}>
                                    {modelName === model.id && (
                                        <div className="w-3 h-3 bg-[--accent-color] rounded-full"></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-[--secondary-text-color] mt-6">
                        Voice input is processed by 'gemini-2.5-flash' and spoken responses use your browser's built-in voice. Image generation uses 'imagen-3.0-generate-002'.
                    </p>
                </div>

                <div className="card-style p-6 mt-8">
                    <h2 className="text-xl font-bold mb-1 text-[--primary-text-color]">Image Generation</h2>
                    <p className="text-[--secondary-text-color] mb-6">Enable or disable AI-generated background images based on weather.</p>
                    <div className="flex items-center justify-between bg-[--input-bg-color] p-3 rounded-lg">
                        <span className="font-medium text-[--primary-text-color] pl-2">Generate Background Images</span>
                        <label htmlFor="image-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={imageGenerationEnabled}
                                onChange={(e) => setImageGenerationEnabled(e.target.checked)}
                                id="image-toggle"
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[--secondary-text-color] rounded-full peer peer-focus:ring-2 peer-focus:ring-[--accent-color]/50 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--accent-color]"></div>
                        </label>
                    </div>
                     <p className="text-xs text-[--secondary-text-color] mt-4">
                        When disabled, a default background will be used. This can help save on API usage.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;