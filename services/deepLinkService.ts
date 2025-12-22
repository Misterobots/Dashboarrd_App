import { Capacitor } from '@capacitor/core';

/**
 * Service for launching external apps via deep links
 */

// Known app URL schemes
const APP_SCHEMES = {
    jellyfin: {
        android: 'org.jellyfin.mobile',
        scheme: 'jellyfin',
        webFallback: true
    },
    netflix: {
        android: 'com.netflix.mediaclient',
        scheme: 'nflx',
        webFallback: true
    },
    disney: {
        android: 'com.disney.disneyplus',
        scheme: 'disneyplus',
        webFallback: true
    },
    prime: {
        android: 'com.amazon.avod.thirdpartyclient',
        scheme: 'primevideo',
        webFallback: true
    },
    hulu: {
        android: 'com.hulu.plus',
        scheme: 'hulu',
        webFallback: true
    },
    plex: {
        android: 'com.plexapp.android',
        scheme: 'plex',
        webFallback: true
    }
};

/**
 * Launch Jellyfin to play specific content
 */
export async function launchJellyfin(
    jellyfinUrl: string,
    itemId?: string
): Promise<boolean> {
    try {
        // Try to open Jellyfin app with deep link
        if (Capacitor.isNativePlatform()) {
            // Android intent URL for Jellyfin
            if (itemId) {
                // Deep link to specific item
                const playUrl = `${jellyfinUrl}/web/index.html#!/item?id=${itemId}`;
                window.open(playUrl, '_system');
            } else {
                // Just open Jellyfin
                window.open(jellyfinUrl, '_system');
            }
            return true;
        } else {
            // Web: open in new tab
            const webUrl = itemId
                ? `${jellyfinUrl}/web/index.html#!/item?id=${itemId}`
                : jellyfinUrl;
            window.open(webUrl, '_blank');
            return true;
        }
    } catch (error) {
        console.error('Failed to launch Jellyfin:', error);
        return false;
    }
}

/**
 * Launch a streaming service app
 */
export async function launchStreamingApp(
    service: keyof typeof APP_SCHEMES,
    contentId?: string
): Promise<boolean> {
    const appInfo = APP_SCHEMES[service];
    if (!appInfo) {
        console.error(`Unknown streaming service: ${service}`);
        return false;
    }

    try {
        if (Capacitor.isNativePlatform()) {
            // Try to open the app via package name (Android)
            const intentUrl = `intent://#Intent;package=${appInfo.android};end`;
            window.open(intentUrl, '_system');
            return true;
        } else if (appInfo.webFallback) {
            // Fallback to web
            const webUrls: Record<string, string> = {
                netflix: 'https://www.netflix.com',
                disney: 'https://www.disneyplus.com',
                prime: 'https://www.amazon.com/video',
                hulu: 'https://www.hulu.com',
                plex: 'https://app.plex.tv'
            };
            window.open(webUrls[service] || '#', '_blank');
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Failed to launch ${service}:`, error);
        return false;
    }
}

/**
 * Open web browser to a URL
 */
export function openInBrowser(url: string): void {
    if (Capacitor.isNativePlatform()) {
        window.open(url, '_system');
    } else {
        window.open(url, '_blank');
    }
}

/**
 * Get TMDB page URL for a movie/show
 */
export function getTmdbUrl(tmdbId: number, type: 'movie' | 'tv'): string {
    return `https://www.themoviedb.org/${type}/${tmdbId}`;
}
