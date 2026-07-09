"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotificationToast, { useNotifications } from './NotificationToast';
import api from '@/services/api';

const SocketNotificationManager = () => {
  const { user } = useAuth();
  const { notifications, addNotification, dismissNotification } = useNotifications();

  // Polling mechanism since we removed WebSockets for Serverless
  useEffect(() => {
    if (!user) return;
    
    // Simple polling loop
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/users/notifications`);
        if (res.data) {
          const data = res.data;
          if (data.status === 'success' && data.data?.notifications?.length > 0) {
            data.data.notifications.forEach((notif) => {
              addNotification({
                type: notif.type || 'info',
                title: notif.title || 'New Notification',
                message: notif.message,
              });
            });
          }
        }
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [user, addNotification]);

  return <NotificationToast notifications={notifications} onDismiss={dismissNotification} />;
};

export default SocketNotificationManager;
