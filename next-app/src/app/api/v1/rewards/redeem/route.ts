// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as rewardService from '@/modules/rewards/reward.service';
import { redeemRewardSchema } from '@/modules/rewards/reward.validation';

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(redeemRewardSchema, { body: rawBody }).body;
  const result = await rewardService.redeemReward(user.id, body.rewardId);
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, { protect: true, rateLimit: { name: 'rewards-redeem', limit: 15, windowSeconds: 60 } });
