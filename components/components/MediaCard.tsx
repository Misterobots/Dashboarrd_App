import React from 'react';
import { MediaItem, Status, MediaType } from '../types';
import { Play, Download, Clock, AlertCircle } from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  compact?: boolean;
  onClick?: (item: MediaItem) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, compact = false, onClick }) => {
  const getStatusIcon = (status: Status) => {
    switch (status) {
      case Status.AVAILABLE: return <Play size={16} className="text-green-400" fill="currentColor" />;
      case Status.DOWNLOADING: return <Download size={16} className="text-blue-400 animate-pulse" />;
      case Status.REQUESTED: return <Clock size={16} className="text-yellow-400" />;
      case Status.MISSING: return <AlertCircle size={16} className="text-red-400" />;
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.AVAILABLE: return 'bg-green-500/10 border-green-500/20 text-green-400';
      case Status.DOWNLOADING: return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case Status.REQUESTED: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      default: return 'bg-slate-700 border-slate-600 text-slate-400';
    }
  };

  if (compact) {
    return (
      <div 
        onClick={() => onClick?.(item)}
        className="flex items-center gap-3 p-3 bg-helm-800 rounded-xl border border-helm-700 active:scale-95 transition-transform"
      >
        <img src={item.posterUrl} alt={item.title} className="w-12 h-16 object-cover rounded-md" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate text-white">{item.title}</h4>
          <div className="flex items-center gap-2 mt-1">
             <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusColor(item.status)}`}>
               {item.status}
             </span>
             {item.progress !== undefined && (
               <div className="flex-1 h-1.5 bg-helm-700 rounded-full overflow-hidden max-w-[60px]">
                 <div className="h-full bg-blue-500" style={{ width: `${item.progress}%` }} />
               </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => onClick?.(item)}
      className="group relative bg-helm-800 rounded-2xl overflow-hidden border border-helm-700 shadow-lg hover:shadow-indigo-500/10 active:scale-95 transition-all duration-300 cursor-pointer"
    >
      <div className="aspect-[2/3] w-full overflow-hidden relative">
        <img 
          src={item.posterUrl} 
          alt={item.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-helm-900 via-transparent to-transparent opacity-80" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-lg leading-tight line-clamp-2">{item.title}</h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-helm-300">{item.year}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1.5 border backdrop-blur-md ${getStatusColor(item.status)}`}>
              {getStatusIcon(item.status)}
              {item.status === Status.DOWNLOADING ? `${item.progress}%` : item.type}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
