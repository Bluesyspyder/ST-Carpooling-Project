// @ts-nocheck
import { z } from 'zod';

export const redeemRewardSchema = z.object({
  body: z.object({
    rewardId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Reward ID format'),
  }),
});
