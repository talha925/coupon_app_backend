/**
 * Request logging middleware
 * Logs information about incoming requests
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Generate unique request ID for tracking
    req.id = Math.random().toString(36).substr(2, 9);
    
    // 🔥 CRITICAL: Prevent memory leaks from response listeners
    let hasLogged = false;
    
    const logRequest = () => {
        // 🔥 CRITICAL: Prevent multiple logging calls
        if (hasLogged) return;
        hasLogged = true;
        
        const duration = Date.now() - startTime;
        const logData = {
            id: req.id,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        };
        
        // Color-coded logging based on status
        if (res.statusCode >= 500) {
            console.error('🔴', JSON.stringify(logData));
        } else if (res.statusCode >= 400) {
            console.warn('🟡', JSON.stringify(logData));
        } else {
            console.log('🟢', JSON.stringify(logData));
        }
    };
    
    // 🔥 CRITICAL: Use once() instead of on() to prevent memory leaks
    res.once('finish', logRequest);
    res.once('close', logRequest);
    
    next();
};

module.exports = requestLogger;