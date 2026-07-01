// @ts-nocheck
import User from './user.model';
import { ApiError } from '@/lib/api-wrapper';

// ─── Existing helpers ────────────────────────────────────────────────────────

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

export const updateUser = async (id, updateData) => {
  delete updateData.password;
  delete updateData.email;
  delete updateData.role;
  const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Saved Addresses ─────────────────────────────────────────────────────────

export const getSavedAddresses = async (userId) => {
  const user = await User.findById(userId).select('savedAddresses');
  if (!user) throw new ApiError(404, 'User not found');
  return user.savedAddresses;
};

export const addSavedAddress = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Check duplicate by rounded coords
  const isDuplicate = user.savedAddresses.some(
    (a) =>
      Math.abs(a.latitude - data.latitude) < 0.0001 &&
      Math.abs(a.longitude - data.longitude) < 0.0001
  );
  if (isDuplicate) throw new ApiError(409, 'A saved address at this location already exists.');

  user.savedAddresses.push({
    label: data.label,
    icon: data.icon || '⭐',
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    isDefault: data.isDefault || false,
    verified: data.verified || false,
    provider: data.provider,
    providerPlaceId: data.providerPlaceId,
  });
  await user.save();
  return user.savedAddresses;
};

export const updateSavedAddress = async (userId, addressId, data) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  const addr = user.savedAddresses.id(addressId);
  if (!addr) throw new ApiError(404, 'Saved address not found');

  if (data.label !== undefined) addr.label = data.label;
  if (data.icon !== undefined) addr.icon = data.icon;
  if (data.address !== undefined) addr.address = data.address;
  if (data.latitude !== undefined) addr.latitude = data.latitude;
  if (data.longitude !== undefined) addr.longitude = data.longitude;
  if (data.verified !== undefined) addr.verified = data.verified;
  if (data.provider !== undefined) addr.provider = data.provider;
  if (data.providerPlaceId !== undefined) addr.providerPlaceId = data.providerPlaceId;
  addr.updatedAt = new Date();

  await user.save();
  return user.savedAddresses;
};

export const deleteSavedAddress = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  const addr = user.savedAddresses.id(addressId);
  if (!addr) throw new ApiError(404, 'Saved address not found');
  addr.deleteOne();
  await user.save();
  return user.savedAddresses;
};

export const setDefaultSavedAddress = async (userId, addressId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  user.savedAddresses.forEach((a) => { a.isDefault = a._id.toString() === addressId; });
  await user.save();
  return user.savedAddresses;
};

// ─── Recent / Frequent Addresses ─────────────────────────────────────────────

export const getRecentAddresses = async (userId) => {
  const user = await User.findById(userId).select('recentAddresses');
  if (!user) throw new ApiError(404, 'User not found');
  return [...user.recentAddresses].sort((a, b) => {
    if (b.useCount !== a.useCount) {
      return b.useCount - a.useCount;
    }
    return new Date(b.lastUsedAt) - new Date(a.lastUsedAt);
  });
};

export const getFrequentAddresses = async (userId) => {
  const user = await User.findById(userId).select('frequentAddresses');
  if (!user) throw new ApiError(404, 'User not found');
  return [...user.frequentAddresses].sort(
    (a, b) => b.useCount - a.useCount || b.lastUsedAt - a.lastUsedAt
  );
};

/**
 * Shared helper: upsert into frequentAddresses + recentAddresses (capped at 10).
 * Deduplication by lat/lng rounded to 5 decimal places.
 */
export const recordLocationUsage = async (userId, locationData) => {
  if (!locationData?.latitude || !locationData?.longitude) return;
  const user = await User.findById(userId);
  if (!user) return;

  const roundedLat = Math.round(locationData.latitude * 1e5) / 1e5;
  const roundedLng = Math.round(locationData.longitude * 1e5) / 1e5;
  const address = locationData.address || '';
  const now = new Date();

  // ── frequentAddresses ──
  const freqEntry = user.frequentAddresses.find(
    (e) =>
      Math.round(e.latitude * 1e5) / 1e5 === roundedLat &&
      Math.round(e.longitude * 1e5) / 1e5 === roundedLng
  );
  if (freqEntry) {
    freqEntry.useCount += 1;
    freqEntry.lastUsedAt = now;
    if (address) freqEntry.address = address;
  } else {
    user.frequentAddresses.push({ address, latitude: locationData.latitude, longitude: locationData.longitude, useCount: 1, lastUsedAt: now });
  }

  // ── recentAddresses (cap at 10) ──
  const recentIdx = user.recentAddresses.findIndex(
    (e) =>
      Math.round(e.latitude * 1e5) / 1e5 === roundedLat &&
      Math.round(e.longitude * 1e5) / 1e5 === roundedLng
  );
  if (recentIdx !== -1) {
    user.recentAddresses[recentIdx].lastUsedAt = now;
    user.recentAddresses[recentIdx].useCount += 1;
    if (address) user.recentAddresses[recentIdx].address = address;
  } else {
    user.recentAddresses.push({ address, latitude: locationData.latitude, longitude: locationData.longitude, useCount: 1, lastUsedAt: now });
    // Sort newest first and cap at 10
    user.recentAddresses.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    if (user.recentAddresses.length > 10) user.recentAddresses.splice(10);
  }

  await user.save();
};
