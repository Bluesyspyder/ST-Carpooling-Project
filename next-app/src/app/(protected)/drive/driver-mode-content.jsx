"use client";

import { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { io } from 'socket.io-client';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [routePath, setRoutePath] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [demoStatus, setDemoStatus] = useState('Driving to pickup...');
  
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const pickedUpRef = useRef(new Set());
  
  // Custom marker for Driver Car
  const carIcon = useMemo(() => {
    return typeof window !== 'undefined' ? new L.DivIcon({
      className: 'bg-transparent',
      html: `<div style="display:flex; align-items:center; justify-content:center; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981; box-shadow: 0 0 10px rgba(16,185,129,0.5);">
        <svg viewBox="0 0 24 24" fill="#10b981" style="width: 24px; height: 24px; transform: rotate(-45deg);"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    }) : null;
  }, []);

  const demoCarIcon = useMemo(() => {
    return typeof window !== 'undefined' ? new L.DivIcon({
      className: 'bg-transparent',
      html: `<div style="position: relative;">
        <div style="display:flex; align-items:center; justify-content:center; width: 40px; height: 40px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981; box-shadow: 0 0 10px rgba(16,185,129,0.5); position: absolute; top: -20px; left: -20px;">
          <svg viewBox="0 0 24 24" fill="#10b981" style="width: 24px; height: 24px; transform: rotate(-45deg);"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </div>
        <div class="bg-slate-800 text-emerald-400 px-3 py-1.5 rounded-full text-sm font-bold border border-slate-700 shadow-lg flex items-center gap-2 whitespace-nowrap" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);">
          ${demoStatus}
        </div>
      </div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }) : null;
  }, [demoStatus]);

  const passengerIcon = useMemo(() => {
    return typeof window !== 'undefined' ? new L.DivIcon({
      className: 'bg-transparent',
      html: `<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg text-lg">🧍</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    }) : null;
  }, []);

  useEffect(() => {
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
    
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
    }
    
    setIsDriving(true);
    setIsDemo(true);
    setDemoStatus('Driving to pickup...');
    pickedUpRef.current = new Set();
    let currentIndex = 0;
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const baseUrl = new URL(apiUrl, window.location.origin).origin;
    socketRef.current = io(baseUrl);
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_ride', id);
    });

    const stepDemo = () => {
      if (currentIndex >= routePath.length) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
        setDemoStatus('Arrived at destination');
        return;
      }
      
      const pos = routePath[currentIndex];
      // handle if pos is array [lat, lng] or object {lat, lng}
      const lat = pos.lat !== undefined ? pos.lat : pos[0];
      const lng = pos.lng !== undefined ? pos.lng : pos[1];
      const loc = { lat, lng };
      
      setCurrentLocation(loc);
      
      if (socketRef.current) {
         socketRef.current.emit('driver_location_update', {
            rideId: id,
            lat: loc.lat,
            lng: loc.lng,
            heading: 0,
            speed: 40,
            timestamp: Date.now()
         });
      }
      
      // Check for passenger pickups
      const activeBookings = bookings.filter(b => b.bookingStatus === 'confirmed' || b.bookingStatus === 'pending' || b.bookingStatus === 'waitlisted');
      const nearbyPassenger = activeBookings.find(b => {
         if (pickedUpRef.current.has(b._id)) return false;
         const dLat = b.pickupLocation.latitude - loc.lat;
         const dLng = b.pickupLocation.longitude - loc.lng;
         const dist = Math.sqrt(dLat*dLat + dLng*dLng);
         return dist < 0.0005; // 50 meters radius to trigger wait
      });

      if (nearbyPassenger) {
         pickedUpRef.current.add(nearbyPassenger._id);
         
         setDemoStatus(`Waiting for ${nearbyPassenger.passenger?.firstName || 'Passenger'}...`);
         clearInterval(demoIntervalRef.current);
         setTimeout(() => {
             setDemoStatus('Driving to destination...');
             demoIntervalRef.current = setInterval(stepDemo, 100);
         }, 4000); // Wait 4 seconds
      } else {
         // Calculate next step
         currentIndex += Math.max(1, Math.floor(routePath.length / 200)); // Slower speed
      }
    };

    demoIntervalRef.current = setInterval(stepDemo, 100);
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
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
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
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (loading) return <div className="p-6 text-slate-300">Loading Driver Mode...</div>;
  if (error) return <div className="p-6 text-red-400 font-bold">{error}</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center z-10 shadow-lg gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Driver Mode</h1>
            {isDemo && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-900/50 border border-amber-700 text-amber-500 uppercase tracking-widest flex items-center gap-1">
                🎥 Demo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Ride #{id.substring(0, 6)} · ACTIVE
            {isDemo && <span className="text-amber-500 font-bold ml-2">[{demoStatus.toUpperCase()}]</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isDemo && (
            <>
              {!isDriving && (
                <button 
                  onClick={startDemo}
                  className="text-sm px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white flex items-center gap-2 transition"
                >
                  🎥 Demo Mode
                </button>
              )}
              <button 
                onClick={() => alert("Freeze Bookings not yet implemented")}
                className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Freeze Bookings
              </button>
              <button 
                onClick={handleCompleteRide}
                className="text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                Complete Ride
              </button>
              <button 
                onClick={() => alert("Cancel Ride not yet implemented")}
                className="text-sm px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Cancel Ride
              </button>
            </>
          )}
          <button 
            onClick={() => router.back()}
            className="text-sm px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-white transition"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {typeof window !== 'undefined' && ride.pickupLocation?.latitude && (
          <MapContainer 
            center={currentLocation || [ride.pickupLocation.latitude, ride.pickupLocation.longitude]} 
            zoom={15} 
            className="w-full h-full z-0"
            zoomControl={false}
          >
            <TileLayer
              url={`https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/{z}/{x}/{y}.png?api_key=${process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY}`}
              attribution="© Ola Maps"
            />
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={isDemo ? demoCarIcon : carIcon}>
                <Popup>Your Car</Popup>
              </Marker>
            )}
            <Marker position={[ride.pickupLocation.latitude, ride.pickupLocation.longitude]}>
              <Popup>Start</Popup>
            </Marker>
            <Marker position={[ride.destinationLocation.latitude, ride.destinationLocation.longitude]}>
              <Popup>End</Popup>
            </Marker>
            {/* Passenger Pickups */}
            {bookings.map(booking => (
              <Marker key={booking._id} position={[booking.pickupLocation.latitude, booking.pickupLocation.longitude]} icon={passengerIcon}>
                <Popup>Passenger: {booking.passenger?.firstName || 'Unknown'} (Status: {booking.bookingStatus})</Popup>
              </Marker>
            ))}
            {routePath && (
              <Polyline positions={routePath} color={isDemo ? "#10b981" : "#3b82f6"} weight={6} opacity={0.8} />
            )}
          </MapContainer>
        )}
        
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
