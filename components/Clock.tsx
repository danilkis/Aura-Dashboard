import React, { useState, useEffect } from 'react';

interface ClockProps {
    style?: React.CSSProperties;
}

const Clock: React.FC<ClockProps> = ({ style }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };

    return (
        <div className="text-center" style={style}>
            <h1 className="text-7xl md:text-8xl font-bold text-[--primary-text-color] tracking-tighter" style={{textShadow: '0 4px 20px var(--card-shadow-color)'}}>
                {formatTime(time).replace(' ', '')}
            </h1>
            <p className="text-lg md:text-xl font-medium text-[--secondary-text-color]" style={{textShadow: '0 2px 8px var(--card-shadow-color)'}}>
                {formatDate(time)}
            </p>
        </div>
    );
};

export default Clock;
