import React, { useState, useEffect } from 'react';
import { Clock, Film, Tv, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { AppConfig } from '../../types';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Request {
    id: number;
    title: string;
    type: 'movie' | 'tv';
    posterUrl: string;
    status: 'pending' | 'approved' | 'processing' | 'available';
    requestedAt: string;
}

const UserRequests: React.FC = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setIsLoading(true);
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) {
            const config: AppConfig = JSON.parse(saved);
            if (config.jellyseerr?.enabled) {
                const statsData = await api.getJellyseerrStats(config.jellyseerr);
                setStats(statsData);
            }
        }
        setIsLoading(false);
    };

    const handleRefresh = async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }
        loadRequests();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'text-yellow-400 bg-yellow-400/10';
            case 'approved': return 'text-blue-400 bg-blue-400/10';
            case 'processing': return 'text-purple-400 bg-purple-400/10';
            case 'available': return 'text-emerald-400 bg-emerald-400/10';
            default: return 'text-helm-400 bg-helm-700';
        }
    };

    return (
        <div className="h-full overflow-y-auto pb-24 no-scrollbar">
            {/* Header */}
            <div className="p-4 pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Requests</h1>
                        <p className="text-sm text-helm-400">Your media requests</p>
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
                {/* Stats Summary */}
                {stats && (
                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-helm-800 rounded-xl border border-helm-700 p-3 text-center">
                            <p className="text-xl font-bold text-yellow-400">{stats.pendingRequests}</p>
                            <p className="text-[10px] text-helm-500 uppercase">Pending</p>
                        </div>
                        <div className="bg-helm-800 rounded-xl border border-helm-700 p-3 text-center">
                            <p className="text-xl font-bold text-blue-400">{stats.approvedRequests}</p>
                            <p className="text-[10px] text-helm-500 uppercase">Approved</p>
                        </div>
                        <div className="bg-helm-800 rounded-xl border border-helm-700 p-3 text-center">
                            <p className="text-xl font-bold text-purple-400">{stats.processingRequests}</p>
                            <p className="text-[10px] text-helm-500 uppercase">Processing</p>
                        </div>
                        <div className="bg-helm-800 rounded-xl border border-helm-700 p-3 text-center">
                            <p className="text-xl font-bold text-emerald-400">{stats.availableRequests || 0}</p>
                            <p className="text-[10px] text-helm-500 uppercase">Available</p>
                        </div>
                    </div>
                )}

                {/* Request List */}
                <div className="space-y-3">
                    <h2 className="text-xs text-helm-500 uppercase font-bold tracking-wider px-1">
                        Recent Requests
                    </h2>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 size={32} className="animate-spin text-helm-accent" />
                            <p className="text-sm text-helm-500 mt-3">Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="bg-helm-800 rounded-xl border border-helm-700 p-8 text-center">
                            <Clock size={40} className="mx-auto text-helm-600 mb-3" />
                            <p className="text-sm text-helm-300">No requests yet</p>
                            <p className="text-xs text-helm-500 mt-1">
                                Search for content and request it to see it here
                            </p>
                        </div>
                    ) : (
                        requests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-helm-800 rounded-xl border border-helm-700 p-3 flex gap-3"
                            >
                                <div className="w-16 h-24 bg-helm-900 rounded-lg flex-shrink-0 overflow-hidden">
                                    {request.posterUrl ? (
                                        <img
                                            src={request.posterUrl}
                                            alt={request.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            {request.type === 'movie' ? (
                                                <Film size={20} className="text-helm-600" />
                                            ) : (
                                                <Tv size={20} className="text-helm-600" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white text-sm truncate">{request.title}</h3>
                                    <p className="text-xs text-helm-500 mt-0.5">
                                        {request.type === 'movie' ? 'Movie' : 'TV Series'}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusColor(request.status)}`}>
                                            {request.status}
                                        </span>
                                        <span className="text-[10px] text-helm-600">{request.requestedAt}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Info */}
                <div className="text-center py-4">
                    <p className="text-xs text-helm-600">
                        Requests managed via Jellyseerr
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UserRequests;
