import React, { useState } from 'react';
import {
    ChevronDown, ChevronUp, PlayCircle, Users, Download, Pause, Play,
    Film, Tv, Clock, AlertCircle, CheckCircle2, Server, ListTodo,
    ExternalLink, RefreshCw, Trash2, Plus, Search, Calendar, Bell
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ServiceCardProps {
    name: string;
    type: 'jellyfin' | 'sabnzbd' | 'radarr' | 'sonarr' | 'jellyseerr';
    connected: boolean;
    data: any;
    url?: string;
    onAction?: (action: string, type: string) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, type, connected, data, url, onAction }) => {
    const [expanded, setExpanded] = useState(false);

    const handleToggle = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        }
        setExpanded(!expanded);
    };

    const handleAction = async (action: string) => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }
        onAction?.(action, type);
    };

    const openWebUI = () => {
        if (url) {
            window.open(url, '_blank');
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'jellyfin': return <PlayCircle size={20} />;
            case 'sabnzbd': return <Download size={20} />;
            case 'radarr': return <Film size={20} />;
            case 'sonarr': return <Tv size={20} />;
            case 'jellyseerr': return <ListTodo size={20} />;
            default: return <Server size={20} />;
        }
    };

    const getColorClasses = () => {
        switch (type) {
            case 'jellyfin': return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' };
            case 'sabnzbd': return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
            case 'radarr': return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' };
            case 'sonarr': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
            case 'jellyseerr': return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
            default: return { bg: 'bg-helm-accent/10', text: 'text-helm-accent', border: 'border-helm-accent/20' };
        }
    };

    const colors = getColorClasses();

    const ActionButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, variant?: 'default' | 'danger' }> =
        ({ icon, label, onClick, variant = 'default' }) => (
            <button
                onClick={onClick}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${variant === 'danger'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-helm-700/50 text-helm-300 border border-helm-600/50 hover:bg-helm-600/50'
                    }`}
            >
                {icon}
                {label}
            </button>
        );

    const renderExpandedContent = () => {
        if (!connected) {
            return (
                <div className="text-center py-4 text-helm-500 text-xs">
                    <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                    Not connected. Check Settings.
                </div>
            );
        }

        switch (type) {
            case 'jellyfin':
                return (
                    <div className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-white">{data?.activeStreams || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Streaming</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-sm font-medium text-helm-300 truncate">{data?.serverName || 'Server'}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Server</p>
                            </div>
                        </div>

                        {/* Now Playing */}
                        {data?.sessions && data.sessions.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] text-helm-500 uppercase font-bold flex items-center gap-1">
                                    <PlayCircle size={10} /> Now Playing
                                </span>
                                {data.sessions.slice(0, 3).map((session: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 bg-helm-900/50 rounded-lg p-2.5 border border-helm-700/50">
                                        <div className={`w-2 h-2 rounded-full ${session.playState === 'Playing' ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white truncate">{session.nowPlayingItem}</p>
                                            <p className="text-[10px] text-helm-500">{session.userName} • {session.deviceName}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <ActionButton icon={<ExternalLink size={12} />} label="Open Web" onClick={openWebUI} />
                            <ActionButton icon={<RefreshCw size={12} />} label="Refresh" onClick={() => handleAction('refresh')} />
                        </div>
                    </div>
                );

            case 'sabnzbd':
                return (
                    <div className="space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-helm-900/50 rounded-lg p-3">
                                <p className={`text-sm font-bold ${data?.status === 'Downloading' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                    {data?.status || 'Idle'}
                                </p>
                                <p className="text-[10px] text-helm-500 uppercase">Status</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3">
                                <p className="text-sm font-bold text-white">{data?.speed || '0 KB/s'}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Speed</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3">
                                <p className="text-sm font-medium text-helm-300">{data?.sizeLeft || '0 MB'}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Remaining</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3">
                                <p className="text-sm font-medium text-helm-300">{data?.timeLeft || '--'}</p>
                                <p className="text-[10px] text-helm-500 uppercase">ETA</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            {data?.status === 'Downloading' ? (
                                <ActionButton icon={<Pause size={12} />} label="Pause" onClick={() => handleAction('pause')} />
                            ) : (
                                <ActionButton icon={<Play size={12} />} label="Resume" onClick={() => handleAction('resume')} />
                            )}
                            <ActionButton icon={<ExternalLink size={12} />} label="Open Web" onClick={openWebUI} />
                        </div>
                    </div>
                );

            case 'radarr':
                return (
                    <div className="space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-white">{data?.totalMovies || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Movies</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-red-400">{data?.missingMovies || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Missing</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-blue-400">{data?.queueCount || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Queue</p>
                            </div>
                        </div>

                        {/* Storage */}
                        <div className="bg-helm-900/50 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-helm-400">Free Space</span>
                            <span className="text-sm font-medium text-emerald-400">{data?.freeSpace || 'N/A'}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <ActionButton icon={<Search size={12} />} label="Search All" onClick={() => handleAction('searchAll')} />
                            <ActionButton icon={<RefreshCw size={12} />} label="RSS Sync" onClick={() => handleAction('rssSync')} />
                            <ActionButton icon={<ExternalLink size={12} />} label="Open Web" onClick={openWebUI} />
                        </div>
                    </div>
                );

            case 'sonarr':
                return (
                    <div className="space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-white">{data?.totalSeries || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Series</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-red-400">{data?.missingEpisodes || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Missing</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-blue-400">{data?.queueCount || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Queue</p>
                            </div>
                        </div>

                        {/* Storage */}
                        <div className="bg-helm-900/50 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-helm-400">Free Space</span>
                            <span className="text-sm font-medium text-emerald-400">{data?.freeSpace || 'N/A'}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <ActionButton icon={<Calendar size={12} />} label="Calendar" onClick={() => handleAction('calendar')} />
                            <ActionButton icon={<RefreshCw size={12} />} label="RSS Sync" onClick={() => handleAction('rssSync')} />
                            <ActionButton icon={<ExternalLink size={12} />} label="Open Web" onClick={openWebUI} />
                        </div>
                    </div>
                );

            case 'jellyseerr':
                return (
                    <div className="space-y-4">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-yellow-400">{data?.pendingRequests || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Pending</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-emerald-400">{data?.approvedRequests || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Approved</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-blue-400">{data?.processingRequests || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Processing</p>
                            </div>
                            <div className="bg-helm-900/50 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-helm-400">{data?.availableRequests || 0}</p>
                                <p className="text-[10px] text-helm-500 uppercase">Available</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <ActionButton icon={<Bell size={12} />} label="Approve All" onClick={() => handleAction('approveAll')} />
                            <ActionButton icon={<ExternalLink size={12} />} label="Open Web" onClick={openWebUI} />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const getQuickStat = () => {
        if (!connected) return 'Offline';
        switch (type) {
            case 'jellyfin': return `${data?.activeStreams || 0} streaming`;
            case 'sabnzbd': return data?.speed || 'Idle';
            case 'radarr': return `${data?.totalMovies || 0} movies`;
            case 'sonarr': return `${data?.totalSeries || 0} series`;
            case 'jellyseerr': return `${data?.pendingRequests || 0} pending`;
            default: return 'Connected';
        }
    };

    return (
        <div
            className={`bg-helm-800 rounded-2xl border border-helm-700 overflow-hidden transition-all duration-300 ${expanded ? 'shadow-lg shadow-black/20' : ''}`}
        >
            <button
                onClick={handleToggle}
                className="w-full p-4 flex items-center justify-between active:bg-helm-700/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text}`}>
                        {getIcon()}
                    </div>
                    <div className="text-left">
                        <h4 className="font-semibold text-white text-sm">{name}</h4>
                        <p className={`text-xs ${connected ? 'text-helm-400' : 'text-red-400'}`}>
                            {getQuickStat()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {connected ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                    )}
                    <div className={`p-1 rounded-md transition-transform ${expanded ? 'rotate-180' : ''}`}>
                        <ChevronDown size={16} className="text-helm-500" />
                    </div>
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="pt-3 border-t border-helm-700">
                        {renderExpandedContent()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceCard;
