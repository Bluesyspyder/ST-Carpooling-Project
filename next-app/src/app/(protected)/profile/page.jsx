"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import useCurrentLocation from '@/hooks/useCurrentLocation';
import api from '@/services/api';
import SavedLocationsManager from '@/components/SavedLocationsManager';
import LocationInsights from '@/components/LocationInsights';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapPreview from '@/components/MapPreview';
import {
  fetchFrequentAddresses,
  fetchRecentAddresses,
  fetchSavedAddresses,
} from '@/services/locationService';
import { Capacitor } from '@capacitor/core';
import { takePhoto, dataUrlToFile } from '@/services/nativeCamera';

/* ──────────────────────────── helpers ──────────────────────────── */

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/* ────────────────────── sub-component: EditField ─────────────────── */

const EditField = ({ label, value, onChange, type = 'text', readOnly = false, maxLength }) => (
  <div className="space-y-1">
    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">{label}</label>
    {readOnly ? (
      <p className="text-[var(--text-primary)] text-sm font-bold bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm px-3 py-2.5 select-all">
        {value || '—'}
      </p>
    ) : (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="form-input w-full px-3 py-2.5 text-sm"
      />
    )}
  </div>
);

/* ═══════════════════════════ PROFILE PAGE ═══════════════════════════ */

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useRouter();
  const { getCurrentLocation } = useCurrentLocation();

  /* ── vehicles ── */
  const [vehicles, setVehicles] = useState([]);

  /* ── photo upload ── */
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [vehicleImageUpload, setVehicleImageUpload] = useState({});
  const profileInputRef = useRef(null);

  /* ── location data ── */
  const [frequentAddresses, setFrequentAddresses] = useState([]);
  const [recentAddresses,   setRecentAddresses]   = useState([]);
  const [savedAddresses,    setSavedAddresses]    = useState([]);

  /* ── edit personal info ── */
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* ── home location ── */
  const [homeLocEdit, setHomeLocEdit] = useState(false);
  const [homeLoc, setHomeLoc] = useState({ address: '', latitude: null, longitude: null, verified: false });
  const [homeLocSaving, setHomeLocSaving] = useState(false);
  const [homeLocGPSLoading, setHomeLocGPSLoading] = useState(false);
  const [homeLocError, setHomeLocError] = useState('');

  /* ── initial data load ── */
  useEffect(() => {
    const fetchVehicles = async () => {
      if (user?.role !== 'hybrid') return;
      try {
        const response = await api.get('/vehicles');
        setVehicles(response.data.data.vehicles);
      } catch (error) {
        console.error('Failed to load vehicles', error);
      }
    };
    const loadLocationData = async () => {
      try {
        const [frequent, recent, saved] = await Promise.all([
          fetchFrequentAddresses(),
          fetchRecentAddresses(),
          fetchSavedAddresses(),
        ]);
        setFrequentAddresses(frequent || []);
        setRecentAddresses(recent || []);
        setSavedAddresses(saved || []);
      } catch (error) {
        console.error('Failed to load user location details in Profile:', error);
      }
    };
    fetchVehicles();
    loadLocationData();
  }, [user?.role]);

  /* ── sync homeLocation from user object ── */
  useEffect(() => {
    if (user?.homeLocation) {
      setHomeLoc({
        address:   user.homeLocation.address   || '',
        latitude:  user.homeLocation.latitude  ?? null,
        longitude: user.homeLocation.longitude ?? null,
      });
    }
  }, [user]);

  /* ── handlers: logout ── */
  const handleLogout = () => { logout(); navigate('/'); };

  /* ── handlers: profile photo ── */
  const handleProfilePhotoChange = async (fileOrEvent) => {
    // If it's an event from the hidden input, extract the file
    const file = fileOrEvent?.target?.files ? fileOrEvent.target.files[0] : fileOrEvent;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Profile image must be less than 5MB'); return; }
    setIsUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      // Let axios/the browser set Content-Type (incl. the multipart boundary) —
      // forcing 'multipart/form-data' here strips the boundary and breaks parsing server-side.
      const response = await api.post('/users/profile/upload-image', formData, {
        headers: { 'Content-Type': undefined },
      });
      setUser(response.data.data.user);
    } catch (error) {
      console.error('Profile photo upload error:', error);
      alert('Failed to upload profile photo. Please try again.');
    }
    finally { setIsUploadingProfile(false); }
  };

  const onProfilePhotoClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const dataUrl = await takePhoto();
        if (dataUrl) {
          const file = await dataUrlToFile(dataUrl, 'profile.jpg');
          handleProfilePhotoChange(file);
        }
      } catch (err) {
        console.log('User cancelled or native camera failed', err);
      }
    } else {
      profileInputRef.current?.click();
    }
  };

  /* ── handlers: vehicle photo ── */
  const handleVehiclePhotoChange = async (vehicleId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Vehicle image must be less than 5MB'); return; }
    setVehicleImageUpload((prev) => ({ ...prev, [vehicleId]: true }));
    try {
      const formData = new FormData();
      formData.append('vehicleImage', file);
      const response = await api.post(`/vehicles/${vehicleId}/upload-image`, formData, {
        headers: { 'Content-Type': undefined },
      });
      setVehicles((prev) => prev.map((v) => (v._id === vehicleId ? response.data.data.vehicle : v)));
    } catch (error) {
      console.error('Vehicle photo upload error:', error);
      alert('Failed to upload vehicle photo. Please try again.');
    }
    finally { setVehicleImageUpload((prev) => ({ ...prev, [vehicleId]: false })); }
  };

  const onVehiclePhotoClick = async (vehicleId) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const dataUrl = await takePhoto();
        if (dataUrl) {
          const file = await dataUrlToFile(dataUrl, `vehicle_${vehicleId}.jpg`);
          handleVehiclePhotoChange(vehicleId, file);
        }
      } catch (err) {
        console.log('User cancelled or native camera failed', err);
      }
    } else {
      document.getElementById(`vehicle-input-${vehicleId}`)?.click();
    }
  };

  /* ── handlers: enter edit mode ── */
  const handleStartEdit = () => {
    setEditForm({
      firstName:        user.firstName        || '',
      lastName:         user.lastName         || '',
      phone:            user.phone            || '',
      address:          user.address          || '',
      bio:              user.bio              || '',
      emergencyContact: user.emergencyContact || '',
    });
    setSaveError('');
    setSaveSuccess(false);
    setEditMode(true);
  };

  /* ── handlers: save personal info ── */
  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const response = await api.patch('/users/profile', editForm);
      setUser(response.data.data.user);
      setSaveSuccess(true);
      setEditMode(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('[Profile] Save Profile Error:', err);
      setSaveError(err.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── handlers: GPS home location ── */
  const handleUseGPS = async () => {
    setHomeLocGPSLoading(true);
    setHomeLocError('');
    const loc = await getCurrentLocation();
    if (loc) {
      setHomeLoc({ address: loc.address, latitude: loc.latitude, longitude: loc.longitude });
    } else {
      setHomeLocError('Could not get GPS location. Please ensure location permissions are granted.');
    }
    setHomeLocGPSLoading(false);
  };

  const handleSaveHomeLocation = async () => {
    if (!homeLoc.latitude || !homeLoc.longitude) {
      setHomeLocError('Please select a valid location first.');
      return;
    }
    setHomeLocSaving(true);
    setHomeLocError('');
    try {
      const response = await api.patch('/users/profile', {
        homeLocation: {
          address:   homeLoc.address,
          latitude:  homeLoc.latitude,
          longitude: homeLoc.longitude,
          verified:  true,
        },
      });
      setUser(response.data.data.user);
      setHomeLocEdit(false);
    } catch (err) {
      console.error('[Profile] Save Home Location Error:', err);
      setHomeLocError(err.response?.data?.message || 'Failed to save home location.');
    } finally {
      setHomeLocSaving(false);
    }
  };

  /* ── guards ── */
  if (!user) {
    return (
      <div className="min-h-[calc(100dvh-73px)] bg-slate-950 flex items-center justify-center text-slate-400">
        Loading profile...
      </div>
    );
  }

  const locationStats = {
    saved:    savedAddresses.length,
    recent:   recentAddresses.length,
    frequent: frequentAddresses.length,
    totalUses: frequentAddresses.reduce((s, a) => s + (a.useCount || 0), 0),
  };

  /* ──────────────────────────────── RENDER ──────────────────────────────── */
  return (
    <div className="min-h-[calc(100dvh-73px)] relative py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[1400px] mx-auto">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-8">User Profile</h2>

        <div className="glass-panel p-6 sm:p-10 space-y-8 shadow-sm shadow-[var(--border-glow)]">

          {/* ── Profile Photo ── */}
          <div className="flex flex-col items-center pb-6 border-b border-slate-800">
            <div className="relative group">
              <div className="w-32 h-32 bg-emerald-500/10 border-4 border-emerald-500/30 rounded-full flex items-center justify-center text-5xl font-bold text-emerald-400 overflow-hidden">
                {user.profileImage
                  ? <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  : <>{user.firstName?.[0]}{user.lastName?.[0]}</>}
              </div>
              <button
                onClick={onProfilePhotoClick}
                disabled={isUploadingProfile}
                className="absolute bottom-0 right-0 p-2 bg-emerald-500/90 hover:bg-emerald-600 rounded-full transition disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input ref={profileInputRef} type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
            </div>
            <div className="text-center mt-4">
              <h3 className="text-2xl font-bold tracking-widest uppercase text-[var(--text-primary)]">{user.firstName} {user.lastName}</h3>
              <p className="text-[var(--primary-base)] font-bold tracking-widest text-[10px] uppercase mt-1">
                {user.role === 'hybrid' ? 'Car Owner' : 'Passenger'} Account
              </p>
              {isUploadingProfile && (
                <p className="text-xs text-indigo-400 animate-pulse mt-1">Uploading photo…</p>
              )}
            </div>
          </div>

          {/* ════ PERSONAL INFO SECTION ════ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                <span>👤</span> Personal Information
              </h3>
              {!editMode ? (
                <button
                  id="edit-profile-btn"
                  onClick={handleStartEdit}
                  className="btn-secondary px-4 py-1.5 text-[10px]"
                >
                  ✏️ EDIT DETAILS
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="btn-secondary px-4 py-1.5 text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button
                    id="save-profile-btn"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary px-4 py-1.5 text-[10px] disabled:opacity-50"
                  >
                    {saving ? 'SAVING...' : '✓ SAVE CHANGES'}
                  </button>
                </div>
              )}
            </div>

            {saveError && (
              <div className="bg-[var(--bg-surface)] border border-red-500 text-red-500 text-[10px] rounded-sm px-4 py-2.5 font-bold uppercase tracking-widest">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="bg-[var(--bg-surface)] border border-[var(--primary-base)] text-[var(--primary-base)] text-[10px] rounded-sm px-4 py-2.5 font-bold uppercase tracking-widest">
                ✓ Profile updated successfully!
              </div>
            )}

            {editMode ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <EditField label="First Name" value={editForm.firstName} onChange={(v) => setEditForm(f => ({ ...f, firstName: v }))} />
                <EditField label="Last Name"  value={editForm.lastName}  onChange={(v) => setEditForm(f => ({ ...f, lastName: v }))} />
                <EditField label="Phone"      value={editForm.phone}     onChange={(v) => setEditForm(f => ({ ...f, phone: v }))} type="tel" />
                <EditField label="Address"    value={editForm.address}   onChange={(v) => setEditForm(f => ({ ...f, address: v }))} />
                <EditField label="Emergency Contact" value={editForm.emergencyContact} onChange={(v) => setEditForm(f => ({ ...f, emergencyContact: v }))} type="tel" />
                <EditField label="Email (read-only)" value={user.email} readOnly />
                <div className="sm:col-span-2 xl:col-span-3 space-y-1">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Bio <span className="opacity-70 normal-case">(max 300 chars)</span></label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    maxLength={300}
                    rows={3}
                    className="form-input w-full px-3 py-2.5 text-sm resize-none"
                    placeholder="Tell others about yourself…"
                  />
                  <p className="text-right text-[10px] text-slate-600">{(editForm.bio || '').length}/300</p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 text-sm">
                {[
                  { label: 'Email',    value: user.email },
                  { label: 'Phone',    value: user.phone || 'Not provided' },
                  { label: 'Address',  value: user.address || 'Not provided' },
                  { label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">{label}</p>
                    <p className="text-[var(--text-primary)] text-sm font-bold tracking-wider">{value}</p>
                  </div>
                ))}
                <div className="space-y-1">
                  <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">Average Rating</p>
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {user.averageRating?.toFixed(1) || '5.0'} / 5.0
                  </div>
                </div>
                {user.emergencyContact && (
                  <div className="space-y-1">
                    <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">Emergency Contact</p>
                    <p className="text-[var(--text-primary)] text-sm font-bold tracking-wider">{user.emergencyContact}</p>
                  </div>
                )}
              </div>
            )}

            {!editMode && user.bio && (
              <div className="pt-2 space-y-1">
                <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">Bio</p>
                <p className="text-[var(--text-primary)] text-sm bg-[var(--bg-surface)] p-3 rounded-sm border border-[var(--border-subtle)] italic">"{user.bio}"</p>
              </div>
            )}
          </div>

          {/* ════ HOME LOCATION SECTION (Feature 7 — GPS Support) ════ */}
          {user.role === 'hybrid' && (
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                  <span>🏠</span> Home Location
                  <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">(used for pickup analysis)</span>
                </h3>
                {!homeLocEdit ? (
                  <button
                    id="edit-home-location-btn"
                    onClick={() => { setHomeLocEdit(true); setHomeLocError(''); }}
                    className="btn-secondary px-4 py-1.5 text-[10px]"
                  >
                    {user.homeLocation?.verified ? '✏️ CHANGE' : '+ SET LOCATION'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setHomeLocEdit(false); setHomeLocError(''); }}
                      className="btn-secondary px-4 py-1.5 text-[10px]"
                    >
                      CANCEL
                    </button>
                    <button
                      id="save-home-location-btn"
                      onClick={handleSaveHomeLocation}
                      disabled={homeLocSaving || !homeLoc.latitude}
                      className="btn-primary px-4 py-1.5 text-[10px] disabled:opacity-50"
                    >
                      {homeLocSaving ? 'SAVING...' : '✓ CONFIRM & SAVE'}
                    </button>
                  </div>
                )}
              </div>

              {homeLocError && (
                <div className="bg-[var(--bg-surface)] border border-red-500 text-red-500 text-[10px] rounded-sm px-4 py-2.5 font-bold uppercase tracking-widest">
                  {homeLocError}
                </div>
              )}

              {!homeLocEdit ? (
                user.homeLocation?.verified ? (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm p-4 flex items-start gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="text-[var(--text-primary)] text-sm font-bold tracking-wider">{user.homeLocation.address || 'Verified Location'}</p>
                      <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        {user.homeLocation.latitude?.toFixed(5)}, {user.homeLocation.longitude?.toFixed(5)}
                      </p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--primary-base)] rounded-sm uppercase">
                        ✓ Verified
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-surface)] border border-amber-500/50 rounded-sm p-4 text-[10px] uppercase tracking-widest font-bold text-amber-400">
                    ⚠️ No home location set. Set your home address so drivers and the system can calculate pickup impact accurately.
                  </div>
                )
              ) : (
                <div className="space-y-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm p-4">
                  {/* GPS Button */}
                  <button
                    id="use-gps-btn"
                    onClick={handleUseGPS}
                    disabled={homeLocGPSLoading}
                    className="btn-secondary flex items-center gap-2 px-4 py-2.5 disabled:opacity-50"
                  >
                    {homeLocGPSLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    {homeLocGPSLoading ? 'Getting your GPS…' : '📡 Use Current GPS Location'}
                  </button>

                  <div className="text-slate-500 text-xs text-center">— or search an address below —</div>

                  {/* Address Autocomplete */}
                  <AddressAutocomplete
                    value={homeLoc.address}
                    onChange={({ address, latitude, longitude }) => {
                      setHomeLoc({ address, latitude, longitude, verified: false });
                    }}
                    placeholder="Search your home address…"
                    showCurrentLocation
                  />

                  {/* Map Preview for draggable pin */}
                  {homeLoc.latitude && (
                    <div className="mt-2">
                      <MapPreview
                        location={homeLoc}
                        onLocationChange={(loc) => setHomeLoc((prev) => ({ ...prev, ...loc, verified: false }))}
                        height="220px"
                        interactive
                        onConfirm={() => setHomeLoc((prev) => ({ ...prev, verified: true }))}
                        onUnconfirm={() => setHomeLoc((prev) => ({ ...prev, verified: false }))}
                        confirmed={homeLoc.verified}
                        markerColor="#6366f1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════ LOCATION MANAGEMENT SECTION ════ */}
          <div className="pt-6 border-t border-[var(--border-subtle)] space-y-8">
            <h3 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
              <span>🗺️</span> Location Management
            </h3>

            {/* Location Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: '📌', label: 'Saved',      value: locationStats.saved },
                { icon: '🕐', label: 'Recent',     value: locationStats.recent },
                { icon: '🔥', label: 'Frequent',   value: locationStats.frequent },
                { icon: '🚗', label: 'Total Trips', value: locationStats.totalUses },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm p-4 text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-2xl font-bold tracking-widest text-[var(--text-primary)]">{value}</div>
                  <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <SavedLocationsManager />

            {recentAddresses.length > 0 && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm p-5">
                <h4 className="text-[var(--text-primary)] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>🕐</span> Recently Used
                </h4>
                <div className="space-y-2">
                  {recentAddresses.slice(0, 10).map((addr, i) => (
                    <div key={i} className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-500 text-sm flex-shrink-0">📍</span>
                        <p className="text-[var(--text-primary)] text-sm truncate">{addr.address}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {addr.useCount > 1 && (
                          <span className="text-xs text-[var(--text-secondary)]">{addr.useCount}×</span>
                        )}
                        <span className="text-[var(--text-secondary)] text-xs">{timeAgo(addr.lastUsedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {frequentAddresses.length > 0 && (
              <LocationInsights
                frequentAddresses={frequentAddresses}
                savedAddresses={savedAddresses}
              />
            )}
          </div>

          {/* ── Vehicles (hybrid only) ── */}
          {user.role === 'hybrid' && (
            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-4">
              <h4 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--primary-base)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-3a4 4 0 00-4-4h-3v7m0 0l-3-3m3 3l3-3" />
                </svg>
                Vehicle Specifications
              </h4>
              <div className="space-y-4">
                {vehicles.length > 0 ? vehicles.map((vehicle) => (
                  <div key={vehicle._id} className="border border-[var(--border-subtle)] p-5 rounded-sm bg-[var(--bg-surface)]">
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      {[
                        { label: 'Vehicle Name',   value: vehicle.vehicleName },
                        { label: 'Plate Number',   value: vehicle.vehiclePlateNumber, mono: true },
                        { label: 'Fuel Type',      value: vehicle.vehicleType, capitalize: true },
                        { label: 'Mileage',        value: `${vehicle.mileage} km/l` },
                        { label: 'Seats',          value: vehicle.seatCount },
                      ].map(({ label, value, mono, capitalize }) => (
                        <div key={label} className="space-y-1">
                          <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">{label}</p>
                          <p className={`text-[var(--text-primary)] text-base font-bold ${mono ? 'tracking-wider' : ''} ${capitalize ? 'capitalize' : ''}`}>
                            {value || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[var(--border-subtle)] pt-4">
                      <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest mb-3">Vehicle Photo</p>
                      <div className="relative group">
                        {vehicle.vehicleImage ? (
                          <img src={vehicle.vehicleImage} alt={vehicle.vehicleName}
                            className="w-full h-48 object-cover rounded-lg border-2 border-emerald-500/20" />
                        ) : (
                          <div className="w-full h-48 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-slate-400 text-sm">No vehicle photo</p>
                          </div>
                        )}
                        <button 
                          onClick={() => onVehiclePhotoClick(vehicle._id)}
                          disabled={vehicleImageUpload[vehicle._id]}
                          className="absolute inset-0 w-full h-full rounded-lg bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition cursor-pointer"
                        >
                          <input type="file" accept="image/*"
                            id={`vehicle-input-${vehicle._id}`}
                            onChange={(e) => handleVehiclePhotoChange(vehicle._id, e.target.files[0])}
                            className="hidden" />
                          <span className="text-white font-semibold text-sm">
                            {vehicleImageUpload[vehicle._id] ? 'Uploading...' : 'Change Photo'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 rounded-sm">
                    No vehicle details found.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-end">
            <button onClick={handleLogout}
              className="btn-secondary border-red-500 text-red-500 hover:bg-red-500/10 px-5 py-2.5 text-[10px]">
              SIGN OUT
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
