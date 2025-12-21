import { MediaItem, MediaType, Status, QueueItem } from '../types';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

interface ServiceConfig {
  url: string;
  apiKey: string;
  enabled: boolean;
}

const getBaseUrl = (url: string) => {
    if (!url) return '';
    let formatted = url.trim();
    if (!formatted.startsWith('http')) formatted = 'http://' + formatted;
    return formatted.endsWith('/') ? formatted.slice(0, -1) : formatted;
};

const makeRequest = async (url: string, options: RequestInit = {}, timeout = 12000) => {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    try {
        const response = await CapacitorHttp.request({
            method: options.method || 'GET',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers as any || {})
            },
            data: options.body ? JSON.parse(options.body as string) : undefined,
            connectTimeout: timeout,
            readTimeout: timeout
        });

        if (response.status >= 200 && response.status < 300) {
            return { ok: true, json: async () => response.data };
        }
        return { ok: false, status: response.status };
    } catch (e) {
        console.error("Native Request Error:", e);
        return { ok: false, error: e };
    }
  } else {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }
};

export const api = {
  async testConnection(url: string, apiKey: string): Promise<boolean> {
    const baseUrl = getBaseUrl(url);
    if (!baseUrl) return false;
    try {
      const response = await makeRequest(`${baseUrl}/api/v3/system/status`, {
        headers: { 'X-Api-Key': apiKey }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async lookup(config: ServiceConfig, term: string, type: MediaType) {
    if (!config.enabled) return [];
    const baseUrl = getBaseUrl(config.url);
    const endpoint = type === MediaType.MOVIE ? 'movie/lookup' : 'series/lookup';
    try {
      const response = await makeRequest(`${baseUrl}/api/v3/${endpoint}?term=${encodeURIComponent(term)}`, {
        headers: { 'X-Api-Key': config.apiKey }
      });
      return await response.json();
    } catch (e) {
      return [];
    }
  },

  async addMedia(config: ServiceConfig, item: any, type: MediaType) {
    if (!config.enabled) return false;
    const baseUrl = getBaseUrl(config.url);
    const endpoint = type === MediaType.MOVIE ? 'movie' : 'series';
    
    const payload = type === MediaType.MOVIE ? {
      title: item.title,
      qualityProfileId: 1,
      titleSlug: item.titleSlug,
      tmdbId: item.tmdbId,
      rootFolderPath: item.rootFolderPath || (item.path ? item.path : ''),
      monitored: true,
      addOptions: { searchForMovie: true }
    } : {
      title: item.title,
      qualityProfileId: 1,
      titleSlug: item.titleSlug,
      tvdbId: item.tvdbId,
      rootFolderPath: item.rootFolderPath || (item.path ? item.path : ''),
      monitored: true,
      addOptions: { searchForMissingEpisodes: true }
    };

    try {
      const response = await makeRequest(`${baseUrl}/api/v3/${endpoint}`, {
        method: 'POST',
        headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async deleteMedia(config: ServiceConfig, id: string, type: MediaType) {
    const baseUrl = getBaseUrl(config.url);
    const endpoint = type === MediaType.MOVIE ? 'movie' : 'series';
    try {
      const response = await makeRequest(`${baseUrl}/api/v3/${endpoint}/${id}?deleteFiles=true`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': config.apiKey }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async getDiskSpace(config: ServiceConfig) {
    if (!config.enabled) return null;
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api/v3/diskspace`, {
        headers: { 'X-Api-Key': config.apiKey }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      return null;
    }
  },

  async getMovies(config: ServiceConfig): Promise<MediaItem[]> {
    if (!config.enabled) return [];
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api/v3/movie`, {
        headers: { 'X-Api-Key': config.apiKey }
      });
      const data = await response.json();
      return data.map((m: any) => ({
        id: m.id.toString(),
        title: m.title,
        year: m.year,
        type: MediaType.MOVIE,
        status: m.hasFile ? Status.AVAILABLE : (m.monitored ? Status.MISSING : Status.REQUESTED),
        posterUrl: m.images.find((i:any) => i.coverType === 'poster')?.remoteUrl || `https://picsum.photos/300/450?random=${m.id}`, 
        overview: m.overview,
        rating: m.ratings?.value,
        path: m.path,
        size: m.sizeOnDisk ? `${(m.sizeOnDisk / 1073741824).toFixed(2)} GB` : '0 GB',
        studio: m.studio,
        qualityProfile: `Profile ID: ${m.qualityProfileId}`
      }));
    } catch (e) {
      return [];
    }
  },

  async getSeries(config: ServiceConfig): Promise<MediaItem[]> {
    if (!config.enabled) return [];
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api/v3/series`, {
        headers: { 'X-Api-Key': config.apiKey }
      });
      const data = await response.json();
      return data.map((s: any) => ({
        id: s.id.toString(),
        title: s.title,
        year: s.year,
        type: MediaType.SERIES,
        status: s.statistics?.percentOfEpisodes === 100 ? Status.AVAILABLE : Status.MISSING,
        posterUrl: s.images.find((i:any) => i.coverType === 'poster')?.remoteUrl || `https://picsum.photos/300/450?random=${s.id}`,
        overview: s.overview,
        rating: s.ratings?.value,
        path: s.path,
        size: s.statistics?.sizeOnDisk ? `${(s.statistics.sizeOnDisk / 1073741824).toFixed(2)} GB` : '0 GB',
        qualityProfile: `Profile ID: ${s.qualityProfileId}`
      }));
    } catch (e) {
      return [];
    }
  },

  async getQueue(config: ServiceConfig, type: 'movie' | 'series'): Promise<QueueItem[]> {
    if (!config.enabled) return [];
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api/v3/queue`, {
        headers: { 'X-Api-Key': config.apiKey }
      });
      const data = await response.json();
      return (data.records || []).map((q: any) => ({
        id: q.id.toString(),
        title: type === 'movie' ? q.movie?.title : q.series?.title,
        size: `${(q.size / 1073741824).toFixed(2)} GB`,
        timeLeft: q.timeleft,
        status: q.status === 'Downloading' ? 'Downloading' : 'Queued',
        speed: 'Unknown',
        progress: q.size ? (100 - (q.sizeleft / q.size * 100)) : 0
      }));
    } catch (e) {
      return [];
    }
  }
};