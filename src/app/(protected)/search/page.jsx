"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import api from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const SearchRide = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const isRider = user?.role === 'hybrid';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    setFiltersOpen(false);
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const inputClass = "form-input block w-full px-4 py-2.5 text-sm";

  const activeFilterCount = [
    filters.pickupArea,
    filters.driverName,
    filters.journeyDate,
    filters.seats > 1 ? filters.seats : null,
  ].filter(Boolean).length;

  // Same bottom-nav shape as the Dashboard page, so the app shell stays consistent.
  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    isRider
      ? {
          href: '/create-ride',
          label: 'Offer',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
        }
      : {
          href: '/search',
          label: 'Find',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
    {
      href: '/bookings',
      label: 'Bookings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      href: '/green-credits',
      label: 'Green',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21C7 17.5 4 14 4 9.5A5.5 5.5 0 0112 5a5.5 5.5 0 018 4.5c0 4.5-3 8-8 11.5z" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-[calc(100dvh-73px)] relative">
      <div className="w-full pb-32">

        {/* ── Sticky compact app bar (matches Dashboard) ── */}
        <div className="sticky top-0 z-30 glass-panel rounded-none border-x-0 border-t-0 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-3 flex items-center justify-between backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[var(--primary-base)] font-bold uppercase tracking-widest text-[10px] mb-0.5">Search Module</p>
            <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight truncate">Find a Ride</h1>
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="relative flex-shrink-0 w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6M11 16h2" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 pt-5 space-y-5">

          {/* ── Filters: collapsible sheet-style card ── */}
          <div className="glass-panel overflow-hidden">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="w-full px-5 py-3.5 flex items-center justify-between border-b border-[var(--border-subtle)]"
            >
              <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-widest text-xs">
                <span className="w-1.5 h-1.5 bg-[var(--primary-base)] rounded-sm" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                    {activeFilterCount} active
                  </span>
                )}
              </h2>
              <svg
                className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtersOpen && (
              <form className="p-4 space-y-4" onSubmit={handleSearch}>
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

                <div className="grid grid-cols-2 gap-3">
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
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Seats</label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex justify-center py-3 px-4 disabled:opacity-50"
                >
                  {loading ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </form>
            )}
          </div>

          {/* ── Results feed ── */}
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-slate-850/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-10 text-red-500 glass-panel border-red-500/50 uppercase tracking-widest font-bold text-xs px-4">
                ⚠ Unable to fetch telemetry. Connection failure.
              </div>
            ) : rides.length > 0 ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] px-1">
                  {rides.length} ride{rides.length !== 1 ? 's' : ''} found
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {rides.map((ride) => (
                  <div
                    key={ride._id}
                    className="glass-panel p-4 border border-[var(--border-subtle)] relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--primary-base)]/5 rounded-full blur-2xl -mr-8 -mt-8" />

                    <div className="relative z-10">
                      {/* Header: Driver + Status */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0 uppercase">
                            {ride.driver?.firstName?.[0]}{ride.driver?.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-100 font-bold text-sm truncate">
                              {ride.driver?.firstName} {ride.driver?.lastName}
                            </p>
                            <p className="text-xs text-emerald-400 font-medium">★ {ride.driver?.averageRating?.toFixed(1) || '5.0'}</p>
                          </div>
                        </div>
                        <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold tracking-widest bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-sm uppercase">
                          {ride.rideStatus}
                        </span>
                      </div>

                      {/* Time & Vehicle */}
                      <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Journey</p>
                          <p className="text-xs text-slate-200 font-bold truncate">{new Date(ride.journeyDate).toLocaleDateString()}</p>
                          <p className="text-[11px] text-slate-400 truncate">{ride.journeyTime} · ±{ride.flexibilityMinutes}m</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Vehicle</p>
                          <p className="text-xs text-slate-200 font-bold truncate" title={ride.driverVehicle?.vehicleName}>{ride.driverVehicle?.vehicleName || 'Car'}</p>
                          <p className="text-[11px] text-emerald-400 font-medium">{ride.availableSeats} seats left</p>
                        </div>
                      </div>

                      {/* Locations */}
                      <div className="space-y-2.5 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex flex-col items-center">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                            <div className="w-px h-4 bg-slate-700/50 my-0.5"></div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase">Pickup</p>
                            <p className="text-slate-200 text-xs font-medium line-clamp-2">{ride.pickupLocation?.address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex flex-col items-center">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase">Destination</p>
                            <p className="text-slate-200 text-xs font-medium line-clamp-2">{ride.destinationLocation?.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between relative z-10">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-1 bg-[var(--bg-base)] px-2.5 py-1 rounded-full">
                        <svg className="w-3.5 h-3.5 text-[var(--primary-base)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {typeof ride.distanceKm === 'number'
                          ? `${ride.distanceKm} KM`
                          : (ride.routeDistance ? `${ride.routeDistance.toFixed(1)} KM` : 'N/A')}
                      </p>
                      <Link
                        href={`/ride-details?id=${ride._id}`}
                        className="btn-primary px-4 py-2 text-xs rounded-full shadow-lg shadow-[var(--primary-base)]/20 hover:shadow-[var(--primary-base)]/40"
                      >
                        DETAILS →
                      </Link>
                    </div>
                  </div>
                ))}
                </div>
              </>
            ) : (
              <div className="text-center py-14 text-[var(--text-secondary)] glass-panel flex flex-col items-center">
                <span className="text-4xl mb-3 opacity-50">📡</span>
                <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">No active telemetry found</p>
                <p className="text-[10px] mt-1 max-w-[16rem] uppercase tracking-wider font-bold">Adjust sensors or check back later.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating bottom tab bar (matches Dashboard) ── */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 rounded-3xl border border-white/10 bg-[var(--bg-surface)]/50 backdrop-blur-2xl shadow-2xl shadow-black/40"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch justify-between px-2 py-2">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-colors ${
                  active ? 'text-emerald-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                  active ? 'bg-emerald-500/15' : ''
                }`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default SearchRide;