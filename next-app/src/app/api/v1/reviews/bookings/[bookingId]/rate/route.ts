// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate, ApiError } from '@/lib/api-wrapper';
import * as reviewService from '@/modules/reviews/review.service';
import { rateBookingSchema } from '@/modules/reviews/review.validation';

export const POST = apiHandler(async (req, { params, user }) => {
  const rawBody = await parseBody(req);
  const body = validate(rateBookingSchema, { body: rawBody }).body;
  const { rating, reviewText } = body;
  const review = await reviewService.createRating(params!.bookingId, user.id, rating, reviewText);
  return NextResponse.json({ status: 'success', data: { review } }, { status: 201 });
}, { protect: true });

