// @ts-nocheck
import SosAlert from './sosAlert.model';

/**
 * Persist an SOS broadcast for the safety audit trail. This runs alongside the
 * realtime socket broadcast (which alerts passengers instantly) — the DB record
 * is the durable trail that outlives the live session.
 */
export const recordSosAlert = async (userId, data = {}) => {
  const location =
    data.location && (data.location.latitude != null || data.location.longitude != null)
      ? { latitude: data.location.latitude ?? null, longitude: data.location.longitude ?? null }
      : { latitude: null, longitude: null };

  return SosAlert.create({
    user: userId,
    ride: data.rideId || null,
    triggeredBy: data.triggeredBy || 'driver',
    message: data.message || 'SOS alert triggered.',
    location,
  });
};

/**
 * SOS alerts raised by a user (their own history).
 */
export const getMySosAlerts = async (userId) => {
  return SosAlert.find({ user: userId }).sort({ createdAt: -1 });
};
