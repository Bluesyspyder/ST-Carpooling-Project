// @ts-nocheck
import { ApiError } from '@/lib/api-wrapper';

/**
 * Maps FireAPI fuel descriptions to our supported vehicle types
 */
const mapFuelType = (fuelDesc: string): 'petrol' | 'diesel' | 'ev' => {
  const normalized = (fuelDesc || '').toLowerCase();
  if (normalized.includes('diesel')) return 'diesel';
  if (normalized.includes('electric') || normalized.includes('battery')) return 'ev';
  return 'petrol'; // default for CNG, Petrol, etc.
};

/**
 * Fetch vehicle details from FireAPI RTO service
 * @param {string} plateNumber - The vehicle registration number
 * @returns {Promise<object>} Normalized vehicle details matching our schema
 */
export const fetchVehicleDetails = async (plateNumber: string) => {
  const apiKey = process.env.FIREAPI_KEY;
  if (!apiKey) {
    console.warn('[FIREAPI] FIREAPI_KEY is not set in environment variables. Using mock data for development.');
    // Return mock data if API key is missing (useful for local dev without key)
    return {
      vehicleName: 'Mock Vehicle Model',
      seatCount: 4,
      vehicleType: 'petrol',
      vehiclePlateNumber: plateNumber.toUpperCase(),
    };
  }

  try {
    const url = `https://api.fireapi.io/secure-app/rc-vehicle-info/v1?vehicle_no=${encodeURIComponent(plateNumber)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[FIREAPI] Failed to fetch vehicle details:', response.status, errorData);
      throw new ApiError(400, 'Failed to verify vehicle registration number. Please check the number and try again.');
    }

    const data = await response.json();
    
    // Check if the response contains the expected fields
    if (!data.rc_maker_model || !data.rc_regn_no) {
      throw new ApiError(404, 'Vehicle details not found for this registration number.');
    }

    const maker = data.rc_maker_desc || '';
    const model = data.rc_maker_model || '';
    const vehicleName = `${maker} ${model}`.trim();

    return {
      vehicleName: vehicleName || 'Unknown Vehicle',
      seatCount: data.rc_seat_cap ? Math.min(Number(data.rc_seat_cap), 10) : 4, // Max 10 seats allowed in our schema
      vehicleType: mapFuelType(data.rc_fuel_desc),
      vehiclePlateNumber: data.rc_regn_no.toUpperCase(),
    };
  } catch (error) {
    console.error('[FIREAPI] Error:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Error communicating with RTO service to verify vehicle.');
  }
};
