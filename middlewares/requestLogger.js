/**
 * Request logging middleware
 * Logs information about incoming requests
 */
const requestLogger = (req, res, next) => {
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Get request method and path
    const { method, originalUrl, ip } = req;
    
    // Calculate processing time
    const start = process.hrtime();
    
    // Log when request completes
    res.on('finish', () => {
        // Calculate time taken in ms
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = (seconds * 1000 + nanoseconds / 1000000).toFixed(2);
        
        // Get status code from response
        const statusCode = res.statusCode;
        
        // Determine log level based on status code
        const logType = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        
        // Create log message
        const logMessage = `${timestamp} [${method}] ${originalUrl} - ${statusCode} - ${duration}ms - ${ip}`;
        
        // Log with appropriate level
        if (logType === 'error') {
            console.error(logMessage);
        } else if (logType === 'warn') {
            console.warn(logMessage);
        } else {
            console.log(logMessage);
        }
    });
    
    next();
};

module.exports = requestLogger; 