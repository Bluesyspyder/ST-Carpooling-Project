"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import api from '@/services/api';

/**
 * RouteMap — Leaflet map that draws a route polyline between two verified locations
 * or a sequence of multiple waypoints.
 *
 * Props:
 *  pickup       – { address, latitude, longitude, verified } (fallback if waypoints not provided)
 *  destination  – { address, latitude, longitude, verified } (fallback if waypoints not provided)
 *  waypoints    – Array of { address, latitude, longitude, label } (Feature 3 & 5 multi-point routing)
 *  height       – CSS string (default '320px')
 *  autoFetch    – bool: auto-calculate route when both locations are verified (default true)
 *  showPanel    – bool: show distance/ETA info panel below map (default true)
 *  className    – extra CSS classes on wrapper
 *  liveDriverLocation - { lat, lng } for real-time car marker update
 */
const RouteMap = ({
  pickup,
  destination,
  waypoints = null,
  externalRouteData = null,  // { routePath, distanceKm, durationMinutes, provider, isFallback }
  height = '320px',
  autoFetch = true,
  showPanel = true,
  className = '',
  liveDriverLocation = null,
}) => {
  const mapRef        = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef    = useRef([]);
  const carMarkerRef  = useRef(null);
  const polylineRef   = useRef(null);
  const isMounted     = useRef(true);

  const [routeInfo, setRouteInfo]   = useState(null); // { distanceKm, durationMinutes, provider }
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // ── Map icons (created once per map instance) ────────────────────────────
  const createIcon = useCallback((L, color, letter) => {
    return L.divIcon({
      className: '',
      html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;
              border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};
              color:#fff;border:2px solid #fff;font-weight:700;font-size:13px;
              box-shadow:0 3px 8px rgba(0,0,0,.4)">
               <span style="transform:rotate(45deg)">${letter}</span></div>`,
      iconAnchor: [16, 32],
    });
  }, []);

  // ── Fetch route from backend ──────────────────────────────────────────────
  const fetchRoute = useCallback(async (pLoc, dLoc, wps) => {
    setLoading(true);
    setError('');

    try {
      let res;
      if (wps && wps.length >= 2) {
        res = await api.post('/routes/calculate', {
          waypoints: wps.map(w => ({ latitude: w.latitude, longitude: w.longitude }))
        });
      } else {
        if (
          !pLoc?.latitude || !pLoc?.longitude ||
          !dLoc?.latitude || !dLoc?.longitude
        ) {
          setLoading(false);
          return;
        }
        res = await api.post('/routes/calculate', {
          origin:      { latitude: pLoc.latitude,  longitude: pLoc.longitude },
          destination: { latitude: dLoc.latitude,  longitude: dLoc.longitude },
        });
      }

      const { routePath, distanceKm, durationMinutes, provider, isFallback } = res.data.data;

      if (!isMounted.current) return;

      setRouteInfo({ distanceKm, durationMinutes, provider, isFallback });

      // Draw polyline
      const L = (await import('leaflet')).default;
      if (!isMounted.current || !leafletMapRef.current) return;

      if (polylineRef.current) polylineRef.current.remove();

      const latlngs = routePath.map(({ lat, lng }) => [lat, lng]);
      polylineRef.current = L.polyline(latlngs, {
        color:     isFallback ? '#f59e0b' : '#818cf8',
        weight:    4,
        opacity:   0.85,
        dashArray: isFallback ? '6 8' : null,
      }).addTo(leafletMapRef.current);

      leafletMapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40], animate: false });
    } catch (err) {
      if (!isMounted.current) return;
      setError('Could not calculate route. Showing marker positions only.');
      console.warn('[RouteMap] Route fetch failed:', err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // ── Initialise Leaflet map ────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;

    const initMap = async () => {
      if (!mapRef.current) return;

      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        polylineRef.current   = null;
      }

      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Determine center point
      let center = [28.5355, 77.3910];
      if (waypoints && waypoints.length > 0) {
        const first = waypoints[0];
        if (first?.latitude) center = [first.latitude, first.longitude];
      } else if (pickup?.latitude) {
        center = [pickup.latitude, pickup.longitude];
      }

      leafletMapRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, 12);

      L.tileLayer(`https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/{z}/{x}/{y}.png?api_key=${process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY}`, {
        attribution: '© Ola Maps',
      }).addTo(leafletMapRef.current);

      // Render markers based on waypoints if present, else fall back to pickup & destination
      if (waypoints && waypoints.length > 0) {
        const bounds = L.latLngBounds();
        waypoints.forEach((wp, index) => {
          if (!wp.latitude || !wp.longitude) return;
          
          let color = '#6366f1'; // default Indigo
          let label = wp.label || String(index + 1);
          
          if (index === 0) {
            color = '#10b981'; // Driver home (Green)
            label = 'D';
          } else if (index === waypoints.length - 1) {
            color = '#ef4444'; // Office (Red)
            label = 'O';
          } else {
            color = '#3b82f6'; // Pickups (Blue)
          }

          const icon = createIcon(L, color, label);
          const marker = L.marker([wp.latitude, wp.longitude], { icon })
            .addTo(leafletMapRef.current)
            .bindPopup(`<b>${index === 0 ? 'Driver Start' : index === waypoints.length - 1 ? 'Destination' : `Pickup #${index}`}</b><br>${wp.address || ''}`, { maxWidth: 220 });
          
          markersRef.current.push(marker);
          bounds.extend([wp.latitude, wp.longitude]);
        });

        if (waypoints.length >= 2) {
          leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], animate: false });
        }
      } else {
        const bounds = L.latLngBounds();
        if (pickup?.latitude && pickup?.longitude) {
          const icon = createIcon(L, '#10b981', 'A');
          const marker = L.marker([pickup.latitude, pickup.longitude], { icon })
            .addTo(leafletMapRef.current)
            .bindPopup(`<b>Pickup</b><br>${pickup.address || ''}`, { maxWidth: 220 });
          markersRef.current.push(marker);
          bounds.extend([pickup.latitude, pickup.longitude]);
        }

        if (destination?.latitude && destination?.longitude) {
          const icon = createIcon(L, '#6366f1', 'B');
          const marker = L.marker([destination.latitude, destination.longitude], { icon })
            .addTo(leafletMapRef.current)
            .bindPopup(`<b>Destination</b><br>${destination.address || ''}`, { maxWidth: 220 });
          markersRef.current.push(marker);
          bounds.extend([destination.latitude, destination.longitude]);
        }

        if (pickup?.latitude && destination?.latitude) {
          leafletMapRef.current.fitBounds(bounds, { padding: [50, 50], animate: false });
        }
      }
    };

    initMap();
    
    return () => { isMounted.current = false; };
  }, [pickup, destination, waypoints, createIcon]);

  // ── Live Driver Location Update ───────────────────────────────────────────
  useEffect(() => {
    if (!liveDriverLocation || !leafletMapRef.current) return;
    
    const initCar = async () => {
      const L = (await import('leaflet')).default;
      
      if (!carMarkerRef.current) {
        const carIcon = L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204018.png',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          className: 'transition-transform duration-1000' // Smooth movement
        });
        
        carMarkerRef.current = L.marker([liveDriverLocation.lat, liveDriverLocation.lng], { icon: carIcon, zIndexOffset: 1000 })
          .addTo(leafletMapRef.current)
          .bindPopup('<b>Driver is here</b>');
      } else {
        carMarkerRef.current.setLatLng([liveDriverLocation.lat, liveDriverLocation.lng]);
      }
    };
    
    initCar();
  }, [liveDriverLocation]);

  // ── Global Cleanup on Unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        polylineRef.current   = null;
      }
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, []);

  // ── Draw externally-provided route (no extra API call) ───────────────────
  useEffect(() => {
    if (!externalRouteData) return;
    const draw = async () => {
      const { routePath, distanceKm, durationMinutes, provider, isFallback } = externalRouteData;
      setRouteInfo({ distanceKm, durationMinutes, provider, isFallback });
      setLoading(false);
      const L = (await import('leaflet')).default;
      if (!leafletMapRef.current) return;
      if (polylineRef.current) polylineRef.current.remove();
      const latlngs = routePath.map(({ lat, lng }) => [lat, lng]);
      polylineRef.current = L.polyline(latlngs, {
        color:     isFallback ? '#f59e0b' : '#818cf8',
        weight:    4,
        opacity:   0.85,
        dashArray: isFallback ? '6 8' : null,
      }).addTo(leafletMapRef.current);
      if (latlngs.length > 1) leafletMapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40], animate: false });
    };
    draw();
  }, [externalRouteData]);

  // ── Auto-fetch route ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoFetch || externalRouteData) return;
    if (waypoints && waypoints.length >= 2) {
      fetchRoute(null, null, waypoints);
    } else if (pickup?.verified && destination?.verified) {
      fetchRoute(pickup, destination, null);
    } else {
      setRouteInfo(null);
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }
  }, [
    autoFetch, fetchRoute, externalRouteData,
    pickup?.verified,   pickup?.latitude,   pickup?.longitude,
    destination?.verified, destination?.latitude, destination?.longitude,
    waypoints
  ]);

  const hasPickup = pickup?.latitude && pickup?.longitude;
  const hasDest   = destination?.latitude && destination?.longitude;
  const hasWaypoints = waypoints && waypoints.length >= 2;

  if (!hasPickup && !hasDest && !hasWaypoints) return null;

  const fmtDuration = (mins) => {
    if (!mins) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-700/60 ${className}`}>
      {/* Map */}
      <div className="relative">
        <div ref={mapRef} style={{ height }} className="w-full bg-slate-900" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center z-[500] pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-lg text-sm text-slate-300">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Calculating route…
            </div>
          </div>
        )}
      </div>

      {/* Info panel */}
      {showPanel && (
        <div className="bg-slate-900/80 border-t border-slate-700/50 px-4 py-3">
          {error && (
            <p className="text-amber-400 text-xs mb-2">{error}</p>
          )}

          {routeInfo ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-xs">Distance</span>
                  <span className="text-slate-100 font-semibold">
                    {routeInfo.distanceKm?.toFixed(1)} km
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-600" />
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-xs">ETA</span>
                  <span className="text-slate-100 font-semibold">
                    {fmtDuration(routeInfo.durationMinutes)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {routeInfo.isFallback && (
                  <span className="text-amber-400/80 text-xs">⚠ Estimate only</span>
                )}
                <span className="text-slate-500 text-xs">via {routeInfo.provider}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {hasPickup && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-40">{pickup.address?.split(',')[0] || 'Pickup'}</span>
                </div>
              )}
              {hasDest && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="inline-block w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="truncate max-w-40">{destination.address?.split(',')[0] || 'Destination'}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteMap;
