import { MediaItem, MediaType, Status, QueueItem } from './types';

export const MOCK_LIBRARY: MediaItem[] = [
  {
    id: '1',
    title: 'Dune: Part Two',
    year: 2024,
    type: MediaType.MOVIE,
    status: Status.AVAILABLE,
    posterUrl: 'https://picsum.photos/300/450?random=1',
    rating: 8.9,
    qualityProfile: 'Ultra HD - 4K',
    path: '/data/media/movies/Dune Part Two (2024)',
    size: '24.5 GB',
    studio: 'Warner Bros. Pictures',
    overview: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.'
  },
  {
    id: '2',
    title: 'Fallout',
    year: 2024,
    type: MediaType.SERIES,
    status: Status.AVAILABLE,
    posterUrl: 'https://picsum.photos/300/450?random=2',
    rating: 8.7,
    qualityProfile: 'WEB-DL - 1080p',
    path: '/data/media/tv/Fallout',
    size: '45.2 GB',
    studio: 'Amazon Studios',
    overview: 'In a future, post-apocalyptic Los Angeles brought about by nuclear decimation, citizens must live in underground bunkers to protect themselves from radiation, mutants and bandits.'
  },
  {
    id: '3',
    title: 'Civil War',
    year: 2024,
    type: MediaType.MOVIE,
    status: Status.DOWNLOADING,
    progress: 45,
    posterUrl: 'https://picsum.photos/300/450?random=3',
    rating: 7.6,
    qualityProfile: 'Bluray - 1080p',
    overview: 'A journey across a dystopian future America, following a team of military-embedded journalists as they race against time to reach DC before rebel factions descend upon the White House.'
  },
  {
    id: '4',
    title: 'Shogun',
    year: 2024,
    type: MediaType.SERIES,
    status: Status.AVAILABLE,
    posterUrl: 'https://picsum.photos/300/450?random=4',
    rating: 9.1,
    qualityProfile: 'WEB-DL - 4K',
    path: '/data/media/tv/Shogun',
    size: '62.1 GB',
    studio: 'FX Productions'
  },
  {
    id: '5',
    title: 'Furiosa',
    year: 2024,
    type: MediaType.MOVIE,
    status: Status.REQUESTED,
    posterUrl: 'https://picsum.photos/300/450?random=5',
    qualityProfile: 'Any',
    overview: 'As the world fell, young Furiosa is snatched from the Green Place of Many Mothers and falls into the hands of a great Biker Horde led by the Warlord Dementus.'
  }
];

export const MOCK_QUEUE: QueueItem[] = [
  {
    id: 'q1',
    title: 'Civil War (2024) 1080p Bluray Remux',
    size: '14.2 GB',
    timeLeft: '15m 30s',
    status: 'Downloading',
    speed: '42.5 MB/s',
    progress: 45
  },
  {
    id: 'q2',
    title: 'The.Bear.S03E01.2160p.WEB-DL',
    size: '2.1 GB',
    timeLeft: '2m 10s',
    status: 'Downloading',
    speed: '12.1 MB/s',
    progress: 78
  },
  {
    id: 'q3',
    title: 'House.of.the.Dragon.S02E03.1080p',
    size: '1.8 GB',
    timeLeft: '-',
    status: 'Queued',
    speed: '0 MB/s',
    progress: 0
  }
];

export const MOCK_CHART_DATA = [
  { name: '00:00', speed: 12 },
  { name: '04:00', speed: 18 },
  { name: '08:00', speed: 5 },
  { name: '12:00', speed: 45 },
  { name: '16:00', speed: 32 },
  { name: '20:00', speed: 55 },
  { name: '24:00', speed: 20 },
];
