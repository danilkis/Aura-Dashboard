import React from 'react';
import { Lightbulb, Speaker } from 'lucide-react';

interface DeviceCardProps {
    icon: React.ReactNode;
    name: string;
    status: string;
    isActive: boolean;
    onClick: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ icon, name, status, isActive, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`card-style p-4 transition-all duration-300 cursor-pointer border ${isActive ? 'border-[--accent-color]/50' : 'border-transparent'}`}
        >
             <div className={`mb-4 transition-colors ${isActive ? 'text-[--accent-color]' : 'text-[--secondary-text-color]'}`}>
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-md text-[--primary-text-color]">{name}</h3>
                <p className={`text-sm ${isActive ? 'text-[--primary-text-color]' : 'text-[--secondary-text-color]'}`}>{status}</p>
            </div>
        </div>
    );
}

interface DeviceControlViewProps {
    lightOn: boolean;
    setLightOn: (on: boolean) => void;
    speakerPlaying: boolean;
    setSpeakerPlaying: (playing: boolean) => void;
}

const DeviceControlView: React.FC<DeviceControlViewProps> = ({ lightOn, setLightOn, speakerPlaying, setSpeakerPlaying }) => {
    return (
        <div className="p-4 md:p-8 h-full">
            <h1 className="text-3xl font-bold text-[--primary-text-color] mb-6 drop-shadow-lg">Device Controls</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                <DeviceCard
                    icon={<Lightbulb className="w-8 h-8" />}
                    name="Overhead Light"
                    status={lightOn ? "On • 80%" : "Off"}
                    isActive={lightOn}
                    onClick={() => setLightOn(!lightOn)}
                />
                 <DeviceCard
                    icon={<Speaker className="w-8 h-8" />}
                    name="Kitchen Speaker"
                    status={speakerPlaying ? "Playing • 60%" : "Paused"}
                    isActive={speakerPlaying}
                    onClick={() => setSpeakerPlaying(!speakerPlaying)}
                />
            </div>
        </div>
    );
};

export default DeviceControlView;
