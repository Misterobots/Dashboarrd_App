import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, XCircle, Clock, PlayCircle, Film, Tv,
    RefreshCw, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import { AppConfig, MediaType } from '../../types';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { launchJellyfin } from '../../services/deepLinkService';

interface ServiceStatus {
    name: string;
    connected: boolean;
    type: 'jellyfin' | 'jellyseerr' | 'radarr' | 'sonarr';
}

interface PendingRequest {
    id: number;
    title: string;
    type: 'movie' | 'tv';
    posterUrl: string;
    status: string;
    requestedAt: string;
}

const UserHome: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [requests, setRequests] = useState<PendingRequest[]>([]);
    const [recentItems, setRecentItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [jellyfinUrl, setJellyfinUrl] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const saved = localStorage.getItem('dashboarrd_config');
        if (!saved) {
            setIsLoading(false);
            return;
        }

        const config: AppConfig = JSON.parse(saved);
        setJellyfinUrl(config.jellyfin?.url || '');

        // Check service status
        const statusChecks: ServiceStatus[] = [];

        if (config.jellyfin?.url) {
            const jfStatus = await api.getJellyfinStatus(config.jellyfin);
            statusChecks.push({
                name: 'Jellyfin',
                connected: !!jfStatus,
                type: 'jellyfin'
            });
        }

        if (config.jellyseerr?.url) {
            const jsStatus = await api.testConnection(config.jellyseerr.url, config.jellyseerr.apiKey, 'jellyseerr');
            statusChecks.push({
                name: 'Jellyseerr',
                connected: jsStatus,
                type: 'jellyseerr'
            });
        }

        setServices(statusChecks);

        // Get pending requests from Jellyseerr
        if (config.jellyseerr?.enabled) {
            const stats = await api.getJellyseerrStats(config.jellyseerr);
            // For now, show count as placeholder
            if (stats) {
                // We'd need to fetch actual requests for details
                // This is a simplified version
            }
        }

        setIsLoading(false);
    };

    const handleRefresh = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }
        loadData();
    };

    const handleOpenJellyfin = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }
        await launchJellyfin(jellyfinUrl);
    };

    return (
        <div className="h-full overflow-y-auto pb-24 no-scrollbar">
            {/* Header */}
            <div className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Home</h1>
                        <p className="text-sm text-helm-400">Your media at a glance</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 rounded-xl bg-helm-800 border border-helm-700 active:bg-helm-700 transition-all"
                    >
                        <RefreshCw size={18} className={`text-helm-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-5">
                {/* Service Status */}
                <div className="space-y-3">
                    <h2 className="text-xs text-helm-500 uppercase font-bold tracking-wider px-1">
                        Services
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {services.map((service) => (
                            <div
                                key={service.name}
                                className={`bg-helm-800 rounded-xl border p-4 flex items-center gap-3 ${service.connected ? 'border-helm-700' : 'border-red-500/30'
                                    }`}
                            >
                                {service.connected ? (
                                    <CheckCircle2 size={20} className="text-emerald-400" />
                                ) : (
                                    <XCircle size={20} className="text-red-400" />
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-white">{service.name}</p>
                                    <p className={`text-xs ${service.connected ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {service.connected ? 'Online' : 'Offline'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                    <h2 className="text-xs text-helm-500 uppercase font-bold tracking-wider px-1">
                        Quick Actions
                    </h2>

                    {jellyfinUrl && (
                        <button
                            onClick={handleOpenJellyfin}
                            className="w-full bg-purple-600 hover:bg-purple-500 rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <PlayCircle size={24} className="text-white" />
                                <div className="text-left">
                                    <p className="text-white font-semibold">Open Jellyfin</p>
                                    <p className="text-purple-200 text-xs">Launch media player</p>
                                </div>
                            </div>
                            <ChevronRight size={20} className="text-purple-200" />
                        </button>
                    )}
                </div>

                {/* Your Requests */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs text-helm-500 uppercase font-bold tracking-wider">
                            Your Requests
                        </h2>
                        <span className="text-xs text-helm-600">Via Jellyseerr</span>
                    </div>

                    <div className="bg-helm-800 rounded-xl border border-helm-700 p-4">
                        <div className="flex items-center gap-3 text-helm-500">
                            <Clock size={20} />
                            <div>
                                <p className="text-sm text-helm-300">Pending requests will appear here</p>
                                <p className="text-xs text-helm-500">Search and request new content below</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recently Added placeholder */}
                <div className="space-y-3">
                    <h2 className="text-xs text-helm-500 uppercase font-bold tracking-wider px-1">
                        Recently Added
                    </h2>

                    <div className="bg-helm-800 rounded-xl border border-helm-700 p-6 text-center">
                        <Film size={32} className="mx-auto text-helm-600 mb-2" />
                        <p className="text-sm text-helm-400">New content will appear here</p>
                        <p className="text-xs text-helm-600 mt-1">From your Jellyfin library</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserHome;
