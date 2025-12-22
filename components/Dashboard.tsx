
import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { AppConfig } from '../types';
import ServiceCard from './ServiceCard';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ServiceData {
  jellyfin: any;
  sabnzbd: any;
  radarr: any;
  sonarr: any;
  jellyseerr: any;
}

const Dashboard: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [serviceData, setServiceData] = useState<ServiceData>({
    jellyfin: null,
    sabnzbd: null,
    radarr: null,
    sonarr: null,
    jellyseerr: null
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAllData = async (appConfig: AppConfig) => {
    const [jf, sab, radarr, sonarr, jelly] = await Promise.all([
      api.getJellyfinStatus(appConfig.jellyfin),
      api.getSabStatus(appConfig.sabnzbd),
      api.getRadarrStats(appConfig.radarr),
      api.getSonarrStats(appConfig.sonarr),
      api.getJellyseerrStats(appConfig.jellyseerr)
    ]);

    setServiceData({
      jellyfin: jf,
      sabnzbd: sab,
      radarr: radarr,
      sonarr: sonarr,
      jellyseerr: jelly
    });
    setLastRefresh(new Date());
  };

  useEffect(() => {
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
      const appConfig: AppConfig = JSON.parse(saved);
      setConfig(appConfig);
      fetchAllData(appConfig);
    }
  }, []);

  const handleRefresh = async () => {
    if (!config || isRefreshing) return;
    setIsRefreshing(true);

    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }

    await fetchAllData(config);
    setIsRefreshing(false);
  };

  const getConnectedCount = () => {
    if (!config) return 0;
    return [
      config.jellyfin?.enabled,
      config.sabnzbd?.enabled,
      config.radarr?.enabled,
      config.sonarr?.enabled,
      config.jellyseerr?.enabled
    ].filter(Boolean).length;
  };

  return (
    <div className="space-y-5 pb-24 p-4 overflow-y-auto h-full no-scrollbar">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-helm-400">
            {getConnectedCount()} services connected
          </p>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-helm-800 rounded-full border border-helm-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-green-400 font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-helm-800 rounded-xl border border-helm-700 p-3 text-center">
          <p className="text-2xl font-bold text-white">
            {serviceData.jellyfin?.activeStreams || 0}
          </p>
          <p className="text-[10px] text-helm-500 uppercase font-bold">Streaming</p>
        </div>
        <div className="bg-helm-800 rounded-xl border border-helm-700 p-3 text-center">
          <p className="text-2xl font-bold text-white">
            {(serviceData.radarr?.queueCount || 0) + (serviceData.sonarr?.queueCount || 0)}
          </p>
          <p className="text-[10px] text-helm-500 uppercase font-bold">In Queue</p>
        </div>
        <div className="bg-helm-800 rounded-xl border border-helm-700 p-3 text-center">
          <p className="text-2xl font-bold text-white">
            {serviceData.jellyseerr?.pendingRequests || 0}
          </p>
          <p className="text-[10px] text-helm-500 uppercase font-bold">Requests</p>
        </div>
      </div>

      {/* Service Cards */}
      <div className="space-y-3">
        <h2 className="text-xs text-helm-500 uppercase font-bold tracking-wider px-1">
          Services
        </h2>

        {config?.jellyfin && (
          <ServiceCard
            name="Jellyfin"
            type="jellyfin"
            connected={config.jellyfin.enabled}
            data={serviceData.jellyfin}
          />
        )}

        {config?.sabnzbd && (
          <ServiceCard
            name="SABnzbd"
            type="sabnzbd"
            connected={config.sabnzbd.enabled}
            data={serviceData.sabnzbd}
          />
        )}

        {config?.radarr && (
          <ServiceCard
            name="Radarr"
            type="radarr"
            connected={config.radarr.enabled}
            data={serviceData.radarr}
          />
        )}

        {config?.sonarr && (
          <ServiceCard
            name="Sonarr"
            type="sonarr"
            connected={config.sonarr.enabled}
            data={serviceData.sonarr}
          />
        )}

        {config?.jellyseerr && (
          <ServiceCard
            name="Jellyseerr"
            type="jellyseerr"
            connected={config.jellyseerr.enabled}
            data={serviceData.jellyseerr}
          />
        )}

        {!config && (
          <div className="text-center py-8 text-helm-500">
            <Activity size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No services configured</p>
            <p className="text-xs mt-1">Go to Settings to add your servers</p>
          </div>
        )}
      </div>

      {/* Last Refresh */}
      <p className="text-center text-[10px] text-helm-600">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </p>
    </div>
  );
};

export default Dashboard;
