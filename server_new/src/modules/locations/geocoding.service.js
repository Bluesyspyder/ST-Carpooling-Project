import { geocodeWithMapbox } from './map-providers.js';
import { findPincodeLocation } from './location.service.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Build 5-level progressive fallback address variants (Nominatim removed).
 */
export const getFallbackAddresses = (address) => {
  if (!address || typeof address !== 'string') return [];
  const pincode = address.match(/\b\d{6}\b/)?.[0] || '';
  const addressWithoutPincode = address.replace(/\b\d{6}\b/g, '').trim();
  const parts = addressWithoutPincode.split(',').map((p) => p.trim()).filter(Boolean);

  const raw = [
    // Level 1: Full address
    parts.join(', ') + (pincode ? ', ' + pincode : ''),
    // Level 2: Area + Locality + City + Pincode
    (parts.length > 1 ? parts.slice(1).join(', ') : parts.join(', ')) + (pincode ? ', ' + pincode : ''),
    // Level 3: Locality + City + Pincode
    (parts.length > 2 ? parts.slice(2).join(', ') : parts.slice(-3).join(', ')) + (pincode ? ', ' + pincode : ''),
    // Level 4: City + Pincode
    (parts.length > 0 ? parts[parts.length - 1] : '') + (pincode ? ', ' + pincode : ''),
    // Level 5: Pincode Only
    pincode,
  ].filter(Boolean);

  const unique = [];
  const seen = new Set();
  raw.forEach((q, i) => {
    const key = q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (key && !seen.has(key)) { seen.add(key); unique.push({ level: i + 1, query: q }); }
  });
  return unique;
};

/**
 * Geocode an address with Mapbox → pincode CSV fallback (no Nominatim).
 */
export const geocodeAddressWithFallback = async (address) => {
  if (!address || address.trim() === '') throw new ApiError(400, 'Address cannot be empty.');

  const normalized = address.replace(/\s+/g, ' ').trim();
  const attempts = getFallbackAddresses(normalized);

  for (const attempt of attempts) {
    try {
      const result = await geocodeWithMapbox(attempt.query);
      if (result) {
        return {
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          verified: false,
          provider: result.provider,
        };
      }
    } catch (err) {
      console.warn(`[GEOCODING] Mapbox failed at level ${attempt.level}:`, err.message);
    }
  }

  // Pincode CSV fallback
  const pincode = normalized.match(/\b\d{6}\b/)?.[0];
  if (pincode) {
    try {
      const result = await findPincodeLocation(pincode);
      if (result) {
        return {
          address: `${normalized} (matched by pincode ${pincode})`,
          latitude: result.latitude,
          longitude: result.longitude,
          verified: false,
          provider: 'Pincode CSV Fallback',
        };
      }
    } catch (err) {
      console.warn('[GEOCODING] Pincode fallback failed:', err.message);
    }
  }

  return null;
};
