// @ts-nocheck
import mongoose from 'mongoose';

/**
 * Reward catalog entry. Seeded lazily (see reward.service.ts) since there's
 * no admin CMS yet — treat this as the canonical, editable-in-DB catalog.
 */
const rewardSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, default: '' },
    cost: { type: Number, required: [true, 'Cost is required'], min: [1, 'Cost must be at least 1'] },
    icon: { type: String, default: '🎁' },
    category: { type: String, default: 'general' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Reward = mongoose.models.Reward || mongoose.model('Reward', rewardSchema);

export default Reward;
