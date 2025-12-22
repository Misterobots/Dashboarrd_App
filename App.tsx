import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, Compass, Settings as SettingsIcon, Loader2, Rocket, ArrowRight, CheckCircle2, Gauge, Shield, User } from 'lucide-react';
import Dashboard from './components/Dashboard';
import MediaCard from './components/MediaCard';
import Discovery from './components/Discovery';
import ActivityQueue from './components/ActivityQueue';
import Performance from './components/Performance';
import MediaDetails from './components/MediaDetails';
import Settings from './components/Settings';
import UserApp from './components/UserApp';
import { api } from './services/api';
import { MediaType, MediaItem, AppMode } from './types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

type Tab = 'dashboard' | 'library' | 'discovery' | 'performance' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Mode state
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [showModeSelection, setShowModeSelection] = useState(false);

  useEffect(() => {
    const config = localStorage.getItem('dashboarrd_config');
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.appMode) {
        setAppMode(parsed.appMode);
      } else if (!parsed.onboarded) {
        setShowOnboarding(true);
      } else {
        // Existing user without mode - show selection
        setShowModeSelection(true);
      }
    } else {
      setShowOnboarding(true);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTabChange = async (tab: Tab) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    setActiveTab(tab);
  };

  const handleModeSelect = async (mode: AppMode) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }

    // Save mode to config
    const saved = localStorage.getItem('dashboarrd_config');
    const config = saved ? JSON.parse(saved) : { onboarded: true };
    config.appMode = mode;
    localStorage.setItem('dashboarrd_config', JSON.stringify(config));

    setAppMode(mode);
    setShowModeSelection(false);
    setShowOnboarding(false);
  };

  const handleModeSwitch = () => {
    setShowModeSelection(true);
  };

  const completeOnboarding = () => {
    const saved = localStorage.getItem('dashboarrd_config');
    const config = saved ? JSON.parse(saved) : {};
    config.onboarded = true;
    localStorage.setItem('dashboarrd_config', JSON.stringify(config));
    setShowOnboarding(false);
    setShowModeSelection(true);
  };

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
      const config = JSON.parse(saved);
      try {
        const [movies, series] = await Promise.all([
          api.getMovies(config.radarr),
          api.getSeries(config.sonarr)
        ]);
        setMediaItems([...movies, ...series]);
      } catch (e) { console.error(e); }
    }
    setIsLoadingLibrary(false);
  };

  useEffect(() => {
    if (activeTab === 'library' && appMode === 'admin') {
      fetchLibrary();
    }
  }, [activeTab, appMode]);

  // Mode Selection Screen
  if (showModeSelection) {
    return (
      <div className="flex flex-col min-h-screen bg-helm-900 items-center justify-center p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Choose Your Mode</h1>
          <p className="text-helm-400">Select how you want to use Dashboarrd</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* Admin Mode */}
          <button
            onClick={() => handleModeSelect('admin')}
            className="w-full bg-helm-800 border-2 border-helm-700 hover:border-helm-accent rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-helm-accent/20 rounded-xl">
                <Shield size={28} className="text-helm-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">Admin Mode</h3>
                <p className="text-sm text-helm-400 mt-1">
                  Full access to all services, settings, performance metrics, and management tools.
                </p>
                <p className="text-xs text-helm-500 mt-2">
                  • Dashboard • Library • Discovery • Performance • Settings
                </p>
              </div>
            </div>
          </button>

          {/* User Mode */}
          <button
            onClick={() => handleModeSelect('user')}
            className="w-full bg-helm-800 border-2 border-helm-700 hover:border-purple-500 rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <User size={28} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">User Mode</h3>
                <p className="text-sm text-helm-400 mt-1">
                  Simplified interface for browsing, searching, and requesting content.
                </p>
                <p className="text-xs text-helm-500 mt-2">
                  • Search • Request • Play • Track Requests
                </p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-xs text-helm-600 mt-8">
          You can change this later in Settings
        </p>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="flex flex-col min-h-screen bg-helm-900 items-center justify-center p-6 text-center">
        <Rocket size={64} className="text-helm-accent mb-6" />
        <h1 className="text-3xl font-bold text-white">Welcome to Dashboarrd</h1>
        <p className="text-helm-400 mt-2 max-w-xs">Your unified media server companion app</p>
        <button
          onClick={completeOnboarding}
          className="mt-10 bg-helm-accent text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 active:scale-95 transition-transform"
        >
          Get Started <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  // User Mode - render UserApp
  if (appMode === 'user') {
    return <UserApp onModeSwitch={handleModeSwitch} />;
  }

  // Admin Mode - original app
  const renderContent = () => {
    if (selectedMedia) {
      return <MediaDetails item={selectedMedia} onBack={() => setSelectedMedia(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'library':
        return (
          <div className="h-full flex flex-col p-4 pb-24">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white">Library</h1>
              <div className="flex bg-helm-800 rounded-lg p-1 border border-helm-700">
                {['ALL', 'MOVIE', 'SERIES'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setLibraryFilter(f as any)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${libraryFilter === f ? 'bg-helm-accent text-white font-bold' : 'text-helm-400 hover:text-white'}`}
                  >{f.charAt(0) + f.slice(1).toLowerCase()}</button>
                ))}
              </div>
            </div>
            {isLoadingLibrary ? (
              <div className="flex flex-1 items-center justify-center flex-col gap-3">
                <Loader2 size={32} className="animate-spin text-helm-accent" />
                <p className="text-sm text-helm-500">Syncing library...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 overflow-y-auto no-scrollbar pb-32">
                {mediaItems.length === 0 && (
                  <div className="col-span-full text-center py-20 text-helm-500">
                    <Film size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No media found. Check connection settings.</p>
                  </div>
                )}
                {mediaItems
                  .filter(item => libraryFilter === 'ALL' || item.type === libraryFilter)
                  .map(item => (
                    <MediaCard key={item.id} item={item} onClick={(item) => setSelectedMedia(item)} />
                  ))}
              </div>
            )}
          </div>
        );
      case 'discovery': return <Discovery />;
      case 'performance': return <Performance />;
      case 'settings': return <Settings onModeSwitch={handleModeSwitch} isUserMode={false} />;
      default: return <Dashboard />;
    }
  };

  const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors pb-2 ${active ? 'text-white' : 'text-helm-500'}`}>
      <div className={`p-1 rounded-lg transition-colors ${active ? 'bg-helm-accent/20' : ''}`}>{icon}</div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-50'}`}>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full w-full bg-helm-900 overflow-hidden relative">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full text-sm font-medium flex items-center gap-2 shadow-xl transition-opacity ${toast.type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'} text-white animate-in fade-in slide-in-from-top-2 duration-300`}>
          <CheckCircle2 size={18} />
          {toast.message}
        </div>
      )}

      <main className="flex-1 overflow-hidden">{renderContent()}</main>

      {!selectedMedia && (
        <div className="fixed bottom-0 left-0 right-0 bg-helm-900/90 backdrop-blur-xl border-t border-helm-700/50 flex items-center justify-around z-50 px-2 pb-safe h-[calc(5rem+env(safe-area-inset-bottom))]">
          <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={24} />} label="Home" />
          <NavButton active={activeTab === 'library'} onClick={() => handleTabChange('library')} icon={<Film size={24} />} label="Library" />
          <div className="relative">
            <button
              onClick={() => handleTabChange('discovery')}
              className={`flex flex-col items-center justify-center gap-1 transition-all pb-2 group -translate-y-2 ${activeTab === 'discovery' ? 'text-white' : 'text-helm-500'}`}
            >
              <div className={`p-4 rounded-2xl shadow-xl transition-all transform group-active:scale-90 ${activeTab === 'discovery' ? 'bg-helm-accent scale-110' : 'bg-helm-800 border border-helm-700'}`}>
                <Compass size={28} />
              </div>
            </button>
          </div>
          <NavButton active={activeTab === 'performance'} onClick={() => handleTabChange('performance')} icon={<Gauge size={24} />} label="Stats" />
          <NavButton active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={<SettingsIcon size={24} />} label="Setup" />
        </div>
      )}
    </div>
  );
}

export default App;