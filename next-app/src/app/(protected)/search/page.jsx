"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

import api from '@/services/api';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const SearchRide = () => {
  const [filters, setFilters] = useState({
    pickupArea: '',
    driverName: '',
    journeyDate: '',
    seats: 1,
    radiusKm: 10,
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
        params.radiusKm = filters.radiusKm;
      } else if (filters.pickupArea) {
        params.pickupArea = filters.pickupArea;
      }
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

  const inputClass = "form-input block w-full px-4 py-2.5 text-sm";

  return (
    <div className="min-h-[calc(100dvh-73px)] relative py-8 px-4 sm:px-6 lg:px-8">
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
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Pickup Area</label>
                <AddressAutocomplete
                  value={pickupLocation?.address || filters.pickupArea}
                  onChange={(loc) => {
                    setPickupLocation(loc);
                    setFilters({ ...filters, pickupArea: loc?.address || '' });
                  }}
                  placeholder="e.g. City Center, Sector 14"
                />
              </div>

              {pickupLocation?.latitude && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">Search Radius</label>
                  <select
                    name="radiusKm"
                    value={filters.radiusKm}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {[5, 10, 20, 35, 50].map((km) => (
                      <option key={km} value={km}>{km} km</option>
                    ))}
                  </select>
                </div>
              )}

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
                className="btn-primary w-full flex justify-center py-2.5 px-4 disabled:opacity-50"
              >
                {loading ? 'SEARCHING...' : 'SEARCH'}
              </button>
            </div>
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
              ⚠ Unable to fetch telemetry. Connection failure.
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
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-sm uppercase">
                          {ride.rideStatus}
                        </span>
                      </div>
                    </div>

                    {/* Time & Vehicle */}
                    <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
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
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between mt-4 relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1.5 bg-[var(--bg-base)] px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 text-[var(--primary-base)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {typeof ride.distanceKm === 'number'
                        ? `${ride.distanceKm} KM FROM PICKUP`
                        : (ride.routeDistance ? `${ride.routeDistance.toFixed(1)} KM` : 'ROUTE N/A')}
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
              <span className="text-4xl mb-3 opacity-50">📡</span>
              <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">No active telemetry found</p>
              <p className="text-[10px] mt-1 max-w-md uppercase tracking-wider font-bold">Adjust sensors or check back later.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchRide;
