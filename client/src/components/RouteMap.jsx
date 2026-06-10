import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api.js';

/**
 * RouteMap — Leaflet map that draws a route polyline between two verified locations.
 *
 * Props:
 *  pickup       – { address, latitude, longitude, verified }
 *  destination  – { address, latitude, longitude, verified }
 *  height       – CSS string (default '320px')
 *  autoFetch    – bool: auto-calculate route when both locations are verified (default true)
 *  showPanel    – bool: show distance/ETA info panel below map (default true)
 *  className    – extra CSS classes on wrapper
 */
const RouteMap = ({
  pickup,
  destination,
  height = '320px',
  autoFetch = true,
  showPanel = true,
  className = '',
}) => {
  const mapRef        = useRef(null);
  const leafletMapRef = useRef(null);
  const pickupMarker  = useRef(null);
  const destMarker    = useRef(null);
  const polylineRef   = useRef(null);
  const isMounted     = useRef(true);

  const [routeInfo, setRouteInfo]   = useState(null); // { distanceKm, durationMinutes, provider }
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // ── Map icons (created once per map instance) ────────────────────────────
  const createIcons = useCallback((L) => {
    const pin = (color, letter) =>
      L.divIcon({
        className: '',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;
                border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};
                color:#fff;border:2px solid #fff;font-weight:700;font-size:13px;
                box-shadow:0 3px 8px rgba(0,0,0,.4)">
                 <span style="transform:rotate(45deg)">${letter}</span></div>`,
        iconAnchor: [16, 32],
      });
    return {
      pickupIcon: pin('#10b981', 'A'),
      destIcon:   pin('#6366f1', 'B'),
    };
  }, []);

  // ── Fetch route from backend ──────────────────────────────────────────────
  const fetchRoute = useCallback(async (pLoc, dLoc) => {
    if (
      !pLoc?.latitude || !pLoc?.longitude ||
      !dLoc?.latitude || !dLoc?.longitude
    ) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/routes/calculate', {
        origin:      { latitude: pLoc.latitude,  longitude: pLoc.longitude },
        destination: { latitude: dLoc.latitude,  longitude: dLoc.longitude },
      });
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

      leafletMapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
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
        pickupMarker.current  = null;
        destMarker.current    = null;
        polylineRef.current   = null;
      }

      // Default center: Noida/Delhi region
      const defaultCenter = [28.5355, 77.3910];
      const center =
        pickup?.latitude && pickup?.longitude
          ? [pickup.latitude, pickup.longitude]
          : destination?.latitude && destination?.longitude
          ? [destination.latitude, destination.longitude]
          : defaultCenter;

      leafletMapRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(center, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(leafletMapRef.current);

      const { pickupIcon, destIcon } = createIcons(L);

      if (pickup?.latitude && pickup?.longitude) {
        pickupMarker.current = L.marker([pickup.latitude, pickup.longitude], { icon: pickupIcon })
          .addTo(leafletMapRef.current)
          .bindPopup(`<b>Pickup</b><br>${pickup.address || ''}`, { maxWidth: 220 });
      }

      if (destination?.latitude && destination?.longitude) {
        destMarker.current = L.marker([destination.latitude, destination.longitude], { icon: destIcon })
          .addTo(leafletMapRef.current)
          .bindPopup(`<b>Destination</b><br>${destination.address || ''}`, { maxWidth: 220 });
      }

      // Fit bounds to markers if both present
      if (pickup?.latitude && destination?.latitude) {
        const bounds = L.latLngBounds(
          [pickup.latitude, pickup.longitude],
          [destination.latitude, destination.longitude]
        );
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    initMap();

    return () => {
      isMounted.current = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        pickupMarker.current  = null;
        destMarker.current    = null;
        polylineRef.current   = null;
      }
    };
    // Only re-init map when coordinates actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickup?.latitude, pickup?.longitude,
    destination?.latitude, destination?.longitude,
  ]);

  // ── Auto-fetch route when both locations are verified ─────────────────────
  useEffect(() => {
    if (!autoFetch) return;
    if (pickup?.verified && destination?.verified) {
      fetchRoute(pickup, destination);
    } else {
      // Clear stale route when a location becomes unverified
      setRouteInfo(null);
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }
  }, [
    autoFetch, fetchRoute,
    pickup?.verified,   pickup?.latitude,   pickup?.longitude,
    destination?.verified, destination?.latitude, destination?.longitude,
  ]);

  const hasPickup = pickup?.latitude && pickup?.longitude;
  const hasDest   = destination?.latitude && destination?.longitude;

  if (!hasPickup && !hasDest) return null;

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
              {/* Legend */}
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
              {!routeInfo && !loading && hasPickup && hasDest && (
                <span className="text-slate-500 text-xs ml-auto">
                  Confirm both locations to see route
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteMap;
