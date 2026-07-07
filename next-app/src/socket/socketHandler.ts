import dbConnect from '@/lib/dbConnect';
import { Notification } from '@/modules/notifications/notification.model';

export const emitToUser = async (userId: string, event: string, payload: any) => {
  console.log(`[POLLING MOCK] emitToUser: ${userId} -> ${event}`, payload);
  try {
    await dbConnect();
    
    let type = 'info';
    let title = 'New Notification';
    let message = payload.message || 'You have a new update';
    
    if (event === 'booking:new') {
      type = 'info';
      title = 'New Booking Request';
    } else if (event === 'booking:accepted') {
      type = 'success';
      title = 'Booking Accepted!';
    } else if (event === 'booking:rejected' || event === 'booking:declined') {
      type = 'warning';
      title = 'Booking Declined';
    } else if (event === 'booking:cancelled') {
      type = 'warning';
      title = 'Booking Cancelled';
    } else if (event === 'ride:status') {
      type = payload.status === 'CANCELLED' ? 'warning' : 'info';
      title = payload.status === 'CANCELLED' ? 'Ride Cancelled' : 'Ride Completed';
    }
    
    await Notification.create({
      userId,
      type,
      title,
      message
    });
  } catch (error) {
    console.error('Failed to save notification to DB', error);
  }
};
