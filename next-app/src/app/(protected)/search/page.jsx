"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

import api from '@/services/api';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { avatarClasses } from '@/lib/genderTheme';
import { useAuth } from '@/hooks/useAuth';
import PillInput from '@/components/mobile/PillInput';

const SearchRide = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    pickupArea: '',
    driverName: '',
    journeyDate: '',
    seats: 1,
    femaleOnly: false,
  });
  const [pickupLocation, setPickupLocation] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch immediately on mount and when filters change
  const fetchRides = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      // Pass coordinates if available, fallback to text
      if (pickupLocation?.latitude && pickupLocation?.longitude) {
        params.pickupLat = pickupLocation.latitude;
        params.pickupLng = pickupLocation.longitude;
      } else if (filters.pickupArea) {
        params.pickupArea = filters.pickupArea;
      }
      if (filters.driverName) params.driverName = filters.driverName;
      if (filters.journeyDate) params.journeyDate = filters.journeyDate;
      if (filters.seats > 1) params.seats = filters.seats;
      if (user?.gender === 'F' && filters.femaleOnly) params.femaleOnly = true;

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
  }, [filters.femaleOnly]); // Run on mount + when the female-only filter toggles

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRides();
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const inputClass = "form-input block w-full px-4 py-2.5 text-sm";

  return (
    <>
    {/* ═══════════ DESKTOP / BROWSER LAYOUT (unchanged) ═══════════ */}
    <div className="hidden lg:block min-h-[calc(100vh-73px)] relative py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[1500px] mx-auto space-y-8">
        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden mb-8 border-none bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary-base)] to-[var(--secondary-base)]"></div>
          <p className="text-[var(--primary-base)] font-bold uppercase tracking-widest text-[10px] mb-1">Search Module</p>
          <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Find a Ride
          </h2>
        </div>

        {/* Search filter form */}
        <div className="glass-panel p-6 relative z-20 shadow-2xl rounded-3xl mb-8">
          <form className="space-y-4" onSubmit={handleSearch}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Pickup Area</label>
                <AddressAutocomplete
                  value={pickupLocation?.address || filters.pickupArea}
                  onChange={(loc) => {
                    setPickupLocation(loc);
                    setFilters({ ...filters, pickupArea: loc?.address || '' });
                  }}
                  placeholder="e.g. City Center, Sector 14"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Driver Name</label>
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
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Date</label>
                <input
                  type="date"
                  name="journeyDate"
                  value={filters.journeyDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1.5 font-medium">Required Seats</label>
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
                className="btn-primary w-full flex justify-center py-2.5 px-4 disabled:opacity-50"
              >
                {loading ? 'SEARCHING...' : 'SEARCH'}
              </button>
            </div>

            {user?.gender === 'F' && (
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-pink-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.femaleOnly}
                  onChange={(e) => setFilters({ ...filters, femaleOnly: e.target.checked })}
                  className="rounded accent-pink-500"
                />
                🚺 Show only Women-Only rides
              </label>
            )}
          </form>
        </div>

        {/* Results grid */}
        <div className="space-y-4 relative z-10">
          {loading ? (
            <div className="text-center py-12 text-[var(--text-secondary)] glass-panel font-bold">
              <div className="w-5 h-5 border-2 border-[var(--primary-base)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Scanning transit grids...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500 glass-panel border-red-500/50 uppercase tracking-widest font-bold">
              ⚠ Unable to fetch rides. Connection failure.
            </div>
          ) : rides.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {rides.map((ride) => (
                <div key={ride._id} className="glass-panel p-6 rounded-3xl border border-[var(--border-subtle)] shadow-xl flex flex-col justify-between hover:-translate-y-2 transition-all duration-300 bg-[var(--bg-surface)]/80 backdrop-blur-xl relative overflow-hidden">
                  {/* Decorative accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--primary-base)]/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  
                  <div className="relative z-10">
                    {/* Header: Driver + Status */}
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 uppercase border ${avatarClasses(ride.driver?.gender)}`}>
                          {ride.driver?.firstName?.[0]}{ride.driver?.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-[var(--text-primary)] font-bold text-sm">
                            {ride.driver?.firstName} {ride.driver?.lastName}
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">★ {ride.driver?.averageRating?.toFixed(1) || '5.0'}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-sm uppercase">
                          {ride.rideStatus}
                        </span>
                        {ride.femaleOnly && (
                          <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-sm uppercase">
                            🚺 Women Only
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time & Vehicle */}
                    <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-0.5">Journey Time</p>
                        <p className="text-sm text-[var(--text-primary)] font-bold">{new Date(ride.journeyDate).toLocaleDateString()} at {ride.journeyTime}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Wait: {ride.flexibilityMinutes} mins</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-0.5">Vehicle</p>
                        <p className="text-sm text-[var(--text-primary)] font-bold truncate" title={ride.driverVehicle?.vehicleName}>{ride.driverVehicle?.vehicleName || 'Car'}</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{ride.availableSeats} seats left</p>
                      </div>
                    </div>

                    {/* Locations */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                          <div className="w-px h-5 bg-slate-300 dark:bg-[var(--bg-surface-hover)]/50 my-0.5"></div>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Pickup</p>
                          <p className="text-[var(--text-primary)] text-xs font-medium line-clamp-2">{ride.pickupLocation?.address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Destination</p>
                          <p className="text-[var(--text-primary)] text-xs font-medium line-clamp-2">{ride.destinationLocation?.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between mt-4 relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1.5 bg-[var(--bg-base)] px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 text-[var(--primary-base)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {ride.routeDistance ? `${ride.routeDistance.toFixed(1)} KM` : 'ROUTE N/A'}
                    </p>
                    <Link
                      href={`/ride-details?id=${ride._id}`}
                      className="btn-primary px-5 py-2 text-xs rounded-full shadow-lg shadow-[var(--primary-base)]/20 hover:shadow-[var(--primary-base)]/40"
                    >
                      DETAILS →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-[var(--text-secondary)] glass-panel flex flex-col items-center shadow-md shadow-[var(--border-glow)]">
              <span className="text-4xl mb-3 opacity-50">🚗</span>
              <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">No active rides found</p>
              <p className="text-[10px] mt-1 max-w-md uppercase tracking-wider font-bold">Adjust search criteria or check back later.</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ═══════════ MOBILE LAYOUT ═══════════ */}
    <div className="lg:hidden min-h-[calc(100vh-73px)] relative">
      <div className="sticky top-0 z-20 safe-top bg-[var(--bg-base)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] px-4 py-3 space-y-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Find a Ride</h1>
        <form onSubmit={handleSearch} className="space-y-3">
          <PillInput
            icon={<span>📍</span>}
            placeholder="Pickup area"
            value={pickupLocation?.address || filters.pickupArea}
            onChange={(e) => setFilters({ ...filters, pickupArea: e.target.value })}
          />
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <input
              type="date"
              name="journeyDate"
              value={filters.journeyDate}
              onChange={handleChange}
              className="flex-shrink-0 min-h-[44px] px-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            />
            <input
              type="number"
              name="seats"
              min="1"
              max="8"
              value={filters.seats}
              onChange={handleChange}
              aria-label="Required seats"
              className="flex-shrink-0 w-20 min-h-[44px] px-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
            />
            {user?.gender === 'F' && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, femaleOnly: !filters.femaleOnly })}
                className={`flex-shrink-0 min-h-[44px] px-4 rounded-full border text-xs font-semibold whitespace-nowrap ${filters.femaleOnly ? 'bg-pink-500/15 text-pink-400 border-pink-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}`}
              >
                🚺 Women Only
              </button>
            )}
            <button type="submit" disabled={loading} className="flex-shrink-0 btn-primary min-h-[44px] px-6 text-xs disabled:opacity-50">
              {loading ? '...' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-secondary)] glass-panel font-bold text-sm">
            <div className="w-5 h-5 border-2 border-[var(--primary-base)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Scanning transit grids...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 glass-panel text-sm">⚠ Unable to fetch rides.</div>
        ) : rides.length > 0 ? (
          rides.map((ride) => (
            <Link
              key={ride._id}
              href={`/ride-details?id=${ride._id}`}
              className="flex items-center gap-3 min-h-[44px] p-4 glass-panel"
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 uppercase border ${avatarClasses(ride.driver?.gender)}`}>
                {ride.driver?.firstName?.[0]}{ride.driver?.lastName?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {ride.pickupLocation?.address?.split(',')[0]} → {ride.destinationLocation?.address?.split(',')[0]}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {ride.driver?.firstName} {ride.driver?.lastName} · {new Date(ride.journeyDate).toLocaleDateString()} {ride.journeyTime}
                </p>
                {ride.femaleOnly && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full uppercase">Women Only</span>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-emerald-500">{ride.availableSeats} seats</p>
                <p className="text-[10px] text-[var(--text-muted)]">{ride.routeDistance ? `${ride.routeDistance.toFixed(1)} km` : ''}</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-16 text-[var(--text-secondary)] glass-panel flex flex-col items-center">
            <span className="text-4xl mb-3 opacity-50">🚗</span>
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">No active rides found</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default SearchRide;
