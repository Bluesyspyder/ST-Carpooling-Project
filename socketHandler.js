// utils/socketHandler.js
// Handles all real-time events: live location, booking notifications, ride rooms

module.exports = (io) => {
  // Track connected users: userId -> socketId
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Join user's personal notification room ────────────────────────────────
    socket.on('join_user', ({ userId }) => {
      socket.join(`user_${userId}`);
      connectedUsers.set(userId, socket.id);
      console.log(`👤 User ${userId} joined their room`);
    });

    // ── Join a ride's tracking room (riders subscribe here) ───────────────────
    socket.on('join_ride', ({ rideId }) => {
      socket.join(`ride_${rideId}`);
      console.log(`🚗 Socket joined ride room: ride_${rideId}`);
    });

    socket.on('leave_ride', ({ rideId }) => {
      socket.leave(`ride_${rideId}`);
    });

    // ── Driver broadcasts their live location ─────────────────────────────────
    // (Also handled via REST PATCH but socket is lower latency)
    socket.on('driver_location_update', ({ rideId, lat, lng, heading }) => {
      // Broadcast to all riders in this ride's room (excluding driver)
      socket.to(`ride_${rideId}`).emit('driver_location', { lat, lng, heading, timestamp: Date.now() });
    });

    // ── Driver starts a ride ──────────────────────────────────────────────────
    socket.on('ride_started', ({ rideId }) => {
      io.to(`ride_${rideId}`).emit('ride_status_changed', { status: 'active', rideId });
    });

    // ── Driver ends a ride ────────────────────────────────────────────────────
    socket.on('ride_ended', ({ rideId }) => {
      io.to(`ride_${rideId}`).emit('ride_status_changed', { status: 'completed', rideId });
    });

    // ── SOS / Emergency alert ─────────────────────────────────────────────────
    socket.on('sos_alert', ({ userId, rideId, lat, lng }) => {
      console.log(`🆘 SOS from user ${userId} at [${lat}, ${lng}]`);
      // Notify everyone in the ride
      io.to(`ride_${rideId}`).emit('sos_received', { userId, lat, lng, timestamp: Date.now() });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      connectedUsers.forEach((socketId, userId) => {
        if (socketId === socket.id) connectedUsers.delete(userId);
      });
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};
