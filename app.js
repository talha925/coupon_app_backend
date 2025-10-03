const express = require('express');
const dotenv = require('dotenv');
const { validateEnv, getConfig } = require('./config/env');
const connectDB = require('./config/db');
// const cors = require('cors'); // Removed redundant import, using security.configureCors instead
const helmet = require('helmet');  // Security middleware
const errorHandler = require('./middlewares/errorHandler');
const security = require('./middlewares/security');
const requestLogger = require('./middlewares/requestLogger');
const performanceMiddleware = require('./middlewares/performanceMiddleware');
const { performanceMiddleware: performanceMonitoring } = require('./middleware/performanceMonitoring');
const { createFirstSuperAdmin } = require('./middlewares/authMiddleware');
const redisConfig = require('./config/redis');
const cacheService = require('./services/cacheService');

// Load environment variables
dotenv.config();

// Validate environment variables
if (!validateEnv()) {
    console.error('❌ Environment validation failed. Please check your .env file.');
    process.exit(1);
}

// Get configuration
const config = getConfig();

// Import routes
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const couponRoutes = require('./routes/couponRoutes');
const storeRoutes = require('./routes/storeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const blogRoutes = require('./routes/blogRoutes');
const blogCategoryRoutes = require('./routes/blogCategoryRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');

// Create Express app
const app = express();

// Setup performance monitoring
performanceMiddleware.setupQueryMonitoring();

// Initialize services
async function initializeServices() {
    try {
        await connectDB();      // Connect to MongoDB
        await redisConfig.connect();  // Connect to Redis
        await cacheService.ensureInitialized();
        console.log('✅ All services initialized successfully');
    } catch (error) {
        console.error('❌ Service initialization error:', error);
        // Continue without cache if Redis fails
    }
}

initializeServices();

// Create initial super-admin if needed
createFirstSuperAdmin();

// Request Logging and Performance Monitoring
app.use(performanceMonitoring); // 🚨 CRITICAL: Advanced performance monitoring
app.use(performanceMiddleware.requestTimer);
app.use(performanceMiddleware.performanceSummary);
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
    res.json({ 
        message: 'Coupon Backend API', 
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', performanceMiddleware.healthCheck);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/blogCategories', blogCategoryRoutes);
app.use('/monitoring', monitoringRoutes);

// Error handling middleware (must be after routes)
app.use(errorHandler);

// Start the server
const PORT = config.port;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
    
    // Start monitoring services in production
    if (config.nodeEnv === 'production') {
        const healthCheckService = require('./services/healthCheckService');
        const performanceReporter = require('./services/performanceReporter');
        
        // Start health checks and reporting
        healthCheckService.start();
        performanceReporter.scheduleDailyReports();
        performanceReporter.scheduleWeeklyReports();
        
        console.log('📊 Production monitoring services started');
    }
});

// 🔥 CRITICAL: Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
    console.error('Error:', err.name, err.message);
    console.error('Stack:', err.stack);
    
    // Close server gracefully
    server.close(() => {
        process.exit(1);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
});

process.on('unhandledRejection', (err) => {
    console.error('💥 UNHANDLED REJECTION! Shutting down...');
    console.error('Error:', err);
    
    // Close server gracefully
    server.close(() => {
        process.exit(1);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received, shutting down gracefully...');
    server.close(async () => {
        await redisConfig.disconnect();
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received, shutting down gracefully...');
    server.close(async () => {
        await redisConfig.disconnect();
        process.exit(0);
    });
});