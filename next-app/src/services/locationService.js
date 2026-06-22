import api from './api.js';

export const fetchAutocomplete = async (query) => {
  const res = await api.get('/locations/autocomplete', { params: { q: query } });
  // The backend returns an array directly in res.data.data
  return Array.isArray(res.data.data) ? res.data.data : (res.data.data?.suggestions || []);
};

export const fetchReverseGeocode = async (lat, lng) => {
  const res = await api.get('/locations/reverse-geocode', { params: { lat, lng } });
  return res.data.data;
};

export const fetchGeocode = async (address) => {
  const res = await api.get('/locations/geocode', { params: { address } });
  return res.data.data;
};

export const fetchSavedAddresses = async () => {
  const res = await api.get('/users/saved-addresses');
  return res.data.data.savedAddresses;
};

export const addSavedAddress = async (data) => {
  const res = await api.post('/users/saved-addresses', data);
  return res.data.data.savedAddresses;
};

export const updateSavedAddress = async (id, data) => {
  const res = await api.put(`/users/saved-addresses/${id}`, data);
  return res.data.data.savedAddresses;
};

export const deleteSavedAddress = async (id) => {
  const res = await api.delete(`/users/saved-addresses/${id}`);
  return res.data.data.savedAddresses;
};

export const setDefaultSavedAddress = async (id) => {
  const res = await api.patch(`/users/saved-addresses/${id}/default`);
  return res.data.data.savedAddresses;
};

export const fetchRecentAddresses = async () => {
  const res = await api.get('/users/recent-addresses');
  return res.data.data.recentAddresses;
};

export const fetchFrequentAddresses = async () => {
  const res = await api.get('/users/frequent-addresses');
  return res.data.data.frequentAddresses;
};

// ─── Route calculation ────────────────────────────────────────────────────────

/**
 * Calculate driving route between two coordinate pairs via the backend (Ola Maps).
 * @param {{ latitude: number, longitude: number }} origin
 * @param {{ latitude: number, longitude: number }} destination
 * @returns {{ routePath, distanceKm, durationMinutes, provider }}
 */
export const calculateRoute = async (origin, destination) => {
  const res = await api.post('/routes/calculate', { origin, destination });
  return res.data.data;
};

/**
 * Calculate multi-point route through waypoints via the backend (Ola Maps).
 * @param {{ latitude: number, longitude: number }[]} waypoints
 * @returns {{ routePath, distanceKm, durationMinutes, provider }}
 */
export const calculateMultiPointRoute = async (waypoints) => {
  const res = await api.post('/routes/calculate-multipoint', { waypoints });
  return res.data.data;
};

// ─── Route Helpers (Merged from routeService) ───────────────────────────────

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

const totalPathDistance = (points) => {
  let dist = 0;
  for (let i = 0; i < points.length - 1; i++) dist += haversineKm(points[i], points[i + 1]);
  return dist;
};

const permutations = (arr) => {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) result.push([arr[i], ...perm]);
  }
  return result;
};

export const optimizePickupOrder = (origin, pickups, destination) => {
  if (!pickups || pickups.length === 0) {
    return {
      orderedPickups: [],
      optimizedWaypoints: [origin, destination],
      estimatedDistanceKm: haversineKm(origin, destination),
    };
  }
  if (pickups.length === 1) {
    return {
      orderedPickups: pickups,
      optimizedWaypoints: [origin, pickups[0], destination],
      estimatedDistanceKm: totalPathDistance([origin, pickups[0], destination]),
    };
  }

  let bestOrder = pickups;
  let bestDist = Infinity;

  for (const perm of permutations(pickups)) {
    const dist = totalPathDistance([origin, ...perm, destination]);
    if (dist < bestDist) {
      bestDist = dist;
      bestOrder = perm;
    }
  }

  return {
    orderedPickups: bestOrder,
    optimizedWaypoints: [origin, ...bestOrder, destination],
    estimatedDistanceKm: bestDist,
  };
};

export const getDrivingRoute = async (origin, destination) => {
  if (![origin?.lat, origin?.lng, destination?.lat, destination?.lng].every(Number.isFinite)) {
    throw new Error('A valid origin and destination are required to calculate the driving route.');
  }

  try {
    const result = await calculateRoute(
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: destination.lat, longitude: destination.lng }
    );
    return result;
  } catch (err) {
    console.warn('[ROUTE_SERVICE] Backend route failed, using straight-line estimate:', err.message);
    const distanceKm = haversineKm(origin, destination);
    return {
      routePath: [origin, destination],
      distanceKm,
      durationMinutes: (distanceKm / 40) * 60,
      provider: 'Straight-line estimate',
      isFallback: true,
    };
  }
};

export const getMultiPointRoute = async (waypoints) => {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required to calculate route.');
  }

  try {
    console.log('[locationService] getMultiPointRoute called with waypoints:', JSON.stringify(waypoints));
    const res = await api.post('/routes/calculate-multipoint', { waypoints });
    const result = res.data.data;
    console.log('[locationService] getMultiPointRoute received result:', {
      distanceKm: result.distanceKm,
      routePathLength: result.routePath?.length,
      middlePoint: result.routePath?.[Math.floor(result.routePath.length / 2)],
      provider: result.provider
    });
    return result;
  } catch (err) {
    console.warn('[ROUTE_SERVICE] Multi-point route failed, using straight-line estimate:', err.message);

    let totalDistance = 0;
    const routePath = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += haversineKm(waypoints[i], waypoints[i + 1]);
      routePath.push(waypoints[i]);
    }
    routePath.push(waypoints[waypoints.length - 1]);

    return {
      routePath,
      distanceKm: totalDistance,
      durationMinutes: (totalDistance / 40) * 60,
      provider: 'Straight-line estimate',
      isFallback: true,
    };
  }
};
