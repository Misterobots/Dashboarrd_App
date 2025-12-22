
import React, { useState, useEffect } from 'react';
import { Save, Server, CheckCircle, XCircle, Eye, EyeOff, ShieldAlert, Trash2, Database, Tv, DownloadCloud, Github, ExternalLink, Shield, User } from 'lucide-react';
import { api } from '../services/api';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppConfig } from '../types';
import AppUpdater from './AppUpdater';
import ConfigSharing from './ConfigSharing';
import { APP_VERSION } from '../services/updateService';

interface ServiceConfig {
    url: string;
    apiKey: string;
    enabled: boolean;
}

interface SettingsProps {
    onModeSwitch?: () => void;
    isUserMode?: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onModeSwitch, isUserMode = false }) => {
    const [config, setConfig] = useState<AppConfig>({
        onboarded: true,
        radarr: { url: '', apiKey: '', enabled: false },
        sonarr: { url: '', apiKey: '', enabled: false },
        jellyseerr: { url: '', apiKey: '', enabled: false },
        sabnzbd: { url: '', apiKey: '', enabled: false },
        jellyfin: { url: '', apiKey: '', enabled: false }
    });
    const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
    const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});

    useEffect(() => {
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) setConfig(JSON.parse(saved));
    }, []);

    const testAndSave = async (service: 'radarr' | 'sonarr' | 'jellyseerr' | 'sabnzbd' | 'jellyfin') => {
        const serviceConfig = config[service];
        if (!serviceConfig.url) return;

        if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Medium });
        setTestStatus(prev => ({ ...prev, [service]: 'testing' }));

        const typeMap = { radarr: 'arr', sonarr: 'arr', jellyseerr: 'jellyseerr', sabnzbd: 'sabnzbd', jellyfin: 'jellyfin' } as const;
        const success = await api.testConnection(serviceConfig.url, serviceConfig.apiKey, typeMap[service]);

        const updatedConfig = {
            ...config,
            [service]: { ...serviceConfig, enabled: success }
        };
        setConfig(updatedConfig);
        localStorage.setItem('dashboarrd_config', JSON.stringify(updatedConfig));
        setTestStatus(prev => ({ ...prev, [service]: success ? 'success' : 'error' }));
    };

    const updateServiceField = (service: 'radarr' | 'sonarr' | 'jellyseerr' | 'sabnzbd' | 'jellyfin', field: 'url' | 'apiKey', value: string) => {
        const serviceConfig = config[service];
        setConfig(prev => ({
            ...prev,
            [service]: { ...serviceConfig, [field]: value }
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

    const handleImportConfig = (importedConfig: AppConfig) => {
        setConfig(importedConfig);
        localStorage.setItem('dashboarrd_config', JSON.stringify(importedConfig));
        window.location.reload();
    };

    const renderServiceCard = (key: 'radarr' | 'sonarr' | 'jellyseerr' | 'sabnzbd' | 'jellyfin', title: string, placeholder: string, type: 'arr' | 'sabnzbd' | 'jellyfin' | 'jellyseerr', icon: React.ReactNode) => {
        const serviceConfig = config[key];
        return (
            <div key={key} className="bg-helm-800 rounded-xl border border-helm-700 p-4 space-y-4 animate-in slide-in-from-bottom duration-500">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-helm-accent">{icon}</div>
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
                </div>
                <input
                    type="text"
                    value={serviceConfig.url}
                    onChange={e => updateServiceField(key, 'url', e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-helm-900 border border-helm-700 rounded-lg p-3 text-sm text-white placeholder-helm-500 focus:border-helm-accent outline-none"
                />
                <div className="relative">
                    <input
                        type={showKeys[key] ? 'text' : 'password'}
                        value={serviceConfig.apiKey}
                        onChange={e => updateServiceField(key, 'apiKey', e.target.value)}
                        placeholder="API Key"
                        className="w-full bg-helm-900 border border-helm-700 rounded-lg p-3 pr-10 text-sm text-white placeholder-helm-500 focus:border-helm-accent outline-none font-mono"
                    />
                    <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, [key]: !prev[key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-helm-500 hover:text-white"
                    >
                        {showKeys[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <button
                    onClick={() => testAndSave(key)}
                    disabled={testStatus[key] === 'testing'}
                    className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-colors disabled:opacity-50 ${testStatus[key] === 'success' ? 'bg-emerald-600 text-white' :
                            testStatus[key] === 'error' ? 'bg-red-600 text-white' :
                                'bg-helm-accent text-white'
                        }`}
                >
                    <Save size={16} />
                    {testStatus[key] === 'success' ? 'Saved' : 'Test & Save Connection'}
                </button>
            </div>
        );
    };

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
                                Direct connections may fail due to browser security (CORS). For full functionality, use the Android APK.
                            </p>
                        </div>
                    </div>
                )}

                {renderServiceCard('radarr', 'Radarr (Movies)', 'http://192.168.1.x:7878', 'arr', <Database size={18} />)}
                {renderServiceCard('sonarr', 'Sonarr (TV Shows)', 'http://192.168.1.x:8989', 'arr', <Server size={18} />)}
                {renderServiceCard('jellyseerr', 'Jellyseerr (Requests)', 'http://192.168.1.x:5055', 'jellyseerr', <Server size={18} />)}
                {renderServiceCard('sabnzbd', 'SABnzbd (Downloads)', 'http://192.168.1.x:8080', 'sabnzbd', <DownloadCloud size={18} />)}
                {renderServiceCard('jellyfin', 'Jellyfin (Media Server)', 'http://192.168.1.x:8096', 'jellyfin', <Tv size={18} />)}

                <AppUpdater />
                <ConfigSharing onImport={handleImportConfig} />

                <div className="bg-helm-800 rounded-xl border border-helm-700 p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Github size={18} className="text-white" />
                        <h3 className="font-semibold text-white">Project Info</h3>
                    </div>
                    <a
                        href="https://github.com/Misterobots/Dashboarrd_App"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-helm-900 border border-helm-700 active:bg-helm-700 transition-colors"
                    >
                        <span className="text-xs font-medium text-helm-300">View Source on GitHub</span>
                        <ExternalLink size={14} className="text-helm-500" />
                    </a>
                </div>

                <button
                    onClick={resetAll}
                    className="w-full mt-3 flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                >
                    <Trash2 size={14} /> Clear All Settings
                </button>

                {onModeSwitch && (
                    <button
                        onClick={onModeSwitch}
                        className="w-full mt-3 flex items-center justify-center gap-2 p-3 bg-helm-accent/10 border border-helm-accent/20 rounded-xl text-xs font-medium text-helm-accent hover:bg-helm-accent/20 transition-colors"
                    >
                        {isUserMode ? <Shield size={14} /> : <User size={14} />}
                        Switch to {isUserMode ? 'Admin' : 'User'} Mode
                    </button>
                )}

                <div className="text-center py-6">
                    <p className="text-xs text-helm-600">Dashboarrd Mobile v{APP_VERSION}</p>
                    <p className="text-[10px] text-helm-700 mt-1">{isUserMode ? 'User Mode' : 'Admin Mode'}</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
