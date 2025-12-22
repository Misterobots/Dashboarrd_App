import React, { useState } from 'react';
import {
    Search, Film, Tv, PlayCircle, Plus, Check, Loader2,
    ExternalLink, Monitor
} from 'lucide-react';
import { api } from '../../services/api';
import { AppConfig, MediaType } from '../../types';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { launchJellyfin, launchStreamingApp, openInBrowser } from '../../services/deepLinkService';
import { getStreamingAvailability, StreamingOffer } from '../../services/justWatchService';

const UniversalSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchType, setSearchType] = useState<'all' | 'movie' | 'tv'>('all');
    const [requestingIds, setRequestingIds] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
    const [error, setError] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [streamingOffers, setStreamingOffers] = useState<Record<string, StreamingOffer[]>>({});
    const [loadingOffers, setLoadingOffers] = useState<Record<string, boolean>>({});

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        setExpandedItem(null);
        setStreamingOffers({});

        try {
            const saved = localStorage.getItem('dashboarrd_config');
            if (!saved) {
                setError("Please configure services in Settings first.");
                setIsLoading(false);
                return;
            }
            const config: AppConfig = JSON.parse(saved);

            if (config.jellyseerr?.enabled) {
                const searchResults = await api.jellyseerrSearch(config.jellyseerr, query);

                const filtered = searchType === 'all'
                    ? searchResults
                    : searchResults.filter((r: any) =>
                        searchType === 'movie' ? r.mediaType === 'movie' : r.mediaType === 'tv'
                    );

                setResults(filtered);

                if (filtered.length === 0) {
                    setError("No results found. Try a different search term.");
                }
            } else {
                setError("Jellyseerr is not configured. Go to Settings to set it up.");
            }
        } catch (err) {
            setError("Search failed. Check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExpand = async (item: any) => {
        const key = String(item.tmdbId || item.id);

        if (expandedItem === key) {
            setExpandedItem(null);
            return;
        }

        setExpandedItem(key);

        // Fetch streaming availability if we haven't already
        if (!streamingOffers[key] && !loadingOffers[key] && item.tmdbId) {
            setLoadingOffers(prev => ({ ...prev, [key]: true }));
            try {
                const type = item.mediaType === 'movie' ? 'movie' : 'tv';
                const offers = await getStreamingAvailability(item.tmdbId, type);
                setStreamingOffers(prev => ({ ...prev, [key]: offers }));
            } catch (e) {
                console.error('Failed to fetch streaming offers:', e);
                setStreamingOffers(prev => ({ ...prev, [key]: [] }));
            } finally {
                setLoadingOffers(prev => ({ ...prev, [key]: false }));
            }
        }
    };

    const handleRequest = async (item: any) => {
        const key = item.tmdbId || item.title;
        setRequestingIds(prev => ({ ...prev, [key]: 'loading' }));

        try {
            const saved = localStorage.getItem('dashboarrd_config');
            const config: AppConfig = JSON.parse(saved!);

            if (config.jellyseerr?.enabled) {
                const mediaType = item.mediaType === 'movie' ? MediaType.MOVIE : MediaType.SERIES;
                const success = await api.jellyseerrRequest(config.jellyseerr, item, mediaType);

                if (success) {
                    if (Capacitor.isNativePlatform()) {
                        await Haptics.impact({ style: ImpactStyle.Heavy });
                    }
                    setRequestingIds(prev => ({ ...prev, [key]: 'done' }));
                } else {
                    setRequestingIds(prev => ({ ...prev, [key]: 'error' }));
                }
            }
        } catch (e) {
            setRequestingIds(prev => ({ ...prev, [key]: 'error' }));
        }
    };

    const handlePlayJellyfin = async () => {
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) {
            const config: AppConfig = JSON.parse(saved);
            if (config.jellyfin?.url) {
                if (Capacitor.isNativePlatform()) {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                }
                await launchJellyfin(config.jellyfin.url);
            }
        }
    };

    const handleLaunchService = async (offer: StreamingOffer) => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }

        // Try to open the URL directly, or fallback to app launch
        if (offer.url) {
            openInBrowser(offer.url);
        } else {
            await launchStreamingApp(offer.providerId as any);
        }
    };

    const handleViewOnTMDB = (item: any) => {
        const type = item.mediaType === 'movie' ? 'movie' : 'tv';
        openInBrowser(`https://www.themoviedb.org/${type}/${item.tmdbId}`);
    };

    const ResultCard: React.FC<{ item: any }> = ({ item }) => {
        const key = String(item.tmdbId || item.id);
        const isRequesting = requestingIds[key] === 'loading';
        const isRequested = requestingIds[key] === 'done' || item.requested;
        const isInLibrary = item.added || item.mediaInfo?.status === 5;
        const isExpanded = expandedItem === key;
        const offers = streamingOffers[key] || [];
        const isLoadingStreamingOffers = loadingOffers[key];

        // Filter to only subscription/free services
        const subscriptionOffers = offers.filter(o => o.type === 'flatrate' || o.type === 'free' || o.type === 'ads');

        return (
            <div className="bg-helm-800 rounded-xl border border-helm-700 overflow-hidden">
                <div className="flex cursor-pointer" onClick={() => handleExpand(item)}>
                    {/* Poster */}
                    <div className="w-20 h-30 bg-helm-900 flex-shrink-0">
                        {item.images?.[0]?.remoteUrl || item.posterPath ? (
                            <img
                                src={item.images?.[0]?.remoteUrl || `https://image.tmdb.org/t/p/w200${item.posterPath}`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-helm-600">
                                {item.mediaType === 'movie' ? <Film size={20} /> : <Tv size={20} />}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white text-sm truncate">{item.title || item.name}</h3>
                                <p className="text-xs text-helm-500">
                                    {item.releaseDate?.substring(0, 4) || item.firstAirDate?.substring(0, 4) || item.year} • {item.mediaType === 'movie' ? 'Movie' : 'TV'}
                                </p>
                            </div>

                            {isInLibrary ? (
                                <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-full flex-shrink-0">
                                    JELLYFIN
                                </span>
                            ) : isRequested ? (
                                <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full flex-shrink-0">
                                    REQUESTED
                                </span>
                            ) : null}
                        </div>

                        <p className="text-xs text-helm-400 mt-1 line-clamp-2">{item.overview}</p>

                        {/* Streaming badges preview */}
                        {subscriptionOffers.length > 0 && !isExpanded && (
                            <div className="flex gap-1 mt-2">
                                {subscriptionOffers.slice(0, 4).map(offer => (
                                    <span key={offer.providerId} className={`px-1.5 py-0.5 ${offer.color} rounded text-[8px] font-bold text-white`}>
                                        {offer.providerName.substring(0, 3).toUpperCase()}
                                    </span>
                                ))}
                                {subscriptionOffers.length > 4 && (
                                    <span className="text-[10px] text-helm-500">+{subscriptionOffers.length - 4}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Expanded Actions */}
                {isExpanded && (
                    <div className="p-3 pt-0 space-y-3 border-t border-helm-700/50 mt-2">
                        {/* Watch Options */}
                        <div className="space-y-2">
                            <p className="text-[10px] text-helm-500 uppercase font-bold tracking-wider">Watch On</p>

                            {/* Loading indicator */}
                            {isLoadingStreamingOffers && (
                                <div className="flex items-center gap-2 py-2">
                                    <Loader2 size={14} className="animate-spin text-helm-500" />
                                    <span className="text-xs text-helm-500">Finding streaming options...</span>
                                </div>
                            )}

                            {/* Jellyfin - if in library */}
                            {isInLibrary && (
                                <button
                                    onClick={handlePlayJellyfin}
                                    className="w-full flex items-center gap-3 p-2.5 bg-purple-600 hover:bg-purple-500 rounded-lg transition-all active:scale-[0.98]"
                                >
                                    <PlayCircle size={18} className="text-white" />
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-white">Play on Jellyfin</p>
                                        <p className="text-[10px] text-purple-200">Available in your library</p>
                                    </div>
                                </button>
                            )}

                            {/* Streaming Services from JustWatch */}
                            {subscriptionOffers.map(offer => (
                                <button
                                    key={offer.providerId}
                                    onClick={() => handleLaunchService(offer)}
                                    className={`w-full flex items-center gap-3 p-2.5 ${offer.color} hover:opacity-90 rounded-lg transition-all active:scale-[0.98]`}
                                >
                                    <Monitor size={18} className="text-white" />
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-white">{offer.providerName}</p>
                                        <p className="text-[10px] text-white/70 capitalize">
                                            {offer.type === 'flatrate' ? 'Subscription' : offer.type === 'free' ? 'Free' : offer.type}
                                        </p>
                                    </div>
                                    <ExternalLink size={14} className="text-white/50" />
                                </button>
                            ))}

                            {/* No streaming options message */}
                            {!isLoadingStreamingOffers && !isInLibrary && subscriptionOffers.length === 0 && (
                                <p className="text-xs text-helm-500 py-2">No streaming options found in your region</p>
                            )}
                        </div>

                        {/* Request / TMDB */}
                        <div className="flex gap-2">
                            {!isInLibrary && !isRequested && (
                                <button
                                    onClick={() => handleRequest(item)}
                                    disabled={isRequesting}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-helm-accent hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-all active:scale-95"
                                >
                                    {isRequesting ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Plus size={14} />
                                    )}
                                    {isRequesting ? 'Requesting...' : 'Request to Library'}
                                </button>
                            )}

                            <button
                                onClick={() => handleViewOnTMDB(item)}
                                className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-helm-700 hover:bg-helm-600 rounded-lg text-xs font-medium text-helm-300 transition-all active:scale-95"
                            >
                                <ExternalLink size={12} />
                                TMDB
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Search Header */}
            <div className="p-4 pb-2 bg-helm-900 sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-white mb-1">Search</h1>
                <p className="text-xs text-helm-500 mb-3">Find where to watch any movie or show</p>

                <form onSubmit={handleSearch} className="space-y-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-helm-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search movies and TV shows..."
                            className="w-full bg-helm-800 border border-helm-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-helm-500 focus:border-helm-accent outline-none"
                        />
                    </div>

                    <div className="flex gap-2">
                        {[
                            { value: 'all', label: 'All' },
                            { value: 'movie', label: 'Movies', icon: <Film size={12} /> },
                            { value: 'tv', label: 'TV Shows', icon: <Tv size={12} /> }
                        ].map(({ value, label, icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setSearchType(value as any)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${searchType === value
                                    ? 'bg-helm-accent border-helm-accent text-white'
                                    : 'bg-helm-800 border-helm-700 text-helm-400'
                                    }`}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                </form>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 no-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 size={32} className="animate-spin text-helm-accent" />
                        <p className="text-sm text-helm-500 mt-3">Searching...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <Search size={32} className="mx-auto text-helm-600 mb-3" />
                        <p className="text-sm text-helm-400">{error}</p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="text-center py-12">
                        <Search size={32} className="mx-auto text-helm-600 mb-3" />
                        <p className="text-sm text-helm-400">Search for movies and TV shows</p>
                        <p className="text-xs text-helm-600 mt-1">See where to stream or request to your library</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {results.map((item, index) => (
                            <ResultCard key={item.tmdbId || index} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UniversalSearch;
