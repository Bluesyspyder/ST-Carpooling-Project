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
      min: [1, 'Must have at least 1 available seat'],
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
      enum: ['ACTIVE', 'FULL', 'CANCELLED', 'COMPLETED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

const Ride = mongoose.models.Ride || mongoose.model('Ride', rideSchema);

export default Ride;
