import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, Compass, Settings as SettingsIcon, Loader2, Rocket, ArrowRight, CheckCircle2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import MediaCard from './components/MediaCard';
import Discovery from './components/Discovery';
import ActivityQueue from './components/ActivityQueue';
import MediaDetails from './components/MediaDetails';
import Settings from './components/Settings';
import { api } from './services/api';
import { MediaType, MediaItem } from './types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

type Tab = 'dashboard' | 'library' | 'discovery' | 'activity' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [libraryFilter, setLibraryFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [onboarded, setOnboarded] = useState<boolean>(true);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('dashboarrd_config');
    if (!saved) {
        setOnboarded(false);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTabChange = (tab: Tab) => {
    Haptics.impact({ style: ImpactStyle.Light });
    setActiveTab(tab);
    setSelectedMedia(null);
  };

  const completeOnboarding = () => {
    setOnboarded(true);
    setActiveTab('settings');
    showToast("Setup started. Enter your server details.");
  };

  useEffect(() => {
    if (activeTab === 'library' && onboarded) {
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
                    setMediaItems([...movies, ...series].sort((a, b) => a.title.localeCompare(b.title)));
                } catch (e) {
                    showToast("Library sync failed", "error");
                }
            }
            setIsLoadingLibrary(false);
        };
        fetchLibrary();
    }
  }, [activeTab, onboarded]);

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
      case 'activity': return <ActivityQueue />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  if (!onboarded) {
    return (
        <div className="h-screen w-full bg-helm-900 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-700 pb-safe pt-safe">
            <div className="w-24 h-24 bg-helm-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-helm-accent/20 rotate-12">
                <Rocket size={48} className="text-white -rotate-12" />
            </div>
            <div className="space-y-3">
                <h1 className="text-4xl font-black text-white tracking-tight">Dashboarrd</h1>
                <p className="text-helm-400 max-w-xs mx-auto text-lg leading-relaxed">
                    Your personal navigator for Radarr and Sonarr.
                </p>
            </div>
            <div className="space-y-4 w-full max-w-xs">
                <div className="flex items-center gap-3 text-left bg-helm-800/50 p-4 rounded-2xl border border-helm-700/50">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <p className="text-sm text-helm-300">Direct local connection</p>
                </div>
                <div className="flex items-center gap-3 text-left bg-helm-800/50 p-4 rounded-2xl border border-helm-700/50">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <p className="text-sm text-helm-300">Discover & Request media</p>
                </div>
            </div>
            <button 
                onClick={completeOnboarding}
                className="w-full max-w-xs py-4 bg-helm-accent hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
            >
                Get Started <ArrowRight size={20} />
            </button>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-helm-900 overflow-hidden relative">
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>

      {/* Toast Notification */}
      {toast && (
          <div className={`fixed top-12 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-in slide-in-from-top duration-300 font-medium text-sm ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={16} /> : null}
            {toast.message}
          </div>
      )}

      {!selectedMedia && (
          <div className="fixed bottom-0 left-0 right-0 bg-helm-900/90 backdrop-blur-xl border-t border-helm-700/50 flex items-center justify-around z-50 px-2 pb-safe h-[calc(5rem+env(safe-area-inset-bottom))]">
            <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={24} />} label="Dashboard" />
            <NavButton active={activeTab === 'library'} onClick={() => handleTabChange('library')} icon={<Film size={24} />} label="Library" />
            <div className="relative -top-6">
                <button 
                    onClick={() => handleTabChange('discovery')}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-90 ${activeTab === 'discovery' ? 'bg-white text-helm-accent rotate-12' : 'bg-helm-accent text-white shadow-helm-accent/30'}`}
                >
                    <Compass size={28} />
                </button>
            </div>
            <NavButton active={activeTab === 'activity'} onClick={() => handleTabChange('activity')} icon={<div className="w-6 h-6 rounded-lg bg-helm-700 flex items-center justify-center text-[10px] font-bold">Q</div>} label="Activity" />
            <NavButton active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={<SettingsIcon size={24} />} label="Setup" />
        </div>
      )}
    </div>
  );
}

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 gap-1 transition-colors pb-2 ${active ? 'text-white' : 'text-helm-500'}`}>
    <div className={`p-1 rounded-lg transition-colors ${active ? 'bg-helm-accent/20' : ''}`}>{icon}</div>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-50'}`}>{label}</span>
  </button>
);

export default App;