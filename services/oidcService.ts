import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * OIDC Service for Authelia OAuth2/OpenID Connect authentication
 * 
 * Uses PKCE (Proof Key for Code Exchange) for secure authorization
 * on public clients (mobile apps).
 */

const DEFAULT_AUTHELIA_URL = 'https://login.shivelymedia.com';
const CLIENT_ID = 'dashboarrd-mobile';
const REDIRECT_URI_MOBILE = 'dashboarrd://auth/callback';
const REDIRECT_URI_WEB = 'http://localhost/auth/callback';
const SCOPES = ['openid', 'profile', 'email', 'groups', 'offline_access'];

// Token storage keys
const TOKEN_STORAGE_KEY = 'dashboarrd_oidc_tokens';
const PKCE_STORAGE_KEY = 'dashboarrd_pkce_verifier';

export interface OIDCTokens {
    access_token: string;
    id_token: string;
    refresh_token?: string;
    token_type: string;
    expires_at: number; // Unix timestamp
}

export interface OIDCUser {
    sub: string;
    username: string;
    name?: string;
    email?: string;
    groups?: string[];
}

/**
 * Get Authelia URL from config
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
 * Get redirect URI based on platform
 */
function getRedirectUri(): string {
    return Capacitor.isNativePlatform() ? REDIRECT_URI_MOBILE : REDIRECT_URI_WEB;
}

/**
 * Generate a cryptographically random string for PKCE
 */
function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues)
        .map(v => charset[v % charset.length])
        .join('');
}

/**
 * Generate SHA-256 hash and base64url encode it
 */
async function sha256Base64Url(plain: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64url
    const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const verifier = generateRandomString(64);
    const challenge = await sha256Base64Url(verifier);

    // Store verifier for later use
    localStorage.setItem(PKCE_STORAGE_KEY, verifier);

    return { verifier, challenge };
}

/**
 * Get stored PKCE verifier
 */
export function getStoredVerifier(): string | null {
    return localStorage.getItem(PKCE_STORAGE_KEY);
}

/**
 * Clear stored PKCE verifier
 */
export function clearStoredVerifier(): void {
    localStorage.removeItem(PKCE_STORAGE_KEY);
}

/**
 * Build the authorization URL for Authelia OIDC
 */
export async function buildAuthorizationUrl(): Promise<string> {
    const autheliaUrl = getAutheliaUrl();
    const { challenge } = await generatePKCE();
    const state = generateRandomString(32);

    // Store state for validation
    localStorage.setItem('oidc_state', state);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: getRedirectUri(),
        scope: SCOPES.join(' '),
        state: state,
        code_challenge: challenge,
        code_challenge_method: 'S256'
    });

    return `${autheliaUrl}/api/oidc/authorization?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<OIDCTokens | null> {
    const autheliaUrl = getAutheliaUrl();
    const verifier = getStoredVerifier();

    if (!verifier) {
        console.error('OIDC: No PKCE verifier found');
        return null;
    }

    try {
        const response = await fetch(`${autheliaUrl}/api/oidc/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                code: code,
                redirect_uri: getRedirectUri(),
                code_verifier: verifier
            }).toString()
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OIDC token exchange failed:', error);
            return null;
        }

        const data = await response.json();

        // Calculate expiration time
        const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

        const tokens: OIDCTokens = {
            access_token: data.access_token,
            id_token: data.id_token,
            refresh_token: data.refresh_token,
            token_type: data.token_type || 'Bearer',
            expires_at: expiresAt
        };

        // Store tokens and clear verifier
        storeTokens(tokens);
        clearStoredVerifier();

        return tokens;
    } catch (error) {
        console.error('OIDC token exchange error:', error);
        return null;
    }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<OIDCTokens | null> {
    const tokens = getStoredTokens();
    if (!tokens?.refresh_token) {
        console.error('OIDC: No refresh token available');
        return null;
    }

    const autheliaUrl = getAutheliaUrl();

    try {
        const response = await fetch(`${autheliaUrl}/api/oidc/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: CLIENT_ID,
                refresh_token: tokens.refresh_token
            }).toString()
        });

        if (!response.ok) {
            console.error('OIDC token refresh failed');
            clearTokens();
            return null;
        }

        const data = await response.json();
        const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

        const newTokens: OIDCTokens = {
            access_token: data.access_token,
            id_token: data.id_token || tokens.id_token,
            refresh_token: data.refresh_token || tokens.refresh_token,
            token_type: data.token_type || 'Bearer',
            expires_at: expiresAt
        };

        storeTokens(newTokens);
        return newTokens;
    } catch (error) {
        console.error('OIDC token refresh error:', error);
        return null;
    }
}

/**
 * Parse ID token to extract user info (JWT decode without verification)
 * Note: Token signature is already verified by the server during exchange
 */
export function parseIdToken(idToken: string): OIDCUser | null {
    try {
        const parts = idToken.split('.');
        if (parts.length !== 3) return null;

        // Decode payload (base64url)
        const payload = parts[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const decoded = JSON.parse(atob(payload));

        return {
            sub: decoded.sub,
            username: decoded.preferred_username || decoded.sub,
            name: decoded.name,
            email: decoded.email,
            groups: decoded.groups || []
        };
    } catch (error) {
        console.error('Failed to parse ID token:', error);
        return null;
    }
}

/**
 * Store tokens in localStorage
 */
export function storeTokens(tokens: OIDCTokens): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * Get stored tokens
 */
export function getStoredTokens(): OIDCTokens | null {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;

    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

/**
 * Clear stored tokens
 */
export function clearTokens(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    clearStoredVerifier();
}

/**
 * Check if tokens are expired (with 5 min buffer)
 */
export function areTokensExpired(): boolean {
    const tokens = getStoredTokens();
    if (!tokens) return true;

    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return Date.now() + bufferMs >= tokens.expires_at;
}

/**
 * Check if OIDC is configured on the server
 */
export async function isOIDCAvailable(): Promise<boolean> {
    const autheliaUrl = getAutheliaUrl();

    try {
        const response = await fetch(`${autheliaUrl}/.well-known/openid-configuration`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const config = await response.json();
            return !!config.authorization_endpoint;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Initiate OIDC login flow
 */
export async function initiateOIDCLogin(): Promise<void> {
    const authUrl = await buildAuthorizationUrl();
    console.log('OIDC: Opening authorization URL:', authUrl);

    if (Capacitor.isNativePlatform()) {
        // Use external system browser (Chrome) instead of Custom Tabs
        // This is often more reliable for handling deep link redirects (dashboarrd://)
        // on emulators and some devices where Custom Tabs might hang/block redirects.
        await Browser.open({
            url: authUrl,
            windowName: '_system'
        });
    } else {
        window.location.href = authUrl;
    }
}

/**
 * Handle OAuth callback - exchange code and return user
 */
export async function handleOAuthCallback(code: string, state?: string): Promise<OIDCUser | null> {
    // Validate state if provided
    const storedState = localStorage.getItem('oidc_state');
    if (state && storedState && state !== storedState) {
        console.error('OIDC: State mismatch');
        return null;
    }
    localStorage.removeItem('oidc_state');

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) return null;

    // Parse user from ID token
    return parseIdToken(tokens.id_token);
}

/**
 * Get current user from stored tokens
 */
export function getCurrentUser(): OIDCUser | null {
    const tokens = getStoredTokens();
    if (!tokens) return null;

    return parseIdToken(tokens.id_token);
}

/**
 * Revoke tokens at Authelia
 */
export async function revokeTokens(): Promise<void> {
    const tokens = getStoredTokens();
    if (!tokens) return;

    const autheliaUrl = getAutheliaUrl();

    try {
        await fetch(`${autheliaUrl}/api/oidc/revocation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                token: tokens.access_token,
                token_type_hint: 'access_token'
            }).toString()
        });
    } catch (error) {
        console.error('Token revocation error:', error);
    }

    clearTokens();
}
