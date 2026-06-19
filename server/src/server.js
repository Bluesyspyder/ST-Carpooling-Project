import './config/env.js';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSocket } from './socket/socketHandler.js';

const PORT = process.env.PORT || 5000;

/**
 * Startup Express Server, Connect to Database, and Initialize Socket.io
 */
const startServer = async () => {
  // Connect to MongoDB Database
  await connectDB();

  // Wrap Express app in an HTTP server so Socket.io can share the same port
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  initSocket(httpServer);

  // Listen for requests
  httpServer.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`Server started on port ${PORT}`);
    console.log(`Socket.io enabled`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`==================================================`);
  });

  // Handle unhandled Promise rejections gracefully
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection! Shutting down server...`);
    console.error(err);
    httpServer.close(() => {
      process.exit(1);
    });
  });
};

startServer();
