// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';
import { updateProfileSchema } from '@/modules/users/user.validation';

export const GET = apiHandler(async (req, { params, user }) => {
  const profile = await userService.getUserById(user.id);
  return NextResponse.json({ status: 'success', data: { user: profile } }, { status: 200 });
}, { protect: true });

export const PATCH = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(updateProfileSchema, { body: rawBody }).body;
  const updatedUser = await userService.updateUser(user.id, body);
  return NextResponse.json({ status: 'success', data: { user: updatedUser } }, { status: 200 });
}, { protect: true });

