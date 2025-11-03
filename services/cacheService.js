// services/cacheService.js - COMPLETE BACKEND OVERHAUL VERSION
const redisConfig = require('../config/redis');
const { trackCache } = require('../middleware/performanceMonitoring');

class CacheService {
  static initializing = false;
  
  constructor() {
    this.redis = null;
    this.defaultTTL = {
      categories: 3600,        // 1 hour
      frontBannerBlogs: 900,   // 15 minutes
      blogPost: 1800,          // 30 minutes
      stores: 1800,            // 30 minutes
      coupons: 1800,           // 30 minutes
      store_detail: 3600,      // 1 hour
      coupon_detail: 3600,     // 1 hour
      homepage: 600            // 10 minutes
    };
    this.isInitialized = false;
    this.initializationPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.isReconnecting = false;
    this.connectionHealth = {
      lastConnected: null,
      lastError: null,
      totalReconnects: 0,
      isHealthy: false
    };
    
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
          this.connectionHealth.isHealthy = true;
          this.connectionHealth.lastConnected = new Date();
          this.reconnectAttempts = 0;
          this._setupRedisEventListeners();
          console.log('✅ Cache service successfully connected to Redis with auto-reconnection');
          return true;
        }
      } catch (error) {
        this.connectionHealth.lastError = error.message;
        console.error(`❌ Cache initialization attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          console.log('⚠️ Cache service running in fallback mode after all retries');
          this.isInitialized = true;
          this.connectionHealth.isHealthy = false;
          return false;
        }
      }

      const delay = attempt <= 3 ? retryDelay : retryDelay * Math.pow(2, attempt - 3);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.isInitialized = true;
    this.connectionHealth.isHealthy = false;
    return false;
  }

  _setupRedisEventListeners() {
    if (!this.redis) return;

    this.redis.on('error', (error) => {
      console.error('🔴 Redis connection error:', error.message);
      this.connectionHealth.lastError = error.message;
      this.connectionHealth.isHealthy = false;
      this._handleReconnection();
    });

    this.redis.on('connect', () => {
      console.log('🟢 Redis connected');
      this.connectionHealth.isHealthy = true;
      this.connectionHealth.lastConnected = new Date();
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
    });

    this.redis.on('disconnect', () => {
      console.log('🟡 Redis disconnected');
      this.connectionHealth.isHealthy = false;
      this._handleReconnection();
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
      this.connectionHealth.totalReconnects++;
    });
  }

  async _handleReconnection() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`🔄 Attempting Redis reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        this.redis = redisConfig.getClient();
        if (redisConfig.isReady()) {
          this.connectionHealth.isHealthy = true;
          this.connectionHealth.lastConnected = new Date();
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          console.log('✅ Redis reconnection successful');
        } else {
          this.isReconnecting = false;
          this._handleReconnection();
        }
      } catch (error) {
        console.error('❌ Redis reconnection failed:', error.message);
        this.connectionHealth.lastError = error.message;
        this.isReconnecting = false;
        this._handleReconnection();
      }
    }, delay);
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      redisAvailable: this.isAvailable(),
      hasRedisClient: !!this.redis,
      connectionHealth: this.connectionHealth,
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting
    };
  }

  async ensureInitialized() {
    if (!this.isInitialized) await this.initializationPromise;
  }

  isAvailable() {
    return this.redis && redisConfig.isReady();
  }

  generateKey(type, params = {}) {
    // ✅ CONSISTENT KEY PATTERNS: store:{slug}, coupon:{id}, etc.
    switch (type) {
      case 'store':
        return params.slug ? `store:${params.slug}` : `stores:${this._hashParams(params)}`;
      case 'store_detail':
        return `store:${params.id || params.slug}`;
      case 'coupon':
        return params.id ? `coupon:${params.id}` : `coupons:${this._hashParams(params)}`;
      case 'coupon_detail':
        return `coupon:${params.id}`;
      case 'store_coupons':
        return `store:${params.storeId}:coupons:${this._hashParams(params)}`;
      case 'user':
        return `user:${params.id}`;
      default:
        // Fallback to original pattern for other types
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
  }

  _hashParams(params) {
    if (!params || Object.keys(params).length === 0) return 'all';
    
    const filteredParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
      
    return Object.keys(filteredParams)
      .map(key => `${key}:${filteredParams[key]}`)
      .join('|');
  }

  // ✅ STORE-SPECIFIC CACHE METHODS
  async getStore(slug) {
    const key = this.generateKey('store', { slug });
    return await this.get(key);
  }

  async setStore(slug, storeData, ttl = null) {
    const key = this.generateKey('store', { slug });
    return await this.set(key, storeData, ttl || this.defaultTTL.stores);
  }

  async getStoreById(id) {
    const key = this.generateKey('store_detail', { id });
    return await this.get(key);
  }

  async setStoreById(id, storeData, ttl = null) {
    const key = this.generateKey('store_detail', { id });
    return await this.set(key, storeData, ttl || this.defaultTTL.store_detail);
  }

  // ✅ COUPON-SPECIFIC CACHE METHODS
  async getCoupon(id) {
    const key = this.generateKey('coupon', { id });
    return await this.get(key);
  }

  async setCoupon(id, couponData, ttl = null) {
    const key = this.generateKey('coupon', { id });
    return await this.set(key, couponData, ttl || this.defaultTTL.coupons);
  }

  async getStoreCoupons(storeId, params = {}) {
    const key = this.generateKey('store_coupons', { storeId, ...params });
    return await this.get(key);
  }

  async setStoreCoupons(storeId, couponsData, params = {}, ttl = null) {
    const key = this.generateKey('store_coupons', { storeId, ...params });
    return await this.set(key, couponsData, ttl || this.defaultTTL.coupons);
  }

  // ✅ ATOMIC CACHE INVALIDATION FOR STORES
  async invalidateStoreCache(storeId, storeSlug = null) {
    await this.ensureInitialized();
    if (!this.isAvailable()) return false;

    try {
      const keysToDelete = [];
      
      // Store-specific keys
      if (storeSlug) {
        keysToDelete.push(this.generateKey('store', { slug: storeSlug }));
      }
      if (storeId) {
        keysToDelete.push(this.generateKey('store_detail', { id: storeId }));
      }

      // Store coupons cache patterns
      const storeCouponPattern = `store:${storeId}:coupons:*`;
      const storeCouponKeys = await this._getKeysByPattern(storeCouponPattern);
      keysToDelete.push(...storeCouponKeys);

      // General stores list cache
      const storesPattern = 'stores:*';
      const storesKeys = await this._getKeysByPattern(storesPattern);
      keysToDelete.push(...storesKeys);

      // Delete all keys
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        console.log(`✅ Invalidated ${keysToDelete.length} store cache keys for store ${storeId}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Store cache invalidation error:', error);
      return false;
    }
  }

  // ✅ ATOMIC CACHE INVALIDATION FOR COUPONS
  async invalidateCouponCache(couponId, storeId = null) {
    await this.ensureInitialized();
    if (!this.isAvailable()) return false;

    try {
      const keysToDelete = [];
      
      // Coupon-specific keys
      keysToDelete.push(this.generateKey('coupon', { id: couponId }));

      // Store coupons cache if storeId provided
      if (storeId) {
        const storeCouponPattern = `store:${storeId}:coupons:*`;
        const storeCouponKeys = await this._getKeysByPattern(storeCouponPattern);
        keysToDelete.push(...storeCouponKeys);
      }

      // General coupons list cache
      const couponsPattern = 'coupons:*';
      const couponsKeys = await this._getKeysByPattern(couponsPattern);
      keysToDelete.push(...couponsKeys);

      // Delete all keys
      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        console.log(`✅ Invalidated ${keysToDelete.length} coupon cache keys for coupon ${couponId}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Coupon cache invalidation error:', error);
      return false;
    }
  }

  async _getKeysByPattern(pattern) {
    const keys = [];
    let cursor = '0';
    
    do {
      const result = await this.redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      keys.push(...result.keys);
    } while (cursor !== '0');
    
    return keys;
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
    if (!this.isAvailable()) {
      console.log('❌ Redis not available for pattern deletion');
      return 0;
    }

    // ✅ SAFETY: Prevent accidental deletion of all keys
    if (!pattern.startsWith('coupon_backend')) {
      console.warn(`⚠️ Unsafe pattern blocked: ${pattern}`);
      return 0;
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

      if (keys.length === 0) {
        console.log(`✅ No keys found for pattern: ${pattern}`);
        return 0;
      }

      // 🚨 CRITICAL FIX: Delete all matching keys properly
      let deletedCount = 0;
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        if (batch.length === 1) {
          const result = await this.redis.del(batch[0]);
          deletedCount += result;
        } else {
          const result = await this.redis.del(...batch);
          deletedCount += result;
        }
      }
      
      console.log(`✅ Deleted ${deletedCount} cache keys for pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Redis pattern deletion error:', error);
      throw error;
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

  // ✅ COMPREHENSIVE CACHE INVALIDATION WITH ALL REQUIRED PATTERNS
  async invalidateStoreCaches(storeId = null) {
    try {
      const patterns = [
        // Core store patterns
        'coupon_backend:stores*',
        'coupon_backend:store:*',
        'coupon_backend:store_search*',
        
        // Blog patterns
        'coupon_backend:blog*',
        'coupon_backend:blogs*',
        'coupon_backend:frontBannerBlogs*',
        'coupon_backend:related*',
        
        // Homepage patterns
        'coupon_backend:homepage*',
        
        // Category patterns
        'coupon_backend:categories*',
        
        // Coupon patterns
        'coupon_backend:coupons*'
      ];

      // Add aggressive store-specific patterns if storeId provided
      if (storeId) {
        patterns.push(
          `coupon_backend:store:${storeId}*`,
          `coupon_backend:coupons:store:${storeId}*`,
          `coupon_backend:*${storeId}*` // Aggressive pattern for any cache containing storeId
        );
      }

      let totalDeleted = 0;
      const results = [];
      
      for (const pattern of patterns) {
        try {
          const deleted = await this.delPattern(pattern);
          totalDeleted += deleted;
          results.push({ pattern, deleted });
        } catch (error) {
          console.error(`❌ Failed to delete pattern ${pattern}:`, error.message);
          results.push({ pattern, deleted: 0, error: error.message });
        }
      }

      console.log(`✅ Comprehensive cache invalidation completed: ${totalDeleted} keys deleted for store: ${storeId || 'all'}`);
      console.log('📊 Invalidation details:', results);
      return { totalDeleted, results };
    } catch (error) {
      console.error('❌ Store cache invalidation error:', error);
      throw error;
    }
  }

  // ✅ ENHANCED HOMEPAGE CACHE INVALIDATION
  async invalidateHomepageCaches() {
    try {
      const patterns = [
        'coupon_backend:homepage*',
        'coupon_backend:frontBannerBlogs*',
        'coupon_backend:categories*',
        'coupon_backend:stores*' // Homepage often shows featured stores
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deleted = await this.delPattern(pattern);
        totalDeleted += deleted;
      }

      console.log(`✅ Homepage caches invalidated: ${totalDeleted} keys deleted`);
      return totalDeleted;
    } catch (error) {
      console.error('❌ Homepage cache invalidation error:', error);
      throw error;
    }
  }

  // ✅ ENHANCED CATEGORY CACHE INVALIDATION
  async invalidateCategoryCaches() {
    try {
      const patterns = [
        'coupon_backend:categories*',
        'coupon_backend:stores*', // Categories affect store listings
        'coupon_backend:coupons*' // Categories affect coupon listings
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const deleted = await this.delPattern(pattern);
        totalDeleted += deleted;
      }

      console.log(`✅ Category caches invalidated: ${totalDeleted} keys deleted`);
      return totalDeleted;
    } catch (error) {
      console.error('❌ Category cache invalidation error:', error);
      throw error;
    }
  }

  // ✅ NUCLEAR OPTION: INVALIDATE ALL CACHES
  async invalidateAllCaches() {
    try {
      const deleted = await this.delPattern('coupon_backend:*');
      console.log(`🚨 ALL CACHES INVALIDATED: ${deleted} keys deleted`);
      return deleted;
    } catch (error) {
      console.error('❌ All cache invalidation error:', error);
      throw error;
    }
  }

  // ✅ PRODUCTION-READY: SAFE CACHE INVALIDATION WITH ERROR HANDLING
  async invalidateStoreCachesSafely(storeId = null) {
    try {
      console.log(`🛡️ Starting safe cache invalidation for store: ${storeId || 'all'}`);
      const result = await this.invalidateStoreCaches(storeId);
      console.log(`✅ Safe cache invalidation completed successfully: ${result.totalDeleted} keys deleted`);
      return result;
    } catch (error) {
      console.error(`❌ Cache invalidation failed for store ${storeId}:`, error.message);
      
      // ✅ CRITICAL: Don't throw - continue without cache invalidation
      // This prevents cache failures from breaking the entire operation
      const fallbackResult = {
        totalDeleted: 0,
        error: error.message,
        fallback: true,
        timestamp: new Date(),
        storeId: storeId
      };
      
      console.warn(`⚠️ Continuing operation without cache invalidation:`, fallbackResult);
      return fallbackResult;
    }
  }

  // ✅ PRODUCTION-READY: SAFE HOMEPAGE CACHE INVALIDATION
  async invalidateHomepageCachesSafely() {
    try {
      const result = await this.invalidateHomepageCaches();
      console.log(`✅ Safe homepage cache invalidation completed: ${result} keys deleted`);
      return { totalDeleted: result, success: true };
    } catch (error) {
      console.error('❌ Homepage cache invalidation failed:', error.message);
      return {
        totalDeleted: 0,
        error: error.message,
        fallback: true,
        success: false
      };
    }
  }

  // ✅ PRODUCTION-READY: SAFE BLOG CACHE INVALIDATION
  async invalidateBlogCachesSafely() {
    try {
      const result = await this.invalidateBlogCaches();
      console.log(`✅ Safe blog cache invalidation completed: ${result ? 'success' : 'partial'}`);
      return { success: result, fallback: false };
    } catch (error) {
      console.error('❌ Blog cache invalidation failed:', error.message);
      return {
        success: false,
        error: error.message,
        fallback: true
      };
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