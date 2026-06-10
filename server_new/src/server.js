import './config/env.js';
import app from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5000;

/**
 * Startup Express Server & Connect to Database
 */
const startServer = async () => {
  // Connect to MongoDB Database
  await connectDB();

  // Listen for requests
  const server = app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`Server started on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`==================================================`);
  });

  // Handle unhandled Promise rejections gracefully
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection! Shutting down server...`);
    console.error(err);
    server.close(() => {
      process.exit(1);
    });
  });
};

startServer();
