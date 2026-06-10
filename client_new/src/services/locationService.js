import api from './api.js';

export const fetchAutocomplete = async (query) => {
  const res = await api.get('/locations/autocomplete', { params: { query } });
  return res.data.data.suggestions;
};

export const fetchReverseGeocode = async (lat, lng) => {
  const res = await api.get('/locations/reverse-geocode', { params: { lat, lng } });
  return res.data.data.location;
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
 * Calculate driving route between two coordinate pairs via the backend.
 * @param {{ latitude: number, longitude: number }} origin
 * @param {{ latitude: number, longitude: number }} destination
 * @returns {{ routePath, distanceKm, durationMinutes, provider }}
 */
export const calculateRoute = async (origin, destination) => {
  const res = await api.post('/routes/calculate', { origin, destination });
  return res.data.data;
};
