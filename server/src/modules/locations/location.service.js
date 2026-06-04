import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ApiError from '../../shared/utils/api-error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvCandidates = [
  path.resolve(process.cwd(), 'pincode_with_lat-long.csv'),
  path.resolve(process.cwd(), '../pincode_with_lat-long.csv'),
  path.resolve(__dirname, '../../../../pincode_with_lat-long.csv'),
];

const supplementalPincodeLocations = new Map([
  [
    '201308',
    {
      pincode: '201308',
      latitude: 28.2263,
      longitude: 77.6036,
      officeName: 'Yeida, Greater Noida',
      district: 'Gautam Buddh Nagar',
      state: 'Uttar Pradesh',
    },
  ],
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
const FULL_HOME_ADDRESS_ERROR =
  'Please enter your full home address with house/flat, street or area, city, state, and 6-digit pincode.';
const PINCODE_PATTERN = /\b\d{6}\b/;

const getMapboxToken = () => {
  const candidates = [
    process.env.MAPBOX_TOKEN,
    process.env.VITE_MAPBOX_TOKEN,
    process.env.MAP_API_KEY,
  ];

  return candidates.find((token) => token?.trim().startsWith('pk.'))?.trim();
};

const normalizeAddress = (address) => String(address || '').replace(/\s+/g, ' ').trim();

const getAddressPincode = (address) => address.match(PINCODE_PATTERN)?.[0] || '';

const getAddressFallbackLabel = (address) => {
  const [firstPart] = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return firstPart || 'Home address';
};

const getFullAddressValidationError = (address) => {
  const addressParts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const wordCount = address
    .split(/\s+/)
    .filter((word) => /[a-zA-Z0-9]/.test(word)).length;

  if (
    address.length < 20 ||
    addressParts.length < 4 ||
    wordCount < 6 ||
    !PINCODE_PATTERN.test(address)
  ) {
    return FULL_HOME_ADDRESS_ERROR;
  }

  return '';
};

const toLocationPayload = ({ label, address, latitude, longitude, provider }) => ({
  label,
  address,
  latitude,
  longitude,
  position: {
    lat: latitude,
    lng: longitude,
  },
  provider,
});

const geocodeWithMapbox = async (address) => {
  const token = getMapboxToken();

  if (!token) {
    return null;
  }

  const query = new URLSearchParams({
    access_token: token,
    country: 'in',
    limit: '1',
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${query}`
  );
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(502, data?.message || 'Mapbox geocoding request failed.');
  }

  const feature = data?.features?.[0];
  const [longitude, latitude] = feature?.center || [];

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return toLocationPayload({
    label: feature.text || address,
    address: feature.place_name || address,
    latitude,
    longitude,
    provider: 'Mapbox',
  });
};

const geocodeWithNominatim = async (address) => {
  const query = new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'in',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
    headers: {
      'User-Agent': 'Carpooling-ST-Project/1.0',
      Accept: 'application/json',
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(502, 'OpenStreetMap geocoding request failed.');
  }

  const result = data?.[0];
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return toLocationPayload({
    label: result.name || address,
    address: result.display_name || address,
    latitude,
    longitude,
    provider: 'OpenStreetMap',
  });
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
};

const loadPincodeCache = async () => {
  if (pincodeCache) {
    return pincodeCache;
  }

  const csvPath = csvCandidates.find((candidate) => {
    try {
      return candidate && candidate.length > 0;
    } catch {
      return false;
    }
  });

  let csvContent = null;
  let resolvedPath = null;

  for (const candidate of csvCandidates) {
    try {
      csvContent = await fs.readFile(candidate, 'utf8');
      resolvedPath = candidate;
      break;
    } catch {
      // Try the next likely project layout.
    }
  }

  if (!csvContent) {
    throw new ApiError(500, `Pincode CSV file not found near ${csvPath}`);
  }

  const [headerLine, ...rows] = csvContent.split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  const pincodeIndex = headers.indexOf('Pincode');
  const latitudeIndex = headers.indexOf('Latitude');
  const longitudeIndex = headers.indexOf('Longitude');
  const officeIndex = headers.indexOf('OfficeName');
  const districtIndex = headers.indexOf('District');
  const stateIndex = headers.indexOf('StateName');

  if (pincodeIndex === -1 || latitudeIndex === -1 || longitudeIndex === -1) {
    throw new ApiError(500, `Pincode CSV is missing required columns at ${resolvedPath}`);
  }

  pincodeCache = new Map();

  for (const row of rows) {
    if (!row.trim()) {
      continue;
    }

    const columns = parseCsvLine(row);
    const pincode = columns[pincodeIndex]?.trim();
    const latitude = Number(columns[latitudeIndex]);
    const longitude = Number(columns[longitudeIndex]);

    if (!pincode || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    if (!pincodeCache.has(pincode)) {
      pincodeCache.set(pincode, {
        pincode,
        latitude,
        longitude,
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

  if (!apiKey) {
    throw new ApiError(500, 'MAP_API_KEY is not configured on the server.');
  }

  return { apiKey };
};

export const geocodeAddress = async (address) => {
  const normalizedAddress = normalizeAddress(address);
  const validationError = getFullAddressValidationError(normalizedAddress);

  if (validationError) {
    throw new ApiError(400, validationError);
  }

  const mapboxLocation = await geocodeWithMapbox(normalizedAddress);
  if (mapboxLocation) {
    return mapboxLocation;
  }

  const nominatimLocation = await geocodeWithNominatim(normalizedAddress);
  if (nominatimLocation) {
    return nominatimLocation;
  }

  const pincode = getAddressPincode(normalizedAddress);

  if (pincode) {
    try {
      const pincodeLocation = await findPincodeLocation(pincode);

      return toLocationPayload({
        label: getAddressFallbackLabel(normalizedAddress),
        address: `${normalizedAddress} (matched by pincode ${pincode})`,
        latitude: pincodeLocation.latitude,
        longitude: pincodeLocation.longitude,
        provider: 'Pincode fallback',
      });
    } catch {
      // Fall through to the clearer address-level error below.
    }
  }

  throw new ApiError(404, 'No location found for that address. Please include area, city, state, and pincode.');
};

export const getFixedOfficeLocation = async () => {
  return toLocationPayload(ST_DESTINATION_FALLBACK);
};

export const getAddressRouteLocations = async (homeAddress) => {
  const [homeLocation, officeLocation] = await Promise.all([
    geocodeAddress(homeAddress),
    getFixedOfficeLocation(),
  ]);

  return {
    homeLocation,
    officeLocation,
    destinationAddress: ST_DESTINATION_ADDRESS,
  };
};

export const findPincodeLocation = async (pincode) => {
  const normalizedPincode = String(pincode || '').trim();

  if (!/^\d{6}$/.test(normalizedPincode)) {
    throw new ApiError(400, 'Please enter a valid 6-digit pincode.');
  }

  const cache = await loadPincodeCache();
  const location =
    cache.get(normalizedPincode) ||
    supplementalPincodeLocations.get(normalizedPincode);

  if (!location) {
    throw new ApiError(404, `No location found for pincode ${normalizedPincode}.`);
  }

  return location;
};
