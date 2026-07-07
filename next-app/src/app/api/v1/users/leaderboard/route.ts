// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const [leaderboard, myRank] = await Promise.all([
    userService.getLeaderboard(20),
    userService.getUserRank(user.id),
  ]);
  return NextResponse.json({
    status: 'success',
    data: { leaderboard, myRank },
  }, { status: 200 });
}, { protect: true });
