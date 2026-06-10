import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';
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

const RideDetails = () => {
  const { id }     = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [ride, setRide]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [bookingSeats, setBookingSeats]     = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError]     = useState('');
  const [isBooking, setIsBooking]           = useState(false);

  const [pickupLoc, setPickupLoc] = useState({ address: '', latitude: null, longitude: null, verified: false });

  const [savedAddresses,   setSavedAddresses]   = useState([]);
  const [recentAddresses,  setRecentAddresses]  = useState([]);
  const [frequentAddresses, setFrequentAddresses] = useState([]);

  const { getCurrentLocation } = useCurrentLocation();

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        const response = await api.get(`/rides/${id}`);
        setRide(response.data.data.ride);
      } catch {
        setError('Failed to load ride details.');
      } finally {
        setLoading(false);
      }
    };
    const loadLists = async () => {
      try {
        const [saved, recent, frequent] = await Promise.all([
          fetchSavedAddresses(),
          fetchRecentAddresses(),
          fetchFrequentAddresses(),
        ]);
        setSavedAddresses(saved || []);
        setRecentAddresses(recent || []);
        setFrequentAddresses(frequent || []);
      } catch { /* not logged in – silent */ }
    };
    fetchRideDetails();
    loadLists();
  }, [id]);

  const handlePickupSelect    = (loc) => setPickupLoc({ ...loc, verified: false });
  const handlePickupMapChange = (loc) =>
    setPickupLoc((p) => ({ ...p, ...loc, verified: false }));
  const handlePickupConfirm   = () => setPickupLoc((p) => ({ ...p, verified: true }));
  const handlePickupUnconfirm = () => setPickupLoc((p) => ({ ...p, verified: false }));
  const handleCurrentForPickup = async () => {
    const loc = await getCurrentLocation();
    if (loc) setPickupLoc({ ...loc, verified: false });
  };

  const handleBooking = async (e) => {
    if (e) e.preventDefault();
    if (!user) { navigate('/login'); return; }

    if (!pickupLoc.latitude) {
      setBookingError('Please select your pickup location using the search box above.');
      return;
    }
    if (!pickupLoc.verified) {
      setBookingError('Please confirm your pickup location by clicking "Confirm Location" on the map.');
      return;
    }

    setIsBooking(true);
    setBookingError('');
    setBookingSuccess(false);

    try {
      await api.post('/bookings', {
        ride:          id,
        seatsBooked:   Number(bookingSeats),
        pickupAddress: pickupLoc.address,
        pickupLocation: {
          address:   pickupLoc.address,
          latitude:  pickupLoc.latitude,
          longitude: pickupLoc.longitude,
          verified:  pickupLoc.verified,
        },
      });
      setBookingSuccess(true);
      const updatedResponse = await api.get(`/rides/${id}`);
      setRide(updatedResponse.data.data.ride);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book seats.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex items-center justify-center text-slate-400">
        Loading ride details...
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex items-center justify-center text-slate-400">
        {error || 'Ride not found.'}
      </div>
    );
  }

  // Build location objects from ride data for RouteMap
  const ridePickup = ride.pickupLocation?.latitude
    ? { ...ride.pickupLocation, verified: true }
    : null;
  const rideDest = ride.destinationLocation?.latitude
    ? { ...ride.destinationLocation, verified: true }
    : null;

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[1500px] mx-auto space-y-6">

        {/* Route map — shown at top for visual context */}
        {ridePickup && rideDest && (
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Ride Route</h3>
            <RouteMap
              pickup={ridePickup}
              destination={rideDest}
              height="300px"
              autoFetch
              showPanel
            />
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_380px] gap-6">
          {/* Ride details panel */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-full capitalize">
                  {ride.status}
                </span>
                <h3 className="text-2xl font-bold text-slate-100 mt-3">
                  {ride.source} → {ride.destination}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-emerald-400">₹{ride.pricePerSeat}</p>
                <p className="text-xs text-slate-400 mt-1">per seat</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-slate-800 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-medium">Departure</span>
                <span className="col-span-2 text-slate-200">{new Date(ride.departureTime).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-400 font-medium">Seats Left</span>
                <span className="col-span-2 text-slate-200">{ride.availableSeats}</span>
              </div>
              {ride.pickupLocation?.address && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Pickup</span>
                  <span className="col-span-2 text-slate-200 text-xs">{ride.pickupLocation.address}</span>
                </div>
              )}
              {ride.destinationLocation?.address && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-400 font-medium">Drop-off</span>
                  <span className="col-span-2 text-slate-200 text-xs">{ride.destinationLocation.address}</span>
                </div>
              )}
            </div>

            {ride.vehicle && (
              <div className="pt-6 border-t border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Vehicle</h4>
                <div className="grid sm:grid-cols-2 gap-4 text-sm bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                  <div><p className="text-xs text-slate-400">Name</p><p className="text-slate-200 font-medium mt-0.5">{ride.vehicle.vehicleName}</p></div>
                  <div><p className="text-xs text-slate-400">Plate</p><p className="text-slate-200 font-medium mt-0.5">{ride.vehicle.vehiclePlateNumber}</p></div>
                  <div><p className="text-xs text-slate-400">Fuel</p><p className="text-slate-200 font-medium mt-0.5 capitalize">{ride.vehicle.vehicleType}</p></div>
                  <div><p className="text-xs text-slate-400">Mileage</p><p className="text-slate-200 font-medium mt-0.5">{ride.vehicle.mileage} km/l</p></div>
                </div>
              </div>
            )}

            {ride.driver && (
              <div className="pt-6 border-t border-slate-800 space-y-3">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Driver</h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-lg font-bold text-indigo-400">
                    {ride.driver.firstName[0]}{ride.driver.lastName[0]}
                  </div>
                  <div>
                    <p className="text-slate-200 font-semibold">{ride.driver.firstName} {ride.driver.lastName}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-400 font-bold">
                      <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {ride.driver.averageRating?.toFixed(1) || '5.0'} / 5.0
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl h-fit">
            <h4 className="text-lg font-bold text-slate-100 mb-4">Book this Ride</h4>

            {bookingSuccess ? (
              <div className="bg-green-950/40 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm space-y-2">
                <p className="font-bold">Booking Confirmed! ✓</p>
                <p className="text-xs text-green-300">Your seats have been reserved.</p>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="space-y-4">
                {bookingError && (
                  <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">{bookingError}</div>
                )}

                <QuickLocationChips
                  savedAddresses={savedAddresses}
                  recentAddresses={recentAddresses}
                  frequentAddresses={frequentAddresses}
                  onSelect={handlePickupSelect}
                  showCurrentLocation
                  onCurrentLocation={handleCurrentForPickup}
                />

                <AddressAutocomplete
                  value={pickupLoc.address}
                  onChange={handlePickupSelect}
                  placeholder="Search your pickup location…"
                  label="Your Pickup Location"
                  showCurrentLocation
                />

                {pickupLoc.latitude && (
                  <MapPreview
                    location={pickupLoc}
                    onLocationChange={handlePickupMapChange}
                    height="200px"
                    interactive
                    onConfirm={handlePickupConfirm}
                    onUnconfirm={handlePickupUnconfirm}
                    confirmed={pickupLoc.verified}
                    markerColor="#10b981"
                    markerLabel="P"
                  />
                )}

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Seats to Reserve</label>
                  <input type="number" min="1" max={Math.min(8, ride.availableSeats)} value={bookingSeats}
                    onChange={(e) => setBookingSeats(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm" />
                </div>

                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="text-slate-400">Total Price</span>
                  <span className="text-slate-100 font-extrabold text-lg">₹{(ride.pricePerSeat * bookingSeats).toFixed(0)}</span>
                </div>

                <button type="submit"
                  disabled={isBooking || ride.availableSeats <= 0 || ride.status !== 'pending' || !pickupLoc.verified}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 transition-colors disabled:opacity-50">
                  {isBooking
                    ? 'Processing…'
                    : ride.availableSeats <= 0
                    ? 'Fully Booked'
                    : !pickupLoc.verified
                    ? 'Confirm Pickup First'
                    : 'Confirm Booking'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideDetails;
