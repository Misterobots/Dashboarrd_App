
export type AppMode = 'admin' | 'user';

export enum MediaType {
  MOVIE = 'MOVIE',
  SERIES = 'SERIES',
  MUSIC = 'MUSIC'
}

export enum Status {
  AVAILABLE = 'AVAILABLE',
  DOWNLOADING = 'DOWNLOADING',
  MISSING = 'MISSING',
  REQUESTED = 'REQUESTED'
}

export type MediaSource = 'jellyfin' | 'radarr' | 'sonarr' | 'jellyseerr' | 'tmdb';

export interface MediaItem {
  id: string;
  title: string;
  year: number;
  type: MediaType;
  status: Status;
  posterUrl: string;
  overview?: string;
  rating?: number;
  progress?: number;
  qualityProfile?: string;
  path?: string;
  size?: string;
  studio?: string;
  // Jellyseerr specific
  jellyseerrId?: number;
}

// Extended media item for universal search
export interface UniversalMediaItem extends MediaItem {
  source: MediaSource;
  jellyfinId?: string;
  tmdbId?: number;
  tvdbId?: number;
  isInLibrary: boolean;
  isRequested: boolean;
  streamingServices?: string[];  // e.g., ['Netflix', 'Disney+']
}

export interface QueueItem {
  id: string;
  title: string;
  size: string;
  timeLeft: string;
  status: 'Downloading' | 'Paused' | 'Queued' | 'Completed' | 'Failed';
  speed: string;
  progress: number;
}

export interface AppConfig {
  onboarded: boolean;
  appMode?: AppMode;  // 'admin' or 'user'
  autheliaUrl?: string;  // SSO server URL
  radarr: { url: string; apiKey: string; enabled: boolean };
  sonarr: { url: string; apiKey: string; enabled: boolean };
  jellyseerr: { url: string; apiKey: string; enabled: boolean };
  sabnzbd: { url: string; apiKey: string; enabled: boolean };
  jellyfin: { url: string; apiKey: string; enabled: boolean };
}
