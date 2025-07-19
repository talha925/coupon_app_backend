/**
 * Security middleware collection
 * Configure and export security-related middleware
 */

/**
 * Express rate limiter to prevent brute force attacks
 * Uncomment when express-rate-limit is installed
 */
// const rateLimit = require('express-rate-limit');
const rateLimit = (options) => {
    return (req, res, next) => {
        // Simplified rate limiter - replace with actual package when installed
        console.log('Rate limiter would run here if installed');
        next();
    };
};

/**
 * Data sanitization against NoSQL query injection
 * Uncomment when express-mongo-sanitize is installed
 */
// const mongoSanitize = require('express-mongo-sanitize');
const sanitizeData = (req, res, next) => {
    // Simple sanitization - replace with actual package when installed
    if (req.body) {
        const sanitized = {};
        Object.keys(req.body).forEach(key => {
            // Remove keys that start with $ or contain .
            if (!key.startsWith('$') && !key.includes('.')) {
                sanitized[key] = req.body[key];
            }
        });
        req.body = sanitized;
    }
    next();
};

/**
 * Data sanitization against XSS
 * Uncomment when xss-clean is installed
 */
// const xss = require('xss-clean');
const preventXSS = (req, res, next) => {
    // Simple XSS prevention - replace with actual package when installed
    if (req.body) {
        const sanitized = {};
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Basic HTML escaping
                sanitized[key] = req.body[key]
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;')
                    .replace(/\//g, '&#x2F;');
            } else {
                sanitized[key] = req.body[key];
            }
        });
        req.body = sanitized;
    }
    next();
};

/**
 * Prevent parameter pollution
 * Uncomment when hpp is installed
 */
// const hpp = require('hpp');
const preventParamPollution = (whitelist = []) => {
    return (req, res, next) => {
        // Simple param pollution prevention - replace with actual package when installed
        if (req.query) {
            const cleaned = {};
            Object.keys(req.query).forEach(key => {
                // Keep whitelisted parameters as arrays if needed
                if (whitelist.includes(key)) {
                    cleaned[key] = req.query[key];
                } else if (Array.isArray(req.query[key])) {
                    // For non-whitelisted, use the last value if it's an array
                    cleaned[key] = req.query[key][req.query[key].length - 1];
                } else {
                    cleaned[key] = req.query[key];
                }
            });
            req.query = cleaned;
        }
        next();
    };
};

/**
 * Set secure HTTP headers
 */
const setSecurityHeaders = (req, res, next) => {
    // Set security-related headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
};

/**
 * Apply CORS settings
 */
const configureCors = (req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',') 
        : ['http://localhost:3000', 'https://coupon-app-backend.vercel.app'];
        
    const origin = req.headers.origin;
    
    // Check if the origin is allowed
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (process.env.NODE_ENV === 'development') {
        // In development, we can be more permissive
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (!origin) {
        // Handle requests without origin header (like curl)
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
};

module.exports = {
    rateLimit,
    sanitizeData,
    preventXSS,
    preventParamPollution,
    setSecurityHeaders,
    configureCors
}; 