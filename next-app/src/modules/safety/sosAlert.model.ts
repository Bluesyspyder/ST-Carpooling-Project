// @ts-nocheck
import mongoose from 'mongoose';

/**
 * Permanent audit log of SOS / panic-button broadcasts. Unlike Notification
 * (TTL-capped), safety records must never auto-expire — they back incident
 * review and any follow-up investigation.
 */
const sosAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    // Ride context is optional — an SOS can be raised outside an active ride.
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
      index: true,
    },
    // Role of the person who triggered it, for triage.
    triggeredBy: {
      type: String,
      enum: ['driver', 'passenger'],
      default: 'driver',
    },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    message: {
      type: String,
      default: 'SOS alert triggered.',
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
    },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const SosAlert = mongoose.models.SosAlert || mongoose.model('SosAlert', sosAlertSchema);

export default SosAlert;
