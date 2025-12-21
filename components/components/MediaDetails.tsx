import React, { useState } from 'react';
import { ArrowLeft, Play, HardDrive, Tag, Search, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { MediaItem, Status, MediaType } from '../types';
import { api } from '../services/api';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MediaDetailsProps {
  item: MediaItem;
  onBack: () => void;
}

const MediaDetails: React.FC<MediaDetailsProps> = ({ item, onBack }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${item.title}" and its files?`)) return;
    
    setIsDeleting(true);
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
      const config = JSON.parse(saved);
      const serviceConfig = item.type === MediaType.MOVIE ? config.radarr : config.sonarr;
      const success = await api.deleteMedia(serviceConfig, item.id, item.type);
      if (success) {
        await Haptics.notification({ type: ImpactStyle.Heavy as any });
        onBack();
      } else {
        alert("Failed to delete item.");
      }
    }
    setIsDeleting(false);
  };

  return (
    <div className="h-full bg-helm-900 overflow-y-auto no-scrollbar pb-24 relative animate-in slide-in-from-right duration-300">
      <div className="relative h-72 md:h-96">
        <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-helm-900 via-helm-900/50 to-transparent" />
        <button onClick={onBack} className="absolute top-4 left-4 p-2 rounded-full bg-black/30 backdrop-blur-md text-white border border-white/10 active:scale-95">
          <ArrowLeft size={24} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-6">
           <h1 className="text-3xl font-bold text-white mb-2 leading-tight drop-shadow-lg">{item.title}</h1>
           <div className="flex items-center gap-3 text-sm text-helm-300 font-medium">
             <span className="px-2 py-0.5 rounded bg-helm-800 border border-helm-700">{item.year}</span>
             <span>•</span>
             <span>{item.type}</span>
             {item.rating && <><span>•</span><span className="text-yellow-400">★ {item.rating}</span></>}
           </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between p-4 rounded-xl bg-helm-800 border border-helm-700">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.status === Status.AVAILABLE ? 'bg-green-500/20 text-green-500' : 'bg-helm-600/20 text-helm-400'}`}>
                    <Play size={20} fill={item.status === Status.AVAILABLE ? "currentColor" : "none"} />
                </div>
                <div>
                    <p className="text-xs text-helm-400 uppercase tracking-wider font-semibold">Status</p>
                    <p className="text-white font-medium">{item.status}</p>
                </div>
            </div>
            {item.progress && <div className="text-right"><p className="text-2xl font-bold text-helm-accent">{item.progress}%</p></div>}
        </div>

        <div>
            <h3 className="text-lg font-bold text-white mb-2">Overview</h3>
            <p className="text-helm-300 leading-relaxed text-sm">{item.overview || "No overview available."}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-helm-800/50 border border-helm-700/50">
                <div className="flex items-center gap-2 text-helm-400 mb-1"><Tag size={14} /><span className="text-xs uppercase">Profile</span></div>
                <p className="text-white font-medium truncate">{item.qualityProfile || 'Any'}</p>
            </div>
            <div className="p-4 rounded-xl bg-helm-800/50 border border-helm-700/50">
                <div className="flex items-center gap-2 text-helm-400 mb-1"><HardDrive size={14} /><span className="text-xs uppercase">Size</span></div>
                <p className="text-white font-medium">{item.size || '-'}</p>
            </div>
        </div>

        <div className="flex gap-3 pt-4">
            <button className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-helm-800 border border-helm-700 active:bg-helm-700 transition-colors">
                <Search size={20} className="text-helm-accent" />
                <span className="text-xs font-medium text-white">Search</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-helm-800 border border-helm-700 active:bg-helm-700 transition-colors">
                <RefreshCw size={20} className="text-green-400" />
                <span className="text-xs font-medium text-white">Update</span>
            </button>
             <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-helm-800 border border-helm-700 active:bg-helm-700 transition-colors disabled:opacity-50"
             >
                {isDeleting ? <Loader2 size={20} className="animate-spin text-red-400" /> : <Trash2 size={20} className="text-red-400" />}
                <span className="text-xs font-medium text-white">Delete</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default MediaDetails;