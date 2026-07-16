"use client";

import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { io } from 'socket.io-client';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useDemoAnimation, { DEMO_STAGES } from '@/hooks/useDemoAnimation';
import DemoCompletionModal from '@/components/DemoCompletionModal';

if (typeof window !== 'undefined') {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export default function DriverModeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const router = useRouter();
  const { user } = useAuth();
  
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDriving, setIsDriving] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [routePath, setRoutePath] = useState(null);
  const [bookings, setBookings] = useState([]);
  
  const [demoStage, setDemoStage] = useState(DEMO_STAGES.IDLE);
  const [demoCountdown, setDemoCountdown] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  
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
        transition: transform 0.1s linear;
        filter: drop-shadow(0 0 6px rgba(16,185,129,0.6));
      ">
        <svg viewBox="0 0 40 40" width="40" height="40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="20,4 34,34 20,28 6,34" fill="#10b981" stroke="white" stroke-width="1.5"/>
        </svg>
      </div>`,
    });
  }, []);

  const buildStopIcon = useCallback((label, color) => {
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
  }, []);

  const { start: startDemoHook, stop: stopDemoHook } = useDemoAnimation({
      routePath: routePath,
      passengerPickups: bookings.map(b => ({id: b._id, lat: b.pickupLocation.latitude, lng: b.pickupLocation.longitude})),
      onLocationUpdate: ({lat, lng, heading}) => {
          setCurrentLocation({lat, lng});
          setCurrentHeading(heading);
      },
      onStageChange: (stage, extra = {}) => {
          setDemoStage(stage);
          if (extra.countdown !== undefined) setDemoCountdown(extra.countdown);
          if (stage === DEMO_STAGES.ARRIVED) {
              setShowCompletionModal(true);
          }
      }
  });

  useEffect(() => {
    if (!id) {
      router.push('/');
      return;
    }

    const fetchRide = async () => {
      try {
        const res = await api.get(`/rides/${id}`);
        const rideData = res.data.data.ride;
        
        // Verify user is the driver
        if (rideData.driver?._id !== user?._id && rideData.driver !== user?._id) {
          setError('Only the assigned driver can enter Driver Mode.');
          return;
        }
        setRide(rideData);
        setBookings(res.data.data.bookings || []);
        
        // Fetch route path for Demo Mode and Map display
        try {
          const bookingsList = res.data.data.bookings || [];
          let waypoints = [];
          
          if (bookingsList.length > 0) {
            waypoints = [
              { latitude: rideData.pickupLocation.latitude, longitude: rideData.pickupLocation.longitude },
              ...bookingsList.map(b => ({ latitude: b.pickupLocation.latitude, longitude: b.pickupLocation.longitude })),
              { latitude: rideData.destinationLocation.latitude, longitude: rideData.destinationLocation.longitude }
            ];
          }

          let routeRes;
          if (waypoints.length >= 2) {
             routeRes = await api.post('/routes/calculate', { waypoints });
          } else {
             routeRes = await api.post('/routes/calculate', {
               origin: { latitude: rideData.pickupLocation.latitude, longitude: rideData.pickupLocation.longitude },
               destination: { latitude: rideData.destinationLocation.latitude, longitude: rideData.destinationLocation.longitude }
             });
          }
          
          setRoutePath(routeRes.data.data.routePath);
        } catch (err) {
          console.error('Failed to fetch route for demo/display:', err);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load ride');
      } finally {
        setLoading(false);
      }
    };
    if (user && id) fetchRide();
  }, [id, user]);

  const startDriving = async () => {
    try {
      setIsDriving(true);

      // Connect to Socket.io (which is running on our backend's port)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      // The socket server is on the root of that domain
      const baseUrl = new URL(apiUrl, window.location.origin).origin;
      
      socketRef.current = io(baseUrl);
      
      socketRef.current.on('connect', () => {
        socketRef.current.emit('join_ride', id);
      });

      // Try Native Geolocation first (Capacitor)
      let permissions;
      try {
        permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            alert('Location permission is required for Live Tracking.');
            setIsDriving(false);
            return;
          }
        }

        const watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          (position, err) => {
            if (err) {
              console.error('GPS Watch Error:', err);
              return;
            }
            if (position) {
              const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
              setCurrentLocation(loc);
              
              if (socketRef.current) {
                socketRef.current.emit('driver_location_update', {
                  rideId: id,
                  lat: loc.lat,
                  lng: loc.lng,
                  heading: position.coords.heading,
                  speed: position.coords.speed,
                  timestamp: Date.now()
                });
              }
            }
          }
        );
        watchIdRef.current = watchId;
      } catch (capErr) {
        console.warn('Capacitor Geolocation failed, falling back to Web API:', capErr);
        
        // Fallback to Web Geolocation API
        if (navigator.geolocation) {
          const webWatchId = navigator.geolocation.watchPosition(
            (position) => {
              const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
              setCurrentLocation(loc);
              if (socketRef.current) {
                socketRef.current.emit('driver_location_update', {
                  rideId: id,
                  lat: loc.lat,
                  lng: loc.lng,
                  heading: position.coords?.heading || 0,
                  speed: position.coords?.speed || 0,
                  timestamp: Date.now()
                });
              }
            },
            (err) => {
              console.error('Web GPS Watch Error:', err);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
          // Store it as a string to differentiate if needed, or just keep it
          watchIdRef.current = webWatchId;
        } else {
          throw new Error('Geolocation is not supported by this browser.');
        }
      }
    } catch (err) {
      alert('Could not start GPS tracking: ' + err.message);
      setIsDriving(false);
    }
  };

  const startDemo = () => {
    if (!routePath || routePath.length === 0) {
      alert("Route not available for demo yet. Please wait or try again.");
      return;
    }
    
    setIsDriving(true);
    setIsDemo(true);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const baseUrl = new URL(apiUrl, window.location.origin).origin;
    socketRef.current = io(baseUrl);
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_ride', id);
    });

    startDemoHook();
  };

  const stopDriving = async () => {
    setIsDriving(false);
    setIsDemo(false);
    if (watchIdRef.current !== null) {
      try {
        await Geolocation.clearWatch({ id: watchIdRef.current });
      } catch (err) {
        // Fallback for Web API
        if (navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      }
      watchIdRef.current = null;
    }
    if (isDemo) {
      stopDemoHook();
    }
    if (socketRef.current) {
      socketRef.current.emit('leave_ride', id);
      socketRef.current.disconnect();
    }
  };

  const handleCompleteRide = async () => {
    if (window.confirm("Are you sure you want to complete this ride?")) {
      try {
        await api.post(`/rides/${id}/complete`);
        await stopDriving();
        alert("Ride completed successfully!");
        router.push('/drive');
      } catch (err) {
        alert("Failed to complete ride: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSos = () => {
    if (window.confirm("EMERGENCY: This will immediately alert all passengers and ST Security. Are you sure?")) {
      if (socketRef.current) {
        socketRef.current.emit('sos_alert', {
          rideId: id,
          message: 'SOS ALERT: Driver has triggered an emergency panic button. The ride is paused.',
          location: currentLocation
        });
      }
      alert('SOS signal dispatched.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch({ id: watchIdRef.current }).catch(console.error);
      }
      if (isDemo) {
        stopDemoHook();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (loading) return <div className="p-6 text-slate-300">Loading Driver Mode...</div>;
  if (error) return <div className="p-6 text-red-400 font-bold">{error}</div>;

  const isPaused = demoStage === DEMO_STAGES.PAUSED_AT_PICKUP;

  if (showCompletionModal) {
    return (
      <div className="min-h-screen bg-[#020617] pt-24 pb-8 text-white flex flex-col relative overflow-hidden items-center justify-center">
        <DemoCompletionModal
          isOpen={showCompletionModal}
          onClose={() => router.push('/drive')}
          driverCreditsEarned={ride?.distance * 10 || 150}
          totalEmissionSavedKg={ride?.distance * 0.2 || 3.5}
          routeDistance={ride?.distance || 15}
          vehicleType={'ev'}
          passengerCount={bookings.length || 1}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Driver Mode</h1>
            {isDemo && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                🎥 Demo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Ride #{id.substring(0, 6)} · {ride.rideStatus}
            {isDemo && demoStage !== DEMO_STAGES.IDLE && (
              <span className="ml-2 text-amber-400">[{demoStage.replace(/_/g, ' ')}]</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Demo Mode toggle — only available before ride starts */}
          {!isDriving && demoStage === DEMO_STAGES.IDLE && (
            <button
              onClick={startDemo}
              className={`text-xs px-3 py-2 rounded-lg font-semibold border transition-all ${
                isDemo
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/30 hover:text-amber-400'
              }`}
            >
              🎥 Demo Mode
            </button>
          )}
          {/* Real mode buttons */}
          {!isDemo && (
            <>
              {(ride.rideStatus === 'ACTIVE' || ride.rideStatus === 'FULL') && (
                <button onClick={() => alert("Freeze Bookings not yet implemented")} className="text-sm px-3 py-2 bg-sky-700 rounded-lg hover:bg-sky-600">
                  Freeze Bookings
                </button>
              )}
              {['ACTIVE', 'FULL', 'FROZEN', 'IN_PROGRESS'].includes(ride.rideStatus) && (
                <>
                  <button onClick={handleCompleteRide} className="text-sm px-3 py-2 bg-emerald-700 rounded-lg hover:bg-emerald-600">Complete Ride</button>
                  <button onClick={() => alert("Cancel Ride not yet implemented")} className="text-sm px-3 py-2 bg-red-700 rounded-lg hover:bg-red-600">Cancel Ride</button>
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
            <TileLayer url={`https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/{z}/{x}/{y}.png?api_key=${process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY}`} />

            {/* Moving car marker */}
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={buildCarIcon(currentHeading)}>
                <Popup>{isDemo ? '🎥 Demo Car' : 'Your Car'}</Popup>
              </Marker>
            )}

            {/* Route polyline */}
            {routePath && (
              <Polyline
                positions={routePath}
                pathOptions={{ color: '#10b981', weight: 4, opacity: 0.7, dashArray: isDemo ? '8 4' : undefined }}
              />
            )}

            {/* Stop markers */}
            <Marker position={[ride.pickupLocation.latitude, ride.pickupLocation.longitude]} icon={buildStopIcon('O', '#ef4444')}>
               <Popup>Start</Popup>
            </Marker>
            <Marker position={[ride.destinationLocation.latitude, ride.destinationLocation.longitude]} icon={buildStopIcon('D', '#10b981')}>
               <Popup>End</Popup>
            </Marker>
            {bookings.map((booking, i) => (
              <Marker key={booking._id} position={[booking.pickupLocation.latitude, booking.pickupLocation.longitude]} icon={buildStopIcon(`P${i+1}`, '#3b82f6')}>
                <Popup>Passenger: {booking.passenger?.firstName || 'Unknown'}</Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* ┌── Demo pause overlay ──┐ */}
        {isDemo && isPaused && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg"
            style={{
              background: 'rgba(15,23,42,0.9)',
              border: '1px solid rgba(245,158,11,0.4)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="text-amber-400 animate-pulse">🛑</span>
            Picking up passenger...
            {demoCountdown !== null && (
              <span className="ml-1 bg-amber-500 text-black rounded-full w-7 h-7 flex items-center justify-center text-xs font-black">
                {demoCountdown}
              </span>
            )}
          </div>
        )}

        {/* ┌── Demo stage banner ──┐ */}
        {isDemo && !isPaused && demoStage !== DEMO_STAGES.IDLE && demoStage !== DEMO_STAGES.ARRIVED && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-slate-800/90 border border-slate-700 rounded-full text-sm font-bold text-emerald-400 shadow-lg backdrop-blur">
            <span className="text-emerald-500">🚙</span>
            {demoStage.replace(/_/g, ' ')}...
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-6 left-0 right-0 px-6 z-10 flex flex-col gap-4">
          {!isDriving ? (
            <button 
              onClick={startDriving}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Start Driving & Broadcasting
            </button>
          ) : isDemo ? (
            <button 
              onClick={stopDriving}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-2xl font-bold text-lg shadow-lg"
            >
              ✕ Stop Demo
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
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold text-lg"
              >
                Stop Broadcasting
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
