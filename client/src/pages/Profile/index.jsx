import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import api from '../../services/api.js';
import SavedLocationsManager from '../../components/SavedLocationsManager.jsx';
import LocationInsights from '../../components/LocationInsights.jsx';
import AddressAutocomplete from '../../components/AddressAutocomplete.jsx';
import MapPreview from '../../components/MapPreview.jsx';
import {
  fetchFrequentAddresses,
  fetchRecentAddresses,
  fetchSavedAddresses,
} from '../../services/locationService.js';

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
    <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{label}</label>
    {readOnly ? (
      <p className="text-slate-200 text-sm font-medium bg-slate-900/30 border border-slate-800/60 rounded-lg px-3 py-2.5 select-all">
        {value || '—'}
      </p>
    ) : (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full bg-slate-900/60 border border-slate-700/60 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none transition"
      />
    )}
  </div>
);

/* ═══════════════════════════ PROFILE PAGE ═══════════════════════════ */

const Profile = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

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
  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
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
      setSaveError(err.response?.data?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── handlers: GPS home location ── */
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setHomeLocError('Geolocation is not supported by your browser.');
      return;
    }
    setHomeLocGPSLoading(true);
    setHomeLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setHomeLoc({ address: `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`, latitude: lat, longitude: lng });
        setHomeLocGPSLoading(false);
      },
      (err) => {
        setHomeLocError('Could not get GPS location: ' + err.message);
        setHomeLocGPSLoading(false);
      },
      { timeout: 10000 }
    );
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
      setHomeLocError(err.response?.data?.message || 'Failed to save home location.');
    } finally {
      setHomeLocSaving(false);
    }
  };

  /* ── guards ── */
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-73px)] bg-slate-950 flex items-center justify-center text-slate-400">
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
    <div className="min-h-[calc(100vh-73px)] bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[1400px] mx-auto">
        <h2 className="text-3xl font-extrabold text-slate-100 mb-8">User Profile</h2>

        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-10 space-y-8">

          {/* ── Profile Photo ── */}
          <div className="flex flex-col items-center pb-6 border-b border-slate-800">
            <div className="relative group">
              <div className="w-32 h-32 bg-emerald-500/10 border-4 border-emerald-500/30 rounded-full flex items-center justify-center text-5xl font-bold text-emerald-400 overflow-hidden">
                {user.profileImage
                  ? <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  : <>{user.firstName?.[0]}{user.lastName?.[0]}</>}
              </div>
              <button
                onClick={() => profileInputRef.current?.click()}
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
              <h3 className="text-2xl font-bold text-slate-100">{user.firstName} {user.lastName}</h3>
              <p className="text-emerald-400 font-semibold text-sm capitalize mt-1">
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
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>👤</span> Personal Information
              </h3>
              {!editMode ? (
                <button
                  id="edit-profile-btn"
                  onClick={handleStartEdit}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition"
                >
                  ✏️ Edit Details
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="save-profile-btn"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : '✓ Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {saveError && (
              <div className="bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-2.5">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg px-4 py-2.5">
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
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Bio <span className="text-slate-600 normal-case">(max 300 chars)</span></label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    maxLength={300}
                    rows={3}
                    className="w-full bg-slate-900/60 border border-slate-700/60 focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 text-slate-100 rounded-lg px-3 py-2.5 text-sm outline-none transition resize-none"
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
                    <p className="text-slate-400 font-medium text-xs">{label}</p>
                    <p className="text-slate-200 text-sm">{value}</p>
                  </div>
                ))}
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium text-xs">Average Rating</p>
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {user.averageRating?.toFixed(1) || '5.0'} / 5.0
                  </div>
                </div>
                {user.emergencyContact && (
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium text-xs">Emergency Contact</p>
                    <p className="text-slate-200 text-sm">{user.emergencyContact}</p>
                  </div>
                )}
              </div>
            )}

            {!editMode && user.bio && (
              <div className="pt-2 space-y-1">
                <p className="text-slate-400 text-xs font-medium">Bio</p>
                <p className="text-slate-300 text-sm bg-slate-900/40 p-3 rounded-lg border border-slate-800/60 italic">"{user.bio}"</p>
              </div>
            )}
          </div>

          {/* ════ HOME LOCATION SECTION (Feature 7 — GPS Support) ════ */}
          {user.role === 'hybrid' && (
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>🏠</span> Home Location
                  <span className="text-xs text-slate-500 font-normal">(used for pickup impact analysis)</span>
                </h3>
                {!homeLocEdit ? (
                  <button
                    id="edit-home-location-btn"
                    onClick={() => { setHomeLocEdit(true); setHomeLocError(''); }}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition"
                  >
                    {user.homeLocation?.verified ? '✏️ Change' : '+ Set Location'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setHomeLocEdit(false); setHomeLocError(''); }}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      id="save-home-location-btn"
                      onClick={handleSaveHomeLocation}
                      disabled={homeLocSaving || !homeLoc.latitude}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition disabled:opacity-50"
                    >
                      {homeLocSaving ? 'Saving…' : '✓ Confirm & Save'}
                    </button>
                  </div>
                )}
              </div>

              {homeLocError && (
                <div className="bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-lg px-4 py-2.5">
                  {homeLocError}
                </div>
              )}

              {!homeLocEdit ? (
                user.homeLocation?.verified ? (
                  <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="text-slate-200 text-sm font-semibold">{user.homeLocation.address || 'Verified Location'}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {user.homeLocation.latitude?.toFixed(5)}, {user.homeLocation.longitude?.toFixed(5)}
                      </p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded-full">
                        ✓ Verified
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-400/80">
                    ⚠️ No home location set. Set your home address so drivers and the system can calculate pickup impact accurately.
                  </div>
                )
              ) : (
                <div className="space-y-4 bg-slate-900/30 border border-slate-700/40 rounded-xl p-4">
                  {/* GPS Button */}
                  <button
                    id="use-gps-btn"
                    onClick={handleUseGPS}
                    disabled={homeLocGPSLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold transition disabled:opacity-50"
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
          <div className="pt-6 border-t border-slate-800 space-y-8">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
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
                <div key={label} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-2xl font-extrabold text-slate-100">{value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <SavedLocationsManager />

            {recentAddresses.length > 0 && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
                <h4 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
                  <span>🕐</span> Recently Used
                </h4>
                <div className="space-y-2">
                  {recentAddresses.slice(0, 10).map((addr, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-500 text-sm flex-shrink-0">📍</span>
                        <p className="text-slate-200 text-sm truncate">{addr.address}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {addr.useCount > 1 && (
                          <span className="text-xs text-slate-500">{addr.useCount}×</span>
                        )}
                        <span className="text-slate-500 text-xs">{timeAgo(addr.lastUsedAt)}</span>
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
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-3a4 4 0 00-4-4h-3v7m0 0l-3-3m3 3l3-3" />
                </svg>
                Vehicle Specifications
              </h4>
              <div className="space-y-4">
                {vehicles.length > 0 ? vehicles.map((vehicle) => (
                  <div key={vehicle._id} className="border border-slate-800/80 p-5 rounded-2xl bg-slate-900/20">
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      {[
                        { label: 'Vehicle Name',   value: vehicle.vehicleName },
                        { label: 'Plate Number',   value: vehicle.vehiclePlateNumber, mono: true },
                        { label: 'Fuel Type',      value: vehicle.vehicleType, capitalize: true },
                        { label: 'Mileage',        value: `${vehicle.mileage} km/l` },
                        { label: 'Seats',          value: vehicle.seatCount },
                      ].map(({ label, value, mono, capitalize }) => (
                        <div key={label} className="space-y-1">
                          <p className="text-slate-400 font-medium text-sm">{label}</p>
                          <p className={`text-slate-200 text-base font-semibold ${mono ? 'font-mono uppercase tracking-wider' : ''} ${capitalize ? 'capitalize' : ''}`}>
                            {value || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-800/50 pt-4">
                      <p className="text-slate-400 font-medium text-sm mb-3">Vehicle Photo</p>
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
                        <label className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                          <input type="file" accept="image/*"
                            onChange={(e) => handleVehiclePhotoChange(vehicle._id, e.target.files[0])}
                            disabled={vehicleImageUpload[vehicle._id]}
                            className="hidden" />
                          <span className="text-white font-semibold text-sm">
                            {vehicleImageUpload[vehicle._id] ? 'Uploading...' : 'Change Photo'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-slate-400 bg-slate-900/20 border border-slate-800/80 p-5 rounded-2xl">
                    No vehicle details found.
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-800 flex justify-end">
            <button onClick={handleLogout}
              className="px-5 py-2.5 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 text-red-400 rounded-lg text-sm font-bold transition duration-200">
              Sign Out
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
