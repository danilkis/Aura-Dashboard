import React from 'react';

const Onboarding: React.FC = () => {
    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900 transition-opacity duration-500`}>
            <div className="relative text-center">
                {/* Holographic Liquid Effect */}
                <div className="absolute -inset-10 animate-[spin_10s_linear_infinite]">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-pink-500 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-liquid-trail"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-liquid-trail animation-delay-2000"></div>
                    <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-liquid-trail animation-delay-4000"></div>
                </div>
                
                {/* Welcome Text */}
                <div className="relative">
                    <h1 className="text-4xl md:text-5xl font-bold text-[--primary-text-color] tracking-wider" style={{ textShadow: '0 0 15px rgba(255,255,255,0.5)' }}>
                        welcome again, danon
                    </h1>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;