import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { errorHandler } from './shared/middleware/error.middleware.js';
import ApiError from './shared/utils/api-error.js';

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming JSON and url-encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP logging in development environment
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Server health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Server is healthy and running', 
    timestamp: new Date() 
  });
});

// Register api route entry point
app.use('/api/v1', routes);

// Catch all unmatched routes and trigger 404 (Express v5 wildcard syntax)
app.all('/{*path}', (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found on this server!`));
});

// Global Error Handling Middleware
app.use(errorHandler);

export default app;
