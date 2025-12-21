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
}

export interface QueueItem {
  id: string;
  title: string;
  size: string;
  timeLeft: string;
  status: 'Downloading' | 'Paused' | 'Queued';
  speed: string;
  progress: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  recommendations?: MediaItem[];
}

export interface AppConfig {
  onboarded: boolean;
  radarr: { url: string; apiKey: string; enabled: boolean };
  sonarr: { url: string; apiKey: string; enabled: boolean };
}