// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-wrapper';
import { nextBadgeInfo } from '@/modules/greenCredits/greenCredits.service';

export const GET = apiHandler(async (req, { params, user }) => {
  const greenCredits = user.greenCredits || 0;
  const totalCO2Saved = user.totalCO2Saved || 0;
  const sharedRides = user.sharedRides || 0;
  const greenBadge = user.greenBadge || 'Beginner';
  const { nextBadge, creditsToNextBadge } = nextBadgeInfo(greenCredits);

  return NextResponse.json({
    status: 'success',
    data: { greenCredits, totalCO2Saved, sharedRides, greenBadge, nextBadge, creditsToNextBadge },
  }, { status: 200 });
}, { protect: true });
