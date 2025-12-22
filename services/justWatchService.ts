import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * JustWatch API Service
 * 
 * JustWatch doesn't have an official public API, but their website uses a GraphQL API
 * that we can query for streaming availability data.
 * 
 * Note: This uses an unofficial API endpoint - use responsibly and be aware it may change.
 */

const JUSTWATCH_API = 'https://apis.justwatch.com/graphql';

// Country code for streaming availability (US by default)
let COUNTRY_CODE = 'US';

// Provider ID mappings from JustWatch
const PROVIDER_MAP: Record<number, { id: string; name: string; color: string }> = {
    8: { id: 'netflix', name: 'Netflix', color: 'bg-red-600' },
    9: { id: 'prime', name: 'Prime Video', color: 'bg-sky-500' },
    337: { id: 'disney', name: 'Disney+', color: 'bg-blue-600' },
    15: { id: 'hulu', name: 'Hulu', color: 'bg-green-500' },
    384: { id: 'hbo', name: 'Max', color: 'bg-purple-600' },
    386: { id: 'peacock', name: 'Peacock', color: 'bg-yellow-500' },
    531: { id: 'paramount', name: 'Paramount+', color: 'bg-blue-500' },
    350: { id: 'apple', name: 'Apple TV+', color: 'bg-gray-700' },
    387: { id: 'peacock-premium', name: 'Peacock Premium', color: 'bg-yellow-400' },
    1899: { id: 'max', name: 'Max', color: 'bg-purple-600' },
    283: { id: 'crunchyroll', name: 'Crunchyroll', color: 'bg-orange-500' },
    2: { id: 'apple-itunes', name: 'iTunes', color: 'bg-pink-500' },
    3: { id: 'google-play', name: 'Google Play', color: 'bg-green-600' },
};

export interface StreamingOffer {
    providerId: string;
    providerName: string;
    type: 'flatrate' | 'rent' | 'buy' | 'free' | 'ads';
    color: string;
    url?: string;
}

export interface JustWatchResult {
    tmdbId: number;
    title: string;
    offers: StreamingOffer[];
}

// Helper to make HTTP requests
async function makeRequest(url: string, options: any): Promise<Response> {
    if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.request({
            url,
            method: options.method || 'POST',
            headers: options.headers,
            data: options.body
        });
        return {
            ok: response.status >= 200 && response.status < 300,
            status: response.status,
            json: async () => response.data
        } as Response;
    } else {
        return fetch(url, options);
    }
}

/**
 * Search JustWatch for streaming availability
 */
export async function searchJustWatch(query: string, type: 'movie' | 'show' = 'movie'): Promise<JustWatchResult[]> {
    const graphqlQuery = {
        query: `
            query SearchContent($searchTerm: String!, $country: Country!, $language: Language!, $first: Int!) {
                popularTitles(
                    country: $country
                    searchTerm: $searchTerm
                    first: $first
                    filter: {
                        objectTypes: [${type === 'movie' ? 'MOVIE' : 'SHOW'}]
                    }
                ) {
                    edges {
                        node {
                            id
                            objectType
                            content(country: $country, language: $language) {
                                title
                                originalReleaseYear
                                externalIds {
                                    tmdbId
                                }
                            }
                            offers(country: $country, platform: WEB) {
                                monetizationType
                                providerId
                                standardWebURL
                            }
                        }
                    }
                }
            }
        `,
        variables: {
            searchTerm: query,
            country: COUNTRY_CODE,
            language: 'en',
            first: 10
        }
    };

    try {
        const response = await makeRequest(JUSTWATCH_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(graphqlQuery)
        });

        if (!response.ok) {
            console.error('JustWatch API error:', response.status);
            return [];
        }

        const data = await response.json();
        const edges = data?.data?.popularTitles?.edges || [];

        return edges.map((edge: any) => {
            const node = edge.node;
            const content = node.content;
            const offers = (node.offers || [])
                .filter((offer: any) => PROVIDER_MAP[offer.providerId])
                .map((offer: any) => {
                    const provider = PROVIDER_MAP[offer.providerId];
                    return {
                        providerId: provider.id,
                        providerName: provider.name,
                        type: offer.monetizationType?.toLowerCase() || 'flatrate',
                        color: provider.color,
                        url: offer.standardWebURL
                    };
                });

            // Deduplicate providers (keep only flatrate/subscription options first)
            const uniqueOffers: StreamingOffer[] = [];
            const seenProviders = new Set<string>();

            // First pass: subscription/flatrate
            offers.filter((o: StreamingOffer) => o.type === 'flatrate').forEach((offer: StreamingOffer) => {
                if (!seenProviders.has(offer.providerId)) {
                    seenProviders.add(offer.providerId);
                    uniqueOffers.push(offer);
                }
            });

            // Second pass: free with ads
            offers.filter((o: StreamingOffer) => o.type === 'free' || o.type === 'ads').forEach((offer: StreamingOffer) => {
                if (!seenProviders.has(offer.providerId)) {
                    seenProviders.add(offer.providerId);
                    uniqueOffers.push(offer);
                }
            });

            return {
                tmdbId: content?.externalIds?.tmdbId,
                title: content?.title,
                offers: uniqueOffers
            };
        }).filter((r: JustWatchResult) => r.tmdbId);

    } catch (error) {
        console.error('JustWatch search error:', error);
        return [];
    }
}

/**
 * Get streaming availability for a specific title by TMDB ID
 */
export async function getStreamingAvailability(
    tmdbId: number,
    type: 'movie' | 'tv'
): Promise<StreamingOffer[]> {
    const graphqlQuery = {
        query: `
            query GetTitleOffers($nodeId: ID!, $country: Country!, $language: Language!) {
                node(id: $nodeId) {
                    ... on MovieOrShow {
                        offers(country: $country, platform: WEB) {
                            monetizationType
                            providerId
                            standardWebURL
                        }
                    }
                }
            }
        `,
        variables: {
            nodeId: `tm${tmdbId}`, // JustWatch uses tm prefix for TMDB IDs
            country: COUNTRY_CODE,
            language: 'en'
        }
    };

    try {
        const response = await makeRequest(JUSTWATCH_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(graphqlQuery)
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        const offers = data?.data?.node?.offers || [];

        return offers
            .filter((offer: any) => PROVIDER_MAP[offer.providerId])
            .map((offer: any) => {
                const provider = PROVIDER_MAP[offer.providerId];
                return {
                    providerId: provider.id,
                    providerName: provider.name,
                    type: offer.monetizationType?.toLowerCase() || 'flatrate',
                    color: provider.color,
                    url: offer.standardWebURL
                };
            })
            .filter((offer: StreamingOffer, index: number, self: StreamingOffer[]) =>
                index === self.findIndex(o => o.providerId === offer.providerId)
            );

    } catch (error) {
        console.error('JustWatch availability error:', error);
        return [];
    }
}

/**
 * Set the country code for streaming availability lookups
 */
export function setJustWatchCountry(countryCode: string) {
    COUNTRY_CODE = countryCode.toUpperCase();
}

/**
 * Get provider info by ID
 */
export function getProviderInfo(providerId: string): { name: string; color: string } | null {
    const provider = Object.values(PROVIDER_MAP).find(p => p.id === providerId);
    return provider ? { name: provider.name, color: provider.color } : null;
}
