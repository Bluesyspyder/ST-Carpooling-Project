// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as userService from '@/modules/users/user.service';
import { addSavedAddressSchema } from '@/modules/users/user.validation';

export const GET = apiHandler(async (req, { params, user }) => {
  const savedAddresses = await userService.getSavedAddresses(user.id);
  return NextResponse.json({ status: 'success', data: { savedAddresses } }, { status: 200 });
}, { protect: true });

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(addSavedAddressSchema, { body: rawBody }).body;
  const savedAddresses = await userService.addSavedAddress(user.id, body);
  return NextResponse.json({ status: 'success', data: { savedAddresses } }, { status: 201 });
}, { protect: true });

