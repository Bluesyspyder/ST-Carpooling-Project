import { geocodeWithMapbox, geocodeWithNominatim } from './map-providers.js';
import { findPincodeLocation } from './location.service.js';
import ApiError from '../../shared/utils/api-error.js';

/**
 * Split a comma-separated address string into 6 fallback levels.
 * @param {string} address - The address string
 * @returns {Array<object>} Fallback level entries with name, level, and query query
 */
export const getFallbackAddresses = (address) => {
  if (!address || typeof address !== 'string') return [];
  const pincode = address.match(/\b\d{6}\b/)?.[0] || '';
  const addressWithoutPincode = address.replace(/\b\d{6}\b/g, '').trim();
  const parts = addressWithoutPincode.split(',').map((p) => p.trim()).filter(Boolean);

  const attempts = [];

  // Level 1: House Number + Building + Area + Locality + City + Pincode
  attempts.push({
    level: 1,
    name: 'House Number + Building + Area + Locality + City + Pincode',
    query: parts.join(', ') + (pincode ? ', ' + pincode : ''),
  });

  // Level 2: Building + Area + Locality + City + Pincode
  attempts.push({
    level: 2,
    name: 'Building + Area + Locality + City + Pincode',
    query: (parts.length > 1 ? parts.slice(1).join(', ') : parts.join(', ')) + (pincode ? ', ' + pincode : ''),
  });

  // Level 3: Area + Locality + City + Pincode
  attempts.push({
    level: 3,
    name: 'Area + Locality + City + Pincode',
    query: (parts.length > 2 ? parts.slice(2).join(', ') : parts.slice(-3).join(', ')) + (pincode ? ', ' + pincode : ''),
  });

  // Level 4: Locality + City + Pincode
  attempts.push({
    level: 4,
    name: 'Locality + City + Pincode',
    query: (parts.length > 3 ? parts.slice(3).join(', ') : parts.slice(-2).join(', ')) + (pincode ? ', ' + pincode : ''),
  });

  // Level 5: City + Pincode
  attempts.push({
    level: 5,
    name: 'City + Pincode',
    query: (parts.length > 0 ? parts[parts.length - 1] : '') + (pincode ? ', ' + pincode : ''),
  });

  // Level 6: Pincode Only
  if (pincode) {
    attempts.push({
      level: 6,
      name: 'Pincode Only',
      query: pincode,
    });
  }

  // Filter out duplicates and keep ordering intact
  const uniqueAttempts = [];
  const seenQueries = new Set();

  for (const att of attempts) {
    const normalizedQuery = att.query.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalizedQuery && !seenQueries.has(normalizedQuery)) {
      seenQueries.add(normalizedQuery);
      uniqueAttempts.push(att);
    }
  }

  return uniqueAttempts;
};

/**
 * Geocode an address using a progressive fallback system.
 * Logs each attempt and details of success or failure.
 * @param {string} address - The input address string
 * @returns {Promise<object|null>} Resolved coordinates, address, and metadata
 */
export const geocodeAddressWithFallback = async (address) => {
  if (!address || address.trim() === '') {
    throw new ApiError(400, 'Address cannot be empty.');
  }

  const normalizedAddress = address.replace(/\s+/g, ' ').trim();
  console.log(`[GEOCODING] Original address: "${normalizedAddress}"`);

  const attempts = getFallbackAddresses(normalizedAddress);

  for (const attempt of attempts) {
    console.log(`[GEOCODING] Fallback attempt Level ${attempt.level} (${attempt.name}): Query "${attempt.query}"`);

    // 1. Try Mapbox Geocoding
    try {
      const result = await geocodeWithMapbox(attempt.query);
      if (result) {
        // High confidence only if resolved at Level 1 AND Mapbox relevance >= 0.8
        const isHighConfidence = attempt.level === 1 && result.relevance >= 0.8;
        const resolved = {
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          geocodingFallbackLevel: attempt.name,
          geocodingVerified: isHighConfidence,
          provider: result.provider,
        };
        console.log(`[GEOCODING] Success: Level ${attempt.level} (${attempt.name}) resolved via Mapbox. Coordinates: [${result.latitude}, ${result.longitude}], Verified: ${isHighConfidence}`);
        return resolved;
      }
    } catch (err) {
      console.warn(`[GEOCODING] Mapbox attempt failed at Level ${attempt.level}:`, err.message);
    }

    // 2. Try Nominatim Geocoding
    try {
      const result = await geocodeWithNominatim(attempt.query);
      if (result) {
        // High confidence only if resolved at Level 1 AND Nominatim importance >= 0.6
        const isHighConfidence = attempt.level === 1 && result.importance >= 0.6;
        const resolved = {
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          geocodingFallbackLevel: attempt.name,
          geocodingVerified: isHighConfidence,
          provider: result.provider,
        };
        console.log(`[GEOCODING] Success: Level ${attempt.level} (${attempt.name}) resolved via Nominatim. Coordinates: [${result.latitude}, ${result.longitude}], Verified: ${isHighConfidence}`);
        return resolved;
      }
    } catch (err) {
      console.warn(`[GEOCODING] Nominatim attempt failed at Level ${attempt.level}:`, err.message);
    }
  }

  // 3. Fallback to local Pincode CSV database if a 6-digit pincode is present
  const pincode = normalizedAddress.match(/\b\d{6}\b/)?.[0];
  if (pincode) {
    try {
      console.log(`[GEOCODING] Attempting local Pincode CSV Fallback for pincode "${pincode}"`);
      const result = await findPincodeLocation(pincode);
      if (result) {
        const resolved = {
          address: `${normalizedAddress} (matched by pincode ${pincode})`,
          latitude: result.latitude,
          longitude: result.longitude,
          geocodingFallbackLevel: 'Pincode Only (CSV)',
          geocodingVerified: false,
          provider: 'Pincode CSV Fallback',
        };
        console.log(`[GEOCODING] Success: Resolved via Pincode CSV Fallback. Coordinates: [${result.latitude}, ${result.longitude}], Verified: false`);
        return resolved;
      }
    } catch (err) {
      console.warn('[GEOCODING] Local Pincode CSV Fallback failed:', err.message);
    }
  }

  console.error(`[GEOCODING] Failure reason: All geocoding attempts failed for address "${normalizedAddress}"`);
  return null;
};
