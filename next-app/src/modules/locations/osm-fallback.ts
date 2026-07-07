// @ts-nocheck
/**
 * osm-fallback.ts
 *
 * Server-side OpenStreetMap / Nominatim geocoding fallback.
 * Used when Mapbox or Ola Maps geocoding is unavailable or rate-limited.
 *
 * NOTE: Nominatim's usage policy requires:
 *  1. A descriptive User-Agent header (set below via NOMINATIM_USER_AGENT env var).
 *  2. No more than 1 request per second — enforce at the call-site.
 *  3. Do NOT use the demo server (nominatim.openstreetmap.org) for heavy production
 *     traffic; self-host or use a commercial provider in production.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  'STCarpoolApp/1.0 (contact@st-carpooling.example.com)';

export interface NominatimResult {
  latitude: number;
  longitude: number;
  displayName: string;
  boundingBox?: [number, number, number, number]; // [minLat, maxLat, minLng, maxLng]
}

/**
 * Geocode a free-text address string using Nominatim.
 * Returns the best match or null if no results.
 *
 * @param address  Human-readable address (e.g. "Connaught Place, New Delhi")
 * @param countryCode  ISO 3166-1 alpha-2 — restrict results to this country (default "in")
 */
export const geocodeWithNominatim = async (
  address: string,
  countryCode = 'in'
): Promise<NominatimResult | null> => {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    countrycodes: countryCode,
    addressdetails: '0',
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) {
      console.warn(`[NOMINATIM] HTTP ${res.status} for query: ${address}`);
      return null;
    }

    const data = await res.json();
    if (!data || data.length === 0) {
      console.warn(`[NOMINATIM] No results for: ${address}`);
      return null;
    }

    const hit = data[0];
    return {
      latitude: parseFloat(hit.lat),
      longitude: parseFloat(hit.lon),
      displayName: hit.display_name,
      boundingBox: hit.boundingbox
        ? [
            parseFloat(hit.boundingbox[0]),
            parseFloat(hit.boundingbox[1]),
            parseFloat(hit.boundingbox[2]),
            parseFloat(hit.boundingbox[3]),
          ]
        : undefined,
    };
  } catch (err) {
    console.error('[NOMINATIM] Fetch error:', err.message);
    return null;
  }
};

/**
 * Reverse-geocode coordinates to a human-readable address using Nominatim.
 * Returns the display_name string or null on failure.
 */
export const reverseGeocodeWithNominatim = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch (err) {
    console.error('[NOMINATIM] Reverse geocode error:', err.message);
    return null;
  }
};
