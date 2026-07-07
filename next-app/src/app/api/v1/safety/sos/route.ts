// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as safetyService from '@/modules/safety/safety.service';
import { createSosAlertSchema } from '@/modules/safety/safety.validation';

// Record an SOS broadcast for the safety audit trail.
export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(createSosAlertSchema, { body: rawBody }).body;
  const alert = await safetyService.recordSosAlert(user.id, body);
  return NextResponse.json({ status: 'success', data: { alert } }, { status: 201 });
}, { protect: true });

// The caller's own SOS history.
export const GET = apiHandler(async (req, { params, user }) => {
  const alerts = await safetyService.getMySosAlerts(user.id);
  return NextResponse.json({ status: 'success', data: { alerts } }, { status: 200 });
}, { protect: true });
