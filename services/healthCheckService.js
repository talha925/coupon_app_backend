const axios = require('axios');
const { performanceMonitor } = require('../middleware/performanceMonitoring');
const { SERVER, MONITORING } = require('../config/constants');

class HealthCheckService {
    constructor() {
        this.baseURL = process.env.BASE_URL || SERVER.DEFAULT_BASE_URL;
        this.config = require('../config/monitoring.json');
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) return;
        
        console.log('🏥 Starting health check service...');
        this.isRunning = true;
        
        // Run initial health check
        await this.runHealthCheck();
        
        // Schedule periodic health checks
        this.interval = setInterval(async () => {
            await this.runHealthCheck();
        }, this.config.healthChecks.interval);
        
        console.log(`✅ Health checks scheduled every ${this.config.healthChecks.interval / 1000}s`);
    }

    async stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('🛑 Health check service stopped');
    }

    async runHealthCheck() {
        const results = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: []
        };

        for (const endpoint of this.config.healthChecks.endpoints) {
            const checkResult = await this.checkEndpoint(endpoint);
            results.checks.push(checkResult);
            
            if (!checkResult.healthy) {
                results.status = 'unhealthy';
            }
        }

        // Log results
        if (results.status === 'unhealthy') {
            console.warn('⚠️ Health check failed:', results);
            performanceMonitor.generateAlert('health_check_failed', results);
        } else {
            console.log('✅ Health check passed');
        }

        return results;
    }

    async checkEndpoint(endpoint) {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(`${this.baseURL}${endpoint}`, {
                timeout: 10000,
                headers: { 'User-Agent': 'HealthCheck/1.0' }
            });
            
            const responseTime = Date.now() - startTime;
            const healthy = response.status === 200 && responseTime < 5000;
            
            return {
                endpoint,
                healthy,
                responseTime,
                statusCode: response.status,
                error: null
            };
            
        } catch (error) {
            return {
                endpoint,
                healthy: false,
                responseTime: Date.now() - startTime,
                statusCode: error.response?.status || 0,
                error: error.message
            };
        }
    }
}

module.exports = new HealthCheckService();