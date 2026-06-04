const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export const getMapboxDrivingRoute = async (origin, destination) => {
  const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  if (!accessToken) {
    throw new Error('Mapbox access token is missing. Add VITE_MAPBOX_TOKEN to the client environment.');
  }

  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const query = new URLSearchParams({
    access_token: accessToken,
    geometries: 'geojson',
    overview: 'full',
  });

  let response;

  try {
    response = await fetch(`${MAPBOX_DIRECTIONS_URL}/${coordinates}?${query}`);
  } catch {
    throw new Error('Could not connect to Mapbox. Please check your connection and try again.');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Mapbox request failed with status ${response.status}.`);
  }

  const route = data?.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    throw new Error('Mapbox did not return a usable driving route.');
  }

  return {
    routePath: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
    provider: 'Mapbox',
  };
};

