import ApiError from '../../shared/utils/api-error.js';

// ─── Token helpers ─────────────────────────────────────────────────────────

const getMapboxToken = () => {
  const candidates = [
    process.env.MAPBOX_TOKEN,
    process.env.VITE_MAPBOX_TOKEN,
    process.env.MAP_API_KEY,
  ];
  return candidates.find((t) => t?.trim().startsWith('pk.'))?.trim() || null;
};

// ─── Nominatim (OpenStreetMap) — zero API key required ─────────────────────
// Rate limit: 1 req/s. We rely on backend debounce to stay within limits.

const NOMINATIM_HEADERS = {
  'User-Agent': 'CarpoolApp/1.0 (contact@carpoolapp.local)',
  'Accept-Language': 'en',
};

/**
 * Autocomplete via Nominatim — returns up to 5 suggestions.
 */
export const autocompleteWithNominatim = async (query) => {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '6',
    countrycodes: 'in',
    addressdetails: '1',
    dedupe: '1',
  });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: NOMINATIM_HEADERS }
    );
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) return null;

    return data
      .filter((f) => f.lat && f.lon)
      .slice(0, 5)
      .map((f) => ({
        address: f.display_name,
        latitude: parseFloat(f.lat),
        longitude: parseFloat(f.lon),
        provider: 'OpenStreetMap',
        providerPlaceId: f.place_id?.toString() || null,
      }));
  } catch (err) {
    console.error('[NOMINATIM_AUTOCOMPLETE] Error:', err.message);
    return null;
  }
};

/**
 * Reverse geocode via Nominatim — lat/lng → address string.
 */
export const reverseGeocodeWithNominatim = async (lat, lng) => {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
  });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      { headers: NOMINATIM_HEADERS }
    );
    const data = await res.json().catch(() => null);
    if (!data?.display_name) return null;

    return {
      address: data.display_name,
      latitude: lat,
      longitude: lng,
      provider: 'OpenStreetMap',
    };
  } catch (err) {
    console.error('[NOMINATIM_REVERSE] Error:', err.message);
    return null;
  }
};

/**
 * Geocode a text address via Nominatim.
 */
export const geocodeWithNominatim = async (address) => {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    limit: '1',
    countrycodes: 'in',
    addressdetails: '1',
  });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: NOMINATIM_HEADERS }
    );
    const data = await res.json().catch(() => null);
    const f = data?.[0];
    if (!f) return null;

    return {
      label: f.name || address,
      address: f.display_name || address,
      latitude: parseFloat(f.lat),
      longitude: parseFloat(f.lon),
      provider: 'OpenStreetMap',
      providerPlaceId: f.place_id?.toString() || null,
    };
  } catch (err) {
    console.error('[NOMINATIM_GEOCODE] Error:', err.message);
    return null;
  }
};

// ─── Mapbox ────────────────────────────────────────────────────────────────

export const geocodeWithMapbox = async (address) => {
  const token = getMapboxToken();
  if (!token) return geocodeWithNominatim(address); // graceful fallback

  const params = new URLSearchParams({
    access_token: token,
    country: 'in',
    limit: '1',
  });

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`
    );
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.features?.[0]) {
      console.warn('[MAPBOX_GEOCODE] Failed, trying Nominatim');
      return geocodeWithNominatim(address);
    }

    const f = data.features[0];
    const [longitude, latitude] = f.center || [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      label: f.text || address,
      address: f.place_name || address,
      latitude,
      longitude,
      provider: 'Mapbox',
      providerPlaceId: f.id || null,
    };
  } catch (err) {
    console.warn('[MAPBOX_GEOCODE] Error, falling back to Nominatim:', err.message);
    return geocodeWithNominatim(address);
  }
};

/**
 * Autocomplete — Mapbox if token present, Nominatim otherwise.
 * Never throws: always returns an array (may be empty).
 */
export const autocompleteWithMapbox = async (query) => {
  const token = getMapboxToken();

  // ── Nominatim path (no token) ──
  if (!token) {
    const results = await autocompleteWithNominatim(query);
    return results || [];
  }

  // ── Mapbox path ──
  const params = new URLSearchParams({
    access_token: token,
    country: 'in',
    limit: '5',
    autocomplete: 'true',
    language: 'en',
  });

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
    );
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.features?.length) {
      console.warn('[MAPBOX_AUTOCOMPLETE] Failed, falling back to Nominatim');
      return (await autocompleteWithNominatim(query)) || [];
    }

    return data.features.map((f) => {
      const [lng, lat] = f.center || [];
      return {
        address: f.place_name || f.text,
        latitude: lat,
        longitude: lng,
        provider: 'Mapbox',
        providerPlaceId: f.id || null,
      };
    });
  } catch (err) {
    console.warn('[MAPBOX_AUTOCOMPLETE] Error, falling back to Nominatim:', err.message);
    return (await autocompleteWithNominatim(query)) || [];
  }
};

/**
 * Reverse geocode — Mapbox if token present, Nominatim otherwise.
 */
export const reverseGeocodeWithMapbox = async (lat, lng) => {
  const token = getMapboxToken();

  if (!token) {
    return reverseGeocodeWithNominatim(lat, lng);
  }

  const params = new URLSearchParams({ access_token: token, language: 'en' });

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`
    );
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.features?.length) {
      console.warn('[MAPBOX_REVERSE] Failed, falling back to Nominatim');
      return reverseGeocodeWithNominatim(lat, lng);
    }

    const f = data.features[0];
    return {
      address: f.place_name || f.text,
      latitude: lat,
      longitude: lng,
      provider: 'Mapbox',
    };
  } catch (err) {
    console.warn('[MAPBOX_REVERSE] Error, falling back to Nominatim:', err.message);
    return reverseGeocodeWithNominatim(lat, lng);
  }
};
