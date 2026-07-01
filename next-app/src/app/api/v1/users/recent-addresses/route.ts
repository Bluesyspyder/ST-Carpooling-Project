// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const recentAddresses = await userService.getRecentAddresses(user.id);
  return NextResponse.json({ status: 'success', data: { recentAddresses } }, { status: 200 });
}, { protect: true });

