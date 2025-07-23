import React, { useRef, useEffect } from 'react';

interface AudioWaveformProps {
  waveform: number[];
  color: string;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ waveform, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveform || waveform.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(dpr, dpr);
    
    context.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const middle = height / 2;

    const barWidth = 2;
    const gap = 1;
    const numBars = Math.floor(width / (barWidth + gap));
    const step = Math.floor(waveform.length / numBars);

    context.fillStyle = color;

    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += waveform[(i * step) + j];
      }
      const avg = sum / step;
      
      const barHeight = Math.max(1, avg * height);
      const x = i * (barWidth + gap);
      const y = middle - barHeight / 2;

      context.fillRect(x, y, barWidth, barHeight);
    }
  }, [waveform, color]);

  return (
    <div className="w-full h-10 flex items-center">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};

export default AudioWaveform;
