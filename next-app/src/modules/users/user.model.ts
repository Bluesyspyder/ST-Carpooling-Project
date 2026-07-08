// @ts-nocheck
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
      enum: ['passenger', 'hybrid', 'admin'],
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
    // Saved locations for quick reuse
    savedAddresses: [
      {
        label: { type: String, required: true },
        icon: { type: String, default: '⭐' },
        address: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        isDefault: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        provider: { type: String },
        providerPlaceId: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    // Most recently used locations (capped at 10)
    recentAddresses: [
      {
        address: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        useCount: { type: Number, default: 1 },
        lastUsedAt: { type: Date, default: Date.now },
      },
    ],
    // All-time frequently used locations
    frequentAddresses: [
      {
        address: { type: String, required: true },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        useCount: { type: Number, default: 1 },
        lastUsedAt: { type: Date, default: Date.now },
      },
    ],
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
    // Email verification fields
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    // Home / starting location for the driver (used in impact analysis)
    homeLocation: {
      address: { type: String, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      verified: { type: Boolean, default: false },
    },
    // Raw cancellation tracking metrics
    cancellations24h: {
      type: Number,
      default: 0,
    },
    cancellations6h: {
      type: Number,
      default: 0,
    },
    cancellations2h: {
      type: Number,
      default: 0,
    },
    // ── Green Credits (Phase 1) ──────────────────────────────────────────────
    // Spendable balance — decreases on reward redemption.
    greenCreditsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Never decreases — total ever earned, used for the leaderboard so
    // redeeming rewards doesn't drop a user's rank.
    lifetimeGreenCredits: {
      type: Number,
      default: 0,
    },
    lifetimeCo2SavedKg: {
      type: Number,
      default: 0,
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

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
