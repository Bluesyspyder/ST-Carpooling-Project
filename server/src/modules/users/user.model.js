import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User Schema definition
 */
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9._%+-]+@st\.com$/, 'Please provide a valid email address ending with @st.com'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['passenger', 'driver', 'admin'],
      default: 'passenger',
    },
    profileImage: {
      type: String,
      default: null,
    },
    averageRating: {
      type: Number,
      default: 5.0,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    // Passenger/Rider helpful fields
    emergencyContact: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    // OTP-based forgot password fields
    resetOtp: {
      type: String,
      default: null,
      select: false,
    },
    resetOtpExpiry: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving to database
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.error('Error hashing password in pre-save hook:', error);
    throw error;
  }
});

// Compare password helper method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
