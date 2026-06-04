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
