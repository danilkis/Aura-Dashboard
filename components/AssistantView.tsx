import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Sparkles, Mic, X, AlertTriangle, Square } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

interface AssistantViewProps {
    // State
    isOpen: boolean;
    messages: ChatMessage[];
    input: string;
    isLoading: boolean;
    isRecording: boolean;
    apiError: string | null;

    // Handlers
    setIsOpen: (isOpen: boolean) => void;
    setInput: (input: string) => void;
    setApiError: (error: string | null) => void;
    handleSend: () => void;
    handleMicClick: () => void;
}

const AssistantView: React.FC<AssistantViewProps> = ({
    isOpen,
    messages,
    input,
    isLoading,
    isRecording,
    apiError,
    setIsOpen,
    setInput,
    setApiError,
    handleSend,
    handleMicClick
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if(isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* FAB */}
            <div 
                className={`fixed bottom-8 right-8 z-50 group transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
                onClick={() => {
                    if (!isRecording) setIsOpen(true);
                }}
                aria-label="Open Assistant"
            >
                <div className="card-style w-80 h-16 flex items-center px-5 cursor-pointer shadow-2xl hover:bg-[--bg-hover-color] transition-colors duration-300">
                    <p className="flex-grow text-[--primary-text-color] text-base">Ask question...</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleMicClick(); }}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                        className={`w-10 h-10 flex items-center justify-center bg-[--accent-color] rounded-full transition-all ${isRecording ? 'animate-pulse' : ''}`}>
                         {isRecording ? <Square className="w-5 h-5 text-white" fill="white" /> : <Mic className="w-5 h-5 text-white" />}
                    </button>
                </div>
            </div>
            
            {/* Chat Window */}
            <div className={`fixed bottom-6 right-6 w-[26rem] h-[calc(100vh-4.5rem)] max-h-[44rem] flex flex-col z-50 transition-all duration-300 ease-in-out origin-bottom-right
                ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
            `}>
                <div className="card-style relative w-full h-full flex flex-col shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[--card-border-color] flex-shrink-0">
                        <h2 className="font-bold text-[--primary-text-color] flex items-center text-lg"><Sparkles className="w-5 h-5 mr-2 text-[--accent-color]" />Dashy</h2>
                        <button onClick={() => setIsOpen(false)} className="text-[--secondary-text-color] hover:text-[--primary-text-color] p-1 rounded-full hover:bg-[--bg-hover-color] transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    {/* Messages container */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl ${msg.role === 'user' ? 'bg-[--accent-color] text-white' : 'bg-[--input-bg-color] text-[--primary-text-color]'}`}>
                                    {msg.role === 'user' && msg.audio?.waveform ? (
                                        <AudioWaveform waveform={msg.audio.waveform} color="white" />
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex justify-start">
                                <div className="px-4 py-3 rounded-2xl bg-[--input-bg-color]">
                                   <div className="flex items-center space-x-2">
                                       <div className="w-2 h-2 bg-[--secondary-text-color] rounded-full animate-pulse"></div>
                                       <div className="w-2 h-2 bg-[--secondary-text-color] rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                       <div className="w-2 h-2 bg-[--secondary-text-color] rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                   </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Input form */}
                    <div className="p-3 flex-shrink-0 border-t border-[--card-border-color]">
                         {apiError ? (
                            <div className="bg-[--input-bg-color] border border-[--danger-color]/30 text-[--danger-color] p-3 rounded-lg flex items-center text-sm gap-2">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span className="flex-grow">{apiError}</span>
                                <button onClick={() => setApiError(null)} className="p-1 rounded-full hover:bg-[--danger-color]/20">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                             <div className="flex items-center space-x-2 bg-[--input-bg-color] rounded-xl pr-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type a message or use the mic"
                                    className="w-full bg-transparent p-3 focus:outline-none text-[--primary-text-color] placeholder:text-[--input-placeholder-color]"
                                    disabled={isLoading || isRecording}
                                />
                                <button onClick={handleMicClick} disabled={isLoading} className="p-2 rounded-full hover:bg-[--bg-hover-color] text-[--secondary-text-color] hover:text-[--primary-text-color] transition-colors">
                                    {isRecording ? <Square className="w-5 h-5 text-[--accent-color]" fill="currentColor" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <button onClick={handleSend} disabled={isLoading || isRecording || input.trim() === ''} className="bg-[--accent-color] rounded-full p-2 text-white disabled:opacity-50 transition-opacity">
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AssistantView;
