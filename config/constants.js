/**
 * Application Constants
 * Centralized configuration for consistent values across the application
 */

module.exports = {
    // Server Configuration
    SERVER: {
        DEFAULT_PORT: 5000,
        DEFAULT_BASE_URL: 'http://localhost:5000',
        API_BASE_PATH: '/api'
    },

    // Performance Thresholds
    PERFORMANCE: {
        SLOW_QUERY_THRESHOLD: 100, // milliseconds
        SLOW_REQUEST_THRESHOLD: 1000, // milliseconds
        API_RESPONSE_TIME_THRESHOLD: 500, // milliseconds
        DB_QUERY_TIME_THRESHOLD: 100, // milliseconds
        CACHE_HIT_RATE_THRESHOLD: 0.8 // 80%
    },

    // API Endpoints for Testing
    TEST_ENDPOINTS: {
        HEALTH: '/health',
        BLOG_CATEGORIES: '/api/blogCategories/',
        FRONT_BANNER_BLOGS: '/api/blogs?FrontBanner=true&limit=5',
        BLOG_LISTING: '/api/blogs?limit=5',
        MONITORING: '/monitoring',
        MONITORING_HEALTH: '/monitoring/health',
        MONITORING_METRICS: '/monitoring/metrics'
    },

    // Cache Configuration
    CACHE: {
        DEFAULT_TTL: 300, // 5 minutes in seconds
        BLOG_CACHE_TTL: 600, // 10 minutes
        CATEGORY_CACHE_TTL: 1800 // 30 minutes
    },

    // Monitoring Configuration
    MONITORING: {
        ALERT_COOLDOWN: 60000, // 1 minute
        HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
        METRICS_RETENTION_DAYS: 7
    },

    // HTTP Status Codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
    }
};