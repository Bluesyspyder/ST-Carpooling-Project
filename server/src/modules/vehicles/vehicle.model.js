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
    vehicleName: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
    },
    vehiclePlateNumber: {
      type: String,
      required: [true, 'Vehicle plate number is required'],
      trim: true,
      unique: true,
      uppercase: true,
    },
    // Kept for compatibility with older databases that still have a unique
    // registrationNumber index. The app uses vehiclePlateNumber as the public field.
    registrationNumber: {
      type: String,
      trim: true,
      unique: true,
      uppercase: true,
    },
    seatCount: {
      type: Number,
      required: [true, 'Seat count is required'],
      min: [1, 'Seat count must be at least 1'],
      max: [10, 'Seat count cannot exceed 10'],
    },
    vehicleType: {
      type: String,
      enum: ['diesel', 'petrol', 'ev'],
      required: [true, 'Vehicle type is required'],
    },
    mileage: {
      type: Number,
      required: [true, 'Vehicle mileage is required'],
    },
    vehicleImage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.pre('validate', function () {
  if (!this.registrationNumber && this.vehiclePlateNumber) {
    this.registrationNumber = this.vehiclePlateNumber;
  }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
