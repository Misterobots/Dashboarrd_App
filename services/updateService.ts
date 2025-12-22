import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

// Current app version - must match package.json
export const APP_VERSION = '1.1.6';

// GitHub repository info
const GITHUB_OWNER = 'Misterobots';
const GITHUB_REPO = 'Dashboarrd_App';

export interface ReleaseInfo {
    version: string;
    tagName: string;
    name: string;
    body: string;
    publishedAt: string;
    downloadUrl: string;
    size: number;
}

export interface UpdateCheckResult {
    updateAvailable: boolean;
    currentVersion: string;
    latestRelease: ReleaseInfo | null;
}

/**
 * Compare two semantic versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
    const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number);
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }
    return 0;
}

/**
 * Check for updates from GitHub Releases
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
    try {
        const response = await CapacitorHttp.get({
            url: `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'Dashboarrd-Mobile'
            }
        });

        if (response.status !== 200) {
            console.error('Failed to fetch release info:', response.status);
            return {
                updateAvailable: false,
                currentVersion: APP_VERSION,
                latestRelease: null
            };
        }

        const data = response.data;

        // Find the APK asset
        const apkAsset = data.assets?.find((asset: any) =>
            asset.name.endsWith('.apk')
        );

        if (!apkAsset) {
            console.error('No APK found in latest release');
            return {
                updateAvailable: false,
                currentVersion: APP_VERSION,
                latestRelease: null
            };
        }

        const latestVersion = data.tag_name.replace(/^v/, '');
        const updateAvailable = compareVersions(latestVersion, APP_VERSION) > 0;

        return {
            updateAvailable,
            currentVersion: APP_VERSION,
            latestRelease: {
                version: latestVersion,
                tagName: data.tag_name,
                name: data.name,
                body: data.body || '',
                publishedAt: data.published_at,
                downloadUrl: apkAsset.browser_download_url,
                size: apkAsset.size
            }
        };
    } catch (error) {
        console.error('Error checking for updates:', error);
        return {
            updateAvailable: false,
            currentVersion: APP_VERSION,
            latestRelease: null
        };
    }
}

/**
 * Download and install APK update
 * Note: This requires the app to have permission to install from unknown sources
 */
export async function downloadAndInstallUpdate(
    downloadUrl: string,
    onProgress?: (progress: number) => void
): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.warn('APK installation only available on Android');
        return false;
    }

    try {
        // For Android, we'll open the APK URL directly in the browser
        // which will trigger the download and installation flow
        // This is the simplest approach that works without additional plugins

        // First try using the Android intent system via a custom URL
        const intentUrl = `intent://${downloadUrl.replace('https://', '')}#Intent;scheme=https;action=android.intent.action.VIEW;type=application/vnd.android.package-archive;end`;

        // Fallback: Open in browser which will download the APK
        window.open(downloadUrl, '_system');

        return true;
    } catch (error) {
        console.error('Error downloading update:', error);
        return false;
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date string to relative time
 */
export function formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
}
