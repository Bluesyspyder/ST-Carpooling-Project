// src/services/mapbox.js
import axios from 'axios';
import { MAPBOX_TOKEN } from '../config';

const BASE = 'https://api.mapbox.com';

// Forward geocode: address string → { coordinates, placeName }
export const geocode = async (query, proximityCoords = null) => {
  try {
    let url = `${BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5&country=in`;
    if (proximityCoords) {
      url += `&proximity=${proximityCoords[0]},${proximityCoords[1]}`;
    }
    const res = await axios.get(url);
    return res.data.features.map((f) => ({
      placeName:   f.place_name,
      coordinates: f.center, // [lng, lat]
    }));
  } catch (err) {
    console.error('Geocode error:', err.message);
    return [];
  }
};

// Reverse geocode: [lng, lat] → address string
export const reverseGeocode = async (lng, lat) => {
  try {
    const res = await axios.get(
      `${BASE}/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );
    return res.data.features[0]?.place_name || '';
  } catch {
    return '';
  }
};

// Get driving route: returns { geometry, distanceKm, durationMin }
export const getRoute = async (originCoords, destCoords) => {
  try {
    const res = await axios.get(
      `${BASE}/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    );
    const route = res.data.routes[0];
    return {
      geometry:    route.geometry,
      distanceKm:  Math.round(route.distance / 100) / 10,
      durationMin: Math.round(route.duration / 60),
    };
  } catch (err) {
    console.error('Route error:', err.message);
    return null;
  }
};
