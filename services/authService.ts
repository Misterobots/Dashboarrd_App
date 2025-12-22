import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Authelia Authentication Service
 * 
 * Integrates with Authelia SSO at login.shivelymedia.com
 * Admin access granted to users in 'misterobots' group
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

// Helper to make HTTP requests
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
        // Authelia's verify endpoint returns user info if authenticated
        const response = await makeRequest(`${autheliaUrl}/api/verify`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            // User is authenticated - parse headers for user info
            const username = response.headers.get('Remote-User') || '';
            const groups = (response.headers.get('Remote-Groups') || '').split(',').filter(g => g);
            const email = response.headers.get('Remote-Email') || '';
            const displayName = response.headers.get('Remote-Name') || username;

            const user: AuthUser = {
                username,
                displayName,
                email,
                groups,
                isAdmin: groups.includes(ADMIN_GROUP)
            };

            return { authenticated: true, user };
        } else if (response.status === 401) {
            // Not authenticated
            return { authenticated: false, user: null };
        } else {
            console.error('Authelia verify error:', response.status);
            return { authenticated: false, user: null };
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        return { authenticated: false, user: null };
    }
}

/**
 * Try to get user info from Authelia userinfo endpoint
 */
export async function getUserInfo(): Promise<AuthUser | null> {
    const autheliaUrl = getAutheliaUrl();

    try {
        const response = await makeRequest(`${autheliaUrl}/api/user/info`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                username: data.username || '',
                displayName: data.display_name || data.username,
                email: data.email || '',
                groups: data.groups || [],
                isAdmin: (data.groups || []).includes(ADMIN_GROUP)
            };
        }
        return null;
    } catch (error) {
        console.error('Get user info failed:', error);
        return null;
    }
}

/**
 * Get the login URL to redirect to
 */
export function getLoginUrl(returnUrl?: string): string {
    const autheliaUrl = getAutheliaUrl();
    const currentUrl = returnUrl || (typeof window !== 'undefined' ? window.location.href : '');
    return `${autheliaUrl}/?rd=${encodeURIComponent(currentUrl)}`;
}

/**
 * Get the logout URL
 */
export function getLogoutUrl(): string {
    const autheliaUrl = getAutheliaUrl();
    return `${autheliaUrl}/logout`;
}

/**
 * Redirect to Authelia login
 */
export function redirectToLogin(): void {
    if (Capacitor.isNativePlatform()) {
        // On mobile, open in system browser
        window.open(getLoginUrl(), '_system');
    } else {
        window.location.href = getLoginUrl();
    }
}

/**
 * Logout from Authelia
 */
export async function logout(): Promise<void> {
    const autheliaUrl = getAutheliaUrl();

    try {
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
