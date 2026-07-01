// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';
import { updateSavedAddressSchema } from '@/modules/users/user.validation';

export const PUT = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(updateSavedAddressSchema, { body: rawBody }).body;
  const savedAddresses = await userService.updateSavedAddress(user.id, params!.id, body);
  return NextResponse.json({ status: 'success', data: { savedAddresses } }, { status: 200 });
}, { protect: true });

export const DELETE = apiHandler(async (req, { params, user }) => {
  const savedAddresses = await userService.deleteSavedAddress(user.id, params!.id);
  return NextResponse.json({ status: 'success', data: { savedAddresses } }, { status: 200 });
}, { protect: true });

