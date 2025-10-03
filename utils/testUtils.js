/**
 * Test Utilities
 * Common functions for testing and validation across scripts
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Make HTTP request with error handling and timing
 * @param {string} url - URL to request
 * @param {Object} options - Axios options
 * @returns {Object} Response with timing information
 */
async function makeTimedRequest(url, options = {}) {
    const startTime = Date.now();
    
    try {
        const response = await axios({
            url,
            timeout: 10000,
            ...options
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        return {
            success: true,
            status: response.status,
            data: response.data,
            responseTime,
            headers: response.headers,
            error: null
        };
    } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        return {
            success: false,
            status: error.response?.status || 0,
            data: null,
            responseTime,
            headers: error.response?.headers || {},
            error: {
                message: error.message,
                code: error.code,
                response: error.response?.data
            }
        };
    }
}

/**
 * Save test results to JSON file
 * @param {Object} results - Test results object
 * @param {string} filename - Base filename (timestamp will be added)
 * @param {string} directory - Directory to save file (default: scripts)
 */
function saveTestResults(results, filename, directory = 'scripts') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFilename = `${filename}-${timestamp}.json`;
    const filePath = path.join(__dirname, '..', directory, fullFilename);
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
        console.log(`📄 Results saved to: ${fullFilename}`);
        return filePath;
    } catch (error) {
        console.error('❌ Failed to save results:', error.message);
        return null;
    }
}

/**
 * Calculate performance statistics from response times
 * @param {Array} responseTimes - Array of response times in milliseconds
 * @returns {Object} Performance statistics
 */
function calculatePerformanceStats(responseTimes) {
    if (!responseTimes || responseTimes.length === 0) {
        return {
            count: 0,
            average: 0,
            min: 0,
            max: 0,
            median: 0,
            p95: 0,
            p99: 0
        };
    }
    
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, time) => acc + time, 0);
    
    return {
        count,
        average: Math.round(sum / count),
        min: sorted[0],
        max: sorted[count - 1],
        median: sorted[Math.floor(count / 2)],
        p95: sorted[Math.floor(count * 0.95)],
        p99: sorted[Math.floor(count * 0.99)]
    };
}

/**
 * Validate API response structure
 * @param {Object} response - API response object
 * @param {Object} expectedStructure - Expected response structure
 * @returns {Object} Validation result
 */
function validateResponseStructure(response, expectedStructure) {
    const errors = [];
    
    function checkStructure(obj, expected, path = '') {
        for (const key in expected) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (!(key in obj)) {
                errors.push(`Missing property: ${currentPath}`);
                continue;
            }
            
            const expectedType = expected[key];
            const actualValue = obj[key];
            
            if (typeof expectedType === 'string') {
                if (typeof actualValue !== expectedType) {
                    errors.push(`Type mismatch at ${currentPath}: expected ${expectedType}, got ${typeof actualValue}`);
                }
            } else if (typeof expectedType === 'object' && expectedType !== null) {
                if (typeof actualValue === 'object' && actualValue !== null) {
                    checkStructure(actualValue, expectedType, currentPath);
                } else {
                    errors.push(`Type mismatch at ${currentPath}: expected object, got ${typeof actualValue}`);
                }
            }
        }
    }
    
    checkStructure(response, expectedStructure);
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Wait for specified duration
 * @param {number} ms - Milliseconds to wait
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries) {
                throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
}

module.exports = {
    makeTimedRequest,
    saveTestResults,
    calculatePerformanceStats,
    validateResponseStructure,
    sleep,
    retryWithBackoff
};