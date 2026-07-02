"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { io } from 'socket.io-client';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

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
  
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  
  // Custom marker for Driver Car
  const carIcon = typeof window !== 'undefined' ? new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204018.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  }) : null;

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
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          alert('Location permission is required for Live Tracking.');
          return;
        }
      }

      setIsDriving(true);

      // Connect to Socket.io (which is running on our backend's port)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      // The socket server is on the root of that domain
      const baseUrl = new URL(apiUrl, window.location.origin).origin;
      
      socketRef.current = io(baseUrl);
      
      socketRef.current.on('connect', () => {
        socketRef.current.emit('join_ride', id);
      });

      // Start watching GPS
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
            
            // Emit to passengers
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
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  if (loading) return <div className="p-6 text-slate-300">Loading Driver Mode...</div>;
  if (error) return <div className="p-6 text-red-400 font-bold">{error}</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10 shadow-lg">
        <div>
          <h1 className="text-xl font-bold text-white">Driver Mode</h1>
          <p className="text-xs text-slate-400">Ride #{id.substring(0, 6)}</p>
        </div>
        <button 
          onClick={() => router.back()}
          className="text-sm px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700"
        >
          Exit
        </button>
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
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={carIcon}>
                <Popup>Your Car</Popup>
              </Marker>
            )}
            <Marker position={[ride.pickupLocation.latitude, ride.pickupLocation.longitude]}>
              <Popup>Start</Popup>
            </Marker>
            <Marker position={[ride.destinationLocation.latitude, ride.destinationLocation.longitude]}>
              <Popup>End</Popup>
            </Marker>
          </MapContainer>
        )}
        
        {/* Overlay Controls */}
        <div className="absolute bottom-6 left-0 right-0 px-6 z-10 flex flex-col gap-4">
          {!isDriving ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
