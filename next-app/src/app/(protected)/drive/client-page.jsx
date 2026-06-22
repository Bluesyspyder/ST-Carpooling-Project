"use client";
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

/**
 * Custom numbered marker icons for each waypoint
 */
const makeNumberedIcon = (number, isPicked) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${isPicked ? '#6b7280' : '#34d399'};
      color:${isPicked ? '#9ca3af' : '#0f172a'};
      border:3px solid ${isPicked ? '#4b5563' : '#0f172a'};
      display:flex;align-items:center;justify-content:center;
      font-weight:900;font-size:13px;font-family:Inter,sans-serif;
      box-shadow:0 4px 12px rgba(0,0,0,0.4);
    ">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const originIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#6366f1;color:#fff;
    border:3px solid #1e1b4b;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.4);
  ">🚗</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#f59e0b;color:#000;
    border:3px solid #292524;
    display:flex;align-items:center;justify-content:center;
    font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.4);
  ">🏁</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/**
 * Phase 14 — Full-Screen Drive Mode (Option B)
 * Accessed at /rides/:id/drive — header hidden on this route.
 */
const DriveMode = () => {
  const { id } = useParams();
  const navigate = useRouter();
  const { user } = useAuth();

  const [route, setRoute]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [pickedUp, setPickedUp]   = useState(new Set()); // bookingId Set
  const [currentStop, setCurrentStop] = useState(0);

  const fetchRoute = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/rides/${id}/optimized-route`);
      setRoute(res.data.data);
    } catch (err) {
      console.error('[DriveMode] Failed to fetch optimized route:', err);
      setError(err.response?.data?.message || 'Failed to load route. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRoute(); }, [fetchRoute]);

  const togglePickup = (bookingId) => {
    setPickedUp((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) { next.delete(bookingId); }
      else {
        next.add(bookingId);
        // Advance to next stop automatically
        const nextStop = route.orderedWaypoints.findIndex((w, i) => i > currentStop && !next.has(w.bookingId.toString()));
        if (nextStop !== -1) setCurrentStop(nextStop);
      }
      return next;
    });
  };

  const allPickedUp = route && pickedUp.size === route.orderedWaypoints.length;

  // Build polyline from origin → waypoints → destination
  const polylinePoints = route
    ? [
        [route.origin.lat, route.origin.lng],
        ...route.orderedWaypoints.map((w) => [w.lat, w.lng]),
        [route.destination.lat, route.destination.lng],
      ]
    : [];

  const mapCenter = route
    ? [route.origin.lat, route.origin.lng]
    : [28.4725, 77.4889];

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-5 text-slate-400">
        <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin border-[3px]" />
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-300">Calculating optimal route…</p>
          <p className="text-xs text-slate-500 mt-1">Running TSP optimization on all passenger pickups</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-3xl">⚠</div>
        <div>
          <p className="text-slate-200 font-bold text-lg">{error}</p>
          <p className="text-slate-500 text-sm mt-1">You may not be the driver of this ride.</p>
        </div>
        <button
          onClick={() => navigate(`/rides/${id}`)}
          className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 font-semibold text-sm hover:bg-slate-700 transition"
        >
          ← Back to Ride Details
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/rides/${id}`)}
            className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition"
          >
            ←
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Drive Mode
            </h1>
            <p className="text-[11px] text-slate-500">
              {route?.origin?.address} → {route?.destination?.address}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-center">
            <div>
              <p className="text-xs font-bold text-emerald-400">{route?.totalDistanceKm} km</p>
              <p className="text-[10px] text-slate-500">total distance</p>
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400">{pickedUp.size}/{route?.orderedWaypoints?.length}</p>
              <p className="text-[10px] text-slate-500">picked up</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-bold">{route?.algorithm?.replace(/-/g, ' ')}</p>
              <p className="text-[10px] text-slate-500">algorithm</p>
            </div>
          </div>

          <button
            onClick={fetchRoute}
            className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition text-sm"
            title="Refresh route"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Main Layout: Map + Side Panel ── */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ── Map ── */}
        <div className="flex-1 relative z-10" style={{ minHeight: '300px' }}>
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <ZoomControl position="topright" />
            <TileLayer
              url={`https://api.olamaps.io/tiles/vector/v1/styles/dark/{z}/{x}/{y}.png?api_key=${process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY}`}
              attribution='&copy; Ola Maps'
            />

            {/* Route polyline */}
            {polylinePoints.length > 1 && (
              <Polyline
                positions={polylinePoints}
                color="#34d399"
                weight={3}
                opacity={0.8}
                dashArray="6 4"
              />
            )}

            {/* Origin marker */}
            {route?.origin && (
              <Marker position={[route.origin.lat, route.origin.lng]} icon={originIcon}>
                <Popup className="leaflet-popup-dark">
                  <div className="text-xs font-semibold text-slate-800">🚗 Start: {route.origin.address}</div>
                </Popup>
              </Marker>
            )}

            {/* Pickup waypoint markers */}
            {route?.orderedWaypoints?.map((wp) => {
              const isPickedUp = pickedUp.has(wp.bookingId.toString());
              return (
                <Marker
                  key={wp.bookingId}
                  position={[wp.lat, wp.lng]}
                  icon={makeNumberedIcon(wp.position, isPickedUp)}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-800">Stop #{wp.position}: {wp.passenger.firstName} {wp.passenger.lastName}</p>
                      <p className="text-slate-600">{wp.address}</p>
                      {wp.passenger.phone && <p className="text-emerald-700 font-semibold">📞 {wp.passenger.phone}</p>}
                      <p className={isPickedUp ? 'text-gray-500' : 'text-emerald-700'}>{isPickedUp ? '✓ Picked up' : `${wp.seatsBooked} seat(s)`}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Destination marker */}
            {route?.destination && (
              <Marker position={[route.destination.lat, route.destination.lng]} icon={destIcon}>
                <Popup>
                  <div className="text-xs font-semibold text-slate-800">🏁 Destination: {route.destination.address}</div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* ── Side Panel: Passenger Stop List ── */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col overflow-hidden flex-shrink-0" style={{ maxHeight: '50vh', minHeight: '240px' }}>

          {/* Panel header */}
          <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Pickup Stops
              <span className="ml-auto text-xs font-semibold text-slate-500">{pickedUp.size}/{route?.orderedWaypoints?.length} done</span>
            </h2>
          </div>

          {/* Stop list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {route?.orderedWaypoints?.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No confirmed passengers yet.</p>
                <p className="text-xs mt-1">Accept passenger requests from the Bookings page.</p>
              </div>
            )}

            {route?.orderedWaypoints?.map((wp, i) => {
              const isPickedUp = pickedUp.has(wp.bookingId.toString());
              const isCurrent = i === currentStop && !allPickedUp;

              return (
                <div
                  key={wp.bookingId}
                  className={`p-3 rounded-xl border transition-all duration-300 ${
                    isPickedUp
                      ? 'bg-slate-800/30 border-slate-800/40 opacity-50'
                      : isCurrent
                      ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-800/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Stop number */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border-2 ${
                      isPickedUp ? 'bg-slate-700 border-slate-600 text-slate-500' :
                      isCurrent ? 'bg-emerald-400 border-emerald-400 text-slate-950' :
                      'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {isPickedUp ? '✓' : wp.position}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400 flex-shrink-0">
                          {wp.passenger.profileImage ? (
                            <img src={wp.passenger.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            wp.passenger.firstName?.[0]
                          )}
                        </div>
                        <p className={`text-xs font-bold truncate ${isPickedUp ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {wp.passenger.firstName} {wp.passenger.lastName}
                        </p>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">{wp.seatsBooked}×</span>
                      </div>

                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{wp.address}</p>

                      {wp.passenger.phone && !isPickedUp && (
                        <a
                          href={`tel:${wp.passenger.phone}`}
                          className="text-[10px] text-emerald-400 font-semibold mt-1 inline-block hover:text-emerald-300"
                        >
                          📞 {wp.passenger.phone}
                        </a>
                      )}
                    </div>

                    {/* Picked up toggle */}
                    <button
                      onClick={() => togglePickup(wp.bookingId.toString())}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        isPickedUp
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                          : 'bg-emerald-400 text-slate-950 hover:bg-emerald-500 shadow-sm shadow-emerald-400/30'
                      }`}
                    >
                      {isPickedUp ? 'Undo' : 'Picked Up ✓'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom actions */}
          <div className="p-4 border-t border-slate-800 flex-shrink-0 space-y-2">
            {allPickedUp && route?.orderedWaypoints?.length > 0 ? (
              <div className="text-center space-y-3">
                <div className="text-2xl">🎉</div>
                <p className="text-sm font-bold text-emerald-400">All passengers picked up!</p>
                <p className="text-xs text-slate-500">Head to {route.destination.address}</p>
                <Link
                  href={`/rides/${id}`}
                  className="block w-full py-2.5 px-4 bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl transition text-sm text-center"
                >
                  Complete Ride
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{route?.orderedWaypoints?.length - pickedUp.size} stop{route?.orderedWaypoints?.length - pickedUp.size !== 1 ? 's' : ''} remaining</span>
                <span className="text-slate-600">{route?.totalDistanceKm} km total</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveMode;
