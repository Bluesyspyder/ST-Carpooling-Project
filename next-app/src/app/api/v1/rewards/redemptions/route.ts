// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-wrapper';
import * as rewardService from '@/modules/rewards/reward.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const redemptions = await rewardService.getMyRedemptions(user.id);
  return NextResponse.json({ status: 'success', data: { redemptions } }, { status: 200 });
}, { protect: true });
