import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import LocationConfirmationMap from '../../components/LocationConfirmationMap.jsx';

const CreateRide = () => {
  const [formData, setFormData] = useState({
    vehicle: '',
    source: '',
    destination: '',
    departureTime: '',
    availableSeats: 3,
    pricePerSeat: 10,
  });
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Geocoding fallback states
  const [geocodingState, setGeocodingState] = useState(null); // null, 'confirming', 'manual'
  const [warningMsg, setWarningMsg] = useState('');
  const [pickupLocation, setPickupLocation] = useState({ address: '', lat: null, lng: null });
  const [destinationLocation, setDestinationLocation] = useState({ address: '', lat: null, lng: null });
  const [activeManualField, setActiveManualField] = useState('pickup'); // 'pickup' or 'destination'

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch user's registered vehicles to select from
    const fetchVehicles = async () => {
      try {
        const response = await api.get('/vehicles');
        setVehicles(response.data.data.vehicles);
        if (response.data.data.vehicles.length > 0) {
          setFormData(prev => ({ ...prev, vehicle: response.data.data.vehicles[0]._id }));
        }
      } catch (err) {
        console.error('Failed to load vehicles', err);
      }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e) => {
    const val = e.target.name === 'availableSeats' || e.target.name === 'pricePerSeat'
      ? Number(e.target.value)
      : e.target.value;

    setFormData({
      ...formData,
      [e.target.name]: val,
    });
  };

  const handlePickupChange = (coords) => {
    setPickupLocation(prev => ({
      ...prev,
      lat: coords.lat,
      lng: coords.lng
    }));
  };

  const handleDestinationChange = (coords) => {
    setDestinationLocation(prev => ({
      ...prev,
      lat: coords.lat,
      lng: coords.lng
    }));
  };

  const handleSubmit = async (e, forceConfirmed = false) => {
    if (e) e.preventDefault();
    setError('');
    setWarningMsg('');
    setSuccess(false);
    setIsSubmitting(true);

    if (!formData.vehicle) {
      setError('Please add a vehicle first in your profile before offering a ride.');
      setIsSubmitting(false);
      return;
    }

    try {
      const isoDeparture = new Date(formData.departureTime).toISOString();
      const payload = {
        ...formData,
        departureTime: isoDeparture
      };

      // Send confirmed or manual coordinates if they exist
      if (forceConfirmed || geocodingState === 'confirming' || geocodingState === 'manual') {
        payload.pickupLocation = {
          address: pickupLocation.address || formData.source,
          latitude: pickupLocation.lat,
          longitude: pickupLocation.lng,
          confirmed: true,
          manual: geocodingState === 'manual'
        };
        payload.destinationLocation = {
          address: destinationLocation.address || formData.destination,
          latitude: destinationLocation.lat,
          longitude: destinationLocation.lng,
          confirmed: true,
          manual: geocodingState === 'manual'
        };
      }

      await api.post('/rides', payload);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData && responseData.code === 'GEOCODING_LOW_CONFIDENCE') {
        setGeocodingState('confirming');
        setWarningMsg(responseData.message || 'Address was resolved with low specificity. Please verify and drag/adjust the pins on the map before submitting.');
        
        const errorData = responseData.data || {};
        if (errorData.location) {
          const loc = errorData.location;
          if (errorData.field === 'source') {
            setPickupLocation({ address: loc.address, lat: loc.latitude, lng: loc.longitude });
          } else if (errorData.field === 'destination') {
            setDestinationLocation({ address: loc.address, lat: loc.latitude, lng: loc.longitude });
          }
        }
      } else if (responseData && responseData.code === 'GEOCODING_FAILED') {
        setGeocodingState('manual');
        setError(responseData.message || 'Geocoding failed completely. Please place pickup and destination markers manually on the map.');
        
        // Initialize default coords for manual placement
        if (!pickupLocation.lat) {
          setPickupLocation({ address: formData.source, lat: 28.5355, lng: 77.3910 });
        }
        if (!destinationLocation.lat) {
          setDestinationLocation({ address: formData.destination, lat: 28.4725, lng: 77.4889 });
        }
      } else {
        setError(err.response?.data?.message || 'Failed to list ride offer.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetGeocoding = () => {
    setGeocodingState(null);
    setWarningMsg('');
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-green-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[1400px] mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8 text-center animate-fade-in">
          Offer a Ride
        </h2>

        <div className="glass-panel py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm flex flex-col gap-2">
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {warningMsg && (
            <div className="mb-4 bg-amber-950/40 border border-amber-500/20 text-amber-300 p-3.5 rounded-xl text-sm">
              <span className="font-semibold block mb-1">Warning:</span>
              <span>{warningMsg}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-950/40 border border-green-500/20 text-green-400 p-3.5 rounded-xl text-sm font-semibold">
              Ride registered successfully! Redirecting...
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form Column */}
            <form className="space-y-6" onSubmit={(e) => handleSubmit(e)}>
              <div>
                <label htmlFor="vehicle" className="block text-sm font-medium text-slate-300">
                  Select Vehicle
                </label>
                {vehicles.length === 0 ? (
                  <div className="mt-1 text-sm text-yellow-400 bg-yellow-950/20 border border-yellow-500/10 p-2.5 rounded-lg">
                    No vehicles registered. You must add a vehicle to list a ride.
                  </div>
                ) : (
                  <select
                    id="vehicle"
                    name="vehicle"
                    value={formData.vehicle}
                    onChange={handleChange}
                    disabled={geocodingState !== null}
                    className="mt-1 block w-full pl-3 pr-10 py-2 border border-slate-800 rounded-lg bg-slate-900 text-slate-100 focus:outline-none focus:ring-emerald-500 sm:text-sm disabled:opacity-50"
                  >
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.vehicleName} ({v.vehiclePlateNumber})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-slate-300">
                    Starting Point (Source)
                  </label>
                  <input
                    id="source"
                    name="source"
                    type="text"
                    required
                    value={formData.source}
                    onChange={handleChange}
                    disabled={geocodingState !== null}
                    className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm disabled:opacity-50"
                    placeholder="e.g. Plot No. 1, Knowledge Park III, Greater Noida"
                  />
                </div>
                <div>
                  <label htmlFor="destination" className="block text-sm font-medium text-slate-300">
                    Destination
                  </label>
                  <input
                    id="destination"
                    name="destination"
                    type="text"
                    required
                    value={formData.destination}
                    onChange={handleChange}
                    disabled={geocodingState !== null}
                    className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm disabled:opacity-50"
                    placeholder="e.g. Sector 62, Noida"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="departureTime" className="block text-sm font-medium text-slate-300">
                  Departure Date & Time
                </label>
                <input
                  id="departureTime"
                  name="departureTime"
                  type="datetime-local"
                  required
                  value={formData.departureTime}
                  onChange={handleChange}
                  disabled={geocodingState !== null}
                  className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm disabled:opacity-50"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="availableSeats" className="block text-sm font-medium text-slate-300">
                    Available Seats
                  </label>
                  <input
                    id="availableSeats"
                    name="availableSeats"
                    type="number"
                    required
                    min="1"
                    max="8"
                    value={formData.availableSeats}
                    onChange={handleChange}
                    disabled={geocodingState !== null}
                    className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="pricePerSeat" className="block text-sm font-medium text-slate-300">
                    Price Per Seat ($)
                  </label>
                  <input
                    id="pricePerSeat"
                    name="pricePerSeat"
                    type="number"
                    required
                    min="0"
                    value={formData.pricePerSeat}
                    onChange={handleChange}
                    disabled={geocodingState !== null}
                    className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 sm:text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              {geocodingState === null ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 disabled:opacity-50"
                >
                  {isSubmitting ? 'Listing ride...' : 'Publish Ride'}
                </button>
              ) : (
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleResetGeocoding}
                    className="w-1/2 flex justify-center py-2.5 px-4 border border-slate-700 rounded-lg text-sm font-bold text-slate-200 bg-slate-900 hover:bg-slate-800 transition duration-150"
                  >
                    Edit Address
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(null, true)}
                    disabled={isSubmitting}
                    className="w-1/2 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 transition duration-150 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Confirm & Publish'}
                  </button>
                </div>
              )}
            </form>

            {/* Map Confirmation Column */}
            <div className="flex flex-col gap-4">
              {geocodingState !== null ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-200">
                      {geocodingState === 'manual' ? 'Manual Pin Placement' : 'Confirm Location Pins'}
                    </h3>
                    {geocodingState === 'manual' && (
                      <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setActiveManualField('pickup')}
                          className={`px-3 py-1 rounded-md font-semibold ${activeManualField === 'pickup' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400'}`}
                        >
                          Pickup
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveManualField('destination')}
                          className={`px-3 py-1 rounded-md font-semibold ${activeManualField === 'destination' ? 'bg-indigo-500 text-slate-100' : 'text-slate-400'}`}
                        >
                          Destination
                        </button>
                      </div>
                    )}
                  </div>

                  <LocationConfirmationMap
                    pickup={pickupLocation}
                    destination={destinationLocation}
                    onPickupChange={handlePickupChange}
                    onDestinationChange={handleDestinationChange}
                    manualMode={geocodingState === 'manual'}
                    activeField={activeManualField}
                    interactive={true}
                  />

                  <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
                    <p className="font-semibold text-slate-300">Resolved Coordinates:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-emerald-400 font-medium">Pickup (P):</span>
                        <p className="text-slate-400 truncate">{formData.source}</p>
                        <p className="text-slate-200 mt-0.5">
                          {pickupLocation.lat ? `${pickupLocation.lat.toFixed(5)}, ${pickupLocation.lng.toFixed(5)}` : 'Not Pinned'}
                        </p>
                      </div>
                      <div>
                        <span className="text-indigo-400 font-medium">Destination (D):</span>
                        <p className="text-slate-400 truncate">{formData.destination}</p>
                        <p className="text-slate-200 mt-0.5">
                          {destinationLocation.lat ? `${destinationLocation.lat.toFixed(5)}, ${destinationLocation.lng.toFixed(5)}` : 'Not Pinned'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] border border-dashed border-slate-800 rounded-xl bg-slate-900/20 text-center p-6">
                  <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-400">Map Preview</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                    Enter address details and submit. If verification or manual adjustment is needed, the interactive map will display here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRide;
