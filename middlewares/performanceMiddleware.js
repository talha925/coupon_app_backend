/**
 * Performance Monitoring Middleware
 * Tracks request timing, slow queries, and provides performance metrics
 */

const mongoose = require('mongoose');
const { PERFORMANCE } = require('../config/constants');

// Configuration using constants
const SLOW_QUERY_THRESHOLD = PERFORMANCE.DB_QUERY_TIME_THRESHOLD;
const SLOW_REQUEST_THRESHOLD = PERFORMANCE.SLOW_REQUEST_THRESHOLD;

/**
 * Request timer middleware
 */
const requestTimer = (req, res, next) => {
    req.startTime = Date.now();
    
    // 🔥 CRITICAL: Prevent memory leaks from response listeners
    const originalEnd = res.end;
    let hasEnded = false;
    
    res.end = function(...args) {
        // 🔥 CRITICAL: Prevent multiple end calls
        if (hasEnded) return;
        hasEnded = true;
        
        const duration = Date.now() - req.startTime;
        
        // Log slow requests for monitoring
        if (duration > 1000) {
            console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
        }
        
        // Call original end method
        originalEnd.apply(this, args);
    };
    
    next();
};

/**
 * Database query monitoring
 * Tracks MongoDB query performance
 */
const setupQueryMonitoring = () => {
    // Monitor slow queries
    mongoose.set('debug', (collectionName, method, query, doc, options) => {
        const startTime = Date.now();
        
        // Log query details for debugging
        console.log(`🔍 MongoDB Query: ${collectionName}.${method}`, {
            query: JSON.stringify(query),
            options: JSON.stringify(options)
        });
        
        // Note: This is a simplified version. In production, you'd want to
        // use mongoose plugins or custom query middleware for more accurate timing
    });
    
    // Set up query middleware for timing
    mongoose.plugin(function(schema) {
        schema.pre(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], function() {
            this._startTime = Date.now();
        });
        
        schema.post(['find', 'findOne', 'findOneAndUpdate', 'countDocuments'], function() {
            if (this._startTime) {
                const queryTime = Date.now() - this._startTime;
                
                if (queryTime > SLOW_QUERY_THRESHOLD) {
                    console.warn('🐌 SLOW QUERY:', {
                        collection: this.mongooseCollection.name,
                        operation: this.op,
                        query: this.getQuery(),
                        time: `${queryTime}ms`,
                        warning: 'Query exceeded slow threshold'
                    });
                }
            }
        });
    });
};

/**
 * Cache timing helper
 * Tracks cache hit/miss timing
 */
const trackCacheOperation = (req, operation, startTime) => {
    const cacheTime = Date.now() - startTime;
    req.timing.cache += cacheTime;
    
    console.log(`💾 Cache ${operation}: ${cacheTime}ms`);
    return cacheTime;
};

/**
 * Database timing helper
 * Tracks database operation timing
 */
const trackDatabaseOperation = (req, operation, startTime) => {
    const dbTime = Date.now() - startTime;
    req.timing.database += dbTime;
    
    if (dbTime > SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 Slow DB ${operation}: ${dbTime}ms`);
    } else {
        console.log(`🗄️ DB ${operation}: ${dbTime}ms`);
    }
    
    return dbTime;
};

/**
 * Performance summary middleware
 * Provides detailed performance breakdown
 */
const performanceSummary = (req, res, next) => {
    // Initialize timing object if not exists
    if (!req.timing) {
        req.timing = {
            start: req.startTime || Date.now(),
            database: 0,
            cache: 0,
            processing: 0
        };
    }
    
    // Add performance tracking methods to request
    req.trackCache = (operation, startTime) => trackCacheOperation(req, operation, startTime);
    req.trackDatabase = (operation, startTime) => trackDatabaseOperation(req, operation, startTime);
    
    // 🔥 CRITICAL: Prevent memory leaks from JSON override
    if (!res._jsonOverridden) {
        res._jsonOverridden = true;
        const originalJson = res.json;
        
        res.json = function(data) {
            const totalTime = Date.now() - (req.startTime || req.timing.start);
            req.timing.processing = totalTime - req.timing.database - req.timing.cache;
            
            // Add performance data to response (in development)
            if (process.env.NODE_ENV === 'development') {
                data._performance = {
                    totalTime: `${totalTime}ms`,
                    breakdown: {
                        database: `${req.timing.database}ms`,
                        cache: `${req.timing.cache}ms`,
                        processing: `${req.timing.processing}ms`
                    },
                    timestamp: new Date().toISOString()
                };
            }
            
            originalJson.call(this, data);
        };
    }
    
    next();
};

/**
 * Health check endpoint with performance metrics
 */
const healthCheck = (req, res) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime)}s`,
        memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
    });
};

module.exports = {
    requestTimer,
    setupQueryMonitoring,
    performanceSummary,
    healthCheck,
    trackCacheOperation,
    trackDatabaseOperation,
    SLOW_QUERY_THRESHOLD,
    SLOW_REQUEST_THRESHOLD
};