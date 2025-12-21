
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, HardDrive, Wifi, ArrowDown, ArrowUp, Download, CheckCircle2, XCircle, Server, PlayCircle, Users } from 'lucide-react';
import { api } from '../services/api';
import { MOCK_CHART_DATA } from '../constants';
import { AppConfig } from '../types';

const StatCard: React.FC<{
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, subValue, icon, color }) => (
  <div className="bg-helm-800 p-4 rounded-2xl border border-helm-700 flex flex-col justify-between h-28 relative overflow-hidden transition-all duration-500">
    <div className={`absolute -right-4 -top-4 w-20 h-20 ${color} opacity-10 rounded-full blur-xl`} />
    <div className="flex justify-between items-start z-10">
      <div>
        <p className="text-helm-400 text-xs font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1 tabular-nums tracking-tight">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg bg-helm-900/50 ${color.replace('bg-', 'text-')}`}>
        {icon}
      </div>
    </div>
    {subValue && <p className="text-xs text-helm-500 z-10 truncate">{subValue}</p>}
  </div>
);

const Dashboard: React.FC = () => {
  const [activeDownloads, setActiveDownloads] = useState(0);
  const [totalFreeSpace, setTotalFreeSpace] = useState('0 GB');
  const [services, setServices] = useState<{name: string, connected: boolean, url: string}[]>([]);
  const [jellyfinStats, setJellyfinStats] = useState<{active: number, name: string} | null>(null);
  const [sabStats, setSabStats] = useState<{status: string, speed: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) {
            const config: AppConfig = JSON.parse(saved);
            
            setServices([
                { name: 'Radarr', connected: config.radarr?.enabled, url: config.radarr?.url },
                { name: 'Sonarr', connected: config.sonarr?.enabled, url: config.sonarr?.url },
                { name: 'Jellyseerr', connected: config.jellyseerr?.enabled, url: config.jellyseerr?.url },
                { name: 'SABnzbd', connected: config.sabnzbd?.enabled, url: config.sabnzbd?.url },
                { name: 'Jellyfin', connected: config.jellyfin?.enabled, url: config.jellyfin?.url },
            ]);

            // Fetch Arr Data
            let queueCount = 0;
            let freeSpace = 0;

            try {
                const [rQueue, sQueue] = await Promise.all([
                    api.getQueue(config.radarr, 'movie'),
                    api.getQueue(config.sonarr, 'series')
                ]);
                queueCount = rQueue.length + sQueue.length;

                const diskData = await api.getDiskSpace(config.radarr) || await api.getDiskSpace(config.sonarr);
                if (diskData && diskData.length > 0) {
                     const largestMount = diskData.reduce((prev:any, current:any) => (prev.freeSpace > current.freeSpace) ? prev : current);
                     freeSpace = largestMount.freeSpace;
                }
            } catch (e) { console.error(e); }

            // Fetch Jellyfin
            if (config.jellyfin?.enabled) {
                const jf = await api.getJellyfinStatus(config.jellyfin);
                if (jf) setJellyfinStats({ active: jf.activeStreams, name: jf.serverName });
            }

            // Fetch SABnzbd
            if (config.sabnzbd?.enabled) {
                const sab = await api.getSabStatus(config.sabnzbd);
                if (sab) setSabStats({ status: sab.status, speed: sab.speed });
            }

            setActiveDownloads(queueCount);
            setTotalFreeSpace(`${(freeSpace / 1073741824).toFixed(1)} GB`);
        }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-6 pb-24 p-4 overflow-y-auto h-full no-scrollbar">
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-helm-400">Server Overview</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-helm-800 rounded-full border border-helm-700">
                <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs text-green-400 font-medium">Online</span>
            </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {services.map(s => (
                <div key={s.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0 ${s.connected ? 'bg-helm-800 border-helm-700' : 'bg-helm-800/50 border-helm-700/30'}`}>
                    {s.connected ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-helm-600" />}
                    <div className="flex flex-col">
                        <span className={`text-xs font-bold ${s.connected ? 'text-white' : 'text-helm-500'}`}>{s.name}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard 
          title="Queue" 
          value={activeDownloads.toString()}
          subValue="Active Items"
          icon={<ArrowDown size={18} />} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Free Space" 
          value={totalFreeSpace}
          subValue="Primary Mount"
          icon={<HardDrive size={18} />} 
          color="bg-blue-500" 
        />
        
        {jellyfinStats ? (
             <StatCard 
             title="Jellyfin" 
             value={jellyfinStats.active.toString()}
             subValue="Active Streams"
             icon={<PlayCircle size={18} />} 
             color="bg-purple-500" 
           />
        ) : (
            <StatCard 
            title="System" 
            value="Good"
            subValue="Health Check"
            icon={<Activity size={18} />} 
            color="bg-purple-500" 
          />
        )}

        {sabStats ? (
            <StatCard 
            title="Downloader" 
            value={sabStats.speed}
            subValue={sabStats.status}
            icon={<Download size={18} />} 
            color="bg-orange-500" 
          />
        ) : (
            <StatCard 
            title="Updates" 
            value="Up to Date"
            subValue="No Pending"
            icon={<ArrowUp size={18} />} 
            color="bg-orange-500" 
          />
        )}
      </div>

      <div className="bg-helm-800 rounded-2xl border border-helm-700 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Wifi size={18} className="text-helm-accent" />
            Network Activity
          </h3>
          <p className="text-xs text-helm-500">Live Traffic</p>
        </div>
        <div className="h-48 w-full opacity-50 grayscale">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_CHART_DATA}>
              <defs>
                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="speed" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSpeed)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
