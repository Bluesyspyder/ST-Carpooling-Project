import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from '@/services/api';

/**
 * Initializes push notifications and registers the device token
 * with the Apple APNs or Firebase Cloud Messaging backend.
 */
export const initializePushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications are only available on native platforms.');
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      console.error('User denied push notification permissions.');
      return;
    }

    // Register with Apple / Google to receive token
    await PushNotifications.register();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      // Optional: Send the token to the backend server to associate with the user profile
      try {
         await api.patch('/users/profile', { pushToken: token.value });
      } catch (err) {
         console.error('Failed to save push token to backend:', err);
      }
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification);
      // e.g. navigate to a specific ride
    });

  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
};
