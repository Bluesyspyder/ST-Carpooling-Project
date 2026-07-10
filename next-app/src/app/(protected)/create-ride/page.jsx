"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import React from 'react';

import api from '@/services/api';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import RouteMap from '@/components/RouteMap';
import SeatMap from '@/components/SeatMap';
import { generateSeatLayout } from '@/shared/utils/seatLayout';
import useCurrentLocation from '@/hooks/useCurrentLocation';
import { fetchSavedAddresses } from '@/services/locationService';
import { useProfileGuard } from '@/hooks/useProfileGuard';
import { useAuth } from '@/hooks/useAuth';
import PillInput from '@/components/mobile/PillInput';
import StickyActionBar from '@/components/mobile/StickyActionBar';

const emptyLoc = () => ({ address: '', latitude: null, longitude: null, verified: false });

const ST_OFFICE = {
  address: 'STMicroelectronics Private Limited, Plot No. 1, Knowledge Park III, Greater Noida',
  latitude: 28.481200,
  longitude: 77.481500,
  verified: true
};

const CreateRide = () => {
  const [formData, setFormData] = useState({
    driverVehicle: '',
    journeyDate: '',
    journeyTime: '',
    flexibilityMinutes: 0,
    availableSeats: 3,
    notes: '',
    femaleOnly: false,
  });

  const [vehicles, setVehicles] = useState([]);
  const [pickupLoc, setPickupLoc] = useState(emptyLoc());
  const [viaStops, setViaStops] = useState([]);
  const [destLoc, setDestLoc] = useState(ST_OFFICE);
  
  // Array of specific seats selected by driver to block/reserve
  const [selectedSeats, setSelectedSeats] = useState([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbSavedAddresses, setDbSavedAddresses] = useState([]);

  const router = useRouter();
  const { getCurrentLocation } = useCurrentLocation();
  const { canCreateRide } = useProfileGuard();
  const { user } = useAuth();

  const savedAddresses = useMemo(() => {
    const list = [...dbSavedAddresses];
    if (user?.homeLocation?.address) {
      list.unshift({
        _id: 'profile-home',
        label: 'Home Location',
        icon: '🏠',
        address: user.homeLocation.address,
        latitude: user.homeLocation.latitude,
        longitude: user.homeLocation.longitude,
      });
    }
    return list;
  }, [dbSavedAddresses, user?.homeLocation]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.get('/vehicles');
        const v = res.data.data.vehicles;
        setVehicles(v);
        if (v.length > 0) setFormData((p) => ({ ...p, driverVehicle: v[0]._id }));
      } catch (err) {
        console.error('[CreateRide] Failed to fetch vehicles:', err);
      }

      try {
        const saved = await fetchSavedAddresses();
        setDbSavedAddresses(saved || []);
        const homeLoc = saved?.find(s => s.label?.toLowerCase() === 'home');
        if (homeLoc) {
          setPickupLoc({
            address: homeLoc.address,
            latitude: homeLoc.latitude,
            longitude: homeLoc.longitude,
            verified: true
          });
        }
      } catch (err) {
        console.warn('[CreateRide] Failed to load address lists:', err);
      }
    };
    init();
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleGPS = async () => {
    try {
      const pos = await getCurrentLocation();
      setPickupLoc({ address: 'Current Location', latitude: pos.lat, longitude: pos.lng, verified: true });
    } catch (err) {
      console.error('[CreateRide] GPS error:', err);
      setError('Could not get current location. Please allow location access and try again.');
    }
  };

  const addViaStop = () => {
    if (viaStops.length >= 3) {
      setError('Maximum 3 via stops allowed.');
      return;
    }
    setViaStops([...viaStops, emptyLoc()]);
  };

  const removeViaStop = (index) => {
    const newStops = [...viaStops];
    newStops.splice(index, 1);
    setViaStops(newStops);
  };

  const updateViaStop = (index, loc) => {
    const newStops = [...viaStops];
    newStops[index] = { ...newStops[index], ...loc, verified: true };
    setViaStops(newStops);
  };

  const waypoints = useMemo(() => {
    const pts = [];
    if (pickupLoc.latitude) pts.push(pickupLoc);
    viaStops.forEach(stop => {
      if (stop.latitude) pts.push(stop);
    });
    if (destLoc.latitude) pts.push(destLoc);
    return pts;
  }, [pickupLoc, viaStops, destLoc]);

  const handleSubmit = async () => {
    if (!canCreateRide()) return;
    setError('');
    setIsSubmitting(true);
    try {
      const payload = {
        driverVehicle: formData.driverVehicle,
        journeyDate: new Date(formData.journeyDate).toISOString(),
        journeyTime: formData.journeyTime,
        flexibilityMinutes: Number(formData.flexibilityMinutes),
        availableSeats: Number(formData.availableSeats),
        notes: formData.notes || undefined,
        pickupLocation: {
          address: pickupLoc.address,
          latitude: Number(pickupLoc.latitude),
          longitude: Number(pickupLoc.longitude),
          verified: true,
        },
        destinationLocation: {
          address: destLoc.address,
          latitude: Number(destLoc.latitude),
          longitude: Number(destLoc.longitude),
          verified: true,
        },
        viaStops: viaStops.filter(s => s.latitude).map(s => ({
          address: s.address,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          verified: true,
        })),
        femaleOnly: user?.gender === 'F' ? !!formData.femaleOnly : undefined,
        // Add specific blocked seats logic later on backend if needed
      };

      const res = await api.post('/rides', payload);
      setSuccess(true);
      setTimeout(() => router.push(`/ride-details?id=${res.data.data.ride._id}`), 1500);
    } catch (err) {
      console.error('[CreateRide] Submit failed:', err);
      setError(err.response?.data?.message || 'Failed to create ride. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'form-input block w-full px-4 py-2.5 text-sm bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-colors';
  const labelClass = 'block text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mb-1.5';

  if (success) {
    return (
      <div className="min-h-[calc(100vh-73px)] relative flex items-center justify-center px-4 bg-[var(--bg-default)]">
        <div className="glass-panel p-12 text-center border-l-4 border-l-emerald-500 max-w-md w-full shadow-2xl bg-[var(--bg-surface)]">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold uppercase text-[var(--text-primary)] mb-2">Ride Posted!</h2>
          <p className="text-[var(--text-secondary)] text-sm">Redirecting to your ride details...</p>
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const selectedVehicle = vehicles.find(v => v._id === formData.driverVehicle);

  return (
    <>
    {/* ═══════════ DESKTOP / BROWSER LAYOUT (unchanged) ═══════════ */}
    <div className="hidden lg:block min-h-[calc(100vh-73px)] bg-[var(--bg-default)] py-8 px-4 sm:px-6 lg:px-8 text-[var(--text-primary)]">
      <div className="max-w-[1600px] mx-auto h-full flex flex-col xl:flex-row gap-6 items-stretch">

        {/* ── LEFT COLUMN: Form ── */}
        <div className="xl:w-[45%] flex flex-col gap-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl overflow-y-auto max-h-[85vh] custom-scrollbar">
            <div className="mb-6">
              <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-1">Create Module</p>
              <h1 className="text-2xl font-bold tracking-tight mb-1 text-[var(--text-primary)]">Offer a Ride</h1>
              <p className="text-xs text-[var(--text-secondary)]">Share your commute with fellow ST colleagues</p>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-start gap-2 mb-6">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Profile & Vehicle */}
              <div className="bg-[var(--bg-default)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                    {user?.firstName?.[0] || 'D'}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{user?.firstName} {user?.lastName}</h3>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Driver</p>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="driverVehicle" className={labelClass}>Vehicle</label>
                  {vehicles.length === 0 ? (
                    <div className="text-xs text-amber-400 mt-1">No vehicles found. Add one in Profile.</div>
                  ) : (
                    <select
                      id="driverVehicle" name="driverVehicle"
                      value={formData.driverVehicle} onChange={handleChange}
                      className={inputClass}
                    >
                      {vehicles.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.vehicleName} · {v.vehiclePlateNumber} ({v.seatCount} seats)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass}>Pickup Location</label>
                    <button type="button" onClick={handleGPS} className="text-[10px] text-emerald-400 font-semibold hover:text-emerald-300 transition">
                      📍 Use GPS
                    </button>
                  </div>
                  <AddressAutocomplete
                    value={pickupLoc.address}
                    onChange={(loc) => setPickupLoc({ ...loc, verified: true })}
                    placeholder="Start typing your pickup address…"
                    savedAddresses={savedAddresses}
                    className="!bg-[var(--bg-default)]"
                  />
                  <div className="absolute left-[-16px] top-[40px] w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></div>
                </div>

                <div className="pl-6 border-l-2 border-dashed border-[var(--border-default)] space-y-4 relative -ml-1">
                  {viaStops.map((stop, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={labelClass}>Via Stop {index + 1}</label>
                        <button type="button" onClick={() => removeViaStop(index)} className="text-[10px] text-red-400 hover:text-red-300">
                          Remove
                        </button>
                      </div>
                      <AddressAutocomplete
                        value={stop.address}
                        onChange={(loc) => updateViaStop(index, loc)}
                        placeholder="Add a stop along the way..."
                      />
                      <div className="absolute left-[-29px] top-[40px] w-1.5 h-1.5 rounded-full bg-[var(--bg-base)]0"></div>
                    </div>
                  ))}
                  
                  {viaStops.length < 3 && (
                    <button type="button" onClick={addViaStop} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition">
                      <span>+</span> Add Via Stop
                    </button>
                  )}
                </div>

                <div className="relative">
                  <label className={labelClass}>Destination</label>
                  <AddressAutocomplete
                    value={destLoc.address}
                    onChange={(loc) => setDestLoc({ ...loc, verified: true })}
                    placeholder="Where are you heading?"
                    savedAddresses={savedAddresses}
                  />
                  <div className="absolute left-[-16px] top-[40px] w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></div>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="journeyDate" className={labelClass}>Date</label>
                  <input
                    id="journeyDate" name="journeyDate" type="date" required
                    value={formData.journeyDate} onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="journeyTime" className={labelClass}>Time</label>
                  <input
                    id="journeyTime" name="journeyTime" type="time" required
                    value={formData.journeyTime} onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Seats & Flexible Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="flexibilityMinutes" className={labelClass}>Flexibility</label>
                  <select
                    id="flexibilityMinutes" name="flexibilityMinutes"
                    value={formData.flexibilityMinutes} onChange={handleChange}
                    className={inputClass}
                  >
                    <option value={0}>On Time</option>
                    <option value={10}>+ 10 mins</option>
                    <option value={20}>+ 20 mins</option>
                    <option value={30}>+ 30 mins</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="availableSeats" className={labelClass}>Available Seats</label>
                  <input
                    id="availableSeats" name="availableSeats" type="number" min="1" max={selectedVehicle?.seatCount || 8} required
                    value={formData.availableSeats} onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Seat Selection */}
              {selectedVehicle && (
                <div className="bg-[var(--bg-surface-hover)] p-4 rounded-xl border border-[var(--border-default)]/50">
                  <label className={labelClass}>Block Specific Seats (Optional)</label>
                  <p className="text-[10px] text-[var(--text-secondary)] mb-3">Select seats you want to reserve for yourself or keep empty.</p>
                  <div className="flex justify-center scale-90 origin-top">
                    <SeatMap 
                      layout={generateSeatLayout(selectedVehicle.seatCount)}
                      selectedSeatIds={selectedSeats}
                      onToggleSeat={(seatId) => {
                        setSelectedSeats(prev => 
                          prev.includes(seatId) 
                            ? prev.filter(s => s !== seatId) 
                            : [...prev, seatId]
                        );
                      }}
                      mode="offer"
                    />
                  </div>
                </div>
              )}

              {/* Female Passengers Only — visible only to female drivers */}
              {user?.gender === 'F' && (
                <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/20 p-4 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-pink-400">🚺 Female Passengers Only</p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Only female colleagues will be able to book this ride.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.femaleOnly}
                    onClick={() => setFormData((p) => ({ ...p, femaleOnly: !p.femaleOnly }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${formData.femaleOnly ? 'bg-pink-500' : 'bg-[var(--border-default)]'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.femaleOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}

              {/* Notes */}
              <div>
                <label htmlFor="notes" className={labelClass}>Notes</label>
                <textarea
                  id="notes" name="notes" rows="2"
                  value={formData.notes} onChange={handleChange}
                  className={inputClass} placeholder="e.g. 'Meet at gate 2'"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !pickupLoc.latitude || !destLoc.latitude || vehicles.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[var(--text-primary)] font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : null}
                {isSubmitting ? 'POSTING RIDE...' : 'PUBLISH RIDE'}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Route Map ── */}
        <div className="xl:flex-1 h-[400px] xl:h-[85vh] min-h-[500px]">
          <div className="glass-panel rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl h-full w-full overflow-hidden relative">
            <RouteMap 
              waypoints={waypoints}
              height="100%"
            />
          </div>
        </div>

      </div>
    </div>

    {/* ═══════════ MOBILE LAYOUT ═══════════ */}
    <div className="lg:hidden min-h-[calc(100vh-73px)] bg-[var(--bg-default)] text-[var(--text-primary)] pb-28">
      <div className="px-4 py-5 space-y-5">
        <div>
          <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-1">Create Module</p>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Offer a Ride</h1>
          <p className="text-xs text-[var(--text-secondary)]">Share your commute with fellow ST colleagues</p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs flex items-start gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Profile & Vehicle */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30 flex-shrink-0">
              {user?.firstName?.[0] || 'D'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.firstName} {user?.lastName}</h3>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Driver</p>
            </div>
          </div>
          {vehicles.length === 0 ? (
            <div className="text-xs text-amber-400">No vehicles found. Add one in Profile.</div>
          ) : (
            <select
              name="driverVehicle"
              value={formData.driverVehicle} onChange={handleChange}
              className={`${inputClass} min-h-[44px]`}
            >
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vehicleName} · {v.vehiclePlateNumber} ({v.seatCount} seats)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Route Map preview */}
        <div className="glass-panel rounded-xl h-[220px] overflow-hidden">
          <RouteMap waypoints={waypoints} height="100%" />
        </div>

        {/* Locations */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Pickup Location</label>
              <button type="button" onClick={handleGPS} className="text-[10px] text-emerald-400 font-semibold">
                📍 Use GPS
              </button>
            </div>
            <AddressAutocomplete
              value={pickupLoc.address}
              onChange={(loc) => setPickupLoc({ ...loc, verified: true })}
              placeholder="Start typing your pickup address…"
              savedAddresses={savedAddresses}
            />
          </div>

          {viaStops.map((stop, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelClass}>Via Stop {index + 1}</label>
                <button type="button" onClick={() => removeViaStop(index)} className="text-[10px] text-red-400">
                  Remove
                </button>
              </div>
              <AddressAutocomplete
                value={stop.address}
                onChange={(loc) => updateViaStop(index, loc)}
                placeholder="Add a stop along the way..."
              />
            </div>
          ))}

          {viaStops.length < 3 && (
            <button type="button" onClick={addViaStop} className="min-h-[44px] text-xs text-blue-400 font-medium flex items-center gap-1">
              <span>+</span> Add Via Stop
            </button>
          )}

          <div>
            <label className={labelClass}>Destination</label>
            <AddressAutocomplete
              value={destLoc.address}
              onChange={(loc) => setDestLoc({ ...loc, verified: true })}
              placeholder="Where are you heading?"
              savedAddresses={savedAddresses}
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input
              name="journeyDate" type="date" required
              value={formData.journeyDate} onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className={`${inputClass} min-h-[44px]`}
            />
          </div>
          <div>
            <label className={labelClass}>Time</label>
            <input
              name="journeyTime" type="time" required
              value={formData.journeyTime} onChange={handleChange}
              className={`${inputClass} min-h-[44px]`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Flexibility</label>
            <select
              name="flexibilityMinutes"
              value={formData.flexibilityMinutes} onChange={handleChange}
              className={`${inputClass} min-h-[44px]`}
            >
              <option value={0}>On Time</option>
              <option value={10}>+ 10 mins</option>
              <option value={20}>+ 20 mins</option>
              <option value={30}>+ 30 mins</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Available Seats</label>
            <input
              name="availableSeats" type="number" min="1" max={selectedVehicle?.seatCount || 8} required
              value={formData.availableSeats} onChange={handleChange}
              className={`${inputClass} min-h-[44px]`}
            />
          </div>
        </div>

        {selectedVehicle && (
          <div className="bg-[var(--bg-surface-hover)] p-4 rounded-xl border border-[var(--border-default)]/50">
            <label className={labelClass}>Block Specific Seats (Optional)</label>
            <p className="text-[10px] text-[var(--text-secondary)] mb-3">Select seats you want to reserve for yourself or keep empty.</p>
            <div className="flex justify-center overflow-x-auto">
              <SeatMap
                layout={generateSeatLayout(selectedVehicle.seatCount)}
                selectedSeatIds={selectedSeats}
                onToggleSeat={(seatId) => {
                  setSelectedSeats(prev =>
                    prev.includes(seatId)
                      ? prev.filter(s => s !== seatId)
                      : [...prev, seatId]
                  );
                }}
                mode="offer"
              />
            </div>
          </div>
        )}

        {user?.gender === 'F' && (
          <div className="flex items-center justify-between bg-pink-500/10 border border-pink-500/20 p-4 rounded-xl">
            <div className="min-w-0 pr-3">
              <p className="text-sm font-semibold text-pink-400">🚺 Female Passengers Only</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Only female colleagues will be able to book this ride.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.femaleOnly}
              onClick={() => setFormData((p) => ({ ...p, femaleOnly: !p.femaleOnly }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${formData.femaleOnly ? 'bg-pink-500' : 'bg-[var(--border-default)]'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.femaleOnly ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            name="notes" rows="2"
            value={formData.notes} onChange={handleChange}
            className={inputClass} placeholder="e.g. 'Meet at gate 2'"
          />
        </div>
      </div>

      <StickyActionBar>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !pickupLoc.latitude || !destLoc.latitude || vehicles.length === 0}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-[var(--text-primary)] font-bold py-3.5 min-h-[48px] rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {isSubmitting ? <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : null}
          {isSubmitting ? 'POSTING RIDE...' : 'PUBLISH RIDE'}
        </button>
      </StickyActionBar>
    </div>
    </>
  );
};

export default CreateRide;
