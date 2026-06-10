import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ApiError from '../../shared/utils/api-error.js';
import { autocompleteWithMapbox, reverseGeocodeWithMapbox } from './map-providers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvCandidates = [
  path.resolve(process.cwd(), 'pincode_with_lat-long.csv'),
  path.resolve(process.cwd(), '../pincode_with_lat-long.csv'),
  path.resolve(__dirname, '../../../../pincode_with_lat-long.csv'),
];

const supplementalPincodeLocations = new Map([
  ['201308', { pincode: '201308', latitude: 28.2263, longitude: 77.6036, officeName: 'Yeida, Greater Noida', district: 'Gautam Buddh Nagar', state: 'Uttar Pradesh' }],
  ['201318', { pincode: '201318', latitude: 28.572023, longitude: 77.432905, officeName: 'Sec 01 Greater Noida', district: 'Gautam Buddh Nagar', state: 'Uttar Pradesh' }],
]);

let pincodeCache = null;

export const ST_DESTINATION_ADDRESS =
  'STMicroelectronics Private Limited, Plot No. 1, Knowledge Park III, Greater Noida, Uttar Pradesh 201308';

const ST_DESTINATION_FALLBACK = {
  label: 'STMicroelectronics Private Limited',
  address: ST_DESTINATION_ADDRESS,
  latitude: 28.4725,
  longitude: 77.48889,
  provider: 'Fixed destination',
};

const PINCODE_PATTERN = /\b\d{6}\b/;

const getMapboxToken = () => {
  const candidates = [process.env.MAPBOX_TOKEN, process.env.VITE_MAPBOX_TOKEN, process.env.MAP_API_KEY];
  return candidates.find((token) => token?.trim().startsWith('pk.'))?.trim();
};

const normalizeAddress = (address) => String(address || '').replace(/\s+/g, ' ').trim();
const getAddressPincode = (address) => address.match(PINCODE_PATTERN)?.[0] || '';
const getAddressFallbackLabel = (address) => {
  const [firstPart] = address.split(',').map((p) => p.trim()).filter(Boolean);
  return firstPart || 'Home address';
};

const toLocationPayload = ({ label, address, latitude, longitude, provider }) => ({
  label, address, latitude, longitude,
  position: { lat: latitude, lng: longitude },
  provider,
});

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let quoted = false;
  for (const char of line) {
    if (char === '"') { quoted = !quoted; }
    else if (char === ',' && !quoted) { values.push(current); current = ''; }
    else { current += char; }
  }
  values.push(current);
  return values;
};

const loadPincodeCache = async () => {
  if (pincodeCache) return pincodeCache;
  let csvContent = null;
  for (const candidate of csvCandidates) {
    try { csvContent = await fs.readFile(candidate, 'utf8'); break; } catch { /* try next */ }
  }
  if (!csvContent) throw new ApiError(500, 'Pincode CSV file not found.');

  const [headerLine, ...rows] = csvContent.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const pincodeIndex = headers.indexOf('Pincode');
  const latitudeIndex = headers.indexOf('Latitude');
  const longitudeIndex = headers.indexOf('Longitude');
  const officeIndex = headers.indexOf('OfficeName');
  const districtIndex = headers.indexOf('District');
  const stateIndex = headers.indexOf('StateName');

  if (pincodeIndex === -1 || latitudeIndex === -1 || longitudeIndex === -1) {
    throw new ApiError(500, 'Pincode CSV is missing required columns.');
  }

  pincodeCache = new Map();
  for (const row of rows) {
    if (!row.trim()) continue;
    const columns = parseCsvLine(row);
    const pincode = columns[pincodeIndex]?.trim();
    const latitude = Number(columns[latitudeIndex]);
    const longitude = Number(columns[longitudeIndex]);
    if (!pincode || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (!pincodeCache.has(pincode)) {
      pincodeCache.set(pincode, { pincode, latitude, longitude,
        officeName: columns[officeIndex]?.trim() || '',
        district: columns[districtIndex]?.trim() || '',
        state: columns[stateIndex]?.trim() || '',
      });
    }
  }
  return pincodeCache;
};

export const getMapConfig = () => {
  const apiKey = process.env.MAP_API_KEY;
  if (!apiKey) throw new ApiError(500, 'MAP_API_KEY is not configured on the server.');
  return { apiKey };
};

export const geocodeAddress = async (address) => {
  const normalizedAddress = normalizeAddress(address);
  const pincode = getAddressPincode(normalizedAddress);
  const addressWithoutPincode = normalizedAddress.replace(/\b\d{6}\b/g, '').trim();
  const parts = addressWithoutPincode.split(',').map((p) => p.trim()).filter(Boolean);

  const attempts = [
    { level: 1, name: 'Full Address', query: parts.join(', ') + (pincode ? ', ' + pincode : '') },
    { level: 2, name: 'Area + Locality + City + Pincode', query: (parts.length > 1 ? parts.slice(1).join(', ') : parts.join(', ')) + (pincode ? ', ' + pincode : '') },
    { level: 3, name: 'Locality + City + Pincode', query: (parts.length > 2 ? parts.slice(2).join(', ') : parts.slice(-3).join(', ')) + (pincode ? ', ' + pincode : '') },
    { level: 4, name: 'City + Pincode', query: (parts.length > 0 ? parts[parts.length - 1] : '') + (pincode ? ', ' + pincode : '') },
    { level: 5, name: 'Pincode Only', query: pincode },
  ].filter(a => a.query);

  const { geocodeWithMapbox } = await import('./map-providers.js');

  for (const attempt of attempts) {
    console.log(`[GEOCODING] Attempting Level ${attempt.level} (${attempt.name}): "${attempt.query}"`);
    try {
      const mapboxLocation = await geocodeWithMapbox(attempt.query);
      if (mapboxLocation) {
        console.log(`[GEOCODING] Success at Level ${attempt.level} (${attempt.name})`);
        return {
          ...mapboxLocation,
          label: getAddressFallbackLabel(normalizedAddress),
          address: normalizedAddress,
          fallbackLevel: attempt.level,
        };
      }
    } catch (error) {
      console.warn(`[GEOCODING] Level ${attempt.level} failed:`, error.message);
    }
  }

  if (pincode) {
    console.log(`[GEOCODING] Attempting Level 5 fallback via Pincode CSV: "${pincode}"`);
    try {
      const pincodeLocation = await findPincodeLocation(pincode);
      console.log(`[GEOCODING] Success via Pincode CSV`);
      return toLocationPayload({
        label: getAddressFallbackLabel(normalizedAddress),
        address: `${normalizedAddress} (matched by pincode ${pincode})`,
        latitude: pincodeLocation.latitude,
        longitude: pincodeLocation.longitude,
        provider: 'Pincode fallback',
        fallbackLevel: 5,
      });
    } catch (error) {
      console.warn(`[GEOCODING] Pincode fallback failed for ${pincode}:`, error.message);
    }
  }

  throw new ApiError(404, 'No location found for that address. Please include area, city, state, and pincode.');
};

export const getFixedOfficeLocation = async () => toLocationPayload(ST_DESTINATION_FALLBACK);

export const getAddressRouteLocations = async (homeAddress) => {
  const [homeLocation, officeLocation] = await Promise.all([
    geocodeAddress(homeAddress),
    getFixedOfficeLocation(),
  ]);
  return { homeLocation, officeLocation, destinationAddress: ST_DESTINATION_ADDRESS };
};

export const findPincodeLocation = async (pincode) => {
  const normalizedPincode = String(pincode || '').trim();
  if (!/^\d{6}$/.test(normalizedPincode)) throw new ApiError(400, 'Please enter a valid 6-digit pincode.');
  const cache = await loadPincodeCache();
  const location = supplementalPincodeLocations.get(normalizedPincode) || cache.get(normalizedPincode);
  if (!location) throw new ApiError(404, `No location found for pincode ${normalizedPincode}.`);
  return location;
};

// ─── NEW: Autocomplete ───────────────────────────────────────────────────────

export const autocompleteAddress = async (query) => {
  if (!query || query.trim().length < 3) return [];
  const token = getMapboxToken();
  if (!token) throw new ApiError(503, 'Mapbox token not configured. Please set MAPBOX_TOKEN in server .env.');
  const results = await autocompleteWithMapbox(query.trim());
  if (!results) throw new ApiError(503, 'Autocomplete service unavailable. Please try again.');
  return results;
};

// ─── NEW: Reverse Geocode ────────────────────────────────────────────────────

export const reverseGeocode = async (lat, lng) => {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'Invalid coordinates provided.');
  }
  const token = getMapboxToken();
  if (!token) throw new ApiError(503, 'Mapbox token not configured. Please set MAPBOX_TOKEN in server .env.');
  const result = await reverseGeocodeWithMapbox(latitude, longitude);
  if (!result) throw new ApiError(404, 'Could not resolve address for these coordinates.');
  return result;
};
