/**
 * Shared Circuit Breaker Logic
 * Used to protect external dependencies like WebSocket and Cache services
 */

const circuitBreakerState = {
    websocket: {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        threshold: 5,
        timeout: 30000, // 30 seconds
        successCount: 0,
        failureCount: 0,
        successRate: 100
    },
    cache: {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        threshold: 3,
        timeout: 15000, // 15 seconds
        successCount: 0,
        failureCount: 0,
        successRate: 100
    },
    frontend: {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        threshold: 3,
        timeout: 10000, // 10 seconds
        successCount: 0,
        failureCount: 0,
        successRate: 100
    }
};

/**
 * Update metrics for monitoring
 */
const updateCircuitBreakerMetrics = (service, success) => {
    const breaker = circuitBreakerState[service];
    if (!breaker) return;

    if (success) {
        breaker.successCount = (breaker.successCount || 0) + 1;
    } else {
        breaker.failureCount = (breaker.failureCount || 0) + 1;
    }

    const total = (breaker.successCount || 0) + (breaker.failureCount || 0);
    breaker.successRate = total > 0 ? (breaker.successCount / total) * 100 : 100;
};

/**
 * Execute operation with circuit breaker protection
 * @param {String} service - Service name ('websocket', 'cache', 'frontend')
 * @param {Function} operation - Async operation to execute
 * @param {Function} fallback - Fallback function if circuit is open or operation fails
 */
const callWithCircuitBreaker = async (service, operation, fallback = null) => {
    const breaker = circuitBreakerState[service];

    // If service not defined in breaker, just run operation
    if (!breaker) {
        return await operation();
    }

    // Check if circuit is open
    if (breaker.isOpen) {
        const timeSinceLastFailure = Date.now() - breaker.lastFailure;

        // Check if timeout has passed (half-open state)
        if (timeSinceLastFailure > breaker.timeout) {
            // Reset to try again
            breaker.isOpen = false;
            breaker.failures = 0;
            console.log(`🔄 Circuit breaker RESET for ${service}`);
        } else {
            // Still open, fail fast
            // console.warn(`⚠️ Circuit breaker OPEN for ${service}, using fallback`);
            updateCircuitBreakerMetrics(service, false);
            return fallback ? await fallback() : { success: false, circuitBreakerOpen: true };
        }
    }

    try {
        const result = await operation();

        // Success! Reset failures
        breaker.failures = 0;
        updateCircuitBreakerMetrics(service, true);

        return result;
    } catch (error) {
        breaker.failures++;
        breaker.lastFailure = Date.now();
        updateCircuitBreakerMetrics(service, false);

        console.error(`❌ ${service} operation failed:`, error.message);

        if (breaker.failures >= breaker.threshold) {
            breaker.isOpen = true;
            console.error(`🚨 Circuit breaker OPENED for ${service} after ${breaker.failures} failures`);
        }

        if (fallback) {
            return await fallback();
        }
        throw error;
    }
};

/**
 * Get current status of all circuit breakers
 */
const getCircuitBreakerStatus = () => {
    return Object.keys(circuitBreakerState).reduce((acc, key) => {
        const breaker = circuitBreakerState[key];
        acc[key] = {
            isOpen: breaker.isOpen,
            failures: breaker.failures,
            lastFailure: breaker.lastFailure,
            timeSinceLastFailure: breaker.lastFailure ? Date.now() - breaker.lastFailure : null,
            successCount: breaker.successCount,
            failureCount: breaker.failureCount,
            successRate: breaker.successRate
        };
        return acc;
    }, {});
};

// Auto-reset logic for monitoring
setInterval(() => {
    Object.keys(circuitBreakerState).forEach(service => {
        const b = circuitBreakerState[service];
        // Decay failure count over time if system is healthy
        if (!b.isOpen && b.failures > 0) {
            b.failures = Math.max(0, b.failures - 1);
        }
    });
}, 300000); // Every 5 minutes

module.exports = {
    callWithCircuitBreaker,
    getCircuitBreakerStatus,
    circuitBreakerState
};
