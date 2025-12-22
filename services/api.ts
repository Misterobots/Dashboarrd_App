
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

const getImageUrl = (baseUrl: string, apiKey: string, images: any[], id: string) => {
  if (!images || !Array.isArray(images)) return `https://picsum.photos/300/450?random=${id}`;
  const poster = images.find((i: any) => i.coverType.toLowerCase() === 'poster');
  if (!poster) return `https://picsum.photos/300/450?random=${id}`;
  if (poster.url) return `${baseUrl}${poster.url}?apikey=${apiKey}`;
  return poster.remoteUrl;
};

export const api = {
  async testConnection(url: string, apiKey: string, type: 'arr' | 'sabnzbd' | 'jellyfin' | 'jellyseerr' = 'arr'): Promise<boolean> {
    const baseUrl = getBaseUrl(url);
    if (!baseUrl) return false;

    let endpoint = '';
    let headers: any = {};
    let finalUrl = '';

    switch (type) {
      case 'arr':
        endpoint = '/api/v3/system/status';
        headers = { 'X-Api-Key': apiKey };
        finalUrl = `${baseUrl}${endpoint}`;
        break;
      case 'jellyseerr':
        endpoint = '/api/v1/status';
        headers = { 'X-Api-Key': apiKey };
        finalUrl = `${baseUrl}${endpoint}`;
        break;
      case 'sabnzbd':
        finalUrl = `${baseUrl}/api?mode=version&output=json&apikey=${apiKey}`;
        break;
      case 'jellyfin':
        endpoint = '/System/Info';
        headers = { 'X-Emby-Token': apiKey };
        finalUrl = `${baseUrl}${endpoint}`;
        break;
    }

    try {
      const response = await makeRequest(finalUrl, { headers });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  // --- Jellyseerr ---

  async jellyseerrSearch(config: ServiceConfig, query: string): Promise<any[]> {
    if (!config.enabled) return [];
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api/v1/search?query=${encodeURIComponent(query)}`, {
        headers: { 'X-Api-Key': config.apiKey }
      });
      const data = await response.json();
      return (data.results || []).map((item: any) => ({
        tmdbId: item.id,
        title: item.title || item.name,
        year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : (item.firstAirDate ? new Date(item.firstAirDate).getFullYear() : 0),
        images: [{ coverType: 'poster', remoteUrl: `https://image.tmdb.org/t/p/w500${item.posterPath}` }],
        overview: item.overview,
        added: item.mediaInfo?.status === 3 || item.mediaInfo?.status === 4 || item.mediaInfo?.status === 5,
        mediaType: item.mediaType // 'movie' or 'tv'
      }));
    } catch (e) { return []; }
  },

  async jellyseerrRequest(config: ServiceConfig, item: any, type: MediaType) {
    if (!config.enabled) return false;
    const baseUrl = getBaseUrl(config.url);
    try {
      const payload = {
        mediaType: type === MediaType.MOVIE ? 'movie' : 'tv',
        mediaId: item.tmdbId,
        tvdbId: item.tvdbId // Optional, mainly for TV
      };
      const response = await makeRequest(`${baseUrl}/api/v1/request`, {
        method: 'POST',
        headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return response.ok;
    } catch (e) { return false; }
  },

  // --- SABnzbd ---

  async getSabQueue(config: ServiceConfig): Promise<QueueItem[]> {
    if (!config.enabled) return [];
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api?mode=queue&output=json&apikey=${config.apiKey}`);
      const data = await response.json();
      return (data.queue.slots || []).map((s: any) => ({
        id: s.nzo_id,
        title: s.filename,
        size: s.size,
        timeLeft: s.timeleft,
        status: s.status === 'Downloading' ? 'Downloading' : 'Queued',
        speed: s.mb, // raw speed
        progress: parseInt(s.percentage) || 0
      }));
    } catch (e) { return []; }
  },

  async getSabStatus(config: ServiceConfig) {
    if (!config.enabled) return null;
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api?mode=queue&output=json&apikey=${config.apiKey}`);
      const data = await response.json();
      return {
        status: data.queue.status, // 'Downloading', 'Paused'
        speed: data.queue.speed,
        timeLeft: data.queue.timeleft,
        sizeLeft: data.queue.sizeleft
      };
    } catch (e) { return null; }
  },

  // --- Jellyfin ---

  async getJellyfinStatus(config: ServiceConfig) {
    if (!config.enabled) return null;
    const baseUrl = getBaseUrl(config.url);
    try {
      const [infoReq, sessionsReq] = await Promise.all([
        makeRequest(`${baseUrl}/System/Info`, { headers: { 'X-Emby-Token': config.apiKey } }),
        makeRequest(`${baseUrl}/Sessions`, { headers: { 'X-Emby-Token': config.apiKey } })
      ]);

      const info = await infoReq.json();
      const sessions = await sessionsReq.json();
      const activeSessions = sessions.filter((s: any) => s.NowPlayingItem);

      return {
        serverName: info.ServerName,
        version: info.Version,
        activeStreams: activeSessions.length,
        sessions: activeSessions.map((s: any) => ({
          userName: s.UserName,
          deviceName: s.DeviceName,
          client: s.Client,
          nowPlayingItem: s.NowPlayingItem?.Name || 'Unknown',
          nowPlayingType: s.NowPlayingItem?.Type,
          playState: s.PlayState?.IsPaused ? 'Paused' : 'Playing'
        }))
      };
    } catch (e) { return null; }
  },

  // --- Jellyseerr Extended ---

  async getJellyseerrStats(config: ServiceConfig) {
    if (!config.enabled) return null;
    const baseUrl = getBaseUrl(config.url);
    try {
      const response = await makeRequest(`${baseUrl}/api/v1/request?take=100`, {
        headers: { 'X-Api-Key': config.apiKey }
      });
      const data = await response.json();
      const requests = data.results || [];

      return {
        pendingRequests: requests.filter((r: any) => r.status === 1).length,
        approvedRequests: requests.filter((r: any) => r.status === 2).length,
        processingRequests: requests.filter((r: any) => r.status === 3).length,
        availableRequests: requests.filter((r: any) => r.status === 4 || r.status === 5).length
      };
    } catch (e) { return null; }
  },

  // --- Radarr Extended ---

  async getRadarrStats(config: ServiceConfig) {
    if (!config.enabled) return null;
    const baseUrl = getBaseUrl(config.url);
    try {
      const [moviesReq, queueReq, diskReq] = await Promise.all([
        makeRequest(`${baseUrl}/api/v3/movie`, { headers: { 'X-Api-Key': config.apiKey } }),
        makeRequest(`${baseUrl}/api/v3/queue`, { headers: { 'X-Api-Key': config.apiKey } }),
        makeRequest(`${baseUrl}/api/v3/diskspace`, { headers: { 'X-Api-Key': config.apiKey } })
      ]);

      const movies = await moviesReq.json();
      const queue = await queueReq.json();
      const disk = await diskReq.json();

      const freeSpace = disk.length > 0
        ? `${(disk[0].freeSpace / 1073741824).toFixed(1)} GB`
        : 'N/A';

      return {
        totalMovies: movies.length,
        missingMovies: movies.filter((m: any) => !m.hasFile && m.monitored).length,
        queueCount: queue.totalRecords || 0,
        freeSpace
      };
    } catch (e) { return null; }
  },

  // --- Sonarr Extended ---

  async getSonarrStats(config: ServiceConfig) {
    if (!config.enabled) return null;
    const baseUrl = getBaseUrl(config.url);
    try {
      const [seriesReq, queueReq, diskReq] = await Promise.all([
        makeRequest(`${baseUrl}/api/v3/series`, { headers: { 'X-Api-Key': config.apiKey } }),
        makeRequest(`${baseUrl}/api/v3/queue`, { headers: { 'X-Api-Key': config.apiKey } }),
        makeRequest(`${baseUrl}/api/v3/diskspace`, { headers: { 'X-Api-Key': config.apiKey } })
      ]);

      const series = await seriesReq.json();
      const queue = await queueReq.json();
      const disk = await diskReq.json();

      const freeSpace = disk.length > 0
        ? `${(disk[0].freeSpace / 1073741824).toFixed(1)} GB`
        : 'N/A';

      const missingEpisodes = series.reduce((acc: number, s: any) => {
        const stats = s.statistics || {};
        return acc + (stats.episodeCount || 0) - (stats.episodeFileCount || 0);
      }, 0);

      return {
        totalSeries: series.length,
        missingEpisodes,
        queueCount: queue.totalRecords || 0,
        freeSpace
      };
    } catch (e) { return null; }
  },

  // --- Existing Arr Methods ---

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
        posterUrl: getImageUrl(baseUrl, config.apiKey, m.images, m.id),
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
        posterUrl: getImageUrl(baseUrl, config.apiKey, s.images, s.id),
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
