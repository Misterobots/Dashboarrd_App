import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Authelia Authentication Service
 * 
 * Integrates with Authelia SSO at login.shivelymedia.com
 * Admin access granted to users in 'misterobots' group
 * 
 * For mobile apps, we use a "login then verify" flow since
 * Authelia's redirect validation blocks non-web URLs.
 */

const ADMIN_GROUP = 'misterobots';
const DEFAULT_AUTHELIA_URL = 'https://login.shivelymedia.com';

export interface AuthUser {
    username: string;
    displayName?: string;
    email?: string;
    groups: string[];
    isAdmin: boolean;
}

export interface AuthStatus {
    authenticated: boolean;
    user: AuthUser | null;
}

// Helper to make HTTP requests with cookies
async function makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.request({
            url,
            method: (options.method as any) || 'GET',
            headers: options.headers as Record<string, string>,
            webFetchExtra: {
                credentials: 'include'
            }
        });
        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            json: async () => response.data,
            headers: new Headers(response.headers)
        } as Response;
    } else {
        return fetch(url, {
            ...options,
            credentials: 'include'
        });
    }
}

/**
 * Get the Authelia URL from config
 */
function getAutheliaUrl(): string {
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            return config.autheliaUrl || DEFAULT_AUTHELIA_URL;
        } catch {
            return DEFAULT_AUTHELIA_URL;
        }
    }
    return DEFAULT_AUTHELIA_URL;
}

/**
 * Check if user is authenticated with Authelia
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
    const autheliaUrl = getAutheliaUrl();

    try {
        // Try the userinfo endpoint (returns user data if authenticated)
        const response = await makeRequest(`${autheliaUrl}/api/user/info`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // Authelia returns user info if authenticated
            if (data && data.username) {
                const user: AuthUser = {
                    username: data.username || '',
                    displayName: data.display_name || data.username,
                    email: data.email || '',
                    groups: data.groups || [],
                    isAdmin: (data.groups || []).includes(ADMIN_GROUP)
                };
                return { authenticated: true, user };
            }
        }

        // Not authenticated
        return { authenticated: false, user: null };
    } catch (error) {
        console.error('Auth check failed:', error);
        return { authenticated: false, user: null };
    }
}

/**
 * Open Authelia login in external browser
 * For mobile apps, user logs in then returns to app and taps "Verify"
 * 
 * IMPORTANT: We open JUST the base Authelia URL with NO redirect parameter
 * to avoid the "unsafe redirect" error
 */
export async function openLogin(): Promise<void> {
    const autheliaUrl = getAutheliaUrl();

    // Use just the base URL - no redirect parameter at all
    // This avoids the "Redirection was determined to be unsafe" error
    const loginUrl = autheliaUrl;

    console.log('Opening Authelia login:', loginUrl);

    if (Capacitor.isNativePlatform()) {
        // Use Capacitor Browser plugin to open in system browser
        // This properly opens an external browser window
        await Browser.open({
            url: loginUrl,
            presentationStyle: 'popover' // Opens in external browser
        });
    } else {
        // For web, just navigate (will need to come back manually)
        window.open(loginUrl, '_blank');
    }
}

/**
 * Logout from Authelia
 */
export async function logout(): Promise<void> {
    const autheliaUrl = getAutheliaUrl();

    try {
        // Try API logout
        await makeRequest(`${autheliaUrl}/api/logout`, {
            method: 'POST'
        });
    } catch (e) {
        console.error('Logout error:', e);
    }

    // Clear local storage auth state
    clearAuthState();
}

/**
 * Check if a user is an admin
 */
export function isUserAdmin(user: AuthUser | null): boolean {
    if (!user) return false;
    return user.groups.includes(ADMIN_GROUP);
}

/**
 * Save auth state to local storage for persistence
 */
export function saveAuthState(user: AuthUser | null): void {
    const saved = localStorage.getItem('dashboarrd_config');
    const config = saved ? JSON.parse(saved) : { onboarded: true };
    config.authUser = user;
    localStorage.setItem('dashboarrd_config', JSON.stringify(config));
}

/**
 * Get cached auth state from local storage
 */
export function getCachedAuthState(): AuthUser | null {
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            return config.authUser || null;
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Clear cached auth state
 */
export function clearAuthState(): void {
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            delete config.authUser;
            localStorage.setItem('dashboarrd_config', JSON.stringify(config));
        } catch {
            // Ignore parse errors
        }
    }
}
