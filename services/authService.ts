import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import {
    isOIDCAvailable,
    initiateOIDCLogin,
    handleOAuthCallback as oidcHandleCallback,
    getCurrentUser as oidcGetCurrentUser,
    areTokensExpired,
    refreshAccessToken,
    revokeTokens,
    clearTokens,
    getStoredTokens,
    OIDCUser
} from './oidcService';

/**
 * Authelia Authentication Service
 * 
 * Integrates with Authelia SSO at login.shivelymedia.com
 * Admin access granted to users in 'misterobots' group
 * 
 * Primary: OAuth2/OIDC with PKCE (token-based, works on mobile)
 * Fallback: Cookie-based auth (for web or if OIDC not configured)
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

// Track if OIDC is available
let oidcAvailable: boolean | null = null;

// Helper to make HTTP requests with cookies (fallback method)
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
 * Convert OIDC user to AuthUser format
 */
function oidcUserToAuthUser(oidcUser: OIDCUser): AuthUser {
    return {
        username: oidcUser.username,
        displayName: oidcUser.name || oidcUser.username,
        email: oidcUser.email || '',
        groups: oidcUser.groups || [],
        isAdmin: (oidcUser.groups || []).includes(ADMIN_GROUP)
    };
}

/**
 * Check if OIDC is available (cached)
 */
async function checkOIDCAvailable(): Promise<boolean> {
    if (oidcAvailable !== null) return oidcAvailable;
    oidcAvailable = await isOIDCAvailable();
    console.log('OIDC availability:', oidcAvailable);
    return oidcAvailable;
}

/**
 * Check if user is authenticated
 * Tries OIDC tokens first, falls back to cookie-based auth
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
    // First, try OIDC token-based auth
    const tokens = getStoredTokens();
    if (tokens) {
        // Check if tokens are expired
        if (areTokensExpired()) {
            console.log('Auth: Tokens expired, attempting refresh...');
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
                console.log('Auth: Token refresh failed, clearing tokens');
                clearTokens();
            }
        }

        // Get user from tokens
        const oidcUser = oidcGetCurrentUser();
        if (oidcUser) {
            console.log('Auth: Authenticated via OIDC tokens');
            return {
                authenticated: true,
                user: oidcUserToAuthUser(oidcUser)
            };
        }
    }

    // Fallback: Try cookie-based auth (works on web, may not work on mobile)
    const autheliaUrl = getAutheliaUrl();
    try {
        const response = await makeRequest(`${autheliaUrl}/api/user/info`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('Auth status:', response);

        if (response.ok) {
            const data = await response.json();

            if (data && data.username) {
                const user: AuthUser = {
                    username: data.username || '',
                    displayName: data.display_name || data.username,
                    email: data.email || '',
                    groups: data.groups || [],
                    isAdmin: (data.groups || []).includes(ADMIN_GROUP)
                };
                console.log('Auth: Authenticated via cookies');
                return { authenticated: true, user };
            }
        }

        return { authenticated: false, user: null };
    } catch (error) {
        console.error('Auth check failed:', error);
        return { authenticated: false, user: null };
    }
}

/**
 * Handle OAuth callback from redirect
 */
export async function handleOAuthCallback(code: string, state?: string): Promise<AuthStatus> {
    const oidcUser = await oidcHandleCallback(code, state);
    if (oidcUser) {
        const user = oidcUserToAuthUser(oidcUser);
        saveAuthState(user);
        return { authenticated: true, user };
    }
    return { authenticated: false, user: null };
}

/**
 * Open login - uses OIDC if available, falls back to cookie-based
 */
export async function openLogin(): Promise<void> {
    const autheliaUrl = getAutheliaUrl();

    // Check if OIDC is available
    const useOIDC = await checkOIDCAvailable();

    if (useOIDC && Capacitor.isNativePlatform()) {
        // Use OIDC flow on mobile (primary method)
        console.log('Auth: Using OIDC login flow');
        await initiateOIDCLogin();
    } else {
        // Fallback to cookie-based login
        // Set redirect to Authelia itself
        const loginUrl = `${autheliaUrl}/?rd=${encodeURIComponent(autheliaUrl)}`;
        console.log('Auth: Opening cookie-based login:', loginUrl);

        if (Capacitor.isNativePlatform()) {
            await Browser.open({
                url: loginUrl,
                presentationStyle: 'fullscreen'
            });
        } else {
            window.location.href = loginUrl;
        }
    }
}

/**
 * Logout from Authelia
 */
export async function logout(): Promise<void> {
    // Revoke OIDC tokens if present
    const tokens = getStoredTokens();
    if (tokens) {
        await revokeTokens();
    }

    const autheliaUrl = getAutheliaUrl();

    try {
        // Also try API logout for cookie-based sessions
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
    // Clear tokens
    clearTokens();

    // Clear cached user
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
