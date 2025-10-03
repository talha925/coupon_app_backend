/**
 * Configuration Utilities
 * Common functions for handling configuration across the application
 */

const { SERVER, TEST_ENDPOINTS } = require('../config/constants');

/**
 * Get the base URL for the application
 * @param {string} customPort - Optional custom port
 * @returns {string} Base URL
 */
function getBaseURL(customPort = null) {
    const port = customPort || process.env.PORT || SERVER.DEFAULT_PORT;
    return process.env.BASE_URL || `http://localhost:${port}`;
}

/**
 * Build full API endpoint URL
 * @param {string} endpoint - Endpoint path from TEST_ENDPOINTS
 * @param {string} baseURL - Optional base URL
 * @returns {string} Full URL
 */
function buildApiURL(endpoint, baseURL = null) {
    const base = baseURL || getBaseURL();
    return `${base}${endpoint}`;
}

/**
 * Get all test endpoints with full URLs
 * @param {string} baseURL - Optional base URL
 * @returns {Object} Object with endpoint names and full URLs
 */
function getTestEndpoints(baseURL = null) {
    const base = baseURL || getBaseURL();
    const endpoints = {};
    
    Object.keys(TEST_ENDPOINTS).forEach(key => {
        endpoints[key] = `${base}${TEST_ENDPOINTS[key]}`;
    });
    
    return endpoints;
}

/**
 * Validate required environment variables
 * @param {Array} requiredVars - Array of required environment variable names
 * @returns {Object} Validation result with missing variables
 */
function validateEnvironmentVars(requiredVars) {
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    return {
        isValid: missing.length === 0,
        missing: missing,
        message: missing.length > 0 
            ? `Missing required environment variables: ${missing.join(', ')}`
            : 'All required environment variables are present'
    };
}

/**
 * Get performance configuration with defaults
 * @returns {Object} Performance configuration
 */
function getPerformanceConfig() {
    return {
        apiResponseTimeThreshold: parseInt(process.env.API_RESPONSE_TIME_THRESHOLD) || 500,
        dbQueryTimeThreshold: parseInt(process.env.DB_QUERY_TIME_THRESHOLD) || 100,
        cacheHitRateThreshold: parseFloat(process.env.CACHE_HIT_RATE_THRESHOLD) || 0.8,
        slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 1000
    };
}

module.exports = {
    getBaseURL,
    buildApiURL,
    getTestEndpoints,
    validateEnvironmentVars,
    getPerformanceConfig
};