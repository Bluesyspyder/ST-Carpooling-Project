import React, { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api.js';
import { getDrivingRoute } from '../../services/routeService.js';

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 13;
const ST_DESTINATION_ADDRESS =
  'STMicroelectronics Private Limited, Plot No. 1, Knowledge Park III, Greater Noida, Uttar Pradesh 201308';
const ST_DESTINATION_LABEL = 'ST Greater Noida office';
const DEFAULT_OFFICE_LOCATION = {
  label: ST_DESTINATION_LABEL,
  address: ST_DESTINATION_ADDRESS,
  latitude: 28.4725,
  longitude: 77.48889,
  position: {
    lat: 28.4725,
    lng: 77.48889,
  },
  provider: 'Fixed destination',
};
const FULL_HOME_ADDRESS_ERROR =
  'Please enter your full home address with house/flat, street or area, city, state, and 6-digit pincode.';
const PINCODE_PATTERN = /\b\d{6}\b/;

const getHomeAddressValidationError = (address) => {
  const normalizedAddress = address.trim().replace(/\s+/g, ' ');
  const addressParts = normalizedAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const wordCount = normalizedAddress
    .split(/\s+/)
    .filter((word) => /[a-zA-Z0-9]/.test(word)).length;

  if (
    normalizedAddress.length < 20 ||
    addressParts.length < 4 ||
    wordCount < 6 ||
    !PINCODE_PATTERN.test(normalizedAddress)
  ) {
    return FULL_HOME_ADDRESS_ERROR;
  }

  return '';
};

const getShortAddressLabel = (address) => {
  const [firstPart] = address
    .trim()
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return firstPart || 'Home';
};

const buildHomeAddress = ({ addressLine, area, city, state, pincode }) =>
  [addressLine, area, city, state, pincode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

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

const getAddressRouteLocations = async (homeAddress) => {
  const response = await api.post('/locations/address-route', { homeAddress });
  const { homeLocation, officeLocation } = response.data.data;

  return {
    homeLocation,
    officeLocation,
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
  const [homeAddress, setHomeAddress] = useState({
    addressLine: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [homeLocation, setHomeLocation] = useState(null);
  const [officeLocation, setOfficeLocation] = useState(DEFAULT_OFFICE_LOCATION);
  const [routePath, setRoutePath] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeLabel, setRouteLabel] = useState('');
  const [mapStatus, setMapStatus] = useState('Map ready');
  const [isSearching, setIsSearching] = useState(false);

  const mapCenter = useMemo(() => {
    return homeLocation?.position || officeLocation?.position || INDIA_CENTER;
  }, [homeLocation, officeLocation]);

  const handleRouteSubmit = async (event) => {
    event.preventDefault();
    const fullHomeAddress = buildHomeAddress(homeAddress);

    const validationError = getHomeAddressValidationError(fullHomeAddress);

    if (validationError) {
      setRoutePath([]);
      setRouteSummary(null);
      setRouteLabel('');
      setMapStatus(validationError);
      return;
    }

    setIsSearching(true);
    setRoutePath([]);
    setRouteSummary(null);
    setRouteLabel('');
    setMapStatus('Finding route...');

    try {
      const { homeLocation: home, officeLocation: office } = await getAddressRouteLocations(fullHomeAddress);

      setHomeLocation(home);
      setOfficeLocation(office);
      const route = await getDrivingRoute(home.position, office.position);

      setRoutePath(route.routePath);
      setRouteSummary(route);
      setRouteLabel(`From ${getShortAddressLabel(fullHomeAddress)} to ${ST_DESTINATION_LABEL}`);
      setMapStatus(
        home.provider === 'Pincode fallback'
          ? `${route.provider} fastest route ready using your pincode area.`
          : `${route.provider} fastest route ready to STMicroelectronics.`
      );
    } catch (error) {
      console.error(error);
      setMapStatus(error.response?.data?.message || error.message || 'No location found for that address.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="grid min-h-[62vh] lg:grid-cols-[360px_1fr] xl:grid-cols-[400px_1fr]">
      <div className="p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-800/70 flex flex-col justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Route from home address</h2>
          <p className="text-sm text-slate-400 mt-2">
            Enter your home address to map the fastest driving route to STMicroelectronics Greater Noida.
          </p>
        </div>

        <form onSubmit={handleRouteSubmit} className="space-y-3">
          <div>
            <label htmlFor="homeAddress" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              House / building
            </label>
            <input
              id="homeAddress"
              type="text"
              value={homeAddress.addressLine}
              onChange={(event) => setHomeAddress((current) => ({ ...current, addressLine: event.target.value }))}
              className="mt-2 w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
              placeholder="Flat/house number, building, landmark"
            />
          </div>

          <div>
            <label htmlFor="homeArea" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Street / area
            </label>
            <input
              id="homeArea"
              type="text"
              value={homeAddress.area}
              onChange={(event) => setHomeAddress((current) => ({ ...current, area: event.target.value }))}
              className="mt-2 w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
              placeholder="Street, sector, colony, or area"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="homeCity" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                City
              </label>
              <input
                id="homeCity"
                type="text"
                value={homeAddress.city}
                onChange={(event) => setHomeAddress((current) => ({ ...current, city: event.target.value }))}
                className="mt-2 w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                placeholder="City"
              />
            </div>

            <div>
              <label htmlFor="homeState" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                State
              </label>
              <input
                id="homeState"
                type="text"
                value={homeAddress.state}
                onChange={(event) => setHomeAddress((current) => ({ ...current, state: event.target.value }))}
                className="mt-2 w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                placeholder="State"
              />
            </div>
          </div>

          <div>
            <label htmlFor="homePincode" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pincode
            </label>
            <input
              id="homePincode"
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={homeAddress.pincode}
              onChange={(event) => {
                const pincode = event.target.value.replace(/\D/g, '').slice(0, 6);
                setHomeAddress((current) => ({ ...current, pincode }));
              }}
              className="mt-2 w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-900/70 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
              placeholder="147004"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination</p>
            <p className="mt-1 text-sm text-slate-200">{ST_DESTINATION_ADDRESS}</p>
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
              {routeLabel && <p>{routeLabel}</p>}
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
