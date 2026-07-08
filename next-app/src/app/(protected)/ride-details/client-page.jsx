"use client";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

import api, { SOCKET_URL } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapPreview from '@/components/MapPreview';
import RouteMap from '@/components/RouteMap';
import QuickLocationChips from '@/components/QuickLocationChips';
import useCurrentLocation from '@/hooks/useCurrentLocation';
import { optimizePickupOrder, getMultiPointRoute } from '@/services/locationService';
import {
  fetchSavedAddresses,
  fetchRecentAddresses,
  fetchFrequentAddresses,
} from '@/services/locationService';
import { useProfileGuard } from '@/hooks/useProfileGuard';

/* ─── ST Office fixed destination ─────────────────────────────────────────── */
const ST_OFFICE = { lat: 28.481200, lng: 77.481500, address: 'STMicroelectronics, Greater Noida' };

/* ─── small helpers ────────────────────────────────────────────────────────── */
const fmtDist = (km) => (km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`);
const fmtDur  = (min) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

/* ═══════════════════════════ DRIVER ROUTE PANEL ══════════════════════════════
   Reads confirmed bookings from the ride, runs Haversine permutation
   optimiser, fetches a single road-following polyline and displays it.
   ═══════════════════════════════════════════════════════════════════════════ */
const DriverRoutePanel = ({ ride, bookings, liveDriverLocation, pendingPickup = null }) => {
  const [optimResult, setOptimResult]   = useState(null); // { orderedPickups, optimizedWaypoints }
  const [routeData,   setRouteData]     = useState(null); // { routePath, distanceKm, durationMinutes }
  const [loading,     setLoading]       = useState(false);
  const [error,       setError]         = useState('');

  /* collect confirmed pickup coords */
  const confirmedPickups = useMemo(() => {
    const list = (bookings || [])
      .filter(b => (b.bookingStatus === 'confirmed' || b.bookingStatus === 'pending') && b.pickupLocation?.latitude)
      .map(b => ({
        lat:     b.pickupLocation.latitude,
        lng:     b.pickupLocation.longitude,
        address: b.pickupLocation.address || 'Passenger pickup',
        name:    `${b.passenger?.firstName || ''} ${b.passenger?.lastName || ''}`.trim(),
      }));

    if (pendingPickup?.latitude && pendingPickup?.longitude) {
      list.push({
        lat: Number(pendingPickup.latitude),
        lng: Number(pendingPickup.longitude),
        address: pendingPickup.address || 'Your Selected Pickup',
        name: 'You (Preview)',
      });
    }

    return list;
  }, [bookings, pendingPickup]);

  /* driver origin: ride.pickupLocation or ST Office as fallback */
  const driverOrigin = useMemo(() => {
    if (ride?.pickupLocation?.latitude) {
      return { lat: ride.pickupLocation.latitude, lng: ride.pickupLocation.longitude };
    }
    return ST_OFFICE;
  }, [ride]);

  /* driver destination: ride.destinationLocation or ST Office as fallback */
  const driverDestination = useMemo(() => {
    if (ride?.destinationLocation?.latitude) {
      return { lat: ride.destinationLocation.latitude, lng: ride.destinationLocation.longitude, address: ride.destinationLocation.address };
    }
    return ST_OFFICE;
  }, [ride]);

  useEffect(() => {
    if (confirmedPickups.length === 0) {
      setOptimResult(null);
      setRouteData(null);
      return;
    }

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        /* 1. optimise pickup order with Haversine permutations (pure-JS, no API) */
        const opt = optimizePickupOrder(driverOrigin, confirmedPickups, driverDestination);
        setOptimResult(opt);

        /* 2. fetch a real road-following polyline for the optimised waypoints */
        const routeResult = await getMultiPointRoute(opt.optimizedWaypoints);
        setRouteData(routeResult);
      } catch (err) {
        console.error('[RideDetails] Route optimization failed:', err);
        setError(err.message || 'Could not calculate optimised route.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [confirmedPickups, driverOrigin]);

  /* build waypoints array for RouteMap */
  const mapWaypoints = optimResult
    ? optimResult.optimizedWaypoints.map((w, i) => ({
        latitude:  w.lat,
        longitude: w.lng,
        address:   w.address || (i === 0 ? 'Your Start' : i === optimResult.optimizedWaypoints.length - 1 ? 'Destination' : `Stop ${i}`),
        label:     i === 0 ? 'D' : i === optimResult.optimizedWaypoints.length - 1 ? 'O' : `P${i}`,
      }))
    : null;

  /* fallback: show original ride route if no confirmed bookings */
  if (confirmedPickups.length === 0) {
    const ridePickup = ride?.pickupLocation?.latitude
      ? { ...ride.pickupLocation, verified: true }
      : null;
    const rideDest = ride?.destinationLocation?.latitude
      ? { ...ride.destinationLocation, verified: true }
      : null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>🗺️</span>
          <span>No confirmed passengers yet — showing base ride route.</span>
        </div>
        {ridePickup && rideDest && (
          <RouteMap
            pickup={ridePickup}
            destination={rideDest}
            height="340px"
            autoFetch
            showPanel
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Route map */}
      {loading ? (
        <div className="h-[340px] bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-400 text-sm animate-pulse">
          Calculating optimised route…
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 text-red-400 text-xs">{error}</div>
      ) : mapWaypoints ? (
        <>
          <RouteMap
            waypoints={mapWaypoints}
            height="340px"
            autoFetch={false}
            showPanel
            externalRouteData={routeData}
            liveDriverLocation={liveDriverLocation}
          />
        </>
      ) : null}

      {/* Ordered stop list */}
      {optimResult && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <span>🔢</span> Optimised Pickup Order
              <span className="text-xs font-normal text-slate-500">({confirmedPickups.length} passenger{confirmedPickups.length > 1 ? 's' : ''})</span>
            </h4>
            {routeData && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-400 font-bold">{fmtDist(routeData.distanceKm)}</span>
                <span className="text-slate-500">·</span>
                <span className="text-indigo-400 font-bold">{fmtDur(routeData.durationMinutes)}</span>
                {routeData.isFallback && (
                  <span className="text-amber-500/70 text-[10px]">(estimate)</span>
                )}
              </div>
            )}
          </div>

          {/* Stop timeline */}
          <div className="space-y-2">
            {/* Driver start */}
            <StopRow
              badge="D"
              badgeColor="bg-indigo-600"
              label="Your Start"
              address={ride?.pickupLocation?.address || 'Driver location'}
              isFirst
            />

            {/* Optimised passenger pickups */}
            {optimResult.orderedPickups.map((p, idx) => (
              <StopRow
                key={idx}
                badge={`P${idx + 1}`}
                badgeColor="bg-emerald-600"
                label={p.name || `Passenger ${idx + 1}`}
                address={p.address}
                distFromPrev={
                  idx === 0
                    ? optimResult.optimizedWaypoints[0] &&
                      `+${fmtDist(
                        haversineKmExport(
                          optimResult.optimizedWaypoints[0],
                          optimResult.optimizedWaypoints[1]
                        )
                      )}`
                    : null
                }
              />
            ))}

            {/* Destination */}
            <StopRow
              badge="🏢"
              badgeColor="bg-slate-600"
              label="Destination"
              address={driverDestination.address || ST_OFFICE.address}
              isLast
            />
          </div>

          <p className="text-[10px] text-slate-600 pt-1">
            Route optimised using Haversine permutation analysis · Provider: {routeData?.provider || 'Computing…'}
          </p>
        </div>
      )}
    </div>
  );
};

/* helper exported for use in StopRow distance calculation */
const haversineKmExport = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const StopRow = ({ badge, badgeColor, label, address, isFirst, isLast }) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${badgeColor}`}>
        {badge}
      </div>
      {!isLast && <div className="w-px flex-1 bg-slate-700/60 my-0.5" style={{ minHeight: '16px' }} />}
    </div>
    <div className="pb-2 min-w-0">
      <p className="text-slate-300 text-xs font-semibold truncate">{label}</p>
      <p className="text-slate-500 text-[11px] truncate">{address}</p>
    </div>
  </div>
);

/* ═══════════════════════════ MAIN PAGE ═══════════════════════════════════════ */

const RideDetails = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useAuth();
  const navigate = useRouter();

  const [ride,     setRide]     = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const [bookingSeats,   setBookingSeats]   = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError,   setBookingError]   = useState('');
  const [isBooking,      setIsBooking]      = useState(false);

  const [dbSavedAddresses, setDbSavedAddresses] = useState([]);
  const [recentAddresses,   setRecentAddresses]   = useState([]);
  const [frequentAddresses, setFrequentAddresses] = useState([]);

  const [pickupLoc, setPickupLoc] = useState({ address: '', latitude: null, longitude: null, verified: false });

  const { getCurrentLocation } = useCurrentLocation();
  const { canBookRide } = useProfileGuard();

  const userId = user?._id || user?.id;
  const driverId = ride?.driver?._id || ride?.driver?.id || ride?.driver;
  const isDriver = Boolean(userId && driverId && String(userId) === String(driverId));

  const [liveDriverLocation, setLiveDriverLocation] = useState(null);
  const [sosAlert, setSosAlert] = useState(null);
  const [rideStatusNotice, setRideStatusNotice] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const activeBooking = bookings?.find((b) => {
    const passengerId = b.passenger?._id || b.passenger?.id || b.passenger;
    return userId && passengerId && String(userId) === String(passengerId);
  });

  const savedAddresses = useMemo(() => {
    const list = [...dbSavedAddresses];
    if (user?.homeLocation?.address) {
      list.unshift({
        _id: 'profile-home',
        label: 'Home Location',
        icon: '🏠',
        address: user.homeLocation.address,
        latitude: user.homeLocation.latitude,
        longitude: user.homeLocation.longitude,
      });
    } else if (user?.address) {
      list.unshift({
        _id: 'profile-home',
        label: 'Home Location',
        icon: '🏠',
        address: user.address,
      });
    }
    return list;
  }, [dbSavedAddresses, user?.address, user?.homeLocation]);

  useEffect(() => {
    let socket = null;
    if (id && typeof window !== 'undefined') {
      const { io } = require('socket.io-client');
      const baseUrl = SOCKET_URL || window.location.origin;
      socket = io(baseUrl, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
      });

      socket.on('connect', () => {
        // Re-join the ride room on every (re)connect so live events keep flowing.
        socket.emit('join_ride', id);
      });

      socket.on('driver_location_update', (data) => {
        setLiveDriverLocation({ lat: data.lat, lng: data.lng });
      });

      socket.on('sos_alert', (data) => {
        setSosAlert(data.message);
      });

      // Driver cancelled/completed the ride — update the view live so the
      // passenger doesn't book (or keep waiting on) a ghost ride.
      socket.on('ride_status_changed', (data) => {
        if (!data) return;
        setRide((prev) => (prev ? { ...prev, rideStatus: data.status } : prev));
        setRideStatusNotice(
          data.message ||
            (data.status === 'CANCELLED'
              ? 'The driver has cancelled this ride.'
              : `This ride is now ${data.status}.`)
        );
      });
    }
    return () => {
      if (socket) {
        socket.emit('leave_ride', id);
        socket.disconnect();
      }
    };
  }, [id]);

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        const response = await api.get(`/rides/${id}`);
        setRide(response.data.data.ride);
        setBookings(response.data.data.bookings || []);
      } catch (err) {
        console.error('Failed to load ride details:', err);
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
        setDbSavedAddresses(saved || []);
        setRecentAddresses(recent || []);
        setFrequentAddresses(frequent || []);
      } catch (error) {
        console.warn('Failed to load address lists for RideDetails (user may not be logged in):', error);
      }
    };
    fetchRideDetails();
    loadLists();
  }, [id]);

  const handlePickupSelect    = (loc) => setPickupLoc({ ...loc, verified: false });
  const handlePickupMapChange = (loc) => setPickupLoc((p) => ({ ...p, ...loc, verified: false }));
  const handlePickupConfirm   = () => setPickupLoc((p) => ({ ...p, verified: true }));
  const handlePickupUnconfirm = () => setPickupLoc((p) => ({ ...p, verified: false }));
  const handleCurrentForPickup = async () => {
    const loc = await getCurrentLocation();
    if (loc) setPickupLoc({ ...loc, verified: false });
  };

  const handleBooking = async (e) => {
    if (e) e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!canBookRide()) return;

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
          address:     pickupLoc.address,
          latitude:    Number(pickupLoc.latitude),
          longitude:   Number(pickupLoc.longitude),
          coordinates: [Number(pickupLoc.longitude), Number(pickupLoc.latitude)],
          verified:    pickupLoc.verified,
        },
      });
      setBookingSuccess(true);
      const updatedResponse = await api.get(`/rides/${id}`);
      setRide(updatedResponse.data.data.ride);
      setBookings(updatedResponse.data.data.bookings || []);
    } catch (err) {
      console.error('[RideDetails] Booking request failed:', err);
      console.error('[RideDetails] Error data:', err.response?.data);

      const errMsg =
        err.response?.data?.message ||
        (err.request && !err.response
          ? 'Network error — check your connection and try again.'
          : 'Could not complete booking. Please try again.');
      setBookingError(errMsg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleStatusUpdate = async (bookingId, status) => {
    if (statusUpdatingId) return; // guard against double-clicks / duplicate PATCHes
    setStatusUpdatingId(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      const updatedResponse = await api.get(`/rides/${id}`);
      setRide(updatedResponse.data.data.ride);
      setBookings(updatedResponse.data.data.bookings || []);
    } catch (err) {
      alert(err.userMessage || err.response?.data?.message || 'Failed to update booking status.');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /* ── guards ── */
  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-73px)] bg-slate-950 flex items-center justify-center text-slate-400">
        Loading ride details…
      </div>
    );
  }
  if (error || !ride) {
    return (
      <div className="min-h-[calc(100dvh-73px)] bg-slate-950 flex items-center justify-center text-slate-400">
        {error || 'Ride not found.'}
      </div>
    );
  }

  /* ── location objects for fallback RouteMap ── */
  const ridePickup = ride.pickupLocation?.latitude
    ? { ...ride.pickupLocation, verified: true }
    : null;
  const rideDest = ride.destinationLocation?.latitude
    ? { ...ride.destinationLocation, verified: true }
    : null;

  /* ── booking status badge helper ── */
  const statusBadge = (s) => {
    const m = {
      pending:   'bg-amber-950 text-amber-400 border-amber-500/20',
      active:    'bg-emerald-950 text-emerald-400 border-emerald-500/20',
      completed: 'bg-slate-800 text-slate-400 border-slate-600/20',
      cancelled: 'bg-red-950 text-red-400 border-red-500/20',
    };
    return m[s] || 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <div className="min-h-[calc(100dvh-73px)] relative pt-8 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8">

      <div className="w-full max-w-[1500px] mx-auto space-y-6">

        {/* Ride status change banner (driver cancelled/completed while viewing) */}
        {rideStatusNotice && (
          <div className="bg-amber-900/40 border border-amber-500/50 rounded-xl p-4 mb-6 flex items-start justify-between gap-3">
            <p className="text-amber-100 text-sm font-medium">⚠️ {rideStatusNotice}</p>
            <button
              onClick={() => setRideStatusNotice('')}
              className="text-amber-300 hover:text-white text-sm shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* SOS Alert Banner */}
        {sosAlert && (
          <div className="bg-red-900 border-2 border-red-500 rounded-xl p-4 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse mb-6">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <span>🚨</span> EMERGENCY S.O.S
            </h3>
            <p className="text-red-100 text-sm mt-1">{sosAlert}</p>
          </div>
        )}

        {/* ── DRIVER VIEW: Optimised multi-stop route ────────────────────── */}
        {isDriver ? (
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              Driver Route Overview
            </h3>
            <DriverRoutePanel ride={ride} bookings={bookings} liveDriverLocation={liveDriverLocation} />
          </div>
        ) : (
          /* ── PASSENGER VIEW: dynamic preview route ── */
          <>
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
                Ride Route Preview
              </h3>
              <DriverRoutePanel 
                ride={ride} 
                bookings={bookings} 
                liveDriverLocation={liveDriverLocation} 
                pendingPickup={!activeBooking && pickupLoc?.latitude ? pickupLoc : null}
              />
            </div>
          </>
        )}

        {/* ── Booked Passengers & Requests ─────────────── */}
        {bookings && bookings.length > 0 && (
          <div className="glass-panel p-6 space-y-4">
            <h4 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Passenger Requests & Bookings
            </h4>
            <div className="space-y-3">
              {bookings.map((booking, idx) => (
                <div key={booking._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-sm font-bold text-emerald-400 flex-shrink-0">
                      {booking.passenger?.firstName?.[0] || 'P'}{booking.passenger?.lastName?.[0] || ''}
                    </div>
                    <div>
                      <p className="text-[var(--text-primary)] font-semibold text-sm">
                        {booking.passenger?.firstName} {booking.passenger?.lastName}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{booking.passenger?.phone || booking.passenger?.email}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right space-y-3">
                    <div>
                      <div className="flex items-center sm:justify-end gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border capitalize ${
                          booking.bookingStatus === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border-emerald-500/20' :
                          booking.bookingStatus === 'pending'   ? 'bg-amber-950 text-amber-400 border-amber-500/20' :
                          'bg-red-950 text-red-400 border-red-500/20'
                        }`}>{booking.bookingStatus}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] max-w-xs truncate mt-1">{booking.pickupLocation?.address}</p>
                      {isDriver && (
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono">
                          Stop #{idx + 1} · {booking.pickupLocation?.latitude?.toFixed(4)}, {booking.pickupLocation?.longitude?.toFixed(4)}
                        </p>
                      )}
                    </div>
                    
                    {/* Driver Accept/Reject Actions for Pending Requests */}
                    {isDriver && booking.bookingStatus === 'pending' && (
                      <div className="flex items-center sm:justify-end gap-2">
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                          disabled={statusUpdatingId === booking._id}
                          className="btn-primary px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 border-none text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {statusUpdatingId === booking._id ? '…' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                          disabled={statusUpdatingId === booking._id}
                          className="btn-secondary px-4 py-1.5 text-xs border-red-500 text-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-[1fr_380px] gap-6">

          {/* ── Ride details panel ──────────────────────────────────────── */}
          <div className="glass-panel p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2.5 py-1 text-xs font-semibold border rounded-full capitalize ${statusBadge(ride.rideStatus?.toLowerCase())}`}>
                  {ride.rideStatus}
                </span>
                <h3 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mt-3">
                  {ride.pickupLocation?.address?.split(',')[0]} → {ride.destinationLocation?.address?.split(',')[0]}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--primary-base)] tracking-widest uppercase">Free</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">per seat</p>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)] text-sm">
              {[
                { label: 'Journey Date',  value: new Date(ride.journeyDate).toLocaleDateString() },
                { label: 'Journey Time',  value: ride.journeyTime },
                { label: 'Flexible Wait', value: `${ride.flexibilityMinutes} mins` },
                { label: 'Seats Left', value: ride.availableSeats },
                ...(ride.pickupLocation?.address ? [{ label: 'Pickup', value: ride.pickupLocation.address }] : []),
                ...(ride.destinationLocation?.address ? [{ label: 'Drop-off', value: ride.destinationLocation.address }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-3 gap-2">
                  <span className="text-[var(--text-secondary)] font-medium">{label}</span>
                  <span className="col-span-2 text-[var(--text-primary)] text-xs">{value}</span>
                </div>
              ))}
            </div>

            {ride.driverVehicle && (
              <div className="pt-6 border-t border-[var(--border-subtle)] space-y-3">
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Vehicle</h4>
                <div className="grid sm:grid-cols-2 gap-4 text-sm bg-[var(--bg-surface)] p-4 rounded-sm border border-[var(--border-subtle)]">
                  <div><p className="text-xs text-[var(--text-secondary)]">Name</p><p className="text-[var(--text-primary)] font-medium mt-0.5">{ride.driverVehicle.vehicleName}</p></div>
                  <div><p className="text-xs text-[var(--text-secondary)]">Plate</p><p className="text-[var(--text-primary)] font-medium mt-0.5">{ride.driverVehicle.vehiclePlateNumber}</p></div>
                  <div><p className="text-xs text-[var(--text-secondary)]">Fuel</p><p className="text-[var(--text-primary)] font-medium mt-0.5 capitalize">{ride.driverVehicle.vehicleType}</p></div>
                  <div><p className="text-xs text-[var(--text-secondary)]">Mileage</p><p className="text-[var(--text-primary)] font-medium mt-0.5">{ride.driverVehicle.mileage} km/l</p></div>
                </div>
              </div>
            )}

            {ride.driver && (
              <div className="pt-6 border-t border-[var(--border-subtle)] space-y-3">
                <h4 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Rider (Driver)</h4>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-lg font-bold text-indigo-400">
                    {ride.driver.firstName[0]}{ride.driver.lastName[0]}
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] font-semibold">{ride.driver.firstName} {ride.driver.lastName}</p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-400 font-bold">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {ride.driver.averageRating?.toFixed(1) || '5.0'} / 5.0
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ── Booking sidebar (passenger-only; drivers see their own panel) ── */}
          <div className="glass-panel p-6 h-fit">
            {isDriver ? (
              /* Driver sidebar: ride stats */
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-[var(--text-primary)]">Ride Statistics</h4>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Total Seats',      value: (ride.availableSeats || 0) + (bookings.filter(b => b.bookingStatus === 'confirmed').reduce((s, b) => s + b.seatsBooked, 0)) },
                    { label: 'Seats Taken',      value: bookings.filter(b => b.bookingStatus === 'confirmed').reduce((s, b) => s + b.seatsBooked, 0) },
                    { label: 'Seats Available',  value: ride.availableSeats },
                    { label: 'Pending Requests', value: bookings.filter(b => b.bookingStatus === 'pending').length },
                    { label: 'Price / Seat',     value: `Free` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                      <span className="text-[var(--text-secondary)]">{label}</span>
                      <span className="text-[var(--text-primary)] font-semibold">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Drive Mode — Phase 14 */}
                {bookings.filter(b => b.bookingStatus === 'confirmed').length > 0 && (
                  <Link
                    href={`/drive?id=${ride._id}`}
                    className="btn-primary flex items-center justify-center gap-2 w-full py-3 px-4"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    🚗 Start Drive Mode
                  </Link>
                )}

                <Link href="/bookings" className="btn-secondary block w-full text-center py-2.5 px-4">
                  Manage Requests →
                </Link>
              </div>
            ) : (
              /* Passenger booking form */
              <>
                <h4 className="text-lg font-bold text-[var(--text-primary)] mb-4">Book this Ride</h4>

                {bookingSuccess ? (
                  <div className="bg-green-950/40 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm space-y-2">
                    <p className="font-bold">Booking Requested! ✓</p>
                    <p className="text-xs text-green-300">Your request is pending driver approval. Check <Link href="/bookings" className="underline">My Bookings</Link>.</p>
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-4">
                    {bookingError && (
                      <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">{bookingError}</div>
                    )}

                    <AddressAutocomplete
                      value={pickupLoc.address}
                      onChange={handlePickupSelect}
                      placeholder="Search your pickup location…"
                      label="Your Pickup Location"
                      showCurrentLocation
                      savedAddresses={savedAddresses}
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
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">Seats to Reserve</label>
                      <input
                        type="number"
                        min="1"
                        max={Math.min(8, ride.availableSeats)}
                        value={bookingSeats}
                        onChange={(e) => setBookingSeats(e.target.value)}
                        className="form-input block w-full px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="flex justify-between items-center text-sm pt-2">
                      <span className="text-[var(--text-secondary)]">Total Price</span>
                      <span className="text-[var(--text-primary)] font-extrabold text-lg">Free</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isBooking || ride.availableSeats <= 0 || ride.rideStatus !== 'ACTIVE' || !pickupLoc.verified}
                      className="btn-primary w-full py-2.5 px-4 disabled:opacity-50"
                    >
                      {isBooking
                        ? 'Processing…'
                        : ride.availableSeats <= 0
                        ? 'Fully Booked'
                        : !pickupLoc.verified
                        ? 'Confirm Pickup First'
                        : 'Request Booking'}
                    </button>

                    {/* Notice removed since 24h logic is not needed for now */}

                    {!pickupLoc.verified && pickupLoc.latitude && (
                      <p className="text-xs text-amber-400/70 text-center">
                        Drag the map pin to your exact location, then click "Confirm Location"
                      </p>
                    )}
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideDetails;
