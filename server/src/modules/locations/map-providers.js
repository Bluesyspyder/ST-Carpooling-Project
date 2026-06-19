import ApiError from '../../shared/utils/api-error.js';

// ─── Ola Maps — all geocoding/autocomplete for the Indian market ─────────────
// Docs: https://api.olamaps.io
// Auth: api_key query param
// Coverage: India only

const OLA_BASE = 'https://api.olamaps.io';

const getOlaApiKey = () => {
  return (
    process.env.OLA_MAPS_API_KEY ||
    process.env.VITE_OLA_MAPS_API_KEY ||
    null
  );
};

/**
 * India bounding-box guard.
 * Returns true when the coordinate falls within rough India bounds.
 * Lat: 6.5 – 35.7   Lng: 68.1 – 97.4
 */
export const isIndiaCoordinate = (lat, lng) => {
  const la = Number(lat);
  const lo = Number(lng);
  return la >= 6.5 && la <= 35.7 && lo >= 68.1 && lo <= 97.4;
};

// ─── Autocomplete ──────────────────────────────────────────────────────────────

/**
 * Autocomplete — Ola Maps Places API.
 * Returns up to 5 suggestions (India only).
 * Never throws: returns empty array on failure.
 */
export const autocompleteWithOla = async (query) => {
  const apiKey = getOlaApiKey();
  if (!apiKey) {
    console.warn('[OLA_AUTOCOMPLETE] OLA_MAPS_API_KEY not set.');
    return [];
  }

  const params = new URLSearchParams({
    input: query,
    api_key: apiKey,
  });

  try {
    const res = await fetch(`${OLA_BASE}/places/v1/autocomplete?${params}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = null; }

    if (!res.ok || (data && data.status && data.status !== 'ok' && data.status !== 'zero_results')) {
      const msg = data?.error_message || data?.message || text.substring(0, 100) || `HTTP ${res.status}`;
      throw new ApiError(res.status === 200 ? 500 : res.status, `Ola Maps Autocomplete Error: ${msg}`);
    }

    if (!data?.predictions?.length) return [];

    return data.predictions.map((p) => ({
      address: p.description || p.structured_formatting?.main_text || p.name,
      latitude: p.geometry?.location?.lat ?? null,
      longitude: p.geometry?.location?.lng ?? null,
      provider: 'Ola Maps',
      providerPlaceId: p.place_id || null,
    }));
  } catch (err) {
    console.error('[OLA_AUTOCOMPLETE] Request error:', err.message);
    throw err;
  }
};

// ─── Forward geocode ───────────────────────────────────────────────────────────

/**
 * Forward geocode via Ola Maps.
 * Returns { label, address, latitude, longitude, provider, providerPlaceId } or null.
 */
export const geocodeWithOla = async (address) => {
  const apiKey = getOlaApiKey();
  if (!apiKey) {
    console.warn('[OLA_GEOCODE] OLA_MAPS_API_KEY not set.');
    return null;
  }

  const params = new URLSearchParams({
    address,
    api_key: apiKey,
  });

  try {
    const res = await fetch(`${OLA_BASE}/places/v1/geocode?${params}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = null; }

    if (!res.ok || (data && data.status && data.status !== 'ok' && data.status !== 'zero_results')) {
      const msg = data?.error_message || data?.message || text.substring(0, 100) || `HTTP ${res.status}`;
      throw new ApiError(res.status === 200 ? 500 : res.status, `Ola Maps Geocode Error: ${msg}`);
    }

    if (!data?.geocodingResults?.length) return null;

    const r = data.geocodingResults[0];
    const lat = r.geometry?.location?.lat;
    const lng = r.geometry?.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      label: r.name || address,
      address: r.formatted_address || address,
      latitude: lat,
      longitude: lng,
      provider: 'Ola Maps',
      providerPlaceId: r.place_id || null,
    };
  } catch (err) {
    console.error('[OLA_GEOCODE] Request error:', err.message);
    throw err;
  }
};

// ─── Reverse geocode ───────────────────────────────────────────────────────────

/**
 * Reverse geocode via Ola Maps.
 * Returns { address, latitude, longitude, provider } or null.
 */
export const reverseGeocodeWithOla = async (lat, lng) => {
  const apiKey = getOlaApiKey();
  if (!apiKey) {
    console.warn('[OLA_REVERSE] OLA_MAPS_API_KEY not set.');
    return null;
  }

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    api_key: apiKey,
  });

  try {
    const res = await fetch(`${OLA_BASE}/places/v1/reverse-geocode?${params}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = null; }

    if (!res.ok || (data && data.status && data.status !== 'ok' && data.status !== 'zero_results')) {
      const msg = data?.error_message || data?.message || text.substring(0, 100) || `HTTP ${res.status}`;
      throw new ApiError(res.status === 200 ? 500 : res.status, `Ola Maps Reverse Geocode Error: ${msg}`);
    }

    if (!data?.results?.length) return null;

    const r = data.results[0];
    return {
      address: r.formatted_address || `${lat}, ${lng}`,
      latitude: lat,
      longitude: lng,
      provider: 'Ola Maps',
    };
  } catch (err) {
    console.error('[OLA_REVERSE] Request error:', err.message);
    throw err;
  }
};
