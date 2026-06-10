import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import AddressAutocomplete from '../../components/AddressAutocomplete.jsx';
import MapPreview from '../../components/MapPreview.jsx';
import RouteMap from '../../components/RouteMap.jsx';
import QuickLocationChips from '../../components/QuickLocationChips.jsx';
import useCurrentLocation from '../../hooks/useCurrentLocation.js';
import {
  fetchSavedAddresses,
  fetchRecentAddresses,
  fetchFrequentAddresses,
} from '../../services/locationService.js';

const emptyLoc = () => ({ address: '', latitude: null, longitude: null, verified: false });

const CreateRide = () => {
  const [formData, setFormData] = useState({
    vehicle: '',
    departureTime: '',
    availableSeats: 3,
    pricePerSeat: 10,
  });
  const [vehicles, setVehicles]       = useState([]);
  const [pickupLoc, setPickupLoc]     = useState(emptyLoc());
  const [destLoc, setDestLoc]         = useState(emptyLoc());
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 'pickup' | 'destination' — tracks which field quick-chips populate
  const [chipTarget, setChipTarget] = useState('pickup');

  const [savedAddresses,   setSavedAddresses]   = useState([]);
  const [recentAddresses,  setRecentAddresses]  = useState([]);
  const [frequentAddresses, setFrequentAddresses] = useState([]);

  const navigate = useNavigate();
  const { getCurrentLocation } = useCurrentLocation();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await api.get('/vehicles');
        const v = res.data.data.vehicles;
        setVehicles(v);
        if (v.length > 0) setFormData((p) => ({ ...p, vehicle: v[0]._id }));
      } catch { /* silent */ }
    };
    const loadAddressLists = async () => {
      try {
        const [saved, recent, frequent] = await Promise.all([
          fetchSavedAddresses(),
          fetchRecentAddresses(),
          fetchFrequentAddresses(),
        ]);
        setSavedAddresses(saved || []);
        setRecentAddresses(recent || []);
        setFrequentAddresses(frequent || []);
      } catch { /* not logged in or network – silent */ }
    };
    fetchVehicles();
    loadAddressLists();
  }, []);

  const handleChange = (e) => {
    const val = ['availableSeats', 'pricePerSeat'].includes(e.target.name)
      ? Number(e.target.value) : e.target.value;
    setFormData((p) => ({ ...p, [e.target.name]: val }));
  };

  // Location handlers
  const handlePickupSelect  = (loc) => setPickupLoc({ ...loc, verified: false });
  const handleDestSelect    = (loc) => setDestLoc({ ...loc, verified: false });
  const handlePickupMapChange = (loc) =>
    setPickupLoc((p) => ({ ...p, ...loc, verified: false }));
  const handleDestMapChange = (loc) =>
    setDestLoc((p) => ({ ...p, ...loc, verified: false }));
  const handlePickupConfirm   = () => setPickupLoc((p) => ({ ...p, verified: true }));
  const handleDestConfirm     = () => setDestLoc((p) => ({ ...p, verified: true }));
  const handlePickupUnconfirm = () => setPickupLoc((p) => ({ ...p, verified: false }));
  const handleDestUnconfirm   = () => setDestLoc((p) => ({ ...p, verified: false }));

  const handleCurrentForPickup = async () => {
    const loc = await getCurrentLocation();
    if (loc) setPickupLoc({ ...loc, verified: false });
  };
  const handleCurrentForDest = async () => {
    const loc = await getCurrentLocation();
    if (loc) setDestLoc({ ...loc, verified: false });
  };

  // Chips wire to whichever field is currently "active"
  const handleChipSelect = (loc) => {
    if (chipTarget === 'pickup') handlePickupSelect(loc);
    else handleDestSelect(loc);
  };
  const handleChipCurrentLocation = async () => {
    if (chipTarget === 'pickup') await handleCurrentForPickup();
    else await handleCurrentForDest();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.vehicle) {
      setError('Please add a vehicle first in your profile before offering a ride.');
      return;
    }
    if (!pickupLoc.latitude) {
      setError('Please select a pickup location using the autocomplete search.');
      return;
    }
    if (!pickupLoc.verified) {
      setError('Please confirm your pickup location by clicking "Confirm Location" on the map.');
      return;
    }
    if (!destLoc.latitude) {
      setError('Please select a destination location using the autocomplete search.');
      return;
    }
    if (!destLoc.verified) {
      setError('Please confirm your destination by clicking "Confirm Location" on the map.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        source:      pickupLoc.address,
        destination: destLoc.address,
        departureTime: new Date(formData.departureTime).toISOString(),
        pickupLocation: {
          address:   pickupLoc.address,
          latitude:  pickupLoc.latitude,
          longitude: pickupLoc.longitude,
          verified:  pickupLoc.verified,
        },
        destinationLocation: {
          address:   destLoc.address,
          latitude:  destLoc.latitude,
          longitude: destLoc.longitude,
          verified:  destLoc.verified,
        },
      };
      await api.post('/rides', payload);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to list ride offer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bothVerified = pickupLoc.verified && destLoc.verified;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-green-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8 text-center">Offer a Ride</h2>

        <div className="glass-panel py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 bg-green-950/40 border border-green-500/20 text-green-400 p-3.5 rounded-xl text-sm font-semibold">
              Ride registered successfully! Redirecting…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vehicle */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Select Vehicle</label>
              {vehicles.length === 0 ? (
                <div className="text-sm text-yellow-400 bg-yellow-950/20 border border-yellow-500/10 p-2.5 rounded-lg">
                  No vehicles registered. Add a vehicle in your profile first.
                </div>
              ) : (
                <select name="vehicle" value={formData.vehicle} onChange={handleChange}
                  className="w-full pl-3 pr-10 py-2.5 border border-slate-800 rounded-lg bg-slate-900 text-slate-100 focus:outline-none focus:ring-emerald-500 sm:text-sm">
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>{v.vehicleName} ({v.vehiclePlateNumber})</option>
                  ))}
                </select>
              )}
            </div>

            {/* Quick chips — toggle which field they target */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChipTarget('pickup')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    chipTarget === 'pickup'
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                      : 'border-slate-600/40 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Quick-fill: Pickup
                </button>
                <button
                  type="button"
                  onClick={() => setChipTarget('destination')}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    chipTarget === 'destination'
                      ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300'
                      : 'border-slate-600/40 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Quick-fill: Destination
                </button>
              </div>
              <QuickLocationChips
                savedAddresses={savedAddresses}
                recentAddresses={recentAddresses}
                frequentAddresses={frequentAddresses}
                onSelect={handleChipSelect}
                showCurrentLocation
                onCurrentLocation={handleChipCurrentLocation}
              />
            </div>

            {/* Pickup */}
            <div>
              <AddressAutocomplete
                value={pickupLoc.address}
                onChange={handlePickupSelect}
                placeholder="Search pickup / starting point…"
                label="Pickup Location"
                showCurrentLocation
              />
              {pickupLoc.latitude && (
                <div className="mt-3">
                  <MapPreview
                    location={pickupLoc}
                    onLocationChange={handlePickupMapChange}
                    height="220px"
                    interactive
                    onConfirm={handlePickupConfirm}
                    onUnconfirm={handlePickupUnconfirm}
                    confirmed={pickupLoc.verified}
                    markerColor="#10b981"
                    markerLabel="A"
                  />
                </div>
              )}
            </div>

            {/* Destination */}
            <div>
              <AddressAutocomplete
                value={destLoc.address}
                onChange={handleDestSelect}
                placeholder="Search destination…"
                label="Destination"
                showCurrentLocation
              />
              {destLoc.latitude && (
                <div className="mt-3">
                  <MapPreview
                    location={destLoc}
                    onLocationChange={handleDestMapChange}
                    height="220px"
                    interactive
                    onConfirm={handleDestConfirm}
                    onUnconfirm={handleDestUnconfirm}
                    confirmed={destLoc.verified}
                    markerColor="#6366f1"
                    markerLabel="B"
                  />
                </div>
              )}
            </div>

            {/* Route preview — shown once both locations are confirmed */}
            {bothVerified && (
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Route Preview</h3>
                <RouteMap
                  pickup={pickupLoc}
                  destination={destLoc}
                  height="280px"
                  autoFetch
                  showPanel
                />
              </div>
            )}

            {/* Time & Seats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-slate-300 mb-1">Departure Date & Time</label>
                <input type="datetime-local" name="departureTime" required value={formData.departureTime} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Available Seats</label>
                <input type="number" name="availableSeats" min="1" max="8" required value={formData.availableSeats} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Price Per Seat (₹)</label>
                <input type="number" name="pricePerSeat" min="0" required value={formData.pricePerSeat} onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:text-sm" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting || !bothVerified}
              className="w-full py-3 px-4 rounded-lg text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 transition-colors disabled:opacity-50">
              {isSubmitting ? 'Publishing…' : !bothVerified ? 'Confirm Both Locations First' : 'Publish Ride'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRide;
