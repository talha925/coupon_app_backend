/**
 * Performance Monitoring Middleware
 * Tracks request timing, slow queries, and provides performance metrics
 */

const mongoose = require('mongoose');

// Configuration
const SLOW_QUERY_THRESHOLD = 100; // milliseconds
const SLOW_REQUEST_THRESHOLD = 1000; // milliseconds

/**
 * Request timing middleware
 * Measures total request time and logs slow requests
 */
const requestTimer = (req, res, next) => {
    const startTime = Date.now();
    
    // Add timing info to request
    req.startTime = startTime;
    req.timing = {
        start: startTime,
        database: 0,
        cache: 0,
        processing: 0
    };
    
    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(...args) {
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        // Add response headers
        res.set('X-Response-Time', `${totalTime}ms`);
        res.set('X-Request-ID', req.id || 'unknown');
        
        // Log performance metrics
        const logData = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: totalTime,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            timestamp: new Date().toISOString()
        };
        
        // Log slow requests
        if (totalTime > SLOW_REQUEST_THRESHOLD) {
            console.warn('🐌 SLOW REQUEST:', JSON.stringify({
                ...logData,
                timing: req.timing,
                warning: 'Request exceeded slow threshold'
            }, null, 2));
        } else {
            console.log(`✅ ${req.method} ${req.originalUrl} - ${totalTime}ms - ${res.statusCode}`);
        }
        
        // Call original end
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
    // Add performance tracking methods to request
    req.trackCache = (operation, startTime) => trackCacheOperation(req, operation, startTime);
    req.trackDatabase = (operation, startTime) => trackDatabaseOperation(req, operation, startTime);
    
    // Add performance summary to response
    const originalJson = res.json;
    res.json = function(data) {
        const totalTime = Date.now() - req.startTime;
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