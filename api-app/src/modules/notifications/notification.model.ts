import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  type: string;
  title?: string;
  message: string;
  createdAt: Date;
}

const NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // automatically delete after 10 minutes (600 seconds)
});

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
