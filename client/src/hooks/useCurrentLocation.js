import { useState, useCallback } from 'react';
import { fetchReverseGeocode } from '../services/locationService.js';

/**
 * Hook that resolves the browser's current GPS position to an address
 * using the server's /reverse-geocode endpoint.
 */
const useCurrentLocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getCurrentLocation = useCallback(async () => {
    setError('');
    setLoading(true);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        setLoading(false);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const location = await fetchReverseGeocode(latitude, longitude);
            resolve({ address: location.address, latitude, longitude });
          } catch {
            resolve({ address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude });
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          const messages = {
            1: 'Location access denied. Please allow location access in your browser settings.',
            2: 'Unable to determine your location. Please try again.',
            3: 'Location request timed out. Please try again.',
          };
          setError(messages[err.code] || 'Could not get your current location.');
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { getCurrentLocation, loading, error };
};

export default useCurrentLocation;
