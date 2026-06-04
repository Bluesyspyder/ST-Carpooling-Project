import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api.js';
import { getDrivingRoute } from '../../services/routeService.js';

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;

const cleanPincode = (value) => value.replace(/\D/g, '').slice(0, 6);

const routeLineOptions = {
  color: '#4285F4',
  opacity: 1,
  weight: 5,
};

const createMarkerIcon = (label) => L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#ef4444;color:#fff;border:2px solid #fff;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.35)"><span style="transform:rotate(45deg)">${label}</span></div>`,
  iconAnchor: [15, 30],
});

const homeMarkerIcon = createMarkerIcon('H');
const officeMarkerIcon = createMarkerIcon('O');

const getPincodeLocation = async (pincode) => {
  const response = await api.get(`/locations/pincode/${pincode}`);
  const location = response.data.data.location;

  return {
    pincode,
    position: {
      lat: location.latitude,
      lng: location.longitude,
    },
    officeName: location.officeName,
    district: location.district,
    state: location.state,
  };
};

const FitRouteBounds = ({ homeLocation, officeLocation, routePath }) => {
  const map = useMap();

  useEffect(() => {
    if (!homeLocation || !officeLocation) {
      return;
    }

    const positions = routePath.length
      ? routePath
      : [homeLocation.position, officeLocation.position];

    map.fitBounds(positions, { padding: [40, 40] });
  }, [homeLocation, map, officeLocation, routePath]);

  return null;
};

const RouteMap = ({ homeLocation, officeLocation, mapCenter, routePath }) => {
  return (
    <MapContainer
      center={mapCenter}
      zoom={DEFAULT_ZOOM}
      minZoom={2}
      className="h-full min-h-[520px] w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {homeLocation && (
        <Marker position={homeLocation.position} icon={homeMarkerIcon} />
      )}
      {officeLocation && (
        <Marker position={officeLocation.position} icon={officeMarkerIcon} />
      )}
      {routePath.length > 0 && (
        <Polyline positions={routePath} pathOptions={routeLineOptions} />
      )}
      <FitRouteBounds
        homeLocation={homeLocation}
        officeLocation={officeLocation}
        routePath={routePath}
      />
    </MapContainer>
  );
};

const PincodeDirectionsMap = () => {
  const [homePincode, setHomePincode] = useState('');
  const [officePincode, setOfficePincode] = useState('');
  const [homeLocation, setHomeLocation] = useState(null);
  const [officeLocation, setOfficeLocation] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [mapStatus, setMapStatus] = useState('Map ready');
  const [isSearching, setIsSearching] = useState(false);

  const mapCenter = useMemo(() => {
    return homeLocation?.position || officeLocation?.position || INDIA_CENTER;
  }, [homeLocation, officeLocation]);

  const handleRouteSubmit = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(homePincode) || !/^\d{6}$/.test(officePincode)) {
      setMapStatus('Please enter valid 6-digit home and office pincodes.');
      return;
    }

    setIsSearching(true);
    setRoutePath([]);
    setRouteSummary(null);
    setMapStatus('Finding route...');

    try {
      const [home, office] = await Promise.all([
        getPincodeLocation(homePincode),
        getPincodeLocation(officePincode),
      ]);

      setHomeLocation(home);
      setOfficeLocation(office);
      const route = await getDrivingRoute(home.position, office.position);

      setRoutePath(route.routePath);
      setRouteSummary(route);
      setMapStatus(`${route.provider} driving route ready: ${home.pincode} to ${office.pincode}`);
    } catch (error) {
      console.error(error);
      setMapStatus(error.response?.data?.message || error.message || 'No location found for those pincodes.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="grid min-h-[62vh] lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
      <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-800/70 flex flex-col justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Explore route by pincode</h2>
          <p className="text-sm text-slate-400 mt-2">
            Enter home and office pincodes to view the driving route.
          </p>
        </div>

        <form onSubmit={handleRouteSubmit} className="space-y-3">
          <div>
            <label htmlFor="homePincode" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Home pincode
            </label>
            <input
              id="homePincode"
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={homePincode}
              onChange={(event) => setHomePincode(cleanPincode(event.target.value))}
              className="mt-2 w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
              placeholder="515631"
            />
          </div>

          <div>
            <label htmlFor="officePincode" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Office pincode
            </label>
            <input
              id="officePincode"
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={officePincode}
              onChange={(event) => setOfficePincode(cleanPincode(event.target.value))}
              className="mt-2 w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
              placeholder="560001"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full px-4 py-2 bg-emerald-400 hover:bg-emerald-500 disabled:opacity-60 text-slate-950 font-bold rounded-lg transition duration-150 text-sm"
          >
            {isSearching ? 'Finding' : 'Show Route'}
          </button>
        </form>

        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-4 min-h-24">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Map status</p>
          <p className="text-sm text-slate-200 mt-2">{mapStatus}</p>
          {homeLocation && officeLocation && (
            <div className="text-xs text-slate-400 mt-2 space-y-1">
              <p>
                {homeLocation.officeName || homeLocation.district} to {officeLocation.officeName || officeLocation.district}
              </p>
              {routeSummary && (
                <>
                  <p>Distance: {routeSummary.distanceKm.toFixed(1)} km</p>
                  <p>Duration: {Math.ceil(routeSummary.durationMinutes)} min</p>
                  <p>Routing: {routeSummary.provider}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative min-h-[520px] bg-slate-900">
        <RouteMap
          homeLocation={homeLocation}
          officeLocation={officeLocation}
          mapCenter={mapCenter}
          routePath={routePath}
        />
      </div>
    </div>
  );
};

export default PincodeDirectionsMap;
