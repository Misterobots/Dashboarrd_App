import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Film, Settings as SettingsIcon, Loader2, Rocket, ArrowRight, CheckCircle2, Home, Search, Clock, LogIn, User, Shield } from 'lucide-react';
import Dashboard from './components/Dashboard';
import MediaCard from './components/MediaCard';
import Performance from './components/Performance';
import MediaDetails from './components/MediaDetails';
import Settings from './components/Settings';
import UserHome from './components/user/UserHome';
import UniversalSearch from './components/user/UniversalSearch';
import UserRequests from './components/user/UserRequests';
import { api } from './services/api';
import { MediaItem } from './types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { checkAuthStatus, redirectToLogin, logout, AuthUser, getCachedAuthState, saveAuthState, getUserInfo } from './services/authService';

type Tab = 'home' | 'search' | 'requests' | 'dashboard' | 'library' | 'performance' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'ALL' | 'MOVIE' | 'SERIES'>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Authentication state
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Check authentication on load
  useEffect(() => {
    const initAuth = async () => {
      setIsCheckingAuth(true);

      // First check cached auth
      const cached = getCachedAuthState();
      if (cached) {
        setCurrentUser(cached);
        setIsAuthenticated(true);
      }

      try {
        // Verify with Authelia
        const status = await checkAuthStatus();

        if (status.authenticated && status.user) {
          setCurrentUser(status.user);
          setIsAuthenticated(true);
          saveAuthState(status.user);
        } else {
          // Try userinfo endpoint as fallback
          const userInfo = await getUserInfo();
          if (userInfo) {
            setCurrentUser(userInfo);
            setIsAuthenticated(true);
            saveAuthState(userInfo);
          } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
            saveAuthState(null);
          }
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        // Keep cached auth if available
        if (!cached) {
          setIsAuthenticated(false);
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    // Check onboarding
    const config = localStorage.getItem('dashboarrd_config');
    if (config) {
      const parsed = JSON.parse(config);
      if (!parsed.onboarded) {
        setShowOnboarding(true);
      }
    } else {
      setShowOnboarding(true);
    }

    initAuth();
  }, []);

  const handleTabChange = async (tab: Tab) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    setActiveTab(tab);
  };

  const handleLogin = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
    redirectToLogin();
  };

  const handleLogout = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
    await logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
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

  // Loading screen while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex flex-col min-h-screen bg-helm-900 items-center justify-center p-6">
        <Loader2 size={48} className="animate-spin text-helm-accent mb-4" />
        <p className="text-helm-400 text-sm">Authenticating...</p>
      </div>
    );
  }

  // Login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen bg-helm-900 items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-helm-800 rounded-2xl flex items-center justify-center mb-6 border border-helm-700">
          <Shield size={40} className="text-helm-accent" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Login Required</h1>
        <p className="text-helm-400 text-sm max-w-xs mb-8">
          Sign in with your Shively Media account to access Dashboarrd
        </p>
        <button
          onClick={handleLogin}
          className="bg-helm-accent text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-helm-accent/20"
        >
          <LogIn size={20} />
          Sign In
        </button>
        <p className="text-xs text-helm-600 mt-6">
          Powered by Authelia SSO
        </p>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding) {
    return (
      <div className="flex flex-col min-h-screen bg-helm-900 items-center justify-center p-6 text-center">
        <Rocket size={64} className="text-helm-accent mb-6" />
        <h1 className="text-3xl font-bold text-white">Welcome, {currentUser?.displayName || currentUser?.username}!</h1>
        <p className="text-helm-400 mt-2 max-w-xs">Your unified media server companion app</p>
        {currentUser?.isAdmin && (
          <div className="mt-4 px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full">
            <p className="text-xs font-bold text-orange-400">Admin Access Enabled</p>
          </div>
        )}
        <button
          onClick={completeOnboarding}
          className="mt-10 bg-helm-accent text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 active:scale-95 transition-transform"
        >
          Get Started <ArrowRight size={20} />
        </button>
      </div>
    );
  }

  const isAdmin = currentUser?.isAdmin || false;

  const renderContent = () => {
    if (selectedMedia) {
      return <MediaDetails item={selectedMedia} onBack={() => setSelectedMedia(null)} />;
    }

    switch (activeTab) {
      case 'home': return <UserHome />;
      case 'search': return <UniversalSearch />;
      case 'requests': return <UserRequests />;

      // Admin tabs (only accessible if isAdmin)
      case 'dashboard': return isAdmin ? <Dashboard /> : <UserHome />;
      case 'library':
        if (!isAdmin) return <UserHome />;
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
      case 'performance': return isAdmin ? <Performance /> : <UserHome />;
      case 'settings': return <Settings user={currentUser} onLogout={handleLogout} />;
      default: return <UserHome />;
    }
  };

  const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isAdminTab?: boolean }> =
    ({ active, onClick, icon, label, isAdminTab }) => (
      <button onClick={onClick} className={`flex flex-col items-center justify-center w-14 gap-0.5 transition-colors pb-2 ${active ? 'text-white' : 'text-helm-500'}`}>
        <div className={`p-1.5 rounded-xl transition-colors ${active ? (isAdminTab ? 'bg-orange-500/20' : 'bg-helm-accent/20') : ''}`}>
          {icon}
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-50'} ${isAdminTab ? 'text-orange-400' : ''}`}>
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
          <NavButton active={activeTab === 'home'} onClick={() => handleTabChange('home')} icon={<Home size={22} />} label="Home" />
          <NavButton active={activeTab === 'requests'} onClick={() => handleTabChange('requests')} icon={<Clock size={22} />} label="Requests" />

          {/* Search - center button */}
          <div className="relative">
            <button
              onClick={() => handleTabChange('search')}
              className={`flex flex-col items-center justify-center gap-1 transition-all pb-2 group -translate-y-2 ${activeTab === 'search' ? 'text-white' : 'text-helm-500'}`}
            >
              <div className={`p-3.5 rounded-2xl shadow-xl transition-all transform group-active:scale-90 ${activeTab === 'search' ? 'bg-helm-accent scale-110' : 'bg-helm-800 border border-helm-700'}`}>
                <Search size={26} />
              </div>
            </button>
          </div>

          {/* Admin tab - only for admins */}
          {isAdmin && (
            <NavButton active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={<LayoutDashboard size={20} />} label="Admin" isAdminTab />
          )}

          <NavButton active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={<SettingsIcon size={22} />} label="Settings" />
        </div>
      )}
    </div>
  );
}

export default App;