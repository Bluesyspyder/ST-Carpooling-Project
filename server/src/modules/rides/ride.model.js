import mongoose from 'mongoose';

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
    pickupLocation: {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      geocodingFallbackLevel: { type: String },
      geocodingVerified: { type: Boolean, default: true }
    },
    destinationLocation: {
      address: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      geocodingFallbackLevel: { type: String },
      geocodingVerified: { type: Boolean, default: true }
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
