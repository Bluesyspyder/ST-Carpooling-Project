import mongoose from 'mongoose';

/**
 * Vehicle Schema definition
 */
const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Vehicle manufacturing year is required'],
      min: [1990, 'Year must be greater than or equal to 1990'],
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    seatCount: {
      type: Number,
      required: [true, 'Seat count is required'],
      min: [1, 'Seat count must be at least 1'],
      max: [10, 'Seat count cannot exceed 10'],
    },
    type: {
      type: String,
      enum: ['diesel', 'petrol', 'ev'],
      required: [true, 'Vehicle type is required'],
    },
    mileage: {
      type: Number,
      required: [true, 'Vehicle mileage is required'],
    },
  },
  {
    timestamps: true,
  }
);

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
