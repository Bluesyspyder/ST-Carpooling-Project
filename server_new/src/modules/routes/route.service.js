import ApiError from '../../shared/utils/api-error.js';

// ─── Token helpers ────────────────────────────────────────────────────────────

const getOrsKey = () => {
  const candidates = [
    process.env.ORS_API_KEY,
    process.env.VITE_ORS_API_KEY,
    // MAP_API_KEY that is NOT a Mapbox pk. token
    process.env.MAP_API_KEY,
  ];
  return candidates.find((k) => k?.trim() && !k.trim().startsWith('pk.'))?.trim();
};

const getMapboxToken = () => {
  const candidates = [
    process.env.MAPBOX_TOKEN,
    process.env.VITE_MAPBOX_TOKEN,
    process.env.MAP_API_KEY,
  ];
  return candidates.find((t) => t?.trim().startsWith('pk.'))?.trim();
};

// ─── Polyline decoder (ORS uses encoded geometry) ────────────────────────────

const decodePolyline = (encoded) => {
  const coords = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
};

// ─── Validation ───────────────────────────────────────────────────────────────

const validateCoordPair = (obj, name) => {
  const lat = Number(obj?.latitude);
  const lng = Number(obj?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ApiError(400, `${name} must have valid latitude and longitude.`);
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, `${name} coordinates are out of valid range.`);
  }
  return { lat, lng };
};

// ─── OpenRouteService ─────────────────────────────────────────────────────────

const routeWithORS = async (origin, destination) => {
  const apiKey = getOrsKey();
  if (!apiKey) return null; // fall through to Mapbox

  try {
    const response = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
          preference: 'fastest',
        }),
      }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.routes?.[0]) {
      console.warn('[ORS] Route request failed:', data?.error?.message || response.status);
      return null;
    }

    const route = data.routes[0];
    const routePath =
      typeof route.geometry === 'string'
        ? decodePolyline(route.geometry)
        : route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

    if (!routePath.length) return null;

    return {
      routePath,
      distanceKm: route.summary.distance / 1000,
      durationMinutes: route.summary.duration / 60,
      provider: 'OpenRouteService',
    };
  } catch (err) {
    console.warn('[ORS] Request error:', err.message);
    return null;
  }
};

// ─── Mapbox Directions ────────────────────────────────────────────────────────

const routeWithMapbox = async (origin, destination) => {
  const token = getMapboxToken();
  if (!token) return null;

  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: token,
    geometries: 'geojson',
    overview: 'full',
  });

  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?${params}`
    );
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.routes?.[0]) {
      console.warn('[MAPBOX_DIRECTIONS] Failed:', data?.message || response.status);
      return null;
    }

    const route = data.routes[0];
    if (!route.geometry?.coordinates?.length) return null;

    return {
      routePath: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      provider: 'Mapbox',
    };
  } catch (err) {
    console.warn('[MAPBOX_DIRECTIONS] Request error:', err.message);
    return null;
  }
};

// ─── Straight-line fallback ───────────────────────────────────────────────────

const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const straightLineRoute = (origin, destination) => {
  const distanceKm = haversineKm(origin, destination);
  // Rough estimate: avg 40 km/h in city
  const durationMinutes = (distanceKm / 40) * 60;
  return {
    routePath: [origin, destination],
    distanceKm,
    durationMinutes,
    provider: 'Straight-line estimate',
    isFallback: true,
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * calculateRoute
 * Input:  { origin: { latitude, longitude }, destination: { latitude, longitude } }
 * Output: { routePath, distanceKm, durationMinutes, provider }
 */
export const calculateRoute = async ({ origin, destination }) => {
  const o = validateCoordPair(origin, 'Origin');
  const d = validateCoordPair(destination, 'Destination');
  const hasRoutingKey = Boolean(getOrsKey() || getMapboxToken());

  // ORS first
  const orsResult = await routeWithORS(o, d);
  if (orsResult) return orsResult;

  // Mapbox fallback
  const mapboxResult = await routeWithMapbox(o, d);
  if (mapboxResult) return mapboxResult;

  // No API keys configured — return straight-line estimate so the app still works
  console.warn(
    hasRoutingKey
      ? '[ROUTE] Routing providers failed. Returning straight-line estimate.'
      : '[ROUTE] No routing API keys available. Returning straight-line estimate.'
  );
  return straightLineRoute(o, d);
};
