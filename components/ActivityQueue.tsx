import React, { useEffect, useState } from 'react';
import { Download, Pause, Play, Trash2, Wifi, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { QueueItem } from '../types';

const ActivityQueue: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
        setIsLoading(true);
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) {
            const config = JSON.parse(saved);
            try {
                const [rQueue, sQueue] = await Promise.all([
                    api.getQueue(config.radarr, 'movie'),
                    api.getQueue(config.sonarr, 'series')
                ]);
                setQueue([...rQueue, ...sQueue]);
            } catch (e) {
                console.error(e);
            }
        }
        setIsLoading(false);
    };
    
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-helm-900">
      <div className="p-4 border-b border-helm-700/50 bg-helm-900/90 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-helm-400">
          <Wifi size={14} className="text-emerald-400" />
          <span>Queue Manager</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 no-scrollbar">
        {isLoading && queue.length === 0 && (
             <div className="flex justify-center py-10">
                 <Loader2 className="animate-spin text-helm-accent" />
             </div>
        )}
        
        {!isLoading && queue.length === 0 && (
            <div className="text-center py-10 text-helm-500 text-sm">
                Queue is empty.
            </div>
        )}

        {queue.map((item) => (
          <div key={item.id} className="bg-helm-800 rounded-xl border border-helm-700 p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1 mr-4">
                {item.title}
              </h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-helm-400">
                <span>{item.size}</span>
                <span className={item.status === 'Downloading' ? 'text-helm-accent' : ''}>
                   {item.status}
                </span>
                <span>{item.timeLeft}</span>
              </div>
              
              <div className="h-1.5 bg-helm-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.status === 'Paused' ? 'bg-yellow-500/50' : 
                    item.status === 'Queued' ? 'bg-slate-600' : 'bg-helm-accent'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityQueue;