import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Current app version - must match package.json
export const APP_VERSION = '1.1.10';

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

export interface DownloadProgress {
    percent: number;
    downloaded: number;
    total: number;
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

// Lazy load the AppInstall plugin
let appInstallPlugin: any = null;

async function getAppInstallPlugin(): Promise<any> {
    if (appInstallPlugin) return appInstallPlugin;

    try {
        const module = await import('@m430/capacitor-app-install');
        appInstallPlugin = module.default;
        return appInstallPlugin;
    } catch (e) {
        console.error('Failed to load AppInstall plugin:', e);
        return null;
    }
}

/**
 * Download APK and trigger installation
 * This downloads to cache and uses Android's package installer
 */
export async function downloadAndInstallUpdate(
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void
): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
        console.warn('APK installation only available on Android');
        window.open(downloadUrl, '_blank');
        return false;
    }

    try {
        const AppInstall = await getAppInstallPlugin();

        if (!AppInstall) {
            // Fallback: open in browser
            window.open(downloadUrl, '_system');
            return false;
        }

        // Check if we have permission to install unknown apps
        const hasPermission = await AppInstall.hasInstallPermission();

        if (!hasPermission?.result) {
            // Request permission - this opens Android settings
            await AppInstall.openInstallSetting();
            return false; // User needs to come back after granting permission
        }

        // Report initial progress
        onProgress?.({ percent: 0, downloaded: 0, total: 0 });

        // Download the APK using CapacitorHttp
        console.log('Downloading APK from:', downloadUrl);

        const response = await CapacitorHttp.get({
            url: downloadUrl,
            responseType: 'blob',
            headers: {
                'Accept': 'application/vnd.android.package-archive'
            }
        });

        if (response.status !== 200) {
            console.error('Download failed:', response.status);
            return false;
        }

        onProgress?.({ percent: 50, downloaded: 0, total: 0 });

        // Save to cache directory
        const fileName = `dashboarrd-update-${Date.now()}.apk`;

        // Convert response data to base64 if needed
        let base64Data: string;
        if (typeof response.data === 'string') {
            // Already base64
            base64Data = response.data;
        } else {
            // Need to convert - this is a blob
            const blob = response.data as Blob;
            base64Data = await blobToBase64(blob);
        }

        // Write to cache directory
        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
        });

        onProgress?.({ percent: 80, downloaded: 0, total: 0 });

        console.log('APK saved to:', result.uri);

        // Install the APK
        await AppInstall.installApp({
            path: result.uri
        });

        onProgress?.({ percent: 100, downloaded: 0, total: 0 });

        return true;
    } catch (error) {
        console.error('Error downloading/installing update:', error);

        // Fallback: open in browser for manual download
        window.open(downloadUrl, '_system');
        return false;
    }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove the data URL prefix (e.g., "data:application/vnd.android.package-archive;base64,")
            const base64Data = base64.split(',')[1] || base64;
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Check if app has permission to install APKs
 */
export async function hasInstallPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        const AppInstall = await getAppInstallPlugin();
        if (!AppInstall) return false;

        const result = await AppInstall.hasInstallPermission();
        return result?.result || false;
    } catch {
        return false;
    }
}

/**
 * Open Android settings to grant install permission
 */
export async function requestInstallPermission(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const AppInstall = await getAppInstallPlugin();
        if (AppInstall) {
            await AppInstall.openInstallSetting();
        }
    } catch (error) {
        console.error('Failed to open install settings:', error);
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
