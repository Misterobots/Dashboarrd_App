
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wifi, HardDrive, Cpu, MemoryStick, Activity, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { AppConfig } from '../types';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Mock network data - in a real app this would come from a backend
const MOCK_NETWORK_DATA = [
    { time: '00:00', download: 12, upload: 3 },
    { time: '04:00', download: 18, upload: 5 },
    { time: '08:00', download: 5, upload: 2 },
    { time: '12:00', download: 45, upload: 12 },
    { time: '16:00', download: 32, upload: 8 },
    { time: '20:00', download: 55, upload: 15 },
    { time: 'Now', download: 20, upload: 6 },
];

// Mock system stats - would need a backend service for real data
const MOCK_SYSTEM = {
    cpu: 35,
    memory: 62,
    memoryUsed: '12.4 GB',
    memoryTotal: '20 GB'
};

interface DiskSpace {
    path: string;
    freeSpace: number;
    totalSpace: number;
}

const Performance: React.FC = () => {
    const [diskSpaces, setDiskSpaces] = useState<DiskSpace[]>([]);
    const [sabSpeed, setSabSpeed] = useState<string>('0 KB/s');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = async () => {
        const saved = localStorage.getItem('dashboarrd_config');
        if (saved) {
            const config: AppConfig = JSON.parse(saved);

            // Get disk space from Radarr or Sonarr
            const disk = await api.getDiskSpace(config.radarr) || await api.getDiskSpace(config.sonarr);
            if (disk) {
                setDiskSpaces(disk);
            }

            // Get SABnzbd speed
            const sab = await api.getSabStatus(config.sabnzbd);
            if (sab) {
                setSabSpeed(sab.speed || '0 KB/s');
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        }
        await fetchData();
        setIsRefreshing(false);
    };

    const formatBytes = (bytes: number) => {
        const gb = bytes / 1073741824;
        if (gb >= 1000) return `${(gb / 1024).toFixed(1)} TB`;
        return `${gb.toFixed(1)} GB`;
    };

    const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="space-y-5 pb-24 p-4 overflow-y-auto h-full no-scrollbar">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Performance</h1>
                    <p className="text-sm text-helm-400">System metrics & storage</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2.5 rounded-xl bg-helm-800 border border-helm-700 active:bg-helm-700 transition-all disabled:opacity-50"
                >
                    <RefreshCw
                        size={18}
                        className={`text-helm-400 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                </button>
            </div>

            {/* Network Activity */}
            <div className="bg-helm-800 rounded-2xl border border-helm-700 p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Wifi size={18} className="text-helm-accent" />
                        <h3 className="text-white font-semibold">Network Activity</h3>
                    </div>
                    <div className="text-xs text-helm-400">
                        Download: <span className="text-emerald-400 font-medium">{sabSpeed}</span>
                    </div>
                </div>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOCK_NETWORK_DATA}>
                            <defs>
                                <linearGradient id="colorDownload" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 10 }}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                                labelStyle={{ color: '#94a3b8' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="download"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorDownload)"
                                name="Download (MB/s)"
                            />
                            <Area
                                type="monotone"
                                dataKey="upload"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorUpload)"
                                name="Upload (MB/s)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-helm-800 rounded-xl border border-helm-700 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Cpu size={16} className="text-blue-400" />
                        <span className="text-xs text-helm-400 uppercase font-bold">CPU</span>
                    </div>
                    <div className="relative h-2 bg-helm-900 rounded-full overflow-hidden">
                        <div
                            className="absolute h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${MOCK_SYSTEM.cpu}%` }}
                        />
                    </div>
                    <p className="text-right text-xs text-helm-500 mt-1">{MOCK_SYSTEM.cpu}%</p>
                    <p className="text-[10px] text-helm-600 text-center mt-2">*Mock data</p>
                </div>

                <div className="bg-helm-800 rounded-xl border border-helm-700 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MemoryStick size={16} className="text-purple-400" />
                        <span className="text-xs text-helm-400 uppercase font-bold">Memory</span>
                    </div>
                    <div className="relative h-2 bg-helm-900 rounded-full overflow-hidden">
                        <div
                            className="absolute h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${MOCK_SYSTEM.memory}%` }}
                        />
                    </div>
                    <p className="text-right text-xs text-helm-500 mt-1">
                        {MOCK_SYSTEM.memoryUsed} / {MOCK_SYSTEM.memoryTotal}
                    </p>
                    <p className="text-[10px] text-helm-600 text-center mt-2">*Mock data</p>
                </div>
            </div>

            {/* Storage */}
            <div className="bg-helm-800 rounded-2xl border border-helm-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <HardDrive size={18} className="text-helm-accent" />
                    <h3 className="text-white font-semibold">Storage</h3>
                </div>

                {diskSpaces.length === 0 ? (
                    <div className="text-center py-6 text-helm-500 text-sm">
                        <HardDrive size={24} className="mx-auto mb-2 opacity-50" />
                        No storage data available
                    </div>
                ) : (
                    <div className="space-y-4">
                        {diskSpaces.map((disk, index) => {
                            const usedSpace = disk.totalSpace - disk.freeSpace;
                            const usedPercent = (usedSpace / disk.totalSpace) * 100;

                            return (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-helm-300 truncate max-w-[180px]" title={disk.path}>
                                            {disk.path}
                                        </span>
                                        <span className="text-helm-500">
                                            {formatBytes(disk.freeSpace)} free
                                        </span>
                                    </div>
                                    <div className="relative h-3 bg-helm-900 rounded-full overflow-hidden">
                                        <div
                                            className={`absolute h-full rounded-full transition-all ${usedPercent > 90 ? 'bg-red-500' :
                                                    usedPercent > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                                                }`}
                                            style={{ width: `${usedPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-helm-600">
                                        <span>{formatBytes(usedSpace)} used</span>
                                        <span>{formatBytes(disk.totalSpace)} total</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <p className="text-center text-[10px] text-helm-600">
                CPU and Memory stats require a backend service
            </p>
        </div>
    );
};

export default Performance;
