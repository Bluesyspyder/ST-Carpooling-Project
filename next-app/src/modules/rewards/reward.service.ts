// @ts-nocheck
import Reward from './reward.model';
import Redemption from './redemption.model';
import User from '../users/user.model';
import { ApiError } from '@/lib/api-wrapper';

// ── Catalog seed (mirrors the mock rewards the green-credits page shipped with) ──
const SEED_REWARDS = [
  { title: 'Cafeteria Coffee', description: 'A free coffee from the office cafeteria.', cost: 300, icon: '☕', category: 'cafeteria' },
  { title: 'Priority Parking Pass', description: 'Reserved parking spot for a week.', cost: 250, icon: '🅿️', category: 'parking' },
  { title: 'Company Eco Swag', description: 'Branded eco-friendly merchandise.', cost: 400, icon: '🎁', category: 'swag' },
  { title: 'Free Lunch Voucher', description: 'One free meal at the cafeteria.', cost: 300, icon: '🍱', category: 'cafeteria' },
  { title: 'Half-Day Off', description: 'Redeem for a half day of paid leave.', cost: 1000, icon: '🌴', category: 'leave' },
  { title: 'Eco Champion Badge', description: 'A digital badge for your profile.', cost: 50, icon: '🏅', category: 'swag' },
];

const CODE_PREFIX_BY_CATEGORY = {
  cafeteria: 'CFE',
  parking: 'PRK',
  swag: 'SWG',
  leave: 'LVE',
  general: 'GEN',
};

const generateCode = (category) => {
  const prefix = CODE_PREFIX_BY_CATEGORY[category] || 'GEN';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ST-${prefix}-${random}`;
};

/**
 * Lazily seed the reward catalog on first read — avoids needing a separate
 * seed script/ops step for this initial rollout.
 */
export const getRewardCatalog = async () => {
  const count = await Reward.countDocuments();
  if (count === 0) {
    await Reward.insertMany(SEED_REWARDS);
  }
  return Reward.find({ isActive: true }).sort({ cost: 1 });
};

/**
 * Redeem a reward: atomically deducts the user's balance (guarded so a
 * balance can never go negative even under concurrent redemptions), then
 * writes a permanent redemption record with a generated unique code.
 */
export const redeemReward = async (userId, rewardId) => {
  const reward = await Reward.findOne({ _id: rewardId, isActive: true });
  if (!reward) throw new ApiError(404, 'Reward not found');

  // Guarded conditional update: only succeeds if the balance is still
  // sufficient at write time, preventing a double-spend race between a
  // stale read and this write.
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, greenCreditsBalance: { $gte: reward.cost } },
    { $inc: { greenCreditsBalance: -reward.cost } },
    { new: true }
  );
  if (!updatedUser) throw new ApiError(400, 'Insufficient green credits');

  let redemptionCode = generateCode(reward.category);
  let redemption;
  try {
    redemption = await Redemption.create({
      user: userId,
      reward: reward._id,
      title: reward.title,
      cost: reward.cost,
      redemptionCode,
    });
  } catch (err) {
    // Extremely unlikely code collision — retry once with a fresh code.
    if (err.code === 11000) {
      redemptionCode = generateCode(reward.category);
      redemption = await Redemption.create({
        user: userId,
        reward: reward._id,
        title: reward.title,
        cost: reward.cost,
        redemptionCode,
      });
    } else {
      // Refund the balance since the redemption record failed to persist.
      await User.findByIdAndUpdate(userId, { $inc: { greenCreditsBalance: reward.cost } });
      throw err;
    }
  }

  return { redemption, balance: updatedUser.greenCreditsBalance };
};

export const getMyRedemptions = async (userId) => {
  return Redemption.find({ user: userId }).sort({ createdAt: -1 });
};
