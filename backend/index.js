require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const helmet = require('helmet'); // Import helmet
const rateLimit = require('express-rate-limit'); // Import express-rate-limit
const app = express();
const port = process.env.PORT || 3000;
// const db = require('./config/db'); // Import the database configuration - No longer needed here for the test

// ---- START BASIC REQUEST LOGGER ----
app.use((req, res, next) => {
  console.log(
    `INCOMING REQUEST: ${req.method} ${req.originalUrl} at ${new Date().toISOString()}`
  );
  next();
});
// ---- END BASIC REQUEST LOGGER ----

app.use(helmet()); // Use helmet for security headers

// --- START RATE LIMITING CONFIGURATION ---
// General API rate limiter - applies to all /api/ routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login/signup attempts per windowMs to prevent brute-force
  message:
    'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Do not count successful responses towards the limit on auth routes
});
// --- END RATE LIMITING CONFIGURATION ---

// Middleware to parse JSON bodies
app.use(express.json());

// Import routes
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth'); // Import auth routes
const horseRoutes = require('./routes/horses'); // Import horse routes
const storeRoutes = require('./routes/store'); // Import store routes
const breedingRoutes = require('./routes/breeding'); // Added breeding routes
const breedingRequestRoutes = require('./routes/breedingRequests'); // Import breeding request routes
const bankRoutes = require('./routes/bank'); // Import bank routes

// Import schedulers
const { startHealthScheduler } = require('./utils/healthScheduler');

// Apply general API limiter to all routes starting with /api
// Only apply limiters if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.use('/api', apiLimiter);
  // Use routes (apply stricter authLimiter specifically to auth and user creation)
  app.use('/api/users', authLimiter, userRoutes);
  app.use('/api/auth', authLimiter, authRoutes);

  // For other routes, the general apiLimiter already applies if they start with /api
  app.use('/api/horses', horseRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/breeding', breedingRoutes);
  app.use('/api/breeding-requests', breedingRequestRoutes);
  app.use('/api/bank', bankRoutes);
} else {
  // In test environment, register routes without rate limiters
  app.use('/api/users', userRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/horses', horseRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/breeding', breedingRoutes);
  app.use('/api/breeding-requests', breedingRequestRoutes);
  app.use('/api/bank', bankRoutes);
}

app.get('/', (req, res) => {
  res.send('Hello World! Horse Simulation Backend is running.');
});

// Centralized Error Handling Middleware
app.use((err, req, res) => {
  console.error('-----------------------------------------------------');
  console.error('Unhandled Error Caught by Central Error Handler:');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Request URL:', req.originalUrl);
  console.error('Request Method:', req.method);
  if (req.body && Object.keys(req.body).length > 0) {
    console.error('Request Body:', JSON.stringify(req.body, null, 2)); // Be careful logging sensitive data
  }
  console.error('Error Stack:', err.stack);
  console.error('-----------------------------------------------------');

  // Avoid sending error details to client in production for security reasons
  if (process.env.NODE_ENV === 'production') {
    res.status(500).send('Internal Server Error');
  } else {
    // In development, you might want to send more details
    res.status(500).json({
      message: err.message,
      stack: err.stack,
      error: err, // Full error object for more inspection
    });
  }
});

let server;

// Start the server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    startHealthScheduler(); // Start the health degradation scheduler
  });
} else {
  // If in test, we might still want to start the scheduler for specific tests,
  // but it should be controllable. For now, let's not auto-start in test.
  // OR, we could export a function to start it from tests if needed.
  // console.log('Running in test environment. Server and health scheduler not auto-started by index.js.');
}

// Export the app for testing purposes, and the server if it was started.
module.exports = { app, server };
