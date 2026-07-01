"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import React from 'react';

import api from '@/services/api';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapPreview from '@/components/MapPreview';
import QuickLocationChips from '@/components/QuickLocationChips';
import useCurrentLocation from '@/hooks/useCurrentLocation';
import {
  fetchSavedAddresses,
  fetchRecentAddresses,
  fetchFrequentAddresses,
} from '@/services/locationService';
import { useProfileGuard } from '@/hooks/useProfileGuard';
import { useAuth } from '@/hooks/useAuth';

const emptyLoc = () => ({ address: '', latitude: null, longitude: null, verified: false });

const STEPS = ['Route & Map', 'Schedule & Details', 'Review & Post'];

const ST_OFFICE = {
  address: 'STMicroelectronics Private Limited, Plot No. 1, Knowledge Park III, Greater Noida',
  latitude: 28.481200,
  longitude: 77.481500,
  verified: true
};

const CreateRide = () => {
  const [step, setStep]           = useState(0);
  const [formData, setFormData]   = useState({
    driverVehicle: '',
    journeyDate: '',
    journeyTime: '',
    flexibilityMinutes: 0,
    availableSeats: 3,
    notes: '',
  });

  const [vehicles, setVehicles]         = useState([]);
  const [pickupLoc, setPickupLoc]       = useState(emptyLoc());
  const [destLoc, setDestLoc]           = useState(ST_OFFICE);
  const [activeMapField, setActiveMapField] = useState(null); // 'pickup' | 'destination'
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dbSavedAddresses, setDbSavedAddresses] = useState([]);
  const [recentAddresses,  setRecentAddresses]  = useState([]);
  const [frequentAddresses, setFrequentAddresses] = useState([]);

  const router = useRouter();
  const { getCurrentLocation } = useCurrentLocation();
  const { canCreateRide } = useProfileGuard();
  const { user } = useAuth();

  const savedAddresses = React.useMemo(() => {
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
    } else if (user?.address) {
      list.unshift({
        _id: 'profile-home',
        label: 'Home Location',
        icon: '🏠',
        address: user.address,
      });
    }
    return list;
  }, [dbSavedAddresses, user?.address, user?.homeLocation]);

  // Load vehicles and address lists on mount
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
        const [saved, recent, frequent] = await Promise.all([
          fetchSavedAddresses(),
          fetchRecentAddresses(),
          fetchFrequentAddresses(),
        ]);
        setDbSavedAddresses(saved || []);
        setRecentAddresses(recent || []);
        setFrequentAddresses(frequent || []);

        // Try to set Home address as default pickup if available
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

  // Address quick-select from chips
  const handleQuickSelect = (loc, field) => {
    const loc2 = { ...loc, latitude: loc.lat ?? loc.latitude, longitude: loc.lng ?? loc.longitude, verified: true };
    if (field === 'pickup') setPickupLoc(loc2);
    else setDestLoc(loc2);
  };

  // GPS for pickup
  const handleGPS = async () => {
    try {
      const pos = await getCurrentLocation();
      setPickupLoc({ address: 'Current Location', latitude: pos.lat, longitude: pos.lng, verified: true });
    } catch (err) {
      console.error('[CreateRide] GPS error:', err);
      setError('Could not get current location. Please allow location access and try again.');
    }
  };

  const canGoToStep2 =
    pickupLoc.verified && pickupLoc.latitude &&
    destLoc.verified && destLoc.latitude &&
    pickupLoc.address !== destLoc.address;

  const canGoToStep3 =
    formData.driverVehicle &&
    formData.journeyDate &&
    formData.journeyTime &&
    formData.availableSeats > 0;

  const handleSubmit = async () => {
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

  const inputClass = 'form-input block w-full px-4 py-2.5 text-sm';
  const labelClass = 'block text-xs uppercase font-semibold text-[var(--text-secondary)] tracking-wider mb-2';

  if (success) {
    return (
      <div className="min-h-[calc(100vh-73px)] relative flex items-center justify-center px-4">
        <div className="glass-panel p-12 text-center border-l-4 border-l-[var(--primary-base)] max-w-md w-full shadow-2xl shadow-[var(--border-glow)]">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-['Space_Grotesk'] tracking-widest uppercase text-white mb-2">Ride Posted!</h2>
          <p className="text-slate-400 text-sm">Redirecting to your ride details...</p>
          <div className="mt-4 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] relative py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto relative">
        {/* Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden mb-8 border-none bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] text-center sm:text-left">
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-[var(--primary-base)] to-[var(--secondary-base)]"></div>
          <p className="text-[var(--primary-base)] font-bold uppercase tracking-widest text-[10px] mb-1">Create Module</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-2">Offer a Ride</h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[var(--text-secondary)]">Share your commute with fellow ST colleagues</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                  i < step ? 'bg-emerald-500 border-emerald-500 text-slate-950' :
                  i === step ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' :
                  'border-slate-700 text-slate-600'
                }`}>
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${i === step ? 'text-emerald-400' : i < step ? 'text-emerald-600' : 'text-slate-600'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-16 sm:w-24 mx-2 mb-4 transition-all duration-300 ${i < step ? 'bg-emerald-500' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-panel rounded-[2rem] overflow-hidden shadow-2xl bg-[var(--bg-surface)] border-none relative z-10">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--primary-base)] to-[var(--secondary-base)]"></div>

          {/* ── STEP 0: Route & Map ── */}
          {step === 0 && (
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">1</span>
                  Set Your Route
                </h2>

                {/* Quick location chips removed per user request */}

                {/* Pickup */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Pickup Location</label>
                    <button
                      type="button"
                      onClick={handleGPS}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Use my location
                    </button>
                  </div>
                  <AddressAutocomplete
                    value={pickupLoc.address}
                    onChange={(loc) => { setPickupLoc({ ...loc, verified: false }); setActiveMapField('pickup'); }}
                    placeholder="Start typing your pickup address…"
                    showCurrentLocation
                    savedAddresses={savedAddresses}
                  />
                  {pickupLoc.latitude && (
                    <div className="mt-2">
                      <MapPreview
                        location={pickupLoc}
                        onLocationChange={(loc) => setPickupLoc((p) => ({ ...p, ...loc, verified: false }))}
                        height="220px"
                        interactive
                        onConfirm={() => setPickupLoc((p) => ({ ...p, verified: true }))}
                        onUnconfirm={() => setPickupLoc((p) => ({ ...p, verified: false }))}
                        confirmed={pickupLoc.verified}
                        markerColor="#10b981"
                        markerLabel="A"
                      />
                    </div>
                  )}
                </div>

                {/* Destination */}
                <div>
                  <label className={labelClass}>Destination</label>
                  <AddressAutocomplete
                    value={destLoc.address}
                    onChange={(loc) => { setDestLoc({ ...loc, verified: false }); setActiveMapField('destination'); }}
                    placeholder="Where are you heading? (e.g. ST Office)"
                    showCurrentLocation
                    savedAddresses={savedAddresses}
                  />
                  {destLoc.latitude && (
                    <div className="mt-2">
                      <MapPreview
                        location={destLoc}
                        onLocationChange={(loc) => setDestLoc((p) => ({ ...p, ...loc, verified: false }))}
                        height="220px"
                        interactive
                        onConfirm={() => setDestLoc((p) => ({ ...p, verified: true }))}
                        onUnconfirm={() => setDestLoc((p) => ({ ...p, verified: false }))}
                        confirmed={destLoc.verified}
                        markerColor="#6366f1"
                        markerLabel="B"
                      />
                    </div>
                  )}
                </div>
              </div>

              {!canGoToStep2 && (pickupLoc.address || destLoc.address) && (
                <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-500/20 px-3 py-2 rounded-lg">
                  ⚠ Please confirm both pickup and destination on the map before continuing.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 1: Schedule & Details ── */}
          {step === 1 && (
            <div className="p-6 sm:p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">2</span>
                Schedule & Details
              </h2>

              {/* Vehicle */}
              <div>
                <label htmlFor="driverVehicle" className={labelClass}>Your Vehicle</label>
                {vehicles.length === 0 ? (
                  <div className="mt-1 p-4 bg-amber-950/30 border border-amber-500/20 rounded-xl text-sm text-amber-400">
                    ⚠ No vehicles found. Please add a vehicle in your{' '}
                    <button onClick={() => router.push('/profile')} className="underline font-semibold">Profile</button> first.
                  </div>
                ) : (
                  <select
                    id="driverVehicle" name="driverVehicle"
                    value={formData.driverVehicle} onChange={handleChange}
                    className="form-input block w-full pl-3 pr-10 py-2.5 text-sm"
                  >
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.vehicleName} · {v.vehiclePlateNumber} ({v.seatCount} seats)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Journey Date & Time */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="journeyDate" className={labelClass}>Journey Date</label>
                  <input
                    id="journeyDate" name="journeyDate" type="date" required
                    value={formData.journeyDate} onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="journeyTime" className={labelClass}>Journey Time</label>
                  <input
                    id="journeyTime" name="journeyTime" type="time" required
                    value={formData.journeyTime} onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Flexibility & Seats */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="flexibilityMinutes" className={labelClass}>Flexible Waiting Time</label>
                  <select
                    id="flexibilityMinutes" name="flexibilityMinutes"
                    value={formData.flexibilityMinutes} onChange={handleChange}
                    className={inputClass}
                  >
                    <option value={0}>On Time (No wait)</option>
                    <option value={10}>Up to 10 mins</option>
                    <option value={20}>Up to 20 mins</option>
                    <option value={30}>Up to 30 mins</option>
                    <option value={40}>Up to 40 mins</option>
                    <option value={60}>Up to 1 hour</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="availableSeats" className={labelClass}>Available Seats</label>
                  <input
                    id="availableSeats" name="availableSeats" type="number" min="1" max={vehicles.find(v => v._id === formData.driverVehicle)?.seatCount || 8} required
                    value={formData.availableSeats} onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Optional notes */}
              <div>
                <label htmlFor="notes" className={labelClass}>Notes for Co-Riders <span className="text-slate-500 text-xs">(Optional)</span></label>
                <textarea
                  id="notes" name="notes" rows="2"
                  value={formData.notes} onChange={handleChange}
                  className={inputClass} placeholder="e.g. 'Meet at gate 2', 'No smoking please'…"
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Review & Post ── */}
          {step === 2 && (
            <div className="p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">3</span>
                Review & Post
              </h2>

              <div className="space-y-3 text-sm">
                {[
                  { label: 'From', value: pickupLoc.address },
                  { label: 'To', value: destLoc.address },
                  { label: 'Vehicle', value: vehicles.find(v => v._id === formData.driverVehicle)?.vehicleName || '—' },
                  { label: 'Journey', value: formData.journeyDate && formData.journeyTime ? `${formData.journeyDate} at ${formData.journeyTime}` : '—' },
                  { label: 'Flexibility', value: formData.flexibilityMinutes === 0 ? 'On Time' : `Up to ${formData.flexibilityMinutes} mins` },
                  { label: 'Seats Available', value: formData.availableSeats },
                  ...(formData.notes ? [{ label: 'Notes', value: formData.notes }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)] w-24 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-slate-200 font-medium flex-1">{value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="bg-red-950/40 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm flex items-start gap-2">
                  <span>⚠</span> {error}
                </div>
              )}

              <div className="bg-emerald-950/20 border border-emerald-500/15 rounded-xl p-4 text-xs text-emerald-400/80">
                📋 By posting this ride, you agree to pick up confirmed Co-Riders from their specified locations.
              </div>
            </div>
          )}

          {/* ── Navigation Buttons ── */}
          <div className="px-6 sm:px-8 pb-6 flex items-center justify-between border-t border-[var(--border-subtle)] pt-6">
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/')}
              className="btn-secondary px-5 py-2.5"
            >
              {step === 0 ? 'CANCEL' : '← BACK'}
            </button>

            {step < 2 ? (
              <button
                onClick={() => {
                  if (step === 0 && !canCreateRide()) return;
                  setStep(s => s + 1);
                }}
                disabled={step === 0 ? !canGoToStep2 : !canGoToStep3 || vehicles.length === 0}
                className="btn-primary px-6 py-2.5 disabled:opacity-40"
              >
                CONTINUE →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary px-6 py-2.5 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    POSTING...
                  </>
                ) : '🚗 POST RIDE'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRide;
