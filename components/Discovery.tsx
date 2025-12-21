
import React, { useState } from 'react';
import { Search, Plus, Loader2, Check, Film, Tv, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { MediaType, AppConfig } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const Discovery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<MediaType>(MediaType.MOVIE);
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
        setError("Please configure your server in Settings first.");
        setIsLoading(false);
        return;
      }
      const config: AppConfig = JSON.parse(saved);

      // Priority: Use Jellyseerr if enabled
      if (config.jellyseerr?.enabled) {
          const jellyResults = await api.jellyseerrSearch(config.jellyseerr, query);
          // Filter by type if needed, though Jellyseerr returns mixed
          const filtered = jellyResults.filter(r => 
              searchType === MediaType.MOVIE ? r.mediaType === 'movie' : r.mediaType === 'tv'
          );
          setResults(filtered);
          if (filtered.length === 0) setError("No results found on Jellyseerr.");
      } else {
          // Fallback to Radarr/Sonarr
          const serviceConfig = searchType === MediaType.MOVIE ? config.radarr : config.sonarr;
          if (!serviceConfig?.enabled) {
            setError(`${searchType === MediaType.MOVIE ? 'Radarr' : 'Sonarr'} is not enabled.`);
            setIsLoading(false);
            return;
          }
          const lookupResults = await api.lookup(serviceConfig, query, searchType);
          setResults(lookupResults || []);
          if (lookupResults?.length === 0) setError("No results found.");
      }

    } catch (err) {
      setError("Failed to reach media server. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (item: any) => {
    const key = item.tmdbId || item.tvdbId || item.title;
    setRequestingIds(prev => ({ ...prev, [key]: 'loading' }));

    try {
      const saved = localStorage.getItem('dashboarrd_config');
      const config: AppConfig = JSON.parse(saved!);

      let success = false;

      if (config.jellyseerr?.enabled) {
          success = await api.jellyseerrRequest(config.jellyseerr, item, searchType);
      } else {
          const serviceConfig = searchType === MediaType.MOVIE ? config.radarr : config.sonarr;
          success = await api.addMedia(serviceConfig, item, searchType);
      }
      
      if (success) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setRequestingIds(prev => ({ ...prev, [key]: 'done' }));
      } else {
        setRequestingIds(prev => ({ ...prev, [key]: 'error' }));
      }
    } catch (e) {
      setRequestingIds(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  return (
    <div className="flex flex-col h-full bg-helm-900">
      <div className="p-4 bg-helm-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-helm-700/50">
        <h1 className="text-2xl font-bold text-white mb-4">Discovery</h1>
        
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 text-helm-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search for ${searchType === MediaType.MOVIE ? 'movies' : 'TV shows'}...`}
              className="w-full bg-helm-800 text-white pl-11 pr-4 py-3 rounded-xl border border-helm-700 focus:outline-none focus:border-helm-accent transition-all text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSearchType(MediaType.MOVIE)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition-all ${
                searchType === MediaType.MOVIE 
                  ? 'bg-helm-accent border-helm-accent text-white' 
                  : 'bg-helm-800 border-helm-700 text-helm-400'
              }`}
            >
              <Film size={14} /> Movies
            </button>
            <button
              type="button"
              onClick={() => setSearchType(MediaType.SERIES)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition-all ${
                searchType === MediaType.SERIES 
                  ? 'bg-helm-accent border-helm-accent text-white' 
                  : 'bg-helm-800 border-helm-700 text-helm-400'
              }`}
            >
              <Tv size={14} /> TV Shows
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-24">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin text-helm-accent" />
            <p className="text-sm text-helm-500 font-medium">Searching...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <AlertCircle size={48} className="text-helm-700 mb-4" />
            <p className="text-helm-400 text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 opacity-40">
            <Search size={48} className="text-helm-700 mb-4" />
            <p className="text-helm-400 text-sm">Enter a title to discover new media.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {results.map((item) => {
            const key = item.tmdbId || item.tvdbId || item.title;
            const reqStatus = requestingIds[key];
            const poster = item.images?.find((img: any) => img.coverType === 'poster')?.remoteUrl || 
                           `https://picsum.photos/300/450?random=${key}`;

            return (
              <div key={key} className="bg-helm-800 rounded-2xl border border-helm-700 overflow-hidden flex flex-col shadow-xl animate-in fade-in zoom-in duration-300">
                <div className="relative aspect-[2/3] w-full">
                  <img src={poster} className="h-full w-full object-cover" alt={item.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-helm-900/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[10px] font-bold text-helm-accent uppercase bg-helm-900/60 backdrop-blur-sm w-fit px-1.5 py-0.5 rounded">
                      {item.year || 'TBA'}
                    </p>
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-white text-xs line-clamp-2 mb-3 h-8 leading-tight">{item.title}</h3>
                  
                  <button 
                    disabled={reqStatus === 'loading' || reqStatus === 'done' || item.added}
                    onClick={() => handleAdd(item)}
                    className={`mt-auto flex items-center justify-center gap-1.5 w-full text-white text-[10px] py-2.5 rounded-xl transition-all font-black uppercase tracking-wider ${
                        item.added ? 'bg-helm-700 opacity-50' :
                        reqStatus === 'done' ? 'bg-emerald-500' : 
                        reqStatus === 'error' ? 'bg-red-500' : 'bg-helm-accent active:scale-95'
                    }`}
                  >
                    {item.added ? 'In Library' : 
                     reqStatus === 'loading' ? <Loader2 size={12} className="animate-spin" /> : 
                     reqStatus === 'done' ? <><Check size={12} /> Requested</> : 
                     reqStatus === 'error' ? 'Retry' : <><Plus size={12} /> Request</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Discovery;
