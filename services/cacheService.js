const redisConfig = require('../config/redis');
const { trackCache } = require('../middleware/performanceMonitoring');

/**
 * Cache Service with TTL Management
 * Handles caching for blog categories and front banner blogs
 */
class CacheService {
    constructor() {
        this.redis = null;
        this.defaultTTL = {
            categories: 3600, // 1 hour
            frontBannerBlogs: 900, // 15 minutes
            blogPost: 1800 // 30 minutes
        };
        
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // ✅ AUTO-INITIALIZE with smart retry
        this.initializeCache();
    }

    /**
     * Initialize cache service with smart retry logic
     */
    async initializeCache() {
        // ✅ Prevent multiple initializations
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initializeWithRetry();
        return this.initializationPromise;
    }

    async _initializeWithRetry(maxRetries = 10, retryDelay = 1000) {
        console.log('🔗 Cache service initializing...');
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.redis = redisConfig.getClient();
                
                if (redisConfig.isReady()) {
                    this.isInitialized = true;
                    console.log('✅ Cache service successfully connected to Redis');
                    return true;
                }
                
                // Progressive backoff - jyada wait karo as retries increase
                const delay = attempt <= 3 ? retryDelay : retryDelay * 2;
                console.log(`🔄 Waiting for Redis... (Attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
            } catch (error) {
                console.error(`❌ Cache initialization attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    console.log('⚠️ Cache service running in fallback mode after all retries');
                    this.isInitialized = true; // Mark as initialized even in fallback
                    return false;
                }
                
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        this.isInitialized = true;
        return false;
    }

    /**
     * Ensure cache is initialized before any operation
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initializationPromise;
        }
    }

    /**
     * Check if cache is available
     */
    isAvailable() {
        return this.redis && redisConfig.isReady();
    }

    /**
     * Generate cache key
     */
    generateKey(type, params = {}) {
        const baseKey = `coupon_backend:${type}`;
        
        if (Object.keys(params).length === 0) {
            return baseKey;
        }

        const paramString = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');
        
        return `${baseKey}:${paramString}`;
    }

    /**
     * Get data from cache
     */
    async get(key) {
        await this.ensureInitialized();
        
        if (!this.isAvailable()) {
            trackCache('GET', key, false); // Track as miss when cache unavailable
            return null;
        }

        try {
            const data = await this.redis.get(key);
            const hit = data !== null;
            
            // 🚨 CRITICAL: Track cache performance
            trackCache('GET', key, hit);
            
            if (data) {
                console.log(`✅ Cache HIT: ${key}`);
                return JSON.parse(data);
            }
            console.log(`❌ Cache MISS: ${key}`);
            return null;
        } catch (error) {
            console.error('❌ Cache get error:', error);
            trackCache('GET', key, false); // Track as miss on error
            return null;
        }
    }

    /**
     * Set data in cache with TTL
     */
    async set(key, data, ttl = null) {
        await this.ensureInitialized();
        
        if (!this.isAvailable()) {
            trackCache('SET', key, false); // Track failed set
            return false;
        }

        try {
            const serializedData = JSON.stringify(data);
            
            if (ttl) {
                await this.redis.setEx(key, ttl, serializedData);
            } else {
                await this.redis.set(key, serializedData);
            }
            
            // 🚨 PERFORMANCE: Track cache set operations
            trackCache('SET', key, true);
            
            console.log(`✅ Cache SET: ${key} (TTL: ${ttl || 'none'})`);
            return true;
        } catch (error) {
            console.error('❌ Cache set error:', error);
            trackCache('SET', key, false); // Track failed set on error
            return false;
        }
    }

    /**
     * Delete data from cache
     */
    async del(key) {
        await this.ensureInitialized();
        
        if (!this.isAvailable()) {
            return false;
        }

        try {
            await this.redis.del(key);
            console.log(`✅ Cache DEL: ${key}`);
            return true;
        } catch (error) {
            console.error('❌ Cache delete error:', error);
            return false;
        }
    }

    /**
     * Delete multiple keys by pattern
     */
    async delPattern(pattern) {
        await this.ensureInitialized();
        
        if (!this.isAvailable()) {
            return false;
        }

        try {
            // 🔥 CRITICAL: Use SCAN instead of KEYS to prevent blocking
            // KEYS command can block Redis for large datasets
            const keys = [];
            let cursor = 0;
            
            do {
                const result = await this.redis.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100 // Process in batches to prevent memory issues
                });
                
                cursor = result.cursor;
                keys.push(...result.keys);
                
                // 🔥 CRITICAL: Prevent infinite loops
                if (keys.length > 10000) {
                    console.warn(`⚠️ Cache pattern scan limit reached for: ${pattern}`);
                    break;
                }
            } while (cursor !== 0);
            
            if (keys.length > 0) {
                // 🔥 CRITICAL: Delete in batches to prevent memory spikes
                const batchSize = 100;
                for (let i = 0; i < keys.length; i += batchSize) {
                    const batch = keys.slice(i, i + batchSize);
                    await this.redis.del(batch);
                }
                console.log(`✅ Cache DEL PATTERN: ${pattern} (${keys.length} keys)`);
            }
            return true;
        } catch (error) {
            console.error('❌ Cache delete pattern error:', error);
            return false;
        }
    }

    /**
     * Cache blog categories
     */
    async getCachedCategories() {
        await this.ensureInitialized();
        const key = this.generateKey('blog_categories');
        return await this.get(key);
    }

    async setCachedCategories(categories) {
        await this.ensureInitialized();
        const key = this.generateKey('blog_categories');
        return await this.set(key, categories, this.defaultTTL.categories);
    }

    /**
     * Cache front banner blogs
     */
    async getCachedFrontBannerBlogs(params = {}) {
        await this.ensureInitialized();
        const key = this.generateKey('front_banner_blogs', params);
        return await this.get(key);
    }

    async setCachedFrontBannerBlogs(blogs, params = {}) {
        await this.ensureInitialized();
        const key = this.generateKey('front_banner_blogs', params);
        return await this.set(key, blogs, this.defaultTTL.frontBannerBlogs);
    }

    /**
     * Cache individual blog post
     */
    async getCachedBlogPost(id) {
        await this.ensureInitialized();
        const key = this.generateKey('blog_post', { id });
        return await this.get(key);
    }

    async setCachedBlogPost(id, blog) {
        await this.ensureInitialized();
        const key = this.generateKey('blog_post', { id });
        return await this.set(key, blog, this.defaultTTL.blogPost);
    }

    /**
     * Invalidate cache on data updates
     */
    async invalidateBlogCaches() {
        await this.ensureInitialized();
        try {
            // Clear all blog-related caches
            await this.delPattern('coupon_backend:blog_*');
            await this.delPattern('coupon_backend:front_banner_blogs*');
            console.log('✅ Blog caches invalidated');
            return true;
        } catch (error) {
            console.error('❌ Cache invalidation error:', error);
            return false;
        }
    }

    async invalidateCategoryCaches() {
        await this.ensureInitialized();
        try {
            await this.delPattern('coupon_backend:blog_categories*');
            console.log('✅ Category caches invalidated');
            return true;
        } catch (error) {
            console.error('❌ Category cache invalidation error:', error);
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        await this.ensureInitialized();
        
        if (!this.isAvailable()) {
            return { available: false };
        }

        try {
            const info = await this.redis.info('memory');
            const keyspace = await this.redis.info('keyspace');
            
            return {
                available: true,
                memory: info,
                keyspace: keyspace,
                connected: redisConfig.isReady()
            };
        } catch (error) {
            console.error('❌ Cache stats error:', error);
            return { available: false, error: error.message };
        }
    }

    /**
     * Get cache status for debugging
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            redisAvailable: this.isAvailable(),
            redisReady: redisConfig.isReady(),
            hasRedisClient: !!this.redis
        };
    }

    /**
     * Health check for cache service
     */
    async healthCheck() {
        await this.ensureInitialized();
        
        if (!this.isAvailable()) {
            return { 
                status: 'fallback', 
                message: 'Cache service running in fallback mode',
                initialized: this.isInitialized
            };
        }

        try {
            // Test basic cache operation
            const testKey = 'health_check';
            const testValue = { timestamp: Date.now(), status: 'healthy' };
            
            await this.set(testKey, testValue, 10);
            const retrieved = await this.get(testKey);
            
            return {
                status: retrieved ? 'healthy' : 'degraded',
                message: retrieved ? 'Cache operations working normally' : 'Cache read/write issues',
                initialized: this.isInitialized,
                redisConnected: redisConfig.isReady(),
                testOperation: retrieved ? 'success' : 'failed'
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message,
                initialized: this.isInitialized,
                redisConnected: redisConfig.isReady()
            };
        }
    }
}

// Export singleton instance
const cacheService = new CacheService();

// ✅ Global initialization check
process.nextTick(async () => {
    try {
        await cacheService.ensureInitialized();
        const status = cacheService.getStatus();
        console.log('🎯 Cache Service Status:', status);
        
        // Log final status
        if (status.redisAvailable) {
            console.log('🚀 Cache Service: FULLY OPERATIONAL with Redis');
        } else if (status.initialized) {
            console.log('⚠️ Cache Service: RUNNING IN FALLBACK MODE');
        } else {
            console.log('❌ Cache Service: INITIALIZATION FAILED');
        }
    } catch (error) {
        console.error('💥 Cache Service initialization failed:', error);
    }
});

module.exports = cacheService;