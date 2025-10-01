const redis = require('redis');

/**
 * Redis Configuration and Connection Management
 */
class RedisConfig {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    /**
     * Initialize Redis connection
     */
    async connect() {
        try {
            // Use REDIS_URL if available, otherwise fallback to individual components
            const options = process.env.REDIS_URL ? {
                url: process.env.REDIS_URL
            } : {
                url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
                password: process.env.REDIS_PASSWORD || undefined,
                database: process.env.REDIS_DB || 0
            };

            // Add socket configuration
            options.socket = {
                connectTimeout: 5000,
                commandTimeout: 3000,
                reconnectStrategy: (retries) => {
                    if (retries > 3) return false;
                    return Math.min(retries * 100, 3000);
                }
            };

            // Create Redis client
            this.client = redis.createClient(options);

            // Event handlers
            this.client.on('connect', () => {
                console.log('🔗 Redis connecting...');
            });

            this.client.on('ready', () => {
                console.log('✅ Redis connected and ready');
                this.isConnected = true;
            });

            this.client.on('error', (err) => {
                // Only log once, don't spam
                if (this.isConnected) {
                    console.log('⚠️ Redis connection lost - Running without cache');
                }
                this.isConnected = false;
            });

            this.client.on('end', () => {
                this.isConnected = false;
            });

            // Try to connect with a short timeout
            await Promise.race([
                this.client.connect(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Connection timeout')), 3000)
                )
            ]);

        } catch (error) {
            console.log('⚠️ Redis not available - Application will run without caching');
            this.isConnected = false;
            this.client = null;
        }
    }

    /**
     * Get Redis client instance
     */
    getClient() {
        return this.client;
    }

    /**
     * Check if Redis is connected
     */
    isReady() {
        return this.isConnected && this.client && this.client.isReady;
    }

    /**
     * Gracefully close Redis connection
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.quit();
                console.log('✅ Redis connection closed gracefully');
            } catch (error) {
                console.error('❌ Error closing Redis connection:', error);
            }
        }
    }
}

// Export singleton instance
const redisConfig = new RedisConfig();

module.exports = redisConfig;