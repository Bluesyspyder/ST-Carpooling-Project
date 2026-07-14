"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { avatarClasses } from '@/lib/genderTheme';
import api from '@/services/api';
import { getDrivingRoute, getMultiPointRoute } from '@/services/locationService';
import RatingModal from '@/components/RatingModal';
import TicketCard from '@/components/mobile/TicketCard';

const ST_OFFICE_COORDS = { lat: 28.481200, lng: 77.481500 };

const Bookings = () => {
  const { user } = useAuth();
  const router = useRouter();

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
      router.push('/login');
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
      let depTime;
      if (b.ride?.journeyDate && b.ride?.journeyTime) {
        depTime = new Date(b.ride.journeyDate);
        const [hours, minutes] = b.ride.journeyTime.split(':');
        depTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      } else if (b.ride?.departureTime) {
        depTime = new Date(b.ride.departureTime);
      } else {
        depTime = new Date(); // fallback
      }
      
      const isPast = depTime < now || b.ride?.rideStatus === 'COMPLETED';

      if (passengerTab === 'upcoming') {
        return b.bookingStatus === 'confirmed' && !isPast;
      }
      if (passengerTab === 'pending') {
        return (b.bookingStatus === 'pending' || b.bookingStatus === 'waitlisted') && !isPast;
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
      let depTime;
      if (b.ride?.journeyDate && b.ride?.journeyTime) {
        depTime = new Date(b.ride.journeyDate);
        const [hours, minutes] = b.ride.journeyTime.split(':');
        depTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      } else if (b.ride?.departureTime) {
        depTime = new Date(b.ride.departureTime);
      } else {
        depTime = new Date(); // fallback
      }
      
      const isPast = depTime < now || b.ride?.rideStatus === 'COMPLETED';

      if (driverTab === 'requests') {
        return b.bookingStatus === 'pending' || b.bookingStatus === 'waitlisted';
      }
      if (driverTab === 'accepted') {
        return b.bookingStatus === 'confirmed' && !isPast;
      }
      if (driverTab === 'rejected') {
        return b.bookingStatus === 'rejected';
      }
      if (driverTab === 'history') {
        return isPast || b.ride?.rideStatus === 'COMPLETED';
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
    {/* ═══════════ DESKTOP / BROWSER LAYOUT (unchanged) ═══════════ */}
    <div className="hidden lg:block min-h-[calc(100vh-73px)] relative py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-subtle)] pb-4">
          <div>
            <p className="text-[var(--primary-base)] font-bold uppercase tracking-widest text-[10px] mb-2">SYS. MSG // BOOKINGS</p>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Your Bookings</h2>
          </div>

          {user?.role === 'hybrid' && (
            <div className="flex bg-[var(--bg-surface)] p-1 rounded-sm border border-[var(--border-subtle)] mt-4 sm:mt-0">
              <button
                onClick={() => { setRoleMode('passenger'); setPage(1); }}
                className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all ${roleMode === 'passenger' ? 'bg-[var(--primary-base)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Co-Rider Mode
              </button>
              <button
                onClick={() => { setRoleMode('driver'); setPage(1); }}
                className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-sm transition-all ${roleMode === 'driver' ? 'bg-[var(--primary-base)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
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
                className={`px-4 py-1.5 rounded-sm text-[10px] uppercase tracking-widest font-bold border transition ${passengerTab === tab ? 'bg-[var(--primary-base)] text-[var(--text-primary)] border-[var(--primary-base)]' : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-white'}`}
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
                className={`px-4 py-1.5 rounded-sm text-[10px] uppercase tracking-widest font-bold border transition ${driverTab === tab.id ? 'bg-[var(--primary-base)] text-[var(--text-primary)] border-[var(--primary-base)]' : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[var(--text-secondary)] text-sm">
            Loading bookings details...
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="glass-panel py-20 text-center text-[var(--text-secondary)]">
            <span className="text-3xl mb-3 block opacity-50">🗄️</span>
            <span className="font-bold tracking-widest text-sm uppercase">No bookings found in this category.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking._id} className="glass-panel p-6 border-l-4 border-l-[var(--primary-base)] space-y-4 hover:-translate-y-1 transition-all duration-300">
                <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest border border-[var(--border-subtle)] px-2 py-0.5 rounded-sm bg-[var(--bg-surface)]">
                        TKT-{booking._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-wide">
                      {booking.ride?.pickupLocation?.address?.split(',')[0] || booking.ride?.source || 'Start'} <span className="text-[var(--text-secondary)] mx-1">→</span> {booking.ride?.destinationLocation?.address?.split(',')[0] || booking.ride?.destination || 'Destination'}
                    </h3>
                    <p className="text-[10px] text-[var(--primary-base)] font-bold tracking-widest uppercase mt-2">
                      DEP: {booking.ride?.journeyDate ? `${new Date(booking.ride.journeyDate).toLocaleDateString('en-US', { dateStyle: 'short' })} ${booking.ride.journeyTime}` : booking.ride?.departureTime ? new Date(booking.ride.departureTime).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'TBD'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm uppercase tracking-widest border ${
                      booking.bookingStatus === 'confirmed' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--primary-base)]' :
                      booking.bookingStatus === 'pending' ? 'bg-[var(--bg-surface)] text-amber-400 border-amber-500/50' :
                      booking.bookingStatus === 'waitlisted' ? 'bg-[var(--bg-surface)] text-violet-400 border-violet-500/50' :
                      'bg-[var(--bg-surface)] text-red-500 border-red-500/50'
                    }`}>
                      {booking.bookingStatus}
                    </span>
                    <p className="text-xs text-emerald-400 font-bold mt-2 text-right">+{booking.bookingAmount} pts / {booking.seatsBooked} PAX</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {roleMode === 'passenger' ? (
                    <div className="flex flex-col gap-3 w-full md:w-3/4">
                      {/* Driver & Vehicle */}
                      <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] uppercase">
                            {booking.ride?.driver?.firstName?.[0]}{booking.ride?.driver?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-widest">Rider: {booking.ride?.driver?.firstName} {booking.ride?.driver?.lastName}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">COMMS: {booking.ride?.driver?.phone || 'N/A'}</p>
                          </div>
                        </div>
                        {booking.ride?.driverVehicle && (
                          <div className="flex flex-col">
                            <p className="text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-widest">Vehicle: {booking.ride.driverVehicle.vehicleName}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{booking.ride.driverVehicle.vehiclePlateNumber}</p>
                          </div>
                        )}
                        {booking.seatIds && booking.seatIds.length > 0 && (
                          <div className="flex flex-col">
                            <p className="text-[var(--text-primary)] font-bold text-[10px] uppercase tracking-widest">Seats</p>
                            <p className="text-[10px] text-[var(--text-secondary)] font-bold">{booking.seatIds.join(', ')}</p>
                          </div>
                        )}
                      </div>
                      {/* Passenger's actual pickup/dropoff */}
                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">📍</span>
                          <p className="text-[10px] text-[var(--text-secondary)] leading-tight"><strong className="text-[var(--text-primary)]">Pickup:</strong> {booking.pickupLocation?.address}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">📍</span>
                          <p className="text-[10px] text-[var(--text-secondary)] leading-tight"><strong className="text-[var(--text-primary)]">Drop:</strong> {booking.ride?.destinationLocation?.address}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-sm border flex items-center justify-center text-[10px] font-bold uppercase ${avatarClasses(booking.passenger?.gender)}`}>
                        {booking.passenger?.firstName?.[0] || 'U'}{booking.passenger?.lastName?.[0] || ''}
                      </div>
                      <div>
                        <p className="text-[var(--text-primary)] font-bold text-[10px] flex items-center gap-2 uppercase tracking-widest">
                          Co-Rider: {booking.passenger?.firstName || 'Unknown'} {booking.passenger?.lastName || ''}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mb-1 uppercase">LOC: {booking.pickupLocation?.address}</p>
                        
                        {/* Cancellation Metrics */}
                        {booking.bookingStatus === 'pending' && (
                          <div className="flex gap-2">
                            <span className="text-[10px] font-medium bg-[var(--bg-surface-hover)] text-[var(--text-primary)] px-1.5 py-0.5 rounded" title="Cancellations within 24h of departure">
                              24h: {booking.passenger?.cancellations24h || 0}
                            </span>
                            <span className="text-[10px] font-medium bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded" title="Cancellations within 6h of departure">
                              6h: {booking.passenger?.cancellations6h || 0}
                            </span>
                            <span className="text-[10px] font-medium bg-red-950 text-red-400 px-1.5 py-0.5 rounded" title="Cancellations within 2h of departure">
                              2h: {booking.passenger?.cancellations2h || 0}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 12h/6h Policy Warnings (Co-Rider view) */}
                  {roleMode === 'passenger' && (() => {
                    const depTime = new Date(booking.ride?.departureTime);
                    const hoursLeft = (depTime - new Date()) / (1000 * 60 * 60);
                    if (hoursLeft < 6 && hoursLeft > 0 && booking.bookingStatus !== 'cancelled') {
                      return <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest border border-red-500/50 px-2 py-0.5 rounded-sm">⚠ &lt;6H — CANCEL WINDOW CLOSED</span>;
                    }
                    if (hoursLeft < 12 && hoursLeft > 0 && booking.bookingStatus !== 'cancelled') {
                      return <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest border border-amber-500/50 px-2 py-0.5 rounded-sm">⚠ &lt;12H TO DEP — CANNOT CANCEL</span>;
                    }
                    return null;
                  })()}

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {roleMode === 'passenger' && (() => {
                      const depTime = new Date(booking.ride?.departureTime);
                      const hoursLeft = (depTime - new Date()) / (1000 * 60 * 60);
                      const canCancel = hoursLeft >= 12;
                      if (booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed') {
                        return (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            disabled={!canCancel}
                            title={!canCancel ? 'Cannot cancel within 12h of departure' : ''}
                            className="btn-secondary border-red-500 text-red-500 hover:bg-red-500/10 px-3 py-1.5 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Cancel {booking.bookingStatus === 'pending' ? 'Request' : 'Booking'}
                          </button>
                        );
                      }
                      return null;
                    })()}

                    {roleMode === 'driver' && (booking.bookingStatus === 'pending' || booking.bookingStatus === 'waitlisted') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                          className="btn-primary px-3 py-1.5 text-[10px]"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                          className="btn-secondary border-red-500 text-red-500 hover:bg-red-500/10 px-3 py-1.5 text-[10px]"
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
                          className="btn-primary bg-amber-400 hover:bg-amber-300 text-black px-3 py-1.5 text-[10px]"
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
                  <div className="border-t border-[var(--border-subtle)] pt-4 mt-2">
                    <h4 className="text-[10px] font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5 uppercase tracking-widest">
                      <span>⚡</span> Pickup Impact Analysis
                    </h4>

                    {impactLoading[booking._id] ? (
                      <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] animate-pulse tracking-widest">Calculating optimal detour impact...</p>
                    ) : impacts[booking._id] ? (
                      <div className="grid grid-cols-3 gap-4 bg-[var(--bg-surface)] p-4 rounded-sm border border-[var(--border-subtle)] text-xs">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Original Route</p>
                          <p className="text-[var(--text-primary)] font-bold text-sm tracking-wide">{impacts[booking._id].origDist} km</p>
                          <p className="text-[var(--text-secondary)] font-bold text-xs">{impacts[booking._id].origDur} min</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">With Detour</p>
                          <p className="text-[var(--primary-base)] font-bold text-sm tracking-wide">{impacts[booking._id].newDist} km</p>
                          <p className="text-[var(--primary-base)] font-bold text-xs">{impacts[booking._id].newDur} min</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Net Overhead</p>
                          <p className="text-[#3B82F6] font-bold text-sm tracking-wide">+{impacts[booking._id].extraDist} km</p>
                          <p className="text-[#3B82F6] font-bold text-xs">+{impacts[booking._id].extraDur} min</p>
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
                  className="btn-secondary px-3 py-1.5 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="btn-secondary px-3 py-1.5 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ═══════════ MOBILE LAYOUT ═══════════ */}
    <div className="lg:hidden min-h-[calc(100vh-73px)] relative py-5 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Your Bookings</h2>
        {user?.role === 'hybrid' && (
          <div className="flex bg-[var(--bg-surface)] p-1 rounded-full border border-[var(--border-subtle)]">
            <button
              onClick={() => { setRoleMode('passenger'); setPage(1); }}
              className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all min-h-[32px] ${roleMode === 'passenger' ? 'bg-[var(--primary-base)] text-white' : 'text-[var(--text-muted)]'}`}
            >
              Co-Rider
            </button>
            <button
              onClick={() => { setRoleMode('driver'); setPage(1); }}
              className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all min-h-[32px] ${roleMode === 'driver' ? 'bg-[var(--primary-base)] text-white' : 'text-[var(--text-muted)]'}`}
            >
              Rider
            </button>
          </div>
        )}
      </div>

      {/* Chip tabs */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {(roleMode === 'passenger'
          ? ['upcoming', 'pending', 'completed', 'cancelled'].map(t => ({ id: t, label: t }))
          : [
              { id: 'requests', label: 'Requests' },
              { id: 'accepted', label: 'Accepted' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'history', label: 'History' },
            ]
        ).map((tab) => {
          const active = roleMode === 'passenger' ? passengerTab === tab.id : driverTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => roleMode === 'passenger'
                ? (setPassengerTab(tab.id), setPage(1))
                : (setDriverTab(tab.id), setPage(1))}
              className={`flex-shrink-0 min-h-[36px] px-4 rounded-full text-xs font-bold uppercase tracking-wide border capitalize ${active ? 'bg-[var(--primary-base)] text-white border-[var(--primary-base)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-secondary)] text-sm">Loading bookings...</div>
      ) : error ? (
        <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">{error}</div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel py-16 text-center text-[var(--text-secondary)]">
          <span className="text-3xl mb-3 block opacity-50">🗄️</span>
          <span className="font-bold tracking-widest text-sm uppercase">No bookings found</span>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <TicketCard
              key={booking._id}
              statusBadge={
                <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-widest border ${
                  booking.bookingStatus === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/20' :
                  booking.bookingStatus === 'pending' ? 'bg-amber-950 text-amber-400 border-amber-500/20' :
                  booking.bookingStatus === 'waitlisted' ? 'bg-violet-950 text-violet-400 border-violet-500/20' :
                  'bg-red-950 text-red-400 border-red-500/20'
                }`}>
                  {booking.bookingStatus}
                </span>
              }
              header={
                <>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">TKT-{booking._id.slice(-6).toUpperCase()}</p>
                  <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                    {booking.ride?.pickupLocation?.address?.split(',')[0] || booking.ride?.source || 'Start'} → {booking.ride?.destinationLocation?.address?.split(',')[0] || booking.ride?.destination || 'Destination'}
                  </h3>
                </>
              }
              body={
                <div className="space-y-2 text-xs">
                  <p className="text-[var(--primary-base)] font-bold uppercase tracking-widest">
                    DEP: {booking.ride?.journeyDate ? `${new Date(booking.ride.journeyDate).toLocaleDateString('en-US', { dateStyle: 'short' })} ${booking.ride.journeyTime}` : 'TBD'}
                  </p>
                  {roleMode === 'passenger' ? (
                    <p className="text-[var(--text-secondary)]">Rider: {booking.ride?.driver?.firstName || 'Unknown'} {booking.ride?.driver?.lastName || ''}</p>
                  ) : (
                    <p className="text-[var(--text-secondary)]">Co-Rider: {booking.passenger?.firstName || 'Unknown'} {booking.passenger?.lastName || ''}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {roleMode === 'passenger' && (booking.bookingStatus === 'pending' || booking.bookingStatus === 'confirmed') && (
                      <button onClick={() => handleCancelBooking(booking._id)} className="btn-secondary min-h-[36px] px-3 text-[10px] text-red-500">
                        Cancel
                      </button>
                    )}
                    {roleMode === 'driver' && (booking.bookingStatus === 'pending' || booking.bookingStatus === 'waitlisted') && (
                      <>
                        <button onClick={() => handleStatusUpdate(booking._id, 'confirmed')} className="btn-primary min-h-[36px] px-3 text-[10px]">Accept</button>
                        <button onClick={() => handleStatusUpdate(booking._id, 'rejected')} className="btn-secondary min-h-[36px] px-3 text-[10px] text-red-500">Reject</button>
                      </>
                    )}
                    {roleMode === 'passenger' && booking.bookingStatus === 'confirmed' && !booking.rated && new Date(booking.ride?.departureTime) < new Date() && (
                      <button
                        onClick={() => setRatingModal({ bookingId: booking._id, driverName: `${booking.ride?.driver?.firstName || ''} ${booking.ride?.driver?.lastName || ''}`.trim() || 'Rider' })}
                        className="btn-primary min-h-[36px] px-3 text-[10px] bg-amber-400 text-black"
                      >
                        ⭐ Rate
                      </button>
                    )}
                  </div>
                </div>
              }
              footer={
                <>
                  <span>{booking.seatsBooked} PAX</span>
                  <span className="text-emerald-400 font-bold">+{booking.bookingAmount} pts</span>
                </>
              }
            />
          ))}

          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-secondary min-h-[44px] px-4 text-xs disabled:opacity-40">Previous</button>
              <span className="text-xs text-[var(--text-muted)] font-bold">Page {page}/{totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="btn-secondary min-h-[44px] px-4 text-xs disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
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
