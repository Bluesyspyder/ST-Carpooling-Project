import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const SearchRide = () => {
  const [filters, setFilters] = useState({
    source: '',
    destination: '',
    departureDate: '',
  });
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const params = {};
      if (filters.source) params.source = filters.source;
      if (filters.destination) params.destination = filters.destination;
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
          <form className="grid sm:grid-cols-4 gap-4 items-end" onSubmit={handleSearch}>
            <div>
              <label htmlFor="source" className="block text-xs font-medium text-slate-400 mb-1">
                Source Location
              </label>
              <input
                id="source"
                name="source"
                type="text"
                value={filters.source}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                placeholder="e.g. City Center"
              />
            </div>
            
            <div>
              <label htmlFor="destination" className="block text-xs font-medium text-slate-400 mb-1">
                Destination
              </label>
              <input
                id="destination"
                name="destination"
                type="text"
                value={filters.destination}
                onChange={handleChange}
                className="block w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-900/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm"
                placeholder="e.g. Airport"
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
