import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const SearchRide = () => {
  const [filters, setFilters] = useState({
    pickupArea: '',
    driverName: '',
    journeyDate: '',
    seats: 1,
  });
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch immediately on mount and when filters change
  const fetchRides = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.pickupArea) params.pickupArea = filters.pickupArea;
      if (filters.driverName) params.driverName = filters.driverName;
      if (filters.journeyDate) params.journeyDate = filters.journeyDate;
      if (filters.seats > 1) params.seats = filters.seats;

      const response = await api.get('/rides', { params });
      setRides(response.data.data.rides || []);
    } catch (err) {
      setError('Failed to fetch rides. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run on mount

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRides();
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const inputClass = "w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all";

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-[1500px] mx-auto space-y-8">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8">
          Search Rides
        </h2>

        {/* Search filter form */}
        <div className="glass-panel p-6 rounded-2xl shadow-xl relative z-20">
          <form className="space-y-4" onSubmit={handleSearch}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Pickup Area</label>
                <input
                  type="text"
                  name="pickupArea"
                  value={filters.pickupArea}
                  onChange={handleChange}
                  placeholder="e.g. City Center, Sector 14"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Driver Name</label>
                <input
                  type="text"
                  name="driverName"
                  value={filters.driverName}
                  onChange={handleChange}
                  placeholder="e.g. John"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Date</label>
                <input
                  type="date"
                  name="journeyDate"
                  value={filters.journeyDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Required Seats</label>
                <input
                  type="number"
                  name="seats"
                  min="1"
                  max="8"
                  value={filters.seats}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {/* Results grid */}
        <div className="space-y-4 relative z-10">
          {loading ? (
            <div className="text-center py-12 text-slate-400 glass-panel rounded-2xl">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading available rides...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400 bg-red-950/20 border border-red-500/20 rounded-2xl shadow-lg">
              ⚠️ Unable to fetch rides. Please check your connection.
            </div>
          ) : rides.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {rides.map((ride) => (
                <div key={ride._id} className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
                  <div>
                    {/* Header: Driver + Status */}
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-sm font-bold text-emerald-400 flex-shrink-0 uppercase">
                          {ride.driver?.firstName?.[0]}{ride.driver?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-slate-100 font-bold text-sm">
                            {ride.driver?.firstName} {ride.driver?.lastName}
                          </p>
                          <p className="text-xs text-emerald-400 font-medium">★ {ride.driver?.averageRating?.toFixed(1) || '5.0'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 rounded-full">
                          {ride.rideStatus}
                        </span>
                      </div>
                    </div>

                    {/* Time & Vehicle */}
                    <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-xl bg-slate-900/30 border border-slate-800/50">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Journey Time</p>
                        <p className="text-sm text-slate-200 font-bold">{new Date(ride.journeyDate).toLocaleDateString()} at {ride.journeyTime}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Wait: {ride.flexibilityMinutes} mins</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Vehicle</p>
                        <p className="text-sm text-slate-200 font-bold truncate" title={ride.driverVehicle?.vehicleName}>{ride.driverVehicle?.vehicleName || 'Car'}</p>
                        <p className="text-xs text-emerald-400 font-medium mt-0.5">{ride.availableSeats} seats left</p>
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
                          <div className="w-px h-5 bg-slate-700/50 my-0.5"></div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">Pickup</p>
                          <p className="text-slate-200 text-xs font-medium line-clamp-2">{ride.pickupLocation?.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full"></span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">Destination</p>
                          <p className="text-slate-200 text-xs font-medium line-clamp-2">{ride.destinationLocation?.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {ride.routeDistance ? `${ride.routeDistance.toFixed(1)} km` : 'Route info N/A'}
                    </p>
                    <Link
                      to={`/rides/${ride._id}`}
                      className="px-5 py-2 bg-slate-900 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 hover:text-emerald-400 text-slate-100 rounded-xl text-xs font-bold transition-all duration-200"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 glass-panel rounded-2xl flex flex-col items-center">
              <span className="text-4xl mb-3">🚗</span>
              <p className="text-lg font-semibold text-slate-300">No active rides found</p>
              <p className="text-sm mt-1 max-w-md">Try adjusting your filters or check back later. More rides are added regularly!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchRide;
