"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api, { SOCKET_URL } from '@/services/api';
import { io } from 'socket.io-client';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import useDemoAnimation, { DEMO_STAGES } from '@/hooks/useDemoAnimation';
import DemoCompletionModal from '@/components/DemoCompletionModal';

export default function DriverModeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { user } = useAuth();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDriving, setIsDriving] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentHeading, setCurrentHeading] = useState(0);

  // ── Demo Mode state ──────────────────────────────────────────────────────────
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStage, setDemoStage] = useState(DEMO_STAGES.IDLE);
  const [demoCountdown, setDemoCountdown] = useState(null);
  const [demoResult, setDemoResult] = useState(null);   // result object from onComplete
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const rideRef = useRef(null);
  const autoCompletingRef = useRef(false);

  // Great-circle distance in km
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Car icon — rotates with heading ─────────────────────────────────────────
  const buildCarIcon = useCallback((heading = 0) => {
    if (typeof window === 'undefined') return null;
    return new L.DivIcon({
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      html: `<div style="
        width:44px;height:44px;
        display:flex;align-items:center;justify-content:center;
        transform: rotate(${heading}deg);
        transition: transform 0.3s linear;
        filter: drop-shadow(0 0 6px rgba(16,185,129,0.6));
      ">
        <svg viewBox="0 0 40 40" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,4 34,34 20,28 6,34" fill="#10b981" stroke="white" stroke-width="1.5"/>
        </svg>
      </div>`,
    });
  }, []);

  // Stop marker icons (A=origin, B=pickup, C=via, D=destination)
  const buildStopIcon = (label, color) => {
    if (typeof window === 'undefined') return null;
    return new L.DivIcon({
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      html: `<div style="
        width:32px;height:32px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color};
        color:#fff;border:2px solid rgba(255,255,255,0.9);
        display:flex;align-items:center;justify-content:center;
        font-weight:800;font-size:13px;
        box-shadow:0 4px 10px rgba(0,0,0,0.4);
      "><span style="transform:rotate(45deg)">${label}</span></div>`,
    });
  };

  // ── Demo Animation Hook ──────────────────────────────────────────────────────
  const { stage: animStage, polyline: demoPolyline, start: startDemo, stop: stopDemo } = useDemoAnimation({
    ride,
    rideId: id,
    onLocationUpdate: ({ lat, lng, heading }) => {
      setCurrentLocation({ lat, lng });
      setCurrentHeading(heading);
    },
    onStageChange: (stage, extra = {}) => {
      setDemoStage(stage);
      if (extra.countdown !== undefined) setDemoCountdown(extra.countdown);
      else setDemoCountdown(null);
    },
    onComplete: (result) => {
      setDemoResult(result);
      setShowCompletionModal(true);
      // Refresh ride data so the status badge in the header updates
      api.get(`/rides/${id}`).then((res) => setRide(res.data.data.ride)).catch(() => {});
    },
  });

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const res = await api.get(`/rides/${id}`);
        const rideData = res.data.data.ride;
        if (rideData.driver?._id !== user?._id && rideData.driver !== user?._id) {
          setError('Only the assigned driver can enter Driver Mode.');
          return;
        }
        setRide(rideData);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load ride');
      } finally {
        setLoading(false);
      }
    };
    if (user && id) fetchRide();
  }, [id, user]);

  useEffect(() => {
    rideRef.current = ride;
  }, [ride]);

  // ── Real GPS driving (unchanged) ────────────────────────────────────────────
  const startDriving = async () => {
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          alert('Location permission is required for Live Tracking.');
          return;
        }
      }

      setIsDriving(true);
      const baseUrl = SOCKET_URL || window.location.origin;
      socketRef.current = io(baseUrl);
      socketRef.current.on('connect', () => {
        socketRef.current.emit('join_ride', id);
      });

      const watchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        (position, err) => {
          if (err) { console.error('GPS Watch Error:', err); return; }
          if (position) {
            const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
            setCurrentLocation(loc);
            setCurrentHeading(position.coords.heading || 0);

            socketRef.current.emit('driver_location_update', {
              rideId: id, lat: loc.lat, lng: loc.lng,
              heading: position.coords.heading, speed: position.coords.speed,
              timestamp: Date.now(),
            });

            const currentRide = rideRef.current;
            const dest = currentRide?.destinationLocation;
            if (currentRide?.rideStatus === 'IN_PROGRESS' && dest?.latitude && dest?.longitude && !autoCompletingRef.current) {
              const distanceKm = haversineKm(loc.lat, loc.lng, dest.latitude, dest.longitude);
              if (distanceKm <= 0.15) {
                autoCompletingRef.current = true;
                updateRideStatus('COMPLETED', { auto: true });
              }
            }
          }
        }
      );
      watchIdRef.current = watchId;
    } catch (err) {
      alert('Could not start GPS tracking: ' + err.message);
      setIsDriving(false);
    }
  };

  const stopDriving = async () => {
    setIsDriving(false);
    if (watchIdRef.current !== null) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('leave_ride', id);
      socketRef.current.disconnect();
    }
  };

  const updateRideStatus = async (status, { auto = false } = {}) => {
    let pin;
    if (status === 'IN_PROGRESS') {
      pin = window.prompt("Enter the pickup PIN shown on your passenger's booking to start the ride:");
      if (pin === null) return;
      pin = pin.trim();
      if (!/^\d{4}$/.test(pin)) { alert('The pickup PIN must be exactly 4 digits.'); return; }
    } else if (!auto) {
      const confirmMessage =
        status === 'CANCELLED' ? 'Cancel this ride? All passengers will be notified immediately.'
        : status === 'COMPLETED' ? 'Mark this ride as completed?'
        : status === 'FROZEN' ? 'Freeze bookings? No new passengers will be able to book this ride.'
        : 'Start this ride and begin live GPS tracking?';
      if (!window.confirm(confirmMessage)) return;
    }
    try {
      if (status === 'COMPLETED' || status === 'CANCELLED') await stopDriving();
      const res = await api.patch(`/rides/${id}/status`, pin ? { status, pin } : { status });
      setRide(res.data.data.ride);
      if (status === 'IN_PROGRESS') await startDriving();
      return res.data.data.ride;
    } catch (err) {
      alert(err.response?.data?.message || `Failed to update ride status.`);
    }
  };

  const handleSos = () => {
    if (window.confirm('EMERGENCY: This will immediately alert all passengers and ST Security. Are you sure?')) {
      const message = 'SOS ALERT: Driver has triggered an emergency panic button. The ride is paused.';
      if (socketRef.current) socketRef.current.emit('sos_alert', { rideId: id, message, location: currentLocation });
      api.post('/safety/sos', {
        rideId: id, triggeredBy: 'driver', message,
        location: currentLocation ? { latitude: currentLocation.lat, longitude: currentLocation.lng } : null,
      }).catch((err) => console.warn('[SOS] failed to persist alert:', err?.message));
      alert('SOS signal dispatched.');
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) Geolocation.clearWatch({ id: watchIdRef.current }).catch(console.error);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  if (loading) return <div className="p-6 text-slate-300">Loading Driver Mode...</div>;
  if (error) return <div className="p-6 text-red-400 font-bold">{error}</div>;

  // Pause stages for the countdown overlay
  const isPaused = demoStage === DEMO_STAGES.PAUSED_AT_PICKUP || demoStage === DEMO_STAGES.PAUSED_AT_VIA;
  const isDemoRunning = isDemoMode && demoStage !== DEMO_STAGES.IDLE && demoStage !== DEMO_STAGES.ARRIVED;

  // Build stop markers for the demo map
  const stopMarkers = ride ? [
    { lat: ride.pickupLocation.latitude, lng: ride.pickupLocation.longitude, label: 'A', color: '#10b981', popup: 'Origin / Pickup' },
    ...(ride.viaStops || []).map((vs, i) => ({
      lat: vs.latitude, lng: vs.longitude,
      label: String.fromCharCode(67 + i), // C, D
      color: '#f59e0b', popup: `Stop ${i + 1}`,
    })),
    { lat: ride.destinationLocation.latitude, lng: ride.destinationLocation.longitude, label: '🏁', color: '#6366f1', popup: 'Destination' },
  ] : [];

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Driver Mode</h1>
            {isDemoMode && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                🎬 Demo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Ride #{id.substring(0, 6)} · {ride.rideStatus}
            {isDemoMode && demoStage !== DEMO_STAGES.IDLE && (
              <span className="ml-2 text-amber-400">[{demoStage.replace(/_/g, ' ')}]</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Demo Mode toggle — only available before ride starts */}
          {!isDriving && demoStage === DEMO_STAGES.IDLE && (
            <button
              onClick={() => setIsDemoMode((p) => !p)}
              className={`text-xs px-3 py-2 rounded-lg font-semibold border transition-all ${
                isDemoMode
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/30 hover:text-amber-400'
              }`}
            >
              🎬 Demo Mode
            </button>
          )}
          {/* Real mode buttons */}
          {!isDemoMode && (
            <>
              {(ride.rideStatus === 'ACTIVE' || ride.rideStatus === 'FULL') && (
                <button onClick={() => updateRideStatus('FROZEN')} className="text-sm px-3 py-2 bg-sky-700 rounded-lg hover:bg-sky-600">
                  Freeze Bookings
                </button>
              )}
              {ride.rideStatus === 'FROZEN' && (
                <button onClick={() => updateRideStatus('IN_PROGRESS')} className="text-sm px-3 py-2 bg-indigo-700 rounded-lg hover:bg-indigo-600">
                  Start Ride
                </button>
              )}
              {['ACTIVE', 'FULL', 'FROZEN', 'IN_PROGRESS'].includes(ride.rideStatus) && (
                <>
                  <button onClick={() => updateRideStatus('COMPLETED')} className="text-sm px-3 py-2 bg-emerald-700 rounded-lg hover:bg-emerald-600">Complete Ride</button>
                  <button onClick={() => updateRideStatus('CANCELLED')} className="text-sm px-3 py-2 bg-red-700 rounded-lg hover:bg-red-600">Cancel Ride</button>
                </>
              )}
            </>
          )}
          <button onClick={() => router.back()} className="text-sm px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700">Exit</button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {typeof window !== 'undefined' && ride.pickupLocation?.latitude && (
          <MapContainer
            center={currentLocation || [ride.pickupLocation.latitude, ride.pickupLocation.longitude]}
            zoom={15}
            className="w-full h-full z-0"
            zoomControl={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

            {/* Moving car marker */}
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={buildCarIcon(currentHeading)}>
                <Popup>{isDemoMode ? '🎬 Demo Car' : 'Your Car'}</Popup>
              </Marker>
            )}

            {/* Demo: full route polyline */}
            {isDemoMode && demoPolyline.length > 1 && (
              <Polyline
                positions={demoPolyline}
                pathOptions={{ color: '#10b981', weight: 4, opacity: 0.7, dashArray: '8 4' }}
              />
            )}

            {/* Demo: stop markers (A, B, C…) */}
            {isDemoMode
              ? stopMarkers.map((sm, i) => (
                  <Marker key={i} position={[sm.lat, sm.lng]} icon={buildStopIcon(sm.label, sm.color)}>
                    <Popup>{sm.popup}</Popup>
                  </Marker>
                ))
              : (
                <>
                  <Marker position={[ride.pickupLocation.latitude, ride.pickupLocation.longitude]}>
                    <Popup>Pickup</Popup>
                  </Marker>
                  <Marker position={[ride.destinationLocation.latitude, ride.destinationLocation.longitude]}>
                    <Popup>Destination</Popup>
                  </Marker>
                </>
              )}
          </MapContainer>
        )}

        {/* ── Demo pause overlay ── */}
        {isDemoMode && isPaused && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg"
            style={{
              background: 'rgba(15,23,42,0.9)',
              border: '1px solid rgba(245,158,11,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="text-amber-400 animate-pulse">🚗</span>
            Picking up passenger…
            {demoCountdown !== null && (
              <span className="ml-1 bg-amber-500 text-black rounded-full w-7 h-7 flex items-center justify-center text-xs font-black">
                {demoCountdown}
              </span>
            )}
          </div>
        )}

        {/* ── Demo stage banner ── */}
        {isDemoMode && !isPaused && demoStage !== DEMO_STAGES.IDLE && demoStage !== DEMO_STAGES.ARRIVED && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-bold text-emerald-400 shadow"
            style={{
              background: 'rgba(15,23,42,0.85)',
              border: '1px solid rgba(16,185,129,0.3)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {demoStage === DEMO_STAGES.FREEZING && '🔒 Freezing bookings…'}
            {demoStage === DEMO_STAGES.DRIVING_TO_PICKUP && '🚗 Driving to pickup…'}
            {demoStage === DEMO_STAGES.DRIVING_TO_VIA && '🚗 Driving to stop…'}
            {demoStage === DEMO_STAGES.DRIVING_TO_DEST && '🚗 Driving to destination…'}
            {demoStage === DEMO_STAGES.ARRIVING && '✅ Arriving…'}
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-6 left-0 right-0 px-6 z-10 flex flex-col gap-3">
          {isDemoMode ? (
            /* ── Demo controls ── */
            demoStage === DEMO_STAGES.IDLE ? (
              <button
                onClick={startDemo}
                className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  boxShadow: '0 0 30px rgba(245,158,11,0.35)',
                }}
              >
                🎬 Start Demo Ride
              </button>
            ) : demoStage === DEMO_STAGES.ARRIVED ? (
              <button
                onClick={() => { stopDemo(); setIsDemoMode(false); setCurrentLocation(null); }}
                className="w-full py-4 rounded-2xl font-bold text-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Exit Demo
              </button>
            ) : (
              <button
                onClick={() => { stopDemo(); setCurrentLocation(null); }}
                className="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
              >
                ✕ Stop Demo
              </button>
            )
          ) : (
            /* ── Real GPS controls (unchanged) ── */
            !isDriving ? (
              <button
                onClick={startDriving}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Start Driving & Broadcasting
              </button>
            ) : (
              <>
                <button
                  onClick={handleSos}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse"
                >
                  🚨 EMERGENCY S.O.S 🚨
                </button>
                <button
                  onClick={stopDriving}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold"
                >
                  Stop Broadcasting
                </button>
              </>
            )
          )}
        </div>
      </div>

      {/* Eco-Credits Completion Modal */}
      {demoResult && (
        <DemoCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          driverCreditsEarned={demoResult.driverCreditsEarned}
          totalEmissionSavedKg={demoResult.totalEmissionSavedKg}
          routeDistance={demoResult.routeDistance}
          vehicleType={demoResult.vehicleType}
          passengerCount={ride?.bookedSeats || 1}
        />
      )}
    </div>
  );
}
