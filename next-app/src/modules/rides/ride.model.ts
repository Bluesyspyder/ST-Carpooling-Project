// @ts-nocheck
import mongoose from 'mongoose';

/**
 * Unified location sub-document schema.
 * Used for both pickupLocation and destinationLocation.
 */
const locationSchema = new mongoose.Schema(
  {
    address:         { type: String, required: true },
    latitude:        { type: Number, required: true },
    longitude:       { type: Number, required: true },
    coordinates:     { type: [Number], default: [] }, // [longitude, latitude] — for $geoWithin geofencing
    verified:        { type: Boolean, default: false },
    verifiedAt:      { type: Date, default: null },
    provider:        { type: String, default: null },
    providerPlaceId: { type: String, default: null },
    confidenceScore: { type: Number, default: 1.0 },
  },
  { _id: false }
);

/**
 * Ride Schema definition
 */
const rideSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver is required'],
    },
    driverVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
    },
    journeyDate: {
      type: Date,
      required: [true, 'Journey date is required'],
    },
    journeyTime: {
      type: String,
      required: [true, 'Journey time is required'],
    },
    flexibilityMinutes: {
      type: Number,
      default: 0,
    },
    availableSeats: {
      type: Number,
      required: [true, 'Available seats count is required'],
      min: [0, 'Available seats cannot be negative'],
    },
    bookedSeats: {
      type: Number,
      default: 0,
    },
    pickupLocation: {
      type: locationSchema,
      required: [true, 'Pickup location with coordinates is required'],
    },
    destinationLocation: {
      type: locationSchema,
      required: [true, 'Destination location with coordinates is required'],
    },
    routeDistance: { type: Number, default: null },
    routeDuration: { type: Number, default: null },
    notes: { type: String, default: '' },
    rideStatus: {
      type: String,
      enum: ['ACTIVE', 'FULL', 'FROZEN', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'],
      default: 'ACTIVE',
    },
    driverCreditsEarned: { type: Number, default: 0 },
    totalEmissionSavedKg: { type: Number, default: 0 },

    // ── Via-Stops (Phase 3 — Feature 1) ─────────────────────────────────────────
    // Up to 2 optional intermediate waypoints along the driver's route.
    // Used for corridor-based passenger matching.
    viaStops: {
      type: [locationSchema],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 2,
        message: 'A ride can have at most 2 via-stops.',
      },
    },

    // ── Recurring Rides (Phase 3 — Feature 2) ────────────────────────────────────
    // When isRecurring is true, the CRON endpoint clones this ride daily
    // for each day-of-week listed in weeklyDays (0 = Sun … 6 = Sat).
    isRecurring: { type: Boolean, default: false },
    weeklyDays: {
      type: [Number],
      default: [],
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: 'weeklyDays values must be integers 0–6 (Sunday–Saturday).',
      },
    },
    // Child ride instances point back to the template they were spawned from.
    recurringParentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index enables the $geoWithin zone-geofence filter in getRides().
rideSchema.index({ 'pickupLocation.coordinates': '2dsphere' });

const Ride = mongoose.models.Ride || mongoose.model('Ride', rideSchema);

export default Ride;
