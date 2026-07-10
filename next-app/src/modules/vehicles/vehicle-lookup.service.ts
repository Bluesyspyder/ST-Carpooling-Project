// @ts-nocheck
import axios from 'axios';
import { ApiError } from '@/lib/api-wrapper';

const FIRE_API_URL = 'https://api.fireapi.io/secure-app/rc-vehicle-info/v1';

// FireAPI returns a free-text fuel description (e.g. "PETROL", "DIESEL",
// "ELECTRIC(BOV)") — map it onto this app's fixed vehicleType enum.
// Anything unrecognized is left undefined so the user picks it manually.
function mapFuelType(fuelDesc) {
  const normalized = String(fuelDesc || '').toLowerCase();
  if (normalized.includes('petrol')) return 'petrol';
  if (normalized.includes('diesel')) return 'diesel';
  if (normalized.includes('electric') || normalized.includes('bov') || normalized.includes(' ev')) return 'ev';
  return undefined;
}

/**
 * Looks up a vehicle's registration details from its plate number via FireAPI,
 * and maps the response onto this app's vehicle fields. Only defined fields
 * are returned — the caller decides how to merge them into a form.
 */
export async function lookupVehicleByPlate(plateNumber) {
  const trimmed = String(plateNumber || '').trim();
  if (!trimmed) throw new ApiError(400, 'Vehicle plate number is required');

  if (!process.env.FIRE_API_KEY) {
    console.error('[vehicle-lookup] FIRE_API_KEY is not set — vehicle lookup is disabled');
    throw new ApiError(500, 'Vehicle lookup is not configured on this server');
  }

  let response;
  try {
    response = await axios.get(FIRE_API_URL, {
      params: { vehicle_no: trimmed },
      headers: { 'x-api-key': process.env.FIRE_API_KEY },
      timeout: 10000,
    });
  } catch (err) {
    const status = err.response?.status && err.response.status >= 400 && err.response.status < 500 ? err.response.status : 502;
    const message = err.response?.data?.message || 'Unable to fetch vehicle details for this plate number';
    throw new ApiError(status, message);
  }

  const rc = response.data?.data || response.data || {};

  const vehicleName = [rc.rc_maker_desc, rc.rc_maker_model].filter(Boolean).join(' ').trim();
  const vehicleType = mapFuelType(rc.rc_fuel_desc);
  const seatCount = Number(rc.rc_seat_cap);

  return {
    vehiclePlateNumber: trimmed.toUpperCase(),
    ...(vehicleName && { vehicleName }),
    ...(vehicleType && { vehicleType }),
    ...(Number.isFinite(seatCount) && seatCount >= 1 && seatCount <= 10 && { seatCount }),
    ...(rc.rc_owner_name && { ownerName: rc.rc_owner_name }),
    ...((rc.rc_color || rc.rc_colour) && { color: rc.rc_color || rc.rc_colour }),
  };
}
