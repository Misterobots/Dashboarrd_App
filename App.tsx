import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, Compass, Settings as SettingsIcon, Loader2, Rocket, ArrowRight, CheckCircle2, Gauge, Home, Search, Clock } from 'lucide-react';
import Dashboard from './components/Dashboard';
import MediaCard from './components/MediaCard';
import Discovery from './components/Discovery';
import Performance from './components/Performance';
import MediaDetails from './components/MediaDetails';
import Settings from './components/Settings';
import UserHome from './components/user/UserHome';
import UniversalSearch from './components/user/UniversalSearch';
import UserRequests from './components/user/UserRequests';
import { api } from './services/api';
import { MediaType, MediaItem } from './types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// User tabs + Admin tabs when unlocked
type Tab = 'home' | 'search' | 'requests' | 'dashboard' | 'library' | 'discovery' | 'performance' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Admin mode toggle
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);

  useEffect(() => {
    const config = localStorage.getItem('dashboarrd_config');
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.adminModeEnabled) {
        setAdminModeEnabled(true);
      }
      if (!parsed.onboarded) {
        setShowOnboarding(true);
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

  const toggleAdminMode = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }

    const newAdminState = !adminModeEnabled;
    setAdminModeEnabled(newAdminState);

    // Save to config
    const saved = localStorage.getItem('dashboarrd_config');
    const config = saved ? JSON.parse(saved) : { onboarded: true };
    config.adminModeEnabled = newAdminState;
    localStorage.setItem('dashboarrd_config', JSON.stringify(config));

    // If disabling admin mode and on admin-only tab, switch to home
    if (!newAdminState && ['dashboard', 'library', 'performance'].includes(activeTab)) {
      setActiveTab('home');
    }
  };

  const completeOnboarding = () => {
    const saved = localStorage.getItem('dashboarrd_config');
    const config = saved ? JSON.parse(saved) : {};
    config.onboarded = true;
    localStorage.setItem('dashboarrd_config', JSON.stringify(config));
    setShowOnboarding(false);
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
    if (activeTab === 'library') {
      fetchLibrary();
    }
  }, [activeTab]);

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

  const renderContent = () => {
    if (selectedMedia) {
      return <MediaDetails item={selectedMedia} onBack={() => setSelectedMedia(null)} />;
    }

    switch (activeTab) {
      // User tabs
      case 'home': return <UserHome />;
      case 'search': return <UniversalSearch />;
      case 'requests': return <UserRequests />;

      // Admin tabs (only visible when adminModeEnabled)
      case 'dashboard': return adminModeEnabled ? <Dashboard /> : <UserHome />;
      case 'library':
        if (!adminModeEnabled) return <UserHome />;
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
      case 'performance': return adminModeEnabled ? <Performance /> : <UserHome />;
      case 'settings': return <Settings onAdminToggle={toggleAdminMode} adminEnabled={adminModeEnabled} />;
      default: return <UserHome />;
    }
  };

  const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isAdmin?: boolean }> =
    ({ active, onClick, icon, label, isAdmin }) => (
      <button onClick={onClick} className={`flex flex-col items-center justify-center w-14 gap-0.5 transition-colors pb-2 ${active ? 'text-white' : 'text-helm-500'}`}>
        <div className={`p-1.5 rounded-xl transition-colors ${active ? (isAdmin ? 'bg-orange-500/20' : 'bg-helm-accent/20') : ''}`}>
          {icon}
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-50'} ${isAdmin ? 'text-orange-400' : ''}`}>
          {label}
        </span>
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
        <div className="fixed bottom-0 left-0 right-0 bg-helm-900/95 backdrop-blur-xl border-t border-helm-700/50 flex items-center justify-around z-50 px-1 pb-safe h-[calc(5rem+env(safe-area-inset-bottom))]">
          {/* User tabs - always visible */}
          <NavButton active={activeTab === 'home'} onClick={() => handleTabChange('home')} icon={<Home size={22} />} label="Home" />
          <NavButton active={activeTab === 'search'} onClick={() => handleTabChange('search')} icon={<Search size={22} />} label="Search" />

          {/* Discovery - center button */}
          <div className="relative">
            <button
              onClick={() => handleTabChange('discovery')}
              className={`flex flex-col items-center justify-center gap-1 transition-all pb-2 group -translate-y-2 ${activeTab === 'discovery' ? 'text-white' : 'text-helm-500'}`}
            >
              <div className={`p-3 rounded-2xl shadow-xl transition-all transform group-active:scale-90 ${activeTab === 'discovery' ? 'bg-helm-accent scale-110' : 'bg-helm-800 border border-helm-700'}`}>
                <Compass size={26} />
              </div>
            </button>
          </div>

          <NavButton active={activeTab === 'requests'} onClick={() => handleTabChange('requests')} icon={<Clock size={22} />} label="Requests" />

          {/* Admin tabs - only when enabled */}
          {adminModeEnabled && (
            <>
              <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={20} />} label="Admin" isAdmin />
            </>
          )}

          <NavButton active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={<SettingsIcon size={22} />} label="Settings" />
        </div>
      )}
    </div>
  );
}

export default App;