import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import api from '../../services/api.js';
import { getDrivingRoute, getMultiPointRoute } from '../../services/locationService.js';
import RatingModal from '../../components/RatingModal.jsx';

const ST_OFFICE_COORDS = { lat: 28.4725, lng: 77.48889 };

const Bookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Rating modal state
  const [ratingModal, setRatingModal] = useState(null); // { bookingId, driverName }

  // Tab control: 'passenger' or 'driver'
  const [roleMode, setRoleMode] = useState('passenger');
  // Filters
  const [passengerTab, setPassengerTab] = useState('upcoming');
  const [driverTab, setDriverTab] = useState('requests');

  // Data
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Impact analysis state: bookingId -> impactDetails
  const [impacts, setImpacts] = useState({});
  const [impactLoading, setImpactLoading] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Set default role mode based on user role
    if (user.role === 'hybrid') {
      setRoleMode('driver');
    } else {
      setRoleMode('passenger');
    }
  }, [user]);

  // Fetch bookings whenever active tab, role mode or page changes
  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [roleMode, passengerTab, driverTab, page]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (roleMode === 'passenger') {
        const response = await api.get('/bookings/my-bookings', {
          params: { page, limit: 5 }
        });
        const fetchedBookings = response.data.data.bookings || [];
        setBookings(filterPassengerBookings(fetchedBookings));
        setTotalPages(response.data.data.pagination?.totalPages || 1);
      } else {
        const response = await api.get('/bookings/my-rides', {
          params: { page, limit: 5 }
        });
        const fetchedBookings = response.data.data.bookings || [];
        const filtered = filterDriverBookings(fetchedBookings);
        setBookings(filtered);
        setTotalPages(response.data.data.pagination?.totalPages || 1);

        // Trigger impact analysis calculation for pending incoming requests
        if (driverTab === 'requests') {
          filtered.forEach(booking => {
            if (booking.bookingStatus === 'pending') {
              calculateImpact(booking);
            }
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  const filterPassengerBookings = (list) => {
    const now = new Date();
    return list.filter(b => {
      const depTime = new Date(b.ride?.departureTime);
      const isPast = depTime < now || b.ride?.status === 'completed';

      if (passengerTab === 'upcoming') {
        return b.bookingStatus === 'confirmed' && !isPast;
      }
      if (passengerTab === 'pending') {
        return b.bookingStatus === 'pending';
      }
      if (passengerTab === 'completed') {
        return b.bookingStatus === 'confirmed' && isPast;
      }
      if (passengerTab === 'cancelled') {
        return b.bookingStatus === 'cancelled' || b.bookingStatus === 'rejected';
      }
      return true;
    });
  };

  const filterDriverBookings = (list) => {
    const now = new Date();
    return list.filter(b => {
      const depTime = new Date(b.ride?.departureTime);
      const isPast = depTime < now || b.ride?.status === 'completed';

      if (driverTab === 'requests') {
        return b.bookingStatus === 'pending';
      }
      if (driverTab === 'accepted') {
        return b.bookingStatus === 'confirmed' && !isPast;
      }
      if (driverTab === 'rejected') {
        return b.bookingStatus === 'rejected';
      }
      if (driverTab === 'history') {
        return isPast || b.ride?.status === 'completed';
      }
      return true;
    });
  };

  const calculateImpact = async (booking) => {
    if (impacts[booking._id] || impactLoading[booking._id]) return;

    setImpactLoading(prev => ({ ...prev, [booking._id]: true }));
    try {
      // Driver Coordinates: priority homeLocation, fallback ride pickupLocation
      const driverCoords = user.homeLocation?.latitude
        ? { lat: user.homeLocation.latitude, lng: user.homeLocation.longitude }
        : { lat: booking.ride?.pickupLocation?.latitude, lng: booking.ride?.pickupLocation?.longitude };

      const passengerCoords = {
        lat: booking.pickupLocation?.latitude,
        lng: booking.pickupLocation?.longitude
      };

      if (!driverCoords.lat || !passengerCoords.lat) {
        throw new Error('Coordinates not available');
      }

      // 1. Original: Driver -> Office
      const originalRoute = await getDrivingRoute(driverCoords, ST_OFFICE_COORDS);
      // 2. Modified: Driver -> Passenger Pickup -> Office
      const modifiedRoute = await getMultiPointRoute([driverCoords, passengerCoords, ST_OFFICE_COORDS]);

      const distOrig = originalRoute.distanceKm;
      const durOrig = originalRoute.durationMinutes;

      const distNew = modifiedRoute.distanceKm;
      const durNew = modifiedRoute.durationMinutes;

      setImpacts(prev => ({
        ...prev,
        [booking._id]: {
          origDist: distOrig.toFixed(1),
          origDur: Math.round(durOrig),
          newDist: distNew.toFixed(1),
          newDur: Math.round(durNew),
          extraDist: (distNew - distOrig).toFixed(1),
          extraDur: Math.round(durNew - durOrig)
        }
      }));
    } catch (err) {
      console.error('Impact calculation failed:', err);
    } finally {
      setImpactLoading(prev => ({ ...prev, [booking._id]: false }));
    }
  };

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update booking status.');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.post(`/bookings/${bookingId}/cancel`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  return (
    <>
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Your Bookings</h2>

          {user?.role === 'hybrid' && (
            <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-slate-800/80 mt-4 sm:mt-0">
              <button
                onClick={() => { setRoleMode('passenger'); setPage(1); }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roleMode === 'passenger' ? 'bg-indigo-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Co-Rider Mode
              </button>
              <button
                onClick={() => { setRoleMode('driver'); setPage(1); }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${roleMode === 'driver' ? 'bg-indigo-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Rider Mode
              </button>
            </div>
          )}
        </div>

        {/* Passenger Mode Filters */}
        {roleMode === 'passenger' && (
          <div className="flex flex-wrap gap-2">
            {['upcoming', 'pending', 'completed', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setPassengerTab(tab); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition capitalize ${passengerTab === tab ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-900/35 text-slate-400 border-slate-800/80 hover:text-slate-200'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Driver Mode Filters */}
        {roleMode === 'driver' && (
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'requests', label: 'Incoming Requests' },
              { id: 'accepted', label: 'Accepted Passengers' },
              { id: 'rejected', label: 'Rejected Passengers' },
              { id: 'history', label: 'Ride History' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setDriverTab(tab.id); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${driverTab === tab.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-900/35 text-slate-400 border-slate-800/80 hover:text-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Loading bookings details...
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass-panel py-20 rounded-2xl border border-slate-900 text-center text-slate-400">
            <span className="text-3xl mb-3 block">📂</span>
            No bookings found in this category.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking._id} className="glass-panel p-6 rounded-2xl border border-slate-900/80 space-y-4 hover:border-slate-800 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {booking.ride?.source} → {booking.ride?.destination}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Departure: {new Date(booking.ride?.departureTime).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase border ${
                      booking.bookingStatus === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/20' :
                      booking.bookingStatus === 'pending' ? 'bg-amber-950 text-amber-400 border-amber-500/20' :
                      'bg-red-950 text-red-400 border-red-500/20'
                    }`}>
                      {booking.bookingStatus}
                    </span>
                    <p className="text-xs text-slate-400 mt-2">₹{booking.bookingAmount} for {booking.seatsBooked} seat(s)</p>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {roleMode === 'passenger' ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-sm font-bold text-indigo-400">
                        {booking.ride?.driver?.firstName?.[0]}{booking.ride?.driver?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-slate-300 font-semibold text-xs">Rider: {booking.ride?.driver?.firstName} {booking.ride?.driver?.lastName}</p>
                        <p className="text-[10px] text-slate-500">Contact: {booking.ride?.driver?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-sm font-bold text-emerald-400">
                        {booking.passenger?.firstName?.[0]}{booking.passenger?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-slate-300 font-semibold text-xs">Co-Rider: {booking.passenger?.firstName} {booking.passenger?.lastName}</p>
                        <p className="text-[10px] text-slate-400">Pickup: {booking.pickupLocation?.address}</p>
                      </div>
                    </div>
                  )}

                  {/* 24h/6h Policy Warnings (Co-Rider view) */}
                  {roleMode === 'passenger' && (() => {
                    const depTime = new Date(booking.ride?.departureTime);
                    const hoursLeft = (depTime - new Date()) / (1000 * 60 * 60);
                    if (hoursLeft < 6 && hoursLeft > 0 && booking.bookingStatus !== 'cancelled') {
                      return <span className="text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/20 px-2 py-1 rounded-lg">⚠ Departs in &lt;6h — cancel window closed</span>;
                    }
                    if (hoursLeft < 24 && hoursLeft > 0 && booking.bookingStatus !== 'cancelled') {
                      return <span className="text-xs font-semibold text-amber-400 bg-amber-950/30 border border-amber-500/20 px-2 py-1 rounded-lg">⚠ &lt;24h to departure — cannot cancel</span>;
                    }
                    return null;
                  })()}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {roleMode === 'passenger' && (() => {
                      const depTime = new Date(booking.ride?.departureTime);
                      const hoursLeft = (depTime - new Date()) / (1000 * 60 * 60);
                      const canCancel = hoursLeft >= 24;
                      if (booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed') {
                        return (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            disabled={!canCancel}
                            title={!canCancel ? 'Cannot cancel within 24h of departure' : ''}
                            className="px-4 py-2 bg-red-950/40 border border-red-500/20 hover:bg-red-900/40 text-red-400 rounded-lg text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Cancel {booking.bookingStatus === 'pending' ? 'Request' : 'Booking'}
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {roleMode === 'driver' && booking.bookingStatus === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                          className="px-4 py-2 bg-emerald-500 text-slate-950 hover:bg-emerald-600 rounded-lg text-xs font-bold transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                          className="px-4 py-2 bg-red-950/40 border border-red-500/20 hover:bg-red-900/40 text-red-400 rounded-lg text-xs font-bold transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {/* Rate Rider — for past confirmed Co-Rider bookings not yet rated */}
                    {roleMode === 'passenger' &&
                      booking.bookingStatus === 'confirmed' &&
                      !booking.rated &&
                      new Date(booking.ride?.departureTime) < new Date() && (
                        <button
                          onClick={() => setRatingModal({
                            bookingId: booking._id,
                            driverName: `${booking.ride?.driver?.firstName || ''} ${booking.ride?.driver?.lastName || ''}`.trim() || 'Rider',
                          })}
                          className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition shadow-sm shadow-amber-400/20"
                        >
                          ⭐ Rate Rider
                        </button>
                    )}

                    {roleMode === 'passenger' && booking.rated && (
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                        ⭐ Rated {booking.rating}/5
                      </span>
                    )}
                  </div>
                </div>

                {/* Pickup Impact Analysis (Driver Incoming requests only) */}
                {roleMode === 'driver' && booking.bookingStatus === 'pending' && (
                  <div className="border-t border-slate-900/60 pt-4 mt-2">
                    <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                      <span>⚡</span> Pickup Impact Analysis
                    </h4>

                    {impactLoading[booking._id] ? (
                      <p className="text-xs text-slate-500 animate-pulse">Calculating optimal detour impact...</p>
                    ) : impacts[booking._id] ? (
                      <div className="grid grid-cols-3 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-900 text-xs">
                        <div className="space-y-1">
                          <p className="text-slate-500">Original Route</p>
                          <p className="text-slate-300 font-semibold">{impacts[booking._id].origDist} km</p>
                          <p className="text-slate-400">{impacts[booking._id].origDur} min</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-500">With Detour</p>
                          <p className="text-emerald-400 font-semibold">{impacts[booking._id].newDist} km</p>
                          <p className="text-emerald-400">{impacts[booking._id].newDur} min</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-500">Net Overhead</p>
                          <p className="text-indigo-400 font-extrabold font-mono">+{impacts[booking._id].extraDist} km</p>
                          <p className="text-indigo-400 font-mono">+{impacts[booking._id].extraDur} min</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-400/80">Could not calculate routing impact. Make sure API keys are active.</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Rating Modal */}
    {ratingModal && (
      <RatingModal
        bookingId={ratingModal.bookingId}
        driverName={ratingModal.driverName}
        onClose={() => setRatingModal(null)}
        onSuccess={() => {
          setRatingModal(null);
          setBookings((prev) => prev.map((b) =>
            b._id === ratingModal.bookingId ? { ...b, rated: true } : b
          ));
        }}
      />
    )}
    </>
  );
};

export default Bookings;
