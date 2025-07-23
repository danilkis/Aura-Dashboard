import React from 'react';
import { View } from '../types';
import { LayoutGrid, Home, Mail, Settings } from 'lucide-react';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center space-y-1.5 w-full p-3 rounded-2xl transition-all duration-300 ease-in-out ${
            isActive ? 'bg-[--accent-color] text-white shadow-lg' : 'text-[--secondary-text-color] hover:bg-[--bg-hover-color] hover:text-[--primary-text-color]'
        }`}
        aria-label={label}
    >
        <div className="w-7 h-7">{icon}</div>
        <span className="text-sm font-semibold tracking-wide">{label}</span>
    </button>
);

const navItems = [
    { view: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
    { view: 'home', label: 'Home', Icon: Home },
    { view: 'mail', label: 'Mail', Icon: Mail },
    { view: 'settings', label: 'Settings', Icon: Settings },
] as const;


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
    return (
        <div className="hidden md:flex flex-col items-center p-3 z-10">
             <div className="card-style w-24 flex flex-col items-center p-2">
                <nav className="w-full flex flex-col items-center space-y-3 mt-4">
                    {navItems.map(({ view, label, Icon }) => {
                        const isActive = activeView === view;
                        return (
                            <NavItem
                                key={view}
                                icon={<Icon strokeWidth={isActive ? 2.5 : 2} />}
                                label={label}
                                isActive={isActive}
                                onClick={() => setActiveView(view)}
                            />
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default Sidebar;
