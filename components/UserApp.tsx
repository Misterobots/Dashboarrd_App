import React, { useState, useEffect } from 'react';
import { Home, Search, Clock, Settings as SettingsIcon } from 'lucide-react';
import UserHome from './user/UserHome';
import UniversalSearch from './user/UniversalSearch';
import UserRequests from './user/UserRequests';
import Settings from './Settings';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

type UserTab = 'home' | 'search' | 'requests' | 'settings';

interface UserAppProps {
    onModeSwitch: () => void;
}

const UserApp: React.FC<UserAppProps> = ({ onModeSwitch }) => {
    const [activeTab, setActiveTab] = useState<UserTab>('home');

    const handleTabChange = async (tab: UserTab) => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        }
        setActiveTab(tab);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <UserHome />;
            case 'search': return <UniversalSearch />;
            case 'requests': return <UserRequests />;
            case 'settings': return <Settings onModeSwitch={onModeSwitch} isUserMode={true} />;
            default: return <UserHome />;
        }
    };

    const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> =
        ({ active, onClick, icon, label }) => (
            <button
                onClick={onClick}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors pb-2 ${active ? 'text-white' : 'text-helm-500'}`}
            >
                <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-helm-accent/20' : ''}`}>
                    {icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-50'}`}>
                    {label}
                </span>
            </button>
        );

    return (
        <div className="flex flex-col h-full w-full bg-helm-900 overflow-hidden relative">
            <main className="flex-1 overflow-hidden">
                {renderContent()}
            </main>

            {/* User Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-helm-900/90 backdrop-blur-xl border-t border-helm-700/50 flex items-center justify-around z-50 px-4 pb-safe h-[calc(5rem+env(safe-area-inset-bottom))]">
                <NavButton
                    active={activeTab === 'home'}
                    onClick={() => handleTabChange('home')}
                    icon={<Home size={22} />}
                    label="Home"
                />
                <NavButton
                    active={activeTab === 'search'}
                    onClick={() => handleTabChange('search')}
                    icon={<Search size={22} />}
                    label="Search"
                />
                <NavButton
                    active={activeTab === 'requests'}
                    onClick={() => handleTabChange('requests')}
                    icon={<Clock size={22} />}
                    label="Requests"
                />
                <NavButton
                    active={activeTab === 'settings'}
                    onClick={() => handleTabChange('settings')}
                    icon={<SettingsIcon size={22} />}
                    label="Settings"
                />
            </div>
        </div>
    );
};

export default UserApp;
