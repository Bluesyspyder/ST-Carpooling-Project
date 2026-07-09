// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-wrapper';
import dbConnect from '@/lib/dbConnect';
import { Notification } from '@/modules/notifications/notification.model';

export const GET = apiHandler(async (req, { user }) => {
  await dbConnect();
  
  // Find notifications for the user
  const notifications = await Notification.find({ userId: user.id }).sort({ createdAt: -1 });
  
  // Delete the retrieved notifications so they don't pop up again
  if (notifications.length > 0) {
    await Notification.deleteMany({ _id: { $in: notifications.map(n => n._id) } });
  }
  
  return NextResponse.json({
    status: 'success',
    data: {
      notifications
    }
  });
}, { protect: true });
