// @ts-nocheck
import mongoose from 'mongoose';

/**
 * Permanent redemption transaction log (unlike Notification, this is NOT
 * TTL-capped — it's the user's spend history and the record backing each
 * generated coupon/pass code).
 *
 * title/cost are snapshotted at redemption time so a later catalog edit
 * doesn't rewrite history.
 */
const redemptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reward',
      required: [true, 'Reward is required'],
    },
    title: { type: String, required: true },
    cost: { type: Number, required: true },
    redemptionCode: { type: String, required: true, unique: true, uppercase: true },
    status: {
      type: String,
      enum: ['issued', 'used', 'expired'],
      default: 'issued',
    },
  },
  { timestamps: true }
);

const Redemption = mongoose.models.Redemption || mongoose.model('Redemption', redemptionSchema);

export default Redemption;
