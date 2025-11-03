// services/cacheService.js - FINAL PRODUCTION VERSION
const redisConfig = require('../config/redis');
const { trackCache } = require('../middleware/performanceMonitoring');

class CacheService {
  static initializing = false;
  
  constructor() {
    this.redis = null;
    this.defaultTTL = {
      categories: 3600,
      frontBannerBlogs: 900,
      blogPost: 1800
    };
    this.isInitialized = false;
    this.initializationPromise = null;
    
    if (!CacheService.initializing) {
      CacheService.initializing = true;
      this.initializeCache();
    }
  }

  async initializeCache() {
    if (this.initializationPromise) return this.initializationPromise;
    this.initializationPromise = this._initializeWithRetry();
    return this.initializationPromise;
  }

  async _initializeWithRetry(maxRetries = 10, retryDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.redis = redisConfig.getClient();
        if (redisConfig.isReady()) {
          this.isInitialized = true;
          console.log('✅ Cache service successfully connected to Redis');
          return true;
        }
      } catch (error) {
        console.error(`❌ Cache initialization attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          console.log('⚠️ Cache service running in fallback mode after all retries');
          this.isInitialized = true;
          return false;
        }
      }

      const delay = attempt <= 3 ? retryDelay : retryDelay * 2;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.isInitialized = true;
    return false;
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      redisAvailable: this.isAvailable(),
      hasRedisClient: !!this.redis
    };
  }

  async ensureInitialized() {
    if (!this.isInitialized) await this.initializationPromise;
  }

  isAvailable() {
    return this.redis && redisConfig.isReady();
  }

  generateKey(type, params = {}) {
    const baseKey = `coupon_backend:${type}`;
    if (Object.keys(params).length === 0) return baseKey;
    
    const filteredParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
      
    if (Object.keys(filteredParams).length === 0) return baseKey;
    
    const paramString = Object.keys(filteredParams)
      .map(key => `${key}:${filteredParams[key]}`)
      .join('|');
      
    return `${baseKey}:${paramString}`;
  }

  async get(key) {
    await this.ensureInitialized();
    if (!this.isAvailable()) {
      trackCache('GET', key, false);
      return null;
    }
    try {
      const data = await this.redis.get(key);
      const hit = data !== null;
      trackCache('GET', key, hit);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      trackCache('GET', key, false);
      return null;
    }
  }

  async set(key, data, ttl = null) {
    await this.ensureInitialized();
    if (!this.isAvailable()) {
      trackCache('SET', key, false);
      return false;
    }
    try {
      const serializedData = JSON.stringify(data);
      if (ttl) {
        await this.redis.setEx(key, ttl, serializedData);
      } else {
        await this.redis.set(key, serializedData);
      }
      trackCache('SET', key, true);
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      trackCache('SET', key, false);
      return false;
    }
  }

  async del(key) {
    await this.ensureInitialized();
    if (!this.isAvailable()) return false;
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  }

  // ✅ ADDED: Safety check to prevent accidental Redis wipe
  async delPattern(pattern) {
    await this.ensureInitialized();
    if (!this.isAvailable()) return false;

    // ✅ SAFETY: Prevent accidental deletion of all keys
    if (!pattern.startsWith('coupon_backend')) {
      console.warn(`⚠️ Unsafe pattern blocked: ${pattern}`);
      return false;
    }

    try {
      const keys = [];
      let cursor = '0';
      do {
        const res = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        if (Array.isArray(res)) {
          cursor = res[0];
          const found = res[1] || [];
          keys.push(...found);
        } else if (res && typeof res === 'object') {
          cursor = String(res.cursor || '0');
          keys.push(...(res.keys || []));
        } else {
          break;
        }

        if (keys.length > 10000) {
          console.warn(`⚠️ Cache pattern scan limit reached for: ${pattern}`);
          break;
        }
      } while (cursor !== '0' && cursor !== 0);

      if (keys.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          if (batch.length === 1) {
            await this.redis.del(batch[0]);
          } else {
            await this.redis.del(...batch);
          }
        }
      }
      console.log(`✅ Cache DEL PATTERN: ${pattern} (${keys.length} keys)`);
      return true;
    } catch (error) {
      console.error('❌ Cache delete pattern error:', error);
      return false;
    }
  }

  // ✅ FIXED: Correct cache patterns
  async invalidateBlogCaches() {
    try {
      await Promise.all([
        this.delPattern('coupon_backend:blog_post*'),
        this.delPattern('coupon_backend:blogs*'),
        this.delPattern('coupon_backend:frontBannerBlogs*'),
        this.delPattern('coupon_backend:related*') // ✅ FIXED: was 'related_posts*'
      ]);
      console.log('✅ Blog caches invalidated (invalidateBlogCaches)');
      return true;
    } catch (err) {
      console.error('❌ invalidateBlogCaches error:', err);
      return false;
    }
  }

  async getCachedBlogPost(id) {
    const key = this.generateKey('blog_post', { id });
    return this.get(key);
  }

  async setCachedBlogPost(id, blog) {
    const key = this.generateKey('blog_post', { id });
    return this.set(key, blog, this.defaultTTL.blogPost);
  }
}

const cacheService = new CacheService();

process.nextTick(async () => {
  try {
    await cacheService.ensureInitialized();
    const status = cacheService.getStatus();
    console.log('🎯 Cache Service Status:', status);
  } catch (error) {
    console.error('💥 Cache Service initialization failed:', error);
  }
});

module.exports = cacheService;