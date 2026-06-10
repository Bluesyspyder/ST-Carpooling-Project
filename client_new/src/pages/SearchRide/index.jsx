import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import AddressAutocomplete from '../../components/AddressAutocomplete.jsx';
import MapPreview from '../../components/MapPreview.jsx';
import QuickLocationChips from '../../components/QuickLocationChips.jsx';
import useCurrentLocation from '../../hooks/useCurrentLocation.js';
import {
  fetchSavedAddresses,
  fetchRecentAddresses,
  fetchFrequentAddresses,
} from '../../services/locationService.js';

const SearchRide = () => {
  const [filters, setFilters] = useState({
    source: '',
    sourceLat: null,
    sourceLng: null,
    sourceVerified: false,
    destination: '',
    destLat: null,
    destLng: null,
    destVerified: false,
    departureDate: '',
  });
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [recentAddresses, setRecentAddresses] = useState([]);
  const [frequentAddresses, setFrequentAddresses] = useState([]);

  // Track which field's map is expanded
  const [showSourceMap, setShowSourceMap] = useState(false);
  const [showDestMap, setShowDestMap] = useState(false);

  const { getCurrentLocation } = useCurrentLocation();

  useEffect(() => {
    const loadLists = async () => {
      try {
        const [saved, recent, frequent] = await Promise.all([
          fetchSavedAddresses(),
          fetchRecentAddresses(),
          fetchFrequentAddresses(),
        ]);
        setSavedAddresses(saved || []);
        setRecentAddresses(recent || []);
        setFrequentAddresses(frequent || []);
      } catch { /* not logged in or network error – silent */ }
    };
    loadLists();
  }, []);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSourceSelect = (loc) => {
    setFilters((f) => ({
      ...f,
      source: loc?.address || '',
      sourceLat: loc?.latitude || null,
      sourceLng: loc?.longitude || null,
      sourceVerified: false,
    }));
    if (loc?.latitude) setShowSourceMap(true);
  };

  const handleDestSelect = (loc) => {
    setFilters((f) => ({
      ...f,
      destination: loc?.address || '',
      destLat: loc?.latitude || null,
      destLng: loc?.longitude || null,
      destVerified: false,
    }));
    if (loc?.latitude) setShowDestMap(true);
  };

  const handleSourceMapChange = (loc) => {
    setFilters((f) => ({
      ...f,
      sourceLat: loc.latitude,
      sourceLng: loc.longitude,
      source: loc.address || f.source,
      sourceVerified: false,
    }));
  };

  const handleDestMapChange = (loc) => {
    setFilters((f) => ({
      ...f,
      destLat: loc.latitude,
      destLng: loc.longitude,
      destination: loc.address || f.destination,
      destVerified: false,
    }));
  };

  const handleSourceConfirm   = () => setFilters((f) => ({ ...f, sourceVerified: true }));
  const handleSourceUnconfirm = () => setFilters((f) => ({ ...f, sourceVerified: false }));
  const handleDestConfirm     = () => setFilters((f) => ({ ...f, destVerified: true }));
  const handleDestUnconfirm   = () => setFilters((f) => ({ ...f, destVerified: false }));

  const handleCurrentForSource = async () => {
    const loc = await getCurrentLocation();
    if (loc) {
      setFilters((f) => ({
        ...f,
        source: loc.address,
        sourceLat: loc.latitude,
        sourceLng: loc.longitude,
        sourceVerified: false,
      }));
      setShowSourceMap(true);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const params = {};
      if (filters.source) {
        params.source = filters.source;
        if (filters.sourceLat) {
          params.sourceLat = filters.sourceLat;
          params.sourceLng = filters.sourceLng;
        }
      }
      if (filters.destination) {
        params.destination = filters.destination;
        if (filters.destLat) {
          params.destLat = filters.destLat;
          params.destLng = filters.destLng;
        }
      }
      if (filters.departureDate) params.departureDate = filters.departureDate;
      
      const response = await api.get('/rides', { params });
      setRides(response.data.data.rides);
    } catch (err) {
      setError('Failed to fetch rides. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[1500px] mx-auto space-y-8">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8">
          Search Rides
        </h2>

        {/* Search filter form */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl">
          {/* Quick chips */}
          <div className="mb-4">
            <QuickLocationChips
              savedAddresses={savedAddresses}
              recentAddresses={recentAddresses}
              frequentAddresses={frequentAddresses}
              onSelect={handleSourceSelect}
              showCurrentLocation
              onCurrentLocation={handleCurrentForSource}
            />
          </div>

          <form className="space-y-4" onSubmit={handleSearch}>
            <div className="grid sm:grid-cols-4 gap-4 items-end">
              <div>
                <AddressAutocomplete
                  value={filters.source}
                  onChange={handleSourceSelect}
                  placeholder="e.g. City Center"
                  label="Source Location"
                  showCurrentLocation
                />
              </div>
              
              <div>
                <AddressAutocomplete
                  value={filters.destination}
                  onChange={handleDestSelect}
                  placeholder="e.g. Airport"
                  label="Destination"
                />
              </div>

              <div>
                <label htmlFor="departureDate" className="block text-xs font-medium text-slate-400 mb-1">
                  Departure Date
                </label>
                <input
                  id="departureDate"
                  name="departureDate"
                  type="date"
                  value={filters.departureDate}
                  onChange={handleChange}
                  className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition duration-150"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Map previews for pin verification */}
            {(showSourceMap && filters.sourceLat) && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Verify source location on map (optional):</p>
                <MapPreview
                  location={{ address: filters.source, latitude: filters.sourceLat, longitude: filters.sourceLng }}
                  onLocationChange={handleSourceMapChange}
                  height="180px"
                  interactive
                  onConfirm={handleSourceConfirm}
                  onUnconfirm={handleSourceUnconfirm}
                  confirmed={filters.sourceVerified}
                  markerColor="#10b981"
                  markerLabel="A"
                />
              </div>
            )}

            {(showDestMap && filters.destLat) && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Verify destination on map (optional):</p>
                <MapPreview
                  location={{ address: filters.destination, latitude: filters.destLat, longitude: filters.destLng }}
                  onLocationChange={handleDestMapChange}
                  height="180px"
                  interactive
                  onConfirm={handleDestConfirm}
                  onUnconfirm={handleDestUnconfirm}
                  confirmed={filters.destVerified}
                  markerColor="#6366f1"
                  markerLabel="B"
                />
              </div>
            )}
          </form>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Results grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading matching rides...</div>
          ) : rides.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {rides.map((ride) => (
                <div key={ride._id} className="glass-card p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-emerald-400 font-extrabold text-lg">${ride.pricePerSeat} / seat</p>
                        <p className="text-xs text-slate-400 mt-0.5">{ride.availableSeats} seats left</p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-full capitalize">
                        {ride.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
                        <p className="text-slate-200 text-sm truncate"><span className="text-slate-400 font-medium">From:</span> {ride.source}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full"></span>
                        <p className="text-slate-200 text-sm truncate"><span className="text-slate-400 font-medium">To:</span> {ride.destination}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      {new Date(ride.departureTime).toLocaleString()}
                    </div>
                    <Link
                      to={`/rides/${ride._id}`}
                      className="px-4 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 rounded-lg text-xs font-bold transition duration-150"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : searched ? (
            <div className="text-center py-12 text-slate-400 glass-panel rounded-2xl">
              No matching rides found. Try adjusting filters or expanding search.
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 glass-panel rounded-2xl">
              Enter your source and destination to view available rides.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchRide;
