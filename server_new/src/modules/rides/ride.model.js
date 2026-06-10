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
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle is required'],
    },
    // Human-readable display strings (derived from location objects)
    source: {
      type: String,
      required: [true, 'Source location is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination location is required'],
      trim: true,
    },
    // Coordinate-authoritative location objects
    pickupLocation: {
      type: locationSchema,
      required: [true, 'Pickup location with coordinates is required'],
    },
    destinationLocation: {
      type: locationSchema,
      required: [true, 'Destination location with coordinates is required'],
    },
    // Cached route data (populated after first calculation, updated on demand)
    routeData: {
      distanceKm:      { type: Number, default: null },
      durationMinutes: { type: Number, default: null },
      provider:        { type: String, default: null },
      calculatedAt:    { type: Date, default: null },
    },
    departureTime: {
      type: Date,
      required: [true, 'Departure time is required'],
    },
    availableSeats: {
      type: Number,
      required: [true, 'Available seats count is required'],
      min: [1, 'Must have at least 1 available seat'],
    },
    pricePerSeat: {
      type: Number,
      required: [true, 'Price per seat is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const Ride = mongoose.model('Ride', rideSchema);

export default Ride;
