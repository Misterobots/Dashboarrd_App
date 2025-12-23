import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

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
        const config = JSON.parse(saved);
        return config.autheliaUrl || 'https://login.shivelymedia.com';
    }
    return 'https://login.shivelymedia.com';
}

/**
 * Check if user is authenticated with Authelia
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
    const autheliaUrl = getAutheliaUrl();

    try {
        // Try the userinfo endpoint first (more reliable for getting user data)
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
 * Get the login URL - for mobile, we don't include redirect
 * User will log in via browser then return to app
 */
export function getLoginUrl(): string {
    const autheliaUrl = getAutheliaUrl();

    if (Capacitor.isNativePlatform()) {
        // For mobile: just open the login page, no redirect
        // This avoids the "unsafe redirect" error
        return autheliaUrl;
    } else {
        // For web: include redirect back to app
        const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
        return `${autheliaUrl}/?rd=${encodeURIComponent(currentUrl)}`;
    }
}

/**
 * Get the logout URL
 */
export function getLogoutUrl(): string {
    const autheliaUrl = getAutheliaUrl();
    return `${autheliaUrl}/logout`;
}

/**
 * Open Authelia login in browser
 * For mobile apps, user logs in then returns to app and taps "Verify Login"
 */
export function openLogin(): void {
    const loginUrl = getLoginUrl();

    if (Capacitor.isNativePlatform()) {
        // Open in system browser so cookies are shared
        window.open(loginUrl, '_system');
    } else {
        window.location.href = loginUrl;
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
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
        const config = JSON.parse(saved);
        delete config.authUser;
        localStorage.setItem('dashboarrd_config', JSON.stringify(config));
    }
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
        const config = JSON.parse(saved);
        return config.authUser || null;
    }
    return null;
}

/**
 * Clear cached auth state
 */
export function clearAuthState(): void {
    const saved = localStorage.getItem('dashboarrd_config');
    if (saved) {
        const config = JSON.parse(saved);
        delete config.authUser;
        localStorage.setItem('dashboarrd_config', JSON.stringify(config));
    }
}
