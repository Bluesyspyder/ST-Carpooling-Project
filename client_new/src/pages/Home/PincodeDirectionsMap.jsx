import { useState, useRef, useEffect } from 'react';
import api from '../../services/api.js';
import AddressAutocomplete from '../../components/AddressAutocomplete.jsx';
import { fetchReverseGeocode } from '../../services/locationService.js';
import useCurrentLocation from '../../hooks/useCurrentLocation.js';

const ST_OFFICE = {
  label: 'STMicroelectronics Greater Noida',
  address: 'STMicroelectronics Private Limited, Plot No. 1, Knowledge Park III, Greater Noida, Uttar Pradesh 201308',
  latitude:  28.4725,
  longitude: 77.48889,
};

const fmtDuration = (mins) => {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
};

/**
 * Home-page route demo widget.
 * Uses the Mapbox autocomplete → backend /routes/calculate → Leaflet map.
 * Replaces the old multi-field pincode form entirely.
 */
const PincodeDirectionsMap = () => {
  const mapRef        = useRef(null);
  const leafletRef    = useRef(null);
  const homeMarker    = useRef(null);
  const officeMarker  = useRef(null);
  const polylineRef   = useRef(null);
  const isMounted     = useRef(true);

  const [homeLoc, setHomeLoc]       = useState(null);
  const [routeInfo, setRouteInfo]   = useState(null);
  const [status, setStatus]         = useState('Enter your home address to see the route to ST office.');
  const [loading, setLoading]       = useState(false);

  const { getCurrentLocation, loading: gpsLoading } = useCurrentLocation();

  // ── Initialise map once ──────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    let map;

    const init = async () => {
      if (!mapRef.current) return;
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (leafletRef.current) return; // already initialised

      map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
             .setView([28.4725, 77.4889], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      }).addTo(map);

      // Fixed office marker
      const officeIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;
                border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#6366f1;
                color:#fff;border:2px solid #fff;font-weight:700;font-size:13px;
                box-shadow:0 3px 8px rgba(0,0,0,.4)">
                <span style="transform:rotate(45deg)">ST</span></div>`,
        iconAnchor: [17, 34],
      });
      officeMarker.current = L.marker([ST_OFFICE.latitude, ST_OFFICE.longitude], { icon: officeIcon })
        .addTo(map)
        .bindPopup(`<b>${ST_OFFICE.label}</b>`, { maxWidth: 200 });

      leafletRef.current = map;
    };

    init();

    return () => {
      isMounted.current = false;
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []);

  // ── Update home marker + draw route ──────────────────────────────────────
  const drawRoute = async (loc) => {
    if (!loc?.latitude || !loc?.longitude) return;
    if (!leafletRef.current) return;

    setLoading(true);
    setRouteInfo(null);
    setStatus('Calculating route…');

    try {
      const L = (await import('leaflet')).default;

      // Place / move home marker
      const homeIcon = L.divIcon({
        className: '',
        html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;
                border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#10b981;
                color:#fff;border:2px solid #fff;font-weight:700;font-size:13px;
                box-shadow:0 3px 8px rgba(0,0,0,.4)">
                <span style="transform:rotate(45deg)">H</span></div>`,
        iconAnchor: [17, 34],
      });

      if (homeMarker.current) {
        homeMarker.current.setLatLng([loc.latitude, loc.longitude]);
      } else {
        homeMarker.current = L.marker([loc.latitude, loc.longitude], { icon: homeIcon })
          .addTo(leafletRef.current)
          .bindPopup(`<b>Home</b><br>${loc.address}`, { maxWidth: 220 });
      }

      // Fetch route from backend
      const res = await api.post('/routes/calculate', {
        origin:      { latitude: loc.latitude,       longitude: loc.longitude },
        destination: { latitude: ST_OFFICE.latitude,  longitude: ST_OFFICE.longitude },
      });

      if (!isMounted.current) return;

      const { routePath, distanceKm, durationMinutes, provider, isFallback } = res.data.data;

      // Draw polyline
      if (polylineRef.current) polylineRef.current.remove();
      const latlngs = routePath.map(({ lat, lng }) => [lat, lng]);
      polylineRef.current = L.polyline(latlngs, {
        color:     isFallback ? '#f59e0b' : '#818cf8',
        weight:    5,
        opacity:   0.9,
        dashArray: isFallback ? '8 10' : null,
      }).addTo(leafletRef.current);

      leafletRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });

      setRouteInfo({ distanceKm, durationMinutes, provider, isFallback });
      setStatus(
        isFallback
          ? `Straight-line estimate (no routing key configured). ~${distanceKm.toFixed(1)} km.`
          : `${provider} route ready — ${distanceKm.toFixed(1)} km to ST office.`
      );
    } catch (err) {
      if (!isMounted.current) return;
      setStatus(err.response?.data?.message || 'Could not calculate route. Please try a different address.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleAddressSelect = (loc) => {
    setHomeLoc(loc);
    drawRoute(loc);
  };

  const handleCurrentLocation = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setHomeLoc(loc);
      drawRoute(loc);
    }
  };

  return (
    <div className="grid min-h-[62vh] lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
      {/* ── Left panel ── */}
      <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-800/70 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Route to ST Office</h2>
          <p className="text-sm text-slate-400 mt-2">
            Search your home address to map the fastest driving route to STMicroelectronics Greater Noida.
          </p>
        </div>

        {/* Address autocomplete (replaces multi-field form) */}
        <div className="space-y-3">
          <AddressAutocomplete
            value={homeLoc?.address || ''}
            onChange={handleAddressSelect}
            placeholder="Search your home address…"
            label="Home Address"
            showCurrentLocation={false}
          />
          <button
            onClick={handleCurrentLocation}
            disabled={gpsLoading || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600/50 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 text-sm transition-all disabled:opacity-50"
          >
            {gpsLoading ? (
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>📍</span>
            )}
            Use Current Location
          </button>
        </div>

        {/* Fixed destination */}
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
          <p className="text-xs font-semibold text-indigo-400 mb-1">📍 Destination</p>
          <p className="text-xs text-slate-300 leading-relaxed">{ST_OFFICE.address}</p>
        </div>

        {/* Route info panel */}
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4 flex-1 min-h-28">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Status</p>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Calculating…
            </div>
          ) : (
            <p className="text-sm text-slate-300">{status}</p>
          )}

          {routeInfo && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Distance</p>
                <p className="text-lg font-bold text-slate-100 mt-0.5">{routeInfo.distanceKm.toFixed(1)} km</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">ETA</p>
                <p className="text-lg font-bold text-slate-100 mt-0.5">{fmtDuration(routeInfo.durationMinutes)}</p>
              </div>
              <div className="col-span-2 text-center">
                <p className="text-xs text-slate-500">
                  via {routeInfo.provider}
                  {routeInfo.isFallback && ' · estimate only'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Map ── */}
      <div className="relative min-h-[420px] bg-slate-900">
        <div ref={mapRef} className="absolute inset-0" />
        {!homeLoc && (
          <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none z-[400]">
            <div className="bg-slate-950/80 border border-slate-700/60 px-4 py-2 rounded-lg text-xs text-slate-400 backdrop-blur-sm">
              Search your home address to see the route
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PincodeDirectionsMap;
