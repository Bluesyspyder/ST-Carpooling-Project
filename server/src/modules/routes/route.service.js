import ApiError from '../../shared/utils/api-error.js';
import { isIndiaCoordinate } from '../locations/map-providers.js';

// ─── API key helper ────────────────────────────────────────────────────────────

const getOlaApiKey = () => {
  return process.env.OLA_MAPS_API_KEY || process.env.VITE_OLA_MAPS_API_KEY || null;
};

const OLA_BASE = 'https://api.olamaps.io';

// ─── Polyline decoder (Ola Maps uses encoded overview_polyline) ───────────────

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
  if (!isIndiaCoordinate(lat, lng)) {
    throw new ApiError(400, 'This service is currently available only in India.');
  }
  return { lat, lng };
};

// ─── Ola Maps Directions ──────────────────────────────────────────────────────

/**
 * Route between two points via Ola Maps Directions API.
 * Endpoint: POST /routing/v1/directions
 * Auth: api_key query param
 */
const routeWithOla = async (origin, destination, waypointsList = []) => {
  const apiKey = getOlaApiKey();
  if (!apiKey) {
    console.warn('[OLA_DIRECTIONS] OLA_MAPS_API_KEY not set.');
    return null;
  }

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    api_key: apiKey,
    mode: 'driving',
    overview: 'full',
    route_preference: 'fastest',
  });

  if (waypointsList.length > 0) {
    params.set('waypoints', waypointsList.map(w => `${w.lat},${w.lng}`).join('|'));
  }

  try {
    const response = await fetch(`${OLA_BASE}/routing/v1/directions?${params}`, { method: 'POST' });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = null; }

    if (!response.ok || (data && data.status !== 'SUCCESS')) {
      const msg = data?.error_message || data?.message || text.substring(0, 100) || `HTTP ${response.status}`;
      throw new ApiError(response.status === 200 ? 500 : response.status, `Ola Maps Directions Error: ${msg}`);
    }

    if (!data?.routes?.[0]) {
      return null;
    }

    const route = data.routes[0];
    // Accumulate total distance/duration from legs
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    for (const leg of (route.legs || [])) {
      totalDistanceMeters += leg.distance || 0;
      totalDurationSeconds += leg.duration || 0;
    }

    // Decode the overview_polyline for the route path
    let routePath = [];
    if (route.overview_polyline) {
      routePath = decodePolyline(route.overview_polyline);
    } else if (route.legs?.[0]) {
      // Fallback: build from leg start/end
      for (const leg of route.legs) {
        if (leg.start_location) routePath.push({ lat: leg.start_location.lat, lng: leg.start_location.lng });
      }
      const lastLeg = route.legs[route.legs.length - 1];
      if (lastLeg?.end_location) routePath.push({ lat: lastLeg.end_location.lat, lng: lastLeg.end_location.lng });
    }

    if (!routePath.length) return null;

    return {
      routePath,
      distanceKm: totalDistanceMeters / 1000,
      durationMinutes: totalDurationSeconds / 60,
      provider: 'Ola Maps',
    };
  } catch (err) {
    console.error('[OLA_DIRECTIONS] Request error:', err.message);
    throw err;
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

  const olaResult = await routeWithOla(o, d);
  if (olaResult) return olaResult;

  console.warn('[ROUTE] Ola Maps failed. Returning straight-line estimate.');
  return straightLineRoute(o, d);
};

/**
 * calculateMultiPointRoute
 * Input: Array of { latitude, longitude }
 * Output: { routePath, distanceKm, durationMinutes, provider }
 */
export const calculateMultiPointRoute = async (waypoints) => {
  if (!waypoints || waypoints.length < 2) {
    throw new ApiError(400, 'At least 2 waypoints are required.');
  }

  const formattedWaypoints = waypoints.map((w, index) => {
    const lat = Number(w?.latitude ?? w?.lat);
    const lng = Number(w?.longitude ?? w?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new ApiError(400, `Waypoint at index ${index} must have valid latitude and longitude.`);
    }
    if (!isIndiaCoordinate(lat, lng)) {
      throw new ApiError(400, `Waypoint at index ${index} is outside India. This service is only available in India.`);
    }
    return { lat, lng };
  });

  const origin = formattedWaypoints[0];
  const destination = formattedWaypoints[formattedWaypoints.length - 1];
  const middleWaypoints = formattedWaypoints.slice(1, -1);

  const olaResult = await routeWithOla(origin, destination, middleWaypoints);
  if (olaResult) return olaResult;

  // Fallback: straight-line segment estimates
  let totalDistance = 0;
  const path = [];
  for (let i = 0; i < formattedWaypoints.length - 1; i++) {
    totalDistance += haversineKm(formattedWaypoints[i], formattedWaypoints[i + 1]);
    path.push(formattedWaypoints[i]);
  }
  path.push(formattedWaypoints[formattedWaypoints.length - 1]);

  return {
    routePath: path,
    distanceKm: totalDistance,
    durationMinutes: (totalDistance / 40) * 60,
    provider: 'Straight-line estimate',
    isFallback: true,
  };
};
