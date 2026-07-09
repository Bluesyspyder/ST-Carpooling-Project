// @ts-nocheck
import mongoose from 'mongoose';

/**
 * Unified location sub-document schema (mirrors ride.model.js)
 */
const locationSchema = new mongoose.Schema(
  {
    address:         { type: String, required: true },
    latitude:        { type: Number, required: true },
    longitude:       { type: Number, required: true },
    coordinates:     { type: [Number], default: [] }, // [longitude, latitude]
    verified:        { type: Boolean, default: false },
    verifiedAt:      { type: Date, default: null },
    provider:        { type: String, default: null },
    providerPlaceId: { type: String, default: null },
    confidenceScore: { type: Number, default: 1.0 },
  },
  { _id: false }
);

/**
 * Booking Schema definition
 */
const bookingSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride is required'],
    },
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Passenger is required'],
    },
    seatsBooked: {
      type: Number,
      required: [true, 'Seats booked count is required'],
      min: [1, 'Must book at least 1 seat'],
    },
    bookingAmount: {
      type: Number,
      required: [true, 'Booking amount is required'],
      min: [0, 'Booking amount cannot be negative'],
    },
    bookingStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'rejected', 'waitlisted'],
      default: 'pending',
    },
    pickupLocation: {
      type: locationSchema,
      required: [true, 'Pickup location with coordinates is required'],
    },

    // ── Rating fields (Phase 13) ─────────────────────────────────────────────────
    rated:           { type: Boolean, default: false },
    rating:          { type: Number, min: 1, max: 5, default: null },
    ratingComment:   { type: String, default: '' },

    // ── Eco-credit / emissions attribution (set when the parent ride completes) ──
    creditsEarned:    { type: Number, default: 0 },
    emissionSavedKg:  { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

export default Booking;
