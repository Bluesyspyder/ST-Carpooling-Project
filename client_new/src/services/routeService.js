import { getMapboxDrivingRoute } from './mapboxRouteService.js';

const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

const decodePolyline = (encodedGeometry) => {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encodedGeometry.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encodedGeometry.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encodedGeometry.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push({
      lat: latitude / 1e5,
      lng: longitude / 1e5,
    });
  }

  return coordinates;
};

const getErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data.error?.message || data.message;
  } catch {
    return null;
  }
};

const getOpenRouteServiceDrivingRoute = async (origin, destination) => {
  const apiKey = import.meta.env.VITE_ORS_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouteService API key is missing. Add VITE_ORS_API_KEY to the client environment.');
  }

  if (![origin?.lat, origin?.lng, destination?.lat, destination?.lng].every(Number.isFinite)) {
    throw new Error('A valid origin and destination are required to calculate the driving route.');
  }

  let response;

  try {
    response = await fetch(ORS_DIRECTIONS_URL, {
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
    });
  } catch {
    throw new Error('Could not connect to OpenRouteService. Please check your connection and try again.');
  }

  if (!response.ok) {
    const apiMessage = await getErrorMessage(response);
    throw new Error(apiMessage || `OpenRouteService request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const route = data.routes?.[0];

  if (!route?.geometry || !route.summary) {
    throw new Error('OpenRouteService did not return a usable driving route.');
  }

  const routePath = typeof route.geometry === 'string'
    ? decodePolyline(route.geometry)
    : route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

  if (routePath.length === 0) {
    throw new Error('OpenRouteService returned an empty driving route.');
  }

  return {
    routePath,
    distanceKm: route.summary.distance / 1000,
    durationMinutes: route.summary.duration / 60,
    provider: 'OpenRouteService',
  };
};

export const getDrivingRoute = async (origin, destination) => {
  if (![origin?.lat, origin?.lng, destination?.lat, destination?.lng].every(Number.isFinite)) {
    throw new Error('A valid origin and destination are required to calculate the driving route.');
  }

  const hasOpenRouteServiceKey = Boolean(import.meta.env.VITE_ORS_API_KEY);
  const hasMapboxToken = Boolean(import.meta.env.VITE_MAPBOX_TOKEN);

  if (hasOpenRouteServiceKey) {
    try {
      return await getOpenRouteServiceDrivingRoute(origin, destination);
    } catch (error) {
      if (!hasMapboxToken) {
        throw error;
      }

      console.warn('OpenRouteService routing failed. Trying Mapbox.', error);
    }
  }

  if (hasMapboxToken) {
    return getMapboxDrivingRoute(origin, destination);
  }

  throw new Error(
    'Routing API key is missing. Add VITE_ORS_API_KEY or VITE_MAPBOX_TOKEN to the client environment.'
  );
};
