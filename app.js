const express = require('express');
const dotenv = require('dotenv');
const { validateEnv, getConfig } = require('./config/env');
const connectDB = require('./config/db');
// const cors = require('cors'); // Removed redundant import, using security.configureCors instead
const helmet = require('helmet');  // Security middleware
const errorHandler = require('./middlewares/errorHandler');
const security = require('./middlewares/security');
const requestLogger = require('./middlewares/requestLogger');
const { createFirstSuperAdmin } = require('./middlewares/authMiddleware');

// Load environment variables
dotenv.config();

// Validate environment variables
if (!validateEnv()) {
    console.error('❌ Environment validation failed. Please check your .env file.');
    process.exit(1);
}

// Get configuration
const config = getConfig();

const app = express();
connectDB();      // Connect to MongoDB

// Create initial super-admin if needed
createFirstSuperAdmin();

// Request Logging
app.use(requestLogger);

// Security Middleware
app.use(helmet());  // Adds security headers
app.use(security.setSecurityHeaders);
app.use(security.configureCors);  // Improved CORS configuration
app.use('/api', security.rateLimit()); // Rate limiting
app.use(express.json({ limit: '10kb' })); // Limit JSON body size
app.use(security.sanitizeData); // Prevent NoSQL injection
app.use(security.preventXSS); // Prevent XSS attacks
app.use(security.preventParamPollution(['category', 'language', 'isTopStore']));

// Routes
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Error handling middleware (must be after routes)
app.use(errorHandler);

// Start the server
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
});