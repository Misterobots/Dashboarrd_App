import React, { useState } from 'react';
import {
    Search, Film, Tv, PlayCircle, Plus, Check, Loader2,
    ExternalLink, Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { AppConfig, MediaType, UniversalMediaItem, Status } from '../../types';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { launchJellyfin } from '../../services/deepLinkService';

const UniversalSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchType, setSearchType] = useState<'all' | 'movie' | 'tv'>('all');
    const [requestingIds, setRequestingIds] = useState<Record<string, 'loading' | 'done' | 'error'>>({});
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const saved = localStorage.getItem('dashboarrd_config');
            if (!saved) {
                setError("Please configure services in Settings first.");
                setIsLoading(false);
                return;
            }
            const config: AppConfig = JSON.parse(saved);

            // Search via Jellyseerr (includes TMDB and library status)
            if (config.jellyseerr?.enabled) {
                const searchResults = await api.jellyseerrSearch(config.jellyseerr, query);

                // Filter by type if needed
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

    const handlePlay = async (item: any) => {
        // If available in library, launch Jellyfin
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) {
            const config: AppConfig = JSON.parse(saved);
            if (config.jellyfin?.url) {
                if (Capacitor.isNativePlatform()) {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                }
                // For now, just open Jellyfin. With proper integration we'd pass the item ID
                await launchJellyfin(config.jellyfin.url);
            }
        }
    };

    const ResultCard: React.FC<{ item: any }> = ({ item }) => {
        const key = item.tmdbId || item.title;
        const isRequesting = requestingIds[key] === 'loading';
        const isRequested = requestingIds[key] === 'done' || item.added;
        const isAvailable = item.added;

        return (
            <div className="bg-helm-800 rounded-xl border border-helm-700 overflow-hidden flex">
                {/* Poster */}
                <div className="w-24 h-36 bg-helm-900 flex-shrink-0">
                    {item.images?.[0]?.remoteUrl ? (
                        <img
                            src={item.images[0].remoteUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-helm-600">
                            {item.mediaType === 'movie' ? <Film size={24} /> : <Tv size={24} />}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                        <h3 className="font-semibold text-white text-sm truncate">{item.title}</h3>
                        <p className="text-xs text-helm-500">
                            {item.year} • {item.mediaType === 'movie' ? 'Movie' : 'TV Series'}
                        </p>
                        <p className="text-xs text-helm-400 mt-1 line-clamp-2">{item.overview}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                        {isAvailable ? (
                            <button
                                onClick={() => handlePlay(item)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
                            >
                                <PlayCircle size={14} />
                                Play
                            </button>
                        ) : isRequested ? (
                            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600/20 rounded-lg text-xs font-medium text-emerald-400">
                                <Check size={14} />
                                Requested
                            </div>
                        ) : (
                            <button
                                onClick={() => handleRequest(item)}
                                disabled={isRequesting}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-helm-accent hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
                            >
                                {isRequesting ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Plus size={14} />
                                )}
                                {isRequesting ? 'Requesting...' : 'Request'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Search Header */}
            <div className="p-4 pb-2 bg-helm-900 sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-white mb-3">Search</h1>

                <form onSubmit={handleSearch} className="space-y-3">
                    {/* Search Input */}
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

                    {/* Type Filter */}
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
                        <p className="text-xs text-helm-600 mt-1">Results from Jellyseerr & TMDB</p>
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
