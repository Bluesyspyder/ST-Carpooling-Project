import ApiError from '../../shared/utils/api-error.js';

const getMapboxToken = () => {
  const candidates = [
    process.env.MAPBOX_TOKEN,
    process.env.VITE_MAPBOX_TOKEN,
    process.env.MAP_API_KEY,
  ];

  return candidates.find((token) => token?.trim().startsWith('pk.'))?.trim();
};

/**
 * Perform geocoding query using Mapbox API
 * @param {string} address - The address to geocode
 * @returns {Promise<object|null>} The geocoded location or null
 */
export const geocodeWithMapbox = async (address) => {
  const token = getMapboxToken();
  if (!token) {
    console.warn('[MAPBOX] No Mapbox token found.');
    return null;
  }

  const query = new URLSearchParams({
    access_token: token,
    country: 'in',
    limit: '1',
  });

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${query}`
    );
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn(`[MAPBOX] API Request failed: ${data?.message || response.statusText}`);
      return null;
    }

    const feature = data?.features?.[0];
    if (!feature) return null;

    const [longitude, latitude] = feature.center || [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      label: feature.text || address,
      address: feature.place_name || address,
      latitude,
      longitude,
      relevance: feature.relevance || 0,
      provider: 'Mapbox',
    };
  } catch (err) {
    console.error('[MAPBOX] Request error:', err.message);
    return null;
  }
};

/**
 * Perform geocoding query using Nominatim (OpenStreetMap) API
 * @param {string} address - The address to geocode
 * @returns {Promise<object|null>} The geocoded location or null
 */
export const geocodeWithNominatim = async (address) => {
  const query = new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'in',
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
      headers: {
        'User-Agent': 'Carpooling-ST-Project/1.0',
        Accept: 'application/json',
      },
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !Array.isArray(data)) {
      console.warn(`[NOMINATIM] API Request failed: ${response.statusText}`);
      return null;
    }

    const result = data?.[0];
    if (!result) return null;

    const latitude = Number(result.lat);
    const longitude = Number(result.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      label: result.name || address,
      address: result.display_name || address,
      latitude,
      longitude,
      importance: Number(result.importance) || 0,
      provider: 'OpenStreetMap',
    };
  } catch (err) {
    console.error('[NOMINATIM] Request error:', err.message);
    return null;
  }
};
