import React, { useState, useEffect } from 'react';
import { Save, Server, CheckCircle, XCircle, Eye, EyeOff, AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ServiceConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

interface ConfigMap {
  radarr: ServiceConfig;
  sonarr: ServiceConfig;
}

const Settings: React.FC = () => {
  const [config, setConfig] = useState<ConfigMap>({
    radarr: { url: '', apiKey: '', enabled: false },
    sonarr: { url: '', apiKey: '', enabled: false }
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});

  useEffect(() => {
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSave = async (service: keyof ConfigMap) => {
    setTestStatus(prev => ({ ...prev, [service]: 'testing' }));
    
    const isConnected = await api.testConnection(config[service].url, config[service].apiKey);
    
    if (isConnected) {
         setTestStatus(prev => ({ ...prev, [service]: 'success' }));
         const newConfig = { ...config, [service]: { ...config[service], enabled: true }};
         setConfig(newConfig);
         localStorage.setItem('dashboarrd_config', JSON.stringify(newConfig));
         await Haptics.impact({ style: ImpactStyle.Medium });
    } else {
         setTestStatus(prev => ({ ...prev, [service]: 'error' }));
    }
  };

  const updateConfig = (service: keyof ConfigMap, field: keyof ServiceConfig, value: string) => {
    setConfig(prev => ({
        ...prev,
        [service]: { ...prev[service], [field]: value }
    }));
    if (testStatus[service] !== 'idle') {
        setTestStatus(prev => ({ ...prev, [service]: 'idle' }));
    }
  };

  const resetAll = () => {
    if (confirm("Are you sure you want to clear all settings? This will log you out.")) {
      localStorage.removeItem('dashboarrd_config');
      window.location.reload();
    }
  };

  const renderServiceCard = (key: keyof ConfigMap, title: string, port: string) => (
    <div className="bg-helm-800 rounded-xl border border-helm-700 p-4 space-y-4 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Server size={18} className="text-helm-accent" />
                <h3 className="font-semibold text-white">{title}</h3>
            </div>
            {testStatus[key] === 'success' && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium px-2 py-1 bg-emerald-500/10 rounded-full">
                    <CheckCircle size={12} /> Connected
                </div>
            )}
            {testStatus[key] === 'error' && (
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium px-2 py-1 bg-red-500/10 rounded-full">
                    <XCircle size={12} /> Failed
                </div>
            )}
            {testStatus[key] === 'testing' && (
                <div className="flex items-center gap-1.5 text-helm-400 text-xs font-medium px-2 py-1 bg-helm-700/50 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-helm-400 animate-bounce" /> Testing...
                </div>
            )}
        </div>
        
        <div className="space-y-3">
            <div>
                <label className="text-[10px] text-helm-400 uppercase font-bold tracking-wider mb-1.5 block ml-1">Server URL</label>
                <input 
                    type="text" 
                    placeholder={`http://192.168.1.x:${port}`}
                    value={config[key].url}
                    onChange={(e) => updateConfig(key, 'url', e.target.value)}
                    className="w-full bg-helm-900 border border-helm-700 rounded-lg p-3 text-sm text-white focus:border-helm-accent outline-none placeholder-helm-600 transition-colors"
                />
            </div>
            <div>
                <label className="text-[10px] text-helm-400 uppercase font-bold tracking-wider mb-1.5 block ml-1">API Key</label>
                <div className="relative">
                    <input 
                        type={showKeys[key] ? "text" : "password"}
                        value={config[key].apiKey}
                        onChange={(e) => updateConfig(key, 'apiKey', e.target.value)}
                        placeholder="Found in Settings > General"
                        className="w-full bg-helm-900 border border-helm-700 rounded-lg p-3 text-sm text-white focus:border-helm-accent outline-none pr-10 placeholder-helm-600 transition-colors"
                    />
                    <button 
                        onClick={() => setShowKeys(prev => ({...prev, [key]: !prev[key]}))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-helm-500 hover:text-white transition-colors"
                    >
                        {showKeys[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>
        </div>

        <button 
            onClick={() => handleSave(key)}
            disabled={testStatus[key] === 'testing' || !config[key].url || !config[key].apiKey}
            className="w-full py-2.5 bg-helm-700 hover:bg-helm-600 disabled:opacity-50 disabled:cursor-not-allowed active:bg-helm-accent rounded-lg text-sm font-medium text-white transition-all flex items-center justify-center gap-2 mt-2"
        >
            <Save size={16} />
            {testStatus[key] === 'success' ? 'Saved' : 'Test & Save Connection'}
        </button>
        {testStatus[key] === 'error' && (
             <p className="text-[10px] text-red-400 text-center mt-2 px-4">
                Connection failed. Ensure CORS is enabled if using PWA mode.
             </p>
        )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-helm-900">
        <div className="p-4 border-b border-helm-700/50 bg-helm-900/90 backdrop-blur-md sticky top-0 z-10">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-sm text-helm-400">Manage service connections</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 no-scrollbar">
            
            {!Capacitor.isNativePlatform() && (
                <div className="bg-helm-accent/10 border border-helm-accent/30 p-4 rounded-xl flex gap-3">
                    <ShieldAlert className="text-helm-accent shrink-0" size={20} />
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">PWA Mode (Browser)</p>
                        <p className="text-xs text-helm-300 leading-relaxed">
                            To connect to your local server, you must <strong>enable CORS</strong> in Radarr/Sonarr settings.
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
                <AlertTriangle className="text-amber-400 shrink-0" size={20} />
                <p className="text-xs text-amber-200 leading-relaxed">
                    <strong>Important:</strong> Enter your local IP address (e.g. 192.168.1.50) rather than 'localhost'.
                </p>
            </div>

            {renderServiceCard('radarr', 'Radarr (Movies)', '7878')}
            {renderServiceCard('sonarr', 'Sonarr (TV)', '8989')}

            <button 
                onClick={resetAll}
                className="w-full mt-3 flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
                <Trash2 size={14} /> Clear All Settings
            </button>
            
            <div className="text-center py-6">
                <p className="text-xs text-helm-600">Dashboarrd Mobile v1.0.3</p>
            </div>
        </div>
    </div>
  );
};

export default Settings;