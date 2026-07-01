// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = rawBody;
  if (!body.profileImage) throw new ApiError(400, 'No image base64 provided');
  const updatedUser = await userService.updateUser(user.id, { profileImage: body.profileImage });
  return NextResponse.json({ status: 'success', message: 'Profile image uploaded successfully', data: { user: updatedUser } }, { status: 200 });
}, { protect: true });

