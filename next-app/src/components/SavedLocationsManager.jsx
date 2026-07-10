"use client";
import { useState, useEffect } from 'react';
import {
  fetchSavedAddresses,
  addSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  setDefaultSavedAddress,
} from '@/services/locationService';
import AddressAutocomplete from './AddressAutocomplete.jsx';
import MapPreview from './MapPreview.jsx';

const ICONS = ['🏠', '🏫', '🏢', '💼', '🏥', '🛒', '⭐', '❤️', '📍', '🎯'];

const defaultForm = () => ({ label: '', icon: '⭐', address: '', latitude: null, longitude: null, verified: false });

/**
 * Full CRUD panel for saved addresses — used on the Profile page.
 */
const SavedLocationsManager = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewLocation, setViewLocation] = useState(null);

  const load = async () => {
    try {
      const data = await fetchSavedAddresses();
      setAddresses(data || []);
    } catch (error) {
      console.error('Failed to load saved addresses:', error);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(defaultForm());
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (addr) => {
    setForm({ label: addr.label, icon: addr.icon || '⭐', address: addr.address, latitude: addr.latitude, longitude: addr.longitude, verified: addr.verified });
    setEditId(addr._id);
    setError('');
    setShowModal(true);
  };

  const handleAddressSelect = (loc) => {
    setForm((f) => ({ ...f, address: loc.address, latitude: loc.latitude, longitude: loc.longitude, verified: false }));
  };

  const handleMapLocationChange = (loc) => {
    setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude, verified: false }));
  };

  const handleConfirmLocation = () => {
    setForm((f) => ({ ...f, verified: true }));
  };

  const handleUnconfirmLocation = () => {
    setForm((f) => ({ ...f, verified: false }));
  };

  const handleSave = async () => {
    if (!form.label.trim()) { setError('Please enter a label.'); return; }
    if (!form.address || !form.latitude) { setError('Please select an address from the suggestions.'); return; }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await updateSavedAddress(editId, form);
      } else {
        await addSavedAddress(form);
      }
      await load();
      setShowModal(false);
    } catch (err) {
      console.error('[SavedLocationsManager] Failed to save address:', err);
      setError(err.response?.data?.message || 'Failed to save address.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this saved address?')) return;
    try {
      await deleteSavedAddress(id);
      await load();
    } catch (error) {
      console.error('Failed to delete saved address:', error);
      alert('Failed to delete address. Please try again.');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultSavedAddress(id);
      await load();
    } catch (error) {
      console.error('Failed to set default saved address:', error);
      alert('Failed to set default address. Please try again.');
    }
  };

  if (loading) return <div className="text-[var(--text-secondary)] text-sm py-4">Loading saved locations…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2"><span>📌</span> Saved Locations</h3>
        <button onClick={openAdd} className="bg-violet-600 hover:bg-violet-500 text-[var(--text-primary)] text-sm px-4 py-2 rounded-lg transition-colors">
          + Add Location
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-[var(--bg-surface-hover)]/40 border border-[var(--border-default)]/50 rounded-xl p-8 text-center">
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-[var(--text-primary)] font-medium">No saved locations yet</p>
          <p className="text-[var(--text-muted)] text-sm mt-1">Add your Home and Office for quick access.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <div key={addr._id} className="flex items-center justify-between bg-[var(--bg-surface-hover)]/40 border border-[var(--border-default)]/50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{addr.icon || '⭐'}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-primary)] font-medium text-sm">{addr.label}</span>
                    {addr.isDefault && <span className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">Default</span>}
                    {addr.verified && <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">Verified</span>}
                  </div>
                  <p className="text-[var(--text-muted)] text-xs truncate">{addr.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button onClick={() => setViewLocation(addr)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs px-2 py-1 rounded transition-colors">Map</button>
                <button onClick={() => handleSetDefault(addr._id)} className="text-[var(--text-secondary)] hover:text-violet-300 text-xs px-2 py-1 rounded transition-colors">Default</button>
                <button onClick={() => openEdit(addr)} className="text-[var(--text-secondary)] hover:text-blue-300 text-xs px-2 py-1 rounded transition-colors">Edit</button>
                <button onClick={() => handleDelete(addr._id)} className="text-[var(--text-secondary)] hover:text-red-300 text-xs px-2 py-1 rounded transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-5">{editId ? 'Edit Location' : 'Add Location'}</h3>

            {/* Icon picker */}
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-secondary)] mb-2">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                    className={`text-2xl p-1.5 rounded-lg transition-all ${form.icon === ic ? 'bg-violet-600/40 ring-1 ring-violet-500' : 'hover:bg-slate-700/50'}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div className="mb-4">
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Label</label>
              <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Home, Office, College"
                className="w-full bg-[var(--bg-surface-hover)]/60 border border-[var(--border-hover)]/50 rounded-lg px-4 py-2.5 text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm" />
            </div>

            {/* Address Autocomplete */}
            <div className="mb-4">
              <AddressAutocomplete
                value={form.address}
                onChange={handleAddressSelect}
                placeholder="Search for an address…"
                label="Address"
                showCurrentLocation
              />
            </div>

            {/* Map Preview */}
            {form.latitude && (
              <div className="mb-4">
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Confirm pin position</label>
                <MapPreview
                  location={form}
                  onLocationChange={handleMapLocationChange}
                  height="220px"
                  interactive
                  onConfirm={handleConfirmLocation}
                  onUnconfirm={handleUnconfirmLocation}
                  confirmed={form.verified}
                  markerColor="#7c3aed"
                />
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-violet-600 hover:bg-violet-500 text-[var(--text-primary)] text-sm px-5 py-2 rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View on Map Modal */}
      {viewLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setViewLocation(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-primary)] font-semibold">{viewLocation.icon} {viewLocation.label}</h3>
              <button onClick={() => setViewLocation(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">✕</button>
            </div>
            <MapPreview location={viewLocation} height="200px" interactive={false} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedLocationsManager;
