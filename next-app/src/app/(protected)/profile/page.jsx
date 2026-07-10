"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/context/ViewModeContext';
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
import { lookupVehicleByPlate } from '@/services/vehicleService';
import { avatarClasses } from '@/lib/genderTheme';
import { Capacitor } from '@capacitor/core';
import { takePhoto, dataUrlToFile } from '@/services/nativeCamera';
import SettingsRow from '@/components/mobile/SettingsRow';

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
  const { user, setUser, logout } = useAuth();
  const { setViewMode } = useViewMode();
  const navigate = useRouter();
  const { getCurrentLocation } = useCurrentLocation();

  /* ── vehicles ── */
  const [vehicles, setVehicles] = useState([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicleName: '',
    vehiclePlateNumber: '',
    vehicleType: 'diesel',
    mileage: '',
    seatCount: 4,
  });
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isLookingUpPlate, setIsLookingUpPlate] = useState(false);
  const [plateLookupError, setPlateLookupError] = useState('');
  const [addVehicleError, setAddVehicleError] = useState('');

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

  /* ── mobile: expandable section state ── */
  const [mobileExpanded, setMobileExpanded] = useState('personal');
  const toggleMobileSection = (key) => setMobileExpanded((prev) => (prev === key ? null : key));

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

  /* ── handlers: add vehicle ── */
  const handlePlateLookup = async () => {
    if (!newVehicle.vehiclePlateNumber || newVehicle.vehiclePlateNumber.length < 4) return;
    setIsLookingUpPlate(true);
    setPlateLookupError('');
    try {
      const vehicle = await lookupVehicleByPlate(newVehicle.vehiclePlateNumber);
      if (vehicle) {
        setNewVehicle(prev => ({
          ...prev,
          vehicleName: vehicle.vehicleName || prev.vehicleName,
          vehicleType: vehicle.vehicleType || prev.vehicleType,
          mileage: vehicle.mileage || prev.mileage,
          seatCount: vehicle.seatCount || prev.seatCount,
        }));
      }
    } catch (err) {
      console.log('Vehicle lookup failed', err);
      setPlateLookupError('Unable to auto-fill vehicle details. Please enter manually.');
    } finally {
      setIsLookingUpPlate(false);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setIsAddingVehicle(true);
    setAddVehicleError('');
    try {
      const res = await api.post('/vehicles', newVehicle);
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
        if (res.data.data.user.role === 'hybrid') {
          setViewMode('driver');
        }
      }
      if (res.data?.data?.vehicle) {
        setVehicles(prev => [...prev, res.data.data.vehicle]);
      }
      setShowAddVehicle(false);
      setNewVehicle({
        vehicleName: '',
        vehiclePlateNumber: '',
        vehicleType: 'diesel',
        mileage: '',
        seatCount: 4,
      });
    } catch (err) {
      setAddVehicleError(err.response?.data?.message || 'Failed to add vehicle');
    } finally {
      setIsAddingVehicle(false);
    }
  };

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
      const response = await api.post('/users/profile/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
        headers: { 'Content-Type': 'multipart/form-data' },
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
      gender:           user.gender            || '',
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
      const payload = { ...editForm };
      if (!payload.gender) delete payload.gender;
      const response = await api.patch('/users/profile', payload);
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
      <div className="min-h-[calc(100vh-73px)] bg-[var(--bg-default)] flex items-center justify-center text-[var(--text-secondary)]">
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
    <>
    {/* ═══════════ DESKTOP / BROWSER LAYOUT (unchanged) ═══════════ */}
    <div className="hidden lg:block min-h-[calc(100vh-73px)] relative py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[1400px] mx-auto">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight mb-8">User Profile</h2>

        <div className="glass-panel p-6 sm:p-10 space-y-8 shadow-sm shadow-[var(--border-glow)]">

          {/* ── Missing Gender Prompt ── */}
          {!user.gender && (
            <div className="bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-bold rounded-sm px-4 py-3 flex items-center gap-2">
              ⚠️ Please set your gender below to continue booking or publishing rides.
            </div>
          )}

          {/* ── Profile Photo ── */}
          <div className="flex flex-col items-center pb-6 border-b border-[var(--border-subtle)]">
            <div className="relative group">
              <div className={`w-32 h-32 border-4 rounded-full flex items-center justify-center text-5xl font-bold overflow-hidden ${avatarClasses(user.gender)}`}>
                {user.profileImage
                  ? <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  : <>{user.firstName?.[0]}{user.lastName?.[0]}</>}
              </div>
              <button
                onClick={onProfilePhotoClick}
                disabled={isUploadingProfile}
                className="absolute bottom-0 right-0 p-2 bg-emerald-500/90 hover:bg-emerald-600 rounded-full transition disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Gender</label>
                  <select
                    value={editForm.gender || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                    className="form-input w-full px-3 py-2.5 text-sm"
                  >
                    <option value="" disabled>Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
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
                  <p className="text-right text-[10px] text-[var(--text-muted)]">{(editForm.bio || '').length}/300</p>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 text-sm">
                {[
                  { label: 'Email',    value: user.email },
                  { label: 'Phone',    value: user.phone || 'Not provided' },
                  { label: 'Address',  value: user.address || 'Not provided' },
                  { label: 'Gender',   value: user.gender === 'F' ? 'Female' : user.gender === 'M' ? 'Male' : 'Not set' },
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
            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-4">
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

                  <div className="text-[var(--text-muted)] text-xs text-center">— or search an address below —</div>

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
                        <span className="text-[var(--text-muted)] text-sm flex-shrink-0">📍</span>
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

          {/* ── Vehicles Section ── */}
          <div className="pt-6 border-t border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--primary-base)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-3a4 4 0 00-4-4h-3v7m0 0l-3-3m3 3l3-3" />
                </svg>
                {user.role === 'hybrid' ? 'Vehicle Specifications' : 'Upgrade to Rider'}
              </h4>
              {!showAddVehicle && (
                <button 
                  onClick={() => setShowAddVehicle(true)}
                  className="btn-primary px-3 py-1.5 text-[10px]"
                >
                  {user.role === 'hybrid' ? '+ ADD VEHICLE' : 'UPGRADE NOW'}
                </button>
              )}
            </div>

            {user.role === 'passenger' && !showAddVehicle && (
              <div className="bg-[var(--bg-surface)] border border-[var(--primary-base)]/50 p-5 rounded-sm flex flex-col items-center justify-center text-center space-y-3">
                <p className="text-[var(--text-primary)] font-semibold text-sm">Want to drive others?</p>
                <p className="text-[var(--text-secondary)] text-xs max-w-sm">
                  Add your vehicle details to upgrade your account to a Rider. This allows you to post rides and earn money while commuting.
                </p>
              </div>
            )}

            {showAddVehicle && (
              <form onSubmit={handleAddVehicle} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 rounded-sm space-y-4">
                <h5 className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-widest border-b border-[var(--border-subtle)] pb-2 mb-4">
                  Register New Vehicle
                </h5>
                
                {addVehicleError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-sm text-xs font-bold">
                    {addVehicleError}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Plate Number</label>
                    <div className="relative">
                      <input
                        type="text" required
                        value={newVehicle.vehiclePlateNumber} 
                        onChange={(e) => setNewVehicle({...newVehicle, vehiclePlateNumber: e.target.value})}
                        onBlur={handlePlateLookup}
                        className="form-input w-full px-3 py-2.5 text-sm uppercase tracking-wider" 
                        placeholder="e.g. DL-01-AB-1234"
                      />
                      {isLookingUpPlate && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--primary-base)] animate-pulse font-semibold">Looking up...</span>}
                    </div>
                    {plateLookupError && <p className="text-amber-500 text-[10px] mt-1 font-medium">{plateLookupError}</p>}
                  </div>
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Vehicle Name</label>
                    <input
                      type="text" required
                      value={newVehicle.vehicleName} 
                      onChange={(e) => setNewVehicle({...newVehicle, vehicleName: e.target.value})}
                      className="form-input w-full px-3 py-2.5 text-sm" 
                      placeholder="e.g. Honda City"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Fuel Type</label>
                    <select
                      value={newVehicle.vehicleType}
                      onChange={(e) => setNewVehicle({...newVehicle, vehicleType: e.target.value})}
                      className="form-input w-full px-3 py-2.5 text-sm"
                    >
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="ev">Electric (EV)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Mileage (km/l)</label>
                    <input
                      type="number" required min="1" step="0.1"
                      value={newVehicle.mileage} 
                      onChange={(e) => setNewVehicle({...newVehicle, mileage: e.target.value})}
                      className="form-input w-full px-3 py-2.5 text-sm" 
                      placeholder="e.g. 15.5"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Seat Count</label>
                    <input
                      type="number" required min="1" max="10"
                      value={newVehicle.seatCount} 
                      onChange={(e) => setNewVehicle({...newVehicle, seatCount: e.target.value})}
                      className="form-input w-full px-3 py-2.5 text-sm" 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                  <button type="button" onClick={() => setShowAddVehicle(false)}
                    className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
                    CANCEL
                  </button>
                  <button type="submit" disabled={isAddingVehicle}
                    className="btn-primary px-5 py-2 text-[10px]">
                    {isAddingVehicle ? 'SAVING...' : 'SAVE VEHICLE'}
                  </button>
                </div>
              </form>
            )}

            {user.role === 'hybrid' && (
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
                          <div className="w-full h-48 bg-[var(--bg-surface-hover)]/50 rounded-lg border-2 border-dashed border-[var(--border-hover)] flex flex-col items-center justify-center">
                            <svg className="w-12 h-12 text-[var(--text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-[var(--text-secondary)] text-sm">No vehicle photo</p>
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
                          <span className="text-[var(--text-primary)] font-semibold text-sm">
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
            )}
          </div>

          <div className="pt-6 border-t border-[var(--border-subtle)] flex justify-end">
            <button onClick={handleLogout}
              className="btn-secondary border-red-500 text-red-500 hover:bg-red-500/10 px-5 py-2.5 text-[10px]">
              SIGN OUT
            </button>
          </div>

        </div>
      </div>
    </div>

    {/* ═══════════ MOBILE LAYOUT ═══════════ */}
    <div className="lg:hidden min-h-[calc(100vh-73px)] relative py-5 px-4 space-y-5">
      {/* Photo + name header */}
      <div className="flex flex-col items-center pb-5 border-b border-[var(--border-subtle)]">
        <div className="relative group">
          <div className={`w-24 h-24 border-4 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden ${avatarClasses(user.gender)}`}>
            {user.profileImage
              ? <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              : <>{user.firstName?.[0]}{user.lastName?.[0]}</>}
          </div>
          <button
            onClick={onProfilePhotoClick}
            disabled={isUploadingProfile}
            className="absolute bottom-0 right-0 p-2 bg-emerald-500/90 rounded-full transition disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-3">
          <h3 className="text-lg font-bold tracking-wide text-[var(--text-primary)]">{user.firstName} {user.lastName}</h3>
          <p className="text-[var(--primary-base)] font-bold tracking-widest text-[10px] uppercase mt-1">
            {user.role === 'hybrid' ? 'Car Owner' : 'Passenger'} Account
          </p>
          {isUploadingProfile && (
            <p className="text-xs text-indigo-400 animate-pulse mt-1">Uploading photo…</p>
          )}
        </div>
        {!user.gender && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/40 text-amber-400 text-[10px] font-bold rounded-lg px-3 py-2 text-center">
            ⚠️ Please set your gender below to continue booking or publishing rides.
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl divide-y divide-[var(--border-subtle)] px-4">
        {/* Personal Information */}
        <SettingsRow
          icon={<span>👤</span>}
          title="Personal Information"
          subtitle={user.email}
          expanded={mobileExpanded === 'personal'}
          onToggle={() => toggleMobileSection('personal')}
        >
          <div className="space-y-4">
            <div className="flex justify-end">
              {!editMode ? (
                <button onClick={handleStartEdit} className="btn-secondary min-h-[36px] px-4 text-[10px]">✏️ EDIT DETAILS</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="btn-secondary min-h-[36px] px-4 text-[10px]">CANCEL</button>
                  <button onClick={handleSaveProfile} disabled={saving} className="btn-primary min-h-[36px] px-4 text-[10px] disabled:opacity-50">
                    {saving ? 'SAVING...' : '✓ SAVE'}
                  </button>
                </div>
              )}
            </div>

            {saveError && (
              <div className="bg-[var(--bg-surface)] border border-red-500 text-red-500 text-[10px] rounded-lg px-3 py-2 font-bold">{saveError}</div>
            )}
            {saveSuccess && (
              <div className="bg-[var(--bg-surface)] border border-[var(--primary-base)] text-[var(--primary-base)] text-[10px] rounded-lg px-3 py-2 font-bold">
                ✓ Profile updated successfully!
              </div>
            )}

            {editMode ? (
              <div className="space-y-3">
                <EditField label="First Name" value={editForm.firstName} onChange={(v) => setEditForm(f => ({ ...f, firstName: v }))} />
                <EditField label="Last Name" value={editForm.lastName} onChange={(v) => setEditForm(f => ({ ...f, lastName: v }))} />
                <EditField label="Phone" value={editForm.phone} onChange={(v) => setEditForm(f => ({ ...f, phone: v }))} type="tel" />
                <EditField label="Address" value={editForm.address} onChange={(v) => setEditForm(f => ({ ...f, address: v }))} />
                <EditField label="Emergency Contact" value={editForm.emergencyContact} onChange={(v) => setEditForm(f => ({ ...f, emergencyContact: v }))} type="tel" />
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Gender</label>
                  <select
                    value={editForm.gender || ''}
                    onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                    className="form-input w-full px-3 py-2.5 text-sm min-h-[44px]"
                  >
                    <option value="" disabled>Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    maxLength={300}
                    rows={3}
                    className="form-input w-full px-3 py-2.5 text-sm resize-none"
                    placeholder="Tell others about yourself…"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Phone', value: user.phone || 'Not provided' },
                  { label: 'Address', value: user.address || 'Not provided' },
                  { label: 'Gender', value: user.gender === 'F' ? 'Female' : user.gender === 'M' ? 'Male' : 'Not set' },
                  { label: 'Member Since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">{label}</p>
                    <p className="text-[var(--text-primary)] text-sm font-bold text-right">{value}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <p className="text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">Rating</p>
                  <p className="text-amber-400 font-bold text-sm">★ {user.averageRating?.toFixed(1) || '5.0'} / 5.0</p>
                </div>
                {user.bio && (
                  <p className="text-[var(--text-primary)] text-sm bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-subtle)] italic">"{user.bio}"</p>
                )}
              </div>
            )}
          </div>
        </SettingsRow>

        {/* Home Location */}
        {user.role === 'hybrid' && (
          <SettingsRow
            icon={<span>🏠</span>}
            title="Home Location"
            subtitle={user.homeLocation?.verified ? user.homeLocation.address : 'Not set'}
            expanded={mobileExpanded === 'home'}
            onToggle={() => toggleMobileSection('home')}
          >
            <div className="space-y-3">
              {homeLocError && (
                <div className="bg-[var(--bg-surface)] border border-red-500 text-red-500 text-[10px] rounded-lg px-3 py-2 font-bold">{homeLocError}</div>
              )}
              {!homeLocEdit ? (
                <>
                  {user.homeLocation?.verified ? (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-3 flex items-start gap-2">
                      <span className="text-xl">📍</span>
                      <div className="min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-bold truncate">{user.homeLocation.address || 'Verified Location'}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--primary-base)] rounded-sm uppercase">✓ Verified</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[var(--bg-surface)] border border-amber-500/50 rounded-lg p-3 text-[10px] font-bold text-amber-400">
                      ⚠️ No home location set.
                    </div>
                  )}
                  <button onClick={() => { setHomeLocEdit(true); setHomeLocError(''); }} className="btn-secondary min-h-[44px] w-full text-xs">
                    {user.homeLocation?.verified ? '✏️ CHANGE' : '+ SET LOCATION'}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleUseGPS}
                    disabled={homeLocGPSLoading}
                    className="btn-secondary flex items-center justify-center gap-2 min-h-[44px] w-full disabled:opacity-50 text-xs"
                  >
                    {homeLocGPSLoading ? 'Getting your GPS…' : '📡 Use Current GPS Location'}
                  </button>
                  <div className="text-[var(--text-muted)] text-xs text-center">— or search an address below —</div>
                  <AddressAutocomplete
                    value={homeLoc.address}
                    onChange={({ address, latitude, longitude }) => setHomeLoc({ address, latitude, longitude, verified: false })}
                    placeholder="Search your home address…"
                    showCurrentLocation
                  />
                  {homeLoc.latitude && (
                    <MapPreview
                      location={homeLoc}
                      onLocationChange={(loc) => setHomeLoc((prev) => ({ ...prev, ...loc, verified: false }))}
                      height="180px"
                      interactive
                      onConfirm={() => setHomeLoc((prev) => ({ ...prev, verified: true }))}
                      onUnconfirm={() => setHomeLoc((prev) => ({ ...prev, verified: false }))}
                      confirmed={homeLoc.verified}
                      markerColor="#6366f1"
                    />
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setHomeLocEdit(false); setHomeLocError(''); }} className="btn-secondary min-h-[44px] flex-1 text-xs">CANCEL</button>
                    <button onClick={handleSaveHomeLocation} disabled={homeLocSaving || !homeLoc.latitude} className="btn-primary min-h-[44px] flex-1 text-xs disabled:opacity-50">
                      {homeLocSaving ? 'SAVING...' : '✓ SAVE'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SettingsRow>
        )}

        {/* Location Management */}
        <SettingsRow
          icon={<span>🗺️</span>}
          title="Location Management"
          subtitle={`${locationStats.saved} saved · ${locationStats.frequent} frequent`}
          expanded={mobileExpanded === 'locations'}
          onToggle={() => toggleMobileSection('locations')}
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '📌', label: 'Saved', value: locationStats.saved },
                { icon: '🕐', label: 'Recent', value: locationStats.recent },
                { icon: '🔥', label: 'Frequent', value: locationStats.frequent },
                { icon: '🚗', label: 'Total Trips', value: locationStats.totalUses },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-3 text-center">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
                  <div className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-widest mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <SavedLocationsManager />

            {recentAddresses.length > 0 && (
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg p-4">
                <h4 className="text-[var(--text-primary)] font-bold uppercase tracking-widest text-xs mb-3">Recently Used</h4>
                <div className="space-y-2">
                  {recentAddresses.slice(0, 6).map((addr, i) => (
                    <div key={i} className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
                      <p className="text-[var(--text-primary)] text-xs truncate flex-1 min-w-0">📍 {addr.address}</p>
                      <span className="text-[var(--text-secondary)] text-[10px] flex-shrink-0 ml-2">{timeAgo(addr.lastUsedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {frequentAddresses.length > 0 && (
              <LocationInsights frequentAddresses={frequentAddresses} savedAddresses={savedAddresses} />
            )}
          </div>
        </SettingsRow>

        {/* Vehicles */}
        <SettingsRow
          icon={<span>🚗</span>}
          title={user.role === 'hybrid' ? 'Vehicle Specifications' : 'Upgrade to Rider'}
          subtitle={user.role === 'hybrid' ? `${vehicles.length} vehicle(s)` : 'Add a vehicle to start driving'}
          expanded={mobileExpanded === 'vehicles'}
          onToggle={() => toggleMobileSection('vehicles')}
        >
          <div className="space-y-4">
            {!showAddVehicle && (
              <button onClick={() => setShowAddVehicle(true)} className="btn-primary min-h-[44px] w-full text-xs">
                {user.role === 'hybrid' ? '+ ADD VEHICLE' : 'UPGRADE NOW'}
              </button>
            )}

            {showAddVehicle && (
              <form onSubmit={handleAddVehicle} className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-4 rounded-lg space-y-3">
                {addVehicleError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-2 rounded-lg text-xs font-bold">{addVehicleError}</div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Plate Number</label>
                    <input
                      type="text" required
                      value={newVehicle.vehiclePlateNumber}
                      onChange={(e) => setNewVehicle({ ...newVehicle, vehiclePlateNumber: e.target.value })}
                      onBlur={handlePlateLookup}
                      className="form-input w-full px-3 py-2.5 text-sm uppercase min-h-[44px]"
                      placeholder="e.g. DL-01-AB-1234"
                    />
                    {plateLookupError && <p className="text-amber-500 text-[10px] mt-1">{plateLookupError}</p>}
                  </div>
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Vehicle Name</label>
                    <input
                      type="text" required
                      value={newVehicle.vehicleName}
                      onChange={(e) => setNewVehicle({ ...newVehicle, vehicleName: e.target.value })}
                      className="form-input w-full px-3 py-2.5 text-sm min-h-[44px]"
                      placeholder="e.g. Honda City"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Fuel Type</label>
                      <select
                        value={newVehicle.vehicleType}
                        onChange={(e) => setNewVehicle({ ...newVehicle, vehicleType: e.target.value })}
                        className="form-input w-full px-3 py-2.5 text-sm min-h-[44px]"
                      >
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="ev">Electric (EV)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Mileage</label>
                      <input
                        type="number" required min="1" step="0.1"
                        value={newVehicle.mileage}
                        onChange={(e) => setNewVehicle({ ...newVehicle, mileage: e.target.value })}
                        className="form-input w-full px-3 py-2.5 text-sm min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mb-1 block">Seat Count</label>
                    <input
                      type="number" required min="1" max="10"
                      value={newVehicle.seatCount}
                      onChange={(e) => setNewVehicle({ ...newVehicle, seatCount: e.target.value })}
                      className="form-input w-full px-3 py-2.5 text-sm min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddVehicle(false)} className="btn-secondary min-h-[44px] flex-1 text-xs">CANCEL</button>
                  <button type="submit" disabled={isAddingVehicle} className="btn-primary min-h-[44px] flex-1 text-xs">
                    {isAddingVehicle ? 'SAVING...' : 'SAVE'}
                  </button>
                </div>
              </form>
            )}

            {user.role === 'hybrid' && vehicles.length > 0 && (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div key={vehicle._id} className="border border-[var(--border-subtle)] p-4 rounded-lg bg-[var(--bg-surface)]">
                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      {[
                        { label: 'Name', value: vehicle.vehicleName },
                        { label: 'Plate', value: vehicle.vehiclePlateNumber },
                        { label: 'Fuel', value: vehicle.vehicleType },
                        { label: 'Seats', value: vehicle.seatCount },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[var(--text-secondary)] font-bold text-[9px] uppercase tracking-widest">{label}</p>
                          <p className="text-[var(--text-primary)] font-bold capitalize">{value || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="relative">
                      {vehicle.vehicleImage ? (
                        <img src={vehicle.vehicleImage} alt={vehicle.vehicleName} className="w-full h-32 object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-32 bg-[var(--bg-surface-hover)]/50 rounded-lg border-2 border-dashed border-[var(--border-hover)] flex items-center justify-center">
                          <p className="text-[var(--text-secondary)] text-xs">No vehicle photo</p>
                        </div>
                      )}
                      <button
                        onClick={() => onVehiclePhotoClick(vehicle._id)}
                        disabled={vehicleImageUpload[vehicle._id]}
                        className="absolute bottom-2 right-2 btn-secondary min-h-[36px] px-3 text-[10px]"
                      >
                        {vehicleImageUpload[vehicle._id] ? 'Uploading…' : 'Change Photo'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SettingsRow>
      </div>

      <button
        onClick={handleLogout}
        className="btn-secondary border-red-500 text-red-500 min-h-[48px] w-full text-xs"
      >
        SIGN OUT
      </button>
    </div>
    </>
  );
};

export default Profile;
