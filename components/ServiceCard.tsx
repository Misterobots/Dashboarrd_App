import React, { useState, useEffect } from 'react';
import {
    ChevronDown, ChevronUp, PlayCircle, Users, Download, Pause, Play,
    Film, Tv, Clock, AlertCircle, CheckCircle2, Server, ListTodo
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ServiceCardProps {
    name: string;
    type: 'jellyfin' | 'sabnzbd' | 'radarr' | 'sonarr' | 'jellyseerr';
    connected: boolean;
    data: any;
    onRefresh?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, type, connected, data, onRefresh }) => {
    const [expanded, setExpanded] = useState(false);

    const handleToggle = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        }
        setExpanded(!expanded);
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

    const getColor = () => {
        switch (type) {
            case 'jellyfin': return 'purple';
            case 'sabnzbd': return 'orange';
            case 'radarr': return 'yellow';
            case 'sonarr': return 'blue';
            case 'jellyseerr': return 'emerald';
            default: return 'helm-accent';
        }
    };

    const color = getColor();

    const renderExpandedContent = () => {
        if (!connected) {
            return (
                <div className="text-center py-4 text-helm-500 text-xs">
                    Not connected. Check Settings.
                </div>
            );
        }

        switch (type) {
            case 'jellyfin':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Active Streams</span>
                            <span className="text-sm font-bold text-white">{data?.activeStreams || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Server</span>
                            <span className="text-xs text-helm-300 truncate max-w-[120px]">{data?.serverName || 'Unknown'}</span>
                        </div>
                        {data?.sessions && data.sessions.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-helm-700">
                                <span className="text-[10px] text-helm-500 uppercase font-bold">Now Playing</span>
                                {data.sessions.slice(0, 3).map((session: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 bg-helm-900/50 rounded-lg p-2">
                                        <Users size={12} className="text-purple-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white truncate">{session.nowPlayingItem}</p>
                                            <p className="text-[10px] text-helm-500">{session.userName}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'sabnzbd':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Status</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${data?.status === 'Downloading' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {data?.status || 'Idle'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Speed</span>
                            <span className="text-sm font-bold text-white">{data?.speed || '0 KB/s'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Remaining</span>
                            <span className="text-xs text-helm-300">{data?.sizeLeft || '0 MB'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">ETA</span>
                            <span className="text-xs text-helm-300">{data?.timeLeft || '--'}</span>
                        </div>
                    </div>
                );

            case 'radarr':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Total Movies</span>
                            <span className="text-sm font-bold text-white">{data?.totalMovies || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Missing</span>
                            <span className="text-xs font-medium text-red-400">{data?.missingMovies || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">In Queue</span>
                            <span className="text-xs text-helm-300">{data?.queueCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Free Space</span>
                            <span className="text-xs text-helm-300">{data?.freeSpace || 'N/A'}</span>
                        </div>
                    </div>
                );

            case 'sonarr':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Total Series</span>
                            <span className="text-sm font-bold text-white">{data?.totalSeries || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Missing Episodes</span>
                            <span className="text-xs font-medium text-red-400">{data?.missingEpisodes || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">In Queue</span>
                            <span className="text-xs text-helm-300">{data?.queueCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Free Space</span>
                            <span className="text-xs text-helm-300">{data?.freeSpace || 'N/A'}</span>
                        </div>
                    </div>
                );

            case 'jellyseerr':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Pending Requests</span>
                            <span className="text-sm font-bold text-white">{data?.pendingRequests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Approved</span>
                            <span className="text-xs text-emerald-400">{data?.approvedRequests || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-helm-400">Processing</span>
                            <span className="text-xs text-blue-400">{data?.processingRequests || 0}</span>
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
            className={`bg-helm-800 rounded-2xl border border-helm-700 overflow-hidden transition-all duration-300 ${expanded ? 'shadow-lg' : ''}`}
        >
            <button
                onClick={handleToggle}
                className="w-full p-4 flex items-center justify-between active:bg-helm-700/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-${color}-500/10 text-${color}-400`}>
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
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-red-400" />
                    )}
                    {expanded ? (
                        <ChevronUp size={18} className="text-helm-500" />
                    ) : (
                        <ChevronDown size={18} className="text-helm-500" />
                    )}
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
