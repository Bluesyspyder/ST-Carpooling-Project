// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';

export const PATCH = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = rawBody;
  const savedAddresses = await userService.setDefaultSavedAddress(user.id, params!.id);
  return NextResponse.json({ status: 'success', data: { savedAddresses } }, { status: 200 });
}, { protect: true });

