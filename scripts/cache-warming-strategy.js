/**
 * 🚨 CRITICAL PERFORMANCE OPTIMIZATION: Cache Warming Strategy
 * 
 * This script implements strategic cache warming for frequently accessed data
 * to ensure optimal API response times and reduce database load.
 * 
 * PERFORMANCE TARGETS:
 * - blog-categories: 10000ms → <300ms (97% improvement)
 * - blogs?frontBanner=true: 9000ms → <200ms (98% improvement)  
 * - Individual blog posts: 4800ms → <100ms (98% improvement)
 */

const mongoose = require('mongoose');
const cacheService = require('../services/cacheService');
const blogService = require('../services/blogService');
const blogCategoryService = require('../services/blogCategoryService');

class CacheWarmingStrategy {
  constructor() {
    this.warmingStats = {
      startTime: null,
      endTime: null,
      itemsWarmed: 0,
      errors: 0,
      categories: [],
      blogs: [],
      relatedPosts: []
    };
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coupon-backend');
      console.log('✅ Connected to MongoDB for cache warming');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }

  // 🚨 CRITICAL: Warm blog categories cache (10s → <300ms)
  async warmBlogCategories() {
    console.log('\n🔥 Warming blog categories cache...');
    try {
      const categories = await blogCategoryService.findAll();
      this.warmingStats.categories = categories;
      this.warmingStats.itemsWarmed += categories.length;
      console.log(`✅ Warmed ${categories.length} blog categories`);
      return categories;
    } catch (error) {
      console.error('❌ Failed to warm blog categories:', error.message);
      this.warmingStats.errors++;
      throw error;
    }
  }

  // 🚨 CRITICAL: Warm FrontBanner blogs cache (9.7s → <200ms)
  async warmFrontBannerBlogs() {
    console.log('\n🔥 Warming FrontBanner blogs cache...');
    try {
      const frontBannerBlogs = await blogService.findAll({ 
        FrontBanner: 'true', 
        status: 'published',
        limit: 20 // Warm top 20 FrontBanner blogs
      });
      this.warmingStats.blogs.push(...frontBannerBlogs.blogs);
      this.warmingStats.itemsWarmed += frontBannerBlogs.blogs.length;
      console.log(`✅ Warmed ${frontBannerBlogs.blogs.length} FrontBanner blogs`);
      return frontBannerBlogs;
    } catch (error) {
      console.error('❌ Failed to warm FrontBanner blogs:', error.message);
      this.warmingStats.errors++;
      throw error;
    }
  }

  // 🚨 CRITICAL: Warm featured blogs cache
  async warmFeaturedBlogs() {
    console.log('\n🔥 Warming featured blogs cache...');
    try {
      const featuredBlogs = await blogService.findAll({ 
        isFeaturedForHome: 'true', 
        status: 'published',
        limit: 15 // Warm top 15 featured blogs
      });
      this.warmingStats.blogs.push(...featuredBlogs.blogs);
      this.warmingStats.itemsWarmed += featuredBlogs.blogs.length;
      console.log(`✅ Warmed ${featuredBlogs.blogs.length} featured blogs`);
      return featuredBlogs;
    } catch (error) {
      console.error('❌ Failed to warm featured blogs:', error.message);
      this.warmingStats.errors++;
      throw error;
    }
  }

  // 🚨 CRITICAL: Warm individual blog posts and their related posts (4.8s → <100ms)
  async warmPopularBlogPosts() {
    console.log('\n🔥 Warming popular individual blog posts...');
    try {
      // Get most recent published blogs (likely to be accessed)
      const recentBlogs = await blogService.findAll({ 
        status: 'published',
        sort: '-publishDate',
        limit: 10 // Warm top 10 recent blogs
      });

      let warmedCount = 0;
      for (const blog of recentBlogs.blogs) {
        try {
          // This will cache both the blog and its related posts
          await blogService.findById(blog._id);
          warmedCount++;
          this.warmingStats.itemsWarmed++;
        } catch (error) {
          console.error(`❌ Failed to warm blog ${blog._id}:`, error.message);
          this.warmingStats.errors++;
        }
      }

      console.log(`✅ Warmed ${warmedCount} individual blog posts with related data`);
      return warmedCount;
    } catch (error) {
      console.error('❌ Failed to warm popular blog posts:', error.message);
      this.warmingStats.errors++;
      throw error;
    }
  }

  // 🚨 CRITICAL: Warm category-specific blog listings
  async warmCategoryBlogs() {
    console.log('\n🔥 Warming category-specific blog listings...');
    try {
      const categories = this.warmingStats.categories;
      let warmedCount = 0;

      for (const category of categories.slice(0, 5)) { // Warm top 5 categories
        try {
          const categoryBlogs = await blogService.findAll({ 
            categoryId: category._id,
            status: 'published',
            limit: 10
          });
          warmedCount += categoryBlogs.blogs.length;
          this.warmingStats.itemsWarmed += categoryBlogs.blogs.length;
        } catch (error) {
          console.error(`❌ Failed to warm category ${category._id} blogs:`, error.message);
          this.warmingStats.errors++;
        }
      }

      console.log(`✅ Warmed ${warmedCount} category-specific blog listings`);
      return warmedCount;
    } catch (error) {
      console.error('❌ Failed to warm category blogs:', error.message);
      this.warmingStats.errors++;
      throw error;
    }
  }

  // 🚨 PERFORMANCE MONITORING: Check cache hit rates
  async validateCacheWarming() {
    console.log('\n📊 Validating cache warming effectiveness...');
    
    const validationResults = {
      categories: { cached: false, responseTime: 0 },
      frontBannerBlogs: { cached: false, responseTime: 0 },
      featuredBlogs: { cached: false, responseTime: 0 },
      individualBlog: { cached: false, responseTime: 0 }
    };

    try {
      // Test categories cache
      const startCategories = Date.now();
      const categories = await blogCategoryService.findAll();
      validationResults.categories.responseTime = Date.now() - startCategories;
      validationResults.categories.cached = validationResults.categories.responseTime < 50; // Should be <50ms if cached

      // Test FrontBanner blogs cache
      const startFrontBanner = Date.now();
      const frontBannerBlogs = await blogService.findAll({ FrontBanner: 'true', limit: 5 });
      validationResults.frontBannerBlogs.responseTime = Date.now() - startFrontBanner;
      validationResults.frontBannerBlogs.cached = validationResults.frontBannerBlogs.responseTime < 100;

      // Test featured blogs cache
      const startFeatured = Date.now();
      const featuredBlogs = await blogService.findAll({ isFeaturedForHome: 'true', limit: 5 });
      validationResults.featuredBlogs.responseTime = Date.now() - startFeatured;
      validationResults.featuredBlogs.cached = validationResults.featuredBlogs.responseTime < 100;

      // Test individual blog cache (if we have blogs)
      if (this.warmingStats.blogs.length > 0) {
        const testBlog = this.warmingStats.blogs[0];
        const startIndividual = Date.now();
        await blogService.findById(testBlog._id);
        validationResults.individualBlog.responseTime = Date.now() - startIndividual;
        validationResults.individualBlog.cached = validationResults.individualBlog.responseTime < 50;
      }

      console.log('📊 Cache Validation Results:');
      console.log(`   Categories: ${validationResults.categories.cached ? '✅' : '❌'} ${validationResults.categories.responseTime}ms`);
      console.log(`   FrontBanner: ${validationResults.frontBannerBlogs.cached ? '✅' : '❌'} ${validationResults.frontBannerBlogs.responseTime}ms`);
      console.log(`   Featured: ${validationResults.featuredBlogs.cached ? '✅' : '❌'} ${validationResults.featuredBlogs.responseTime}ms`);
      console.log(`   Individual: ${validationResults.individualBlog.cached ? '✅' : '❌'} ${validationResults.individualBlog.responseTime}ms`);

      return validationResults;
    } catch (error) {
      console.error('❌ Cache validation failed:', error.message);
      return validationResults;
    }
  }

  // 🚨 MAIN EXECUTION: Run complete cache warming strategy
  async executeWarmingStrategy() {
    console.log('🚀 Starting Strategic Cache Warming...');
    this.warmingStats.startTime = new Date();

    try {
      await this.connect();

      // Execute warming in optimal order
      await this.warmBlogCategories();
      await this.warmFrontBannerBlogs();
      await this.warmFeaturedBlogs();
      await this.warmPopularBlogPosts();
      await this.warmCategoryBlogs();

      // Validate cache effectiveness
      const validationResults = await this.validateCacheWarming();

      this.warmingStats.endTime = new Date();
      const duration = this.warmingStats.endTime - this.warmingStats.startTime;

      console.log('\n🎯 Cache Warming Strategy Complete!');
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`📦 Items Warmed: ${this.warmingStats.itemsWarmed}`);
      console.log(`❌ Errors: ${this.warmingStats.errors}`);
      console.log(`📊 Success Rate: ${((this.warmingStats.itemsWarmed / (this.warmingStats.itemsWarmed + this.warmingStats.errors)) * 100).toFixed(2)}%`);

      // Generate performance report
      const report = {
        timestamp: new Date().toISOString(),
        duration: duration,
        itemsWarmed: this.warmingStats.itemsWarmed,
        errors: this.warmingStats.errors,
        successRate: ((this.warmingStats.itemsWarmed / (this.warmingStats.itemsWarmed + this.warmingStats.errors)) * 100).toFixed(2),
        validation: validationResults,
        expectedImprovements: {
          'blog-categories': 'From 10000ms to <300ms (97% improvement)',
          'blogs?frontBanner=true': 'From 9700ms to <200ms (98% improvement)',
          'individual-blogs': 'From 4800ms to <100ms (98% improvement)'
        },
        nextSteps: [
          'Monitor cache hit rates in production',
          'Set up automated cache warming schedule',
          'Implement cache warming on application startup',
          'Add cache warming to deployment pipeline'
        ]
      };

      console.log('\n📋 Performance Report Generated');
      return report;

    } catch (error) {
      console.error('💥 Cache warming strategy failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// 🚀 Execute cache warming if run directly
if (require.main === module) {
  const cacheWarmer = new CacheWarmingStrategy();
  
  cacheWarmer.executeWarmingStrategy()
    .then(report => {
      console.log('\n✅ Cache warming completed successfully!');
      console.log('📊 Full report:', JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Cache warming failed:', error.message);
      process.exit(1);
    });
}

module.exports = CacheWarmingStrategy;