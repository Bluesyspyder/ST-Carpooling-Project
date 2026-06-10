import * as userService from './user.service.js';
import ApiError from '../../shared/utils/api-error.js';

// ─── Profile ─────────────────────────────────────────────────────────────────

export const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return res.status(200).json({ status: 'success', data: { user } });
  } catch (error) { next(error); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.id, req.body);
    return res.status(200).json({ status: 'success', data: { user } });
  } catch (error) { next(error); }
};

export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.fileBase64) throw new ApiError(400, 'No image file provided');
    const user = await userService.updateUser(req.user.id, { profileImage: req.fileBase64 });
    return res.status(200).json({ status: 'success', message: 'Profile image uploaded successfully', data: { user } });
  } catch (error) { next(error); }
};

// ─── Saved Addresses ─────────────────────────────────────────────────────────

export const getSavedAddresses = async (req, res, next) => {
  try {
    const savedAddresses = await userService.getSavedAddresses(req.user.id);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const addSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.addSavedAddress(req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const updateSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.updateSavedAddress(req.user.id, req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const deleteSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.deleteSavedAddress(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

export const setDefaultSavedAddress = async (req, res, next) => {
  try {
    const savedAddresses = await userService.setDefaultSavedAddress(req.user.id, req.params.id);
    res.status(200).json({ status: 'success', data: { savedAddresses } });
  } catch (error) { next(error); }
};

// ─── Recent / Frequent ───────────────────────────────────────────────────────

export const getRecentAddresses = async (req, res, next) => {
  try {
    const recentAddresses = await userService.getRecentAddresses(req.user.id);
    res.status(200).json({ status: 'success', data: { recentAddresses } });
  } catch (error) { next(error); }
};

export const getFrequentAddresses = async (req, res, next) => {
  try {
    const frequentAddresses = await userService.getFrequentAddresses(req.user.id);
    res.status(200).json({ status: 'success', data: { frequentAddresses } });
  } catch (error) { next(error); }
};
