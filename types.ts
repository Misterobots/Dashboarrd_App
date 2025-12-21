
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
  radarr: { url: string; apiKey: string; enabled: boolean };
  sonarr: { url: string; apiKey: string; enabled: boolean };
  jellyseerr: { url: string; apiKey: string; enabled: boolean };
  sabnzbd: { url: string; apiKey: string; enabled: boolean };
  jellyfin: { url: string; apiKey: string; enabled: boolean };
}
