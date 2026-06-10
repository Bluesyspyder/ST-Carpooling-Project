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
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      label: feature.text || address,
      address: feature.place_name || address,
      latitude,
      longitude,
      provider: 'Mapbox',
      providerPlaceId: feature.id || null,
    };
  } catch (err) {
    console.error('[MAPBOX] Request error:', err.message);
    return null;
  }
};

/**
 * Mapbox autocomplete — returns up to 5 suggestions for a partial query
 */
export const autocompleteWithMapbox = async (query) => {
  const token = getMapboxToken();
  if (!token) return null;

  const params = new URLSearchParams({
    access_token: token,
    country: 'in',
    limit: '5',
    autocomplete: 'true',
    language: 'en',
  });

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.features) return null;

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
    console.error('[MAPBOX_AUTOCOMPLETE] Error:', err.message);
    return null;
  }
};

/**
 * Mapbox reverse geocoding — lat/lng → address
 */
export const reverseGeocodeWithMapbox = async (lat, lng) => {
  const token = getMapboxToken();
  if (!token) return null;

  const params = new URLSearchParams({ access_token: token, language: 'en' });

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`
    );
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.features?.length) return null;

    const f = data.features[0];
    return {
      address: f.place_name || f.text,
      latitude: lat,
      longitude: lng,
      provider: 'Mapbox',
    };
  } catch (err) {
    console.error('[MAPBOX_REVERSE] Error:', err.message);
    return null;
  }
};
