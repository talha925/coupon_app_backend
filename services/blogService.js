const BlogPost = require('../models/blogPostModel');
const AppError = require('../errors/AppError');
const cacheService = require('./cacheService');

class BlogService {
  // Find all blog posts with pagination, search, filter, sort
  async findAll(queryParams) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      categoryId, 
      storeId, 
      tags, 
      search,
      FrontBanner,
      sort = '-publishDate' 
    } = queryParams;

    // PERFORMANCE: Generate cache key for all queries, not just FrontBanner
    const cacheKey = this.generateCacheKey('blogs', { page, limit, status, categoryId, storeId, tags, search, FrontBanner, sort });
    
    // Check cache first for all queries
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      console.log(`✅ Cache hit: Blog query - ${cacheKey}`);
      return cachedResult;
    }

    // 🚨 CRITICAL OPTIMIZATION: Build optimized query with proper indexing
    const query = {};
    
    // 🚨 CRITICAL: FrontBanner queries - use compound index
    if (FrontBanner !== undefined) {
      query.FrontBanner = FrontBanner === 'true';
      // Ensure status is also included for compound index usage
      if (!status) query.status = 'published'; // Default to published for FrontBanner
    }
    
    if (status) query.status = status;
    if (categoryId) query['category.id'] = categoryId;
    if (storeId) query['store.id'] = storeId;
    if (tags) {
      query.tags = Array.isArray(tags) ? { $in: tags } : { $in: tags.split(',') };
    }
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 🚨 CRITICAL OPTIMIZATION: Minimal field selection for better performance
    const selectFields = 'title slug shortDescription image.url image.alt author.name category.name category.slug store.name store.url tags status publishDate engagement.readingTime FrontBanner isFeaturedForHome createdAt';

    // 🚨 CRITICAL: Use Promise.all for parallel execution + optimized queries
    const [blogs, total] = await Promise.all([
      BlogPost.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select(selectFields) // Minimal field selection
        .lean(), // Critical for performance - returns plain JS objects
      BlogPost.countDocuments(query) // Use countDocuments for better performance
    ]);

    const result = {
      blogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    };

    // 🚨 CRITICAL: Extended cache TTL for FrontBanner queries (15 minutes)
    const cacheTTL = FrontBanner !== undefined ? 900 : 300; // 15 min for FrontBanner, 5 min for others
    await cacheService.set(cacheKey, result, cacheTTL);
    console.log(`✅ Cache set: Blog query - ${cacheKey} (TTL: ${cacheTTL}s)`);

    return result;
  }

  // PERFORMANCE: Generate consistent cache keys
  generateCacheKey(type, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${type}:${sortedParams}`;
  }

  // 🚨 CRITICAL OPTIMIZATION: Find blog post by ID with related data
  async findById(id) {
    // 🚨 CRITICAL OPTIMIZATION: Enhanced caching for individual blog posts
    const cacheKey = `blog:${id}`;
    const cachedBlog = await cacheService.get(cacheKey);
    if (cachedBlog) {
      console.log(`✅ Cache hit: Individual blog - ${id}`);
      return cachedBlog;
    }

    // 🚨 CRITICAL: Optimized field selection for individual blog posts
    const selectFields = 'title slug shortDescription longDescription image author category store tags status publishDate engagement seo navigation faqs createdAt lastUpdated';

    // 🚨 CRITICAL: Parallel execution with optimized queries
    const [blog, relatedPosts] = await Promise.all([
      BlogPost.findById(id)
        .select(selectFields) // Minimal necessary fields
        .lean(), // Critical for performance
      // 🚨 OPTIMIZATION: Get related posts with minimal fields only
      this.getRelatedPostsOptimized(id)
    ]);

    if (!blog) {
      const AppError = require('../utils/appError');
      throw new AppError('Blog post not found', 404);
    }

    // 🚨 CRITICAL: Extended cache TTL for individual blog posts (1 hour)
    const result = { ...blog, relatedPosts };
    await cacheService.set(cacheKey, result, 3600); // 1 hour cache
    console.log(`✅ Cache set: Individual blog - ${id} (TTL: 3600s)`);

    return result;
  }

  // Create new blog post
  async create(blogData) {
    // Data consistency: engagement metrics always non-negative
    if (blogData.engagement) {
      blogData.engagement.likes = Math.max(0, blogData.engagement.likes || 0);
      blogData.engagement.shares = Math.max(0, blogData.engagement.shares || 0);
      blogData.engagement.comments = Math.max(0, blogData.engagement.comments || 0);
    }
    if (blogData.status === 'published' && !blogData.publishDate) {
      blogData.publishDate = new Date();
    }
    const blog = await BlogPost.create(blogData);
    
    // PERFORMANCE: Invalidate all blog-related caches
    await this.invalidateAllBlogCaches();
    
    return blog;
  }

  // Update blog post by ID
  async update(id, updateData) {
    // PERFORMANCE: Parallel execution for validation and update preparation
    const [currentBlog, validationChecks] = await Promise.all([
      BlogPost.findById(id).select('status publishDate').lean(),
      Promise.resolve().then(() => {
        // Data consistency: engagement metrics always non-negative
        if (updateData.engagement) {
          updateData.engagement.likes = Math.max(0, updateData.engagement.likes || 0);
          updateData.engagement.shares = Math.max(0, updateData.engagement.shares || 0);
          updateData.engagement.comments = Math.max(0, updateData.engagement.comments || 0);
        }
        return true;
      })
    ]);

    if (!currentBlog) throw new AppError('Blog post not found', 404);

    // If moving to published, set publishDate
    if (updateData.status === 'published' && currentBlog.status !== 'published') {
      updateData.publishDate = new Date();
    }

    // PERFORMANCE: Parallel execution for update and cache invalidation
    const [blog] = await Promise.all([
      BlogPost.findByIdAndUpdate(
        id,
        { ...updateData, lastUpdated: new Date() },
        { new: true, runValidators: true }
      ).lean(),
      this.invalidateAllBlogCaches() // Start cache invalidation in parallel
    ]);

    return blog;
  }

  // Delete blog post
  async delete(id) {
    const blog = await BlogPost.findByIdAndDelete(id);
    if (!blog) throw new AppError('Blog post not found', 404);
    
    // PERFORMANCE: Invalidate all blog-related caches
    await this.invalidateAllBlogCaches();
    
    return null;
  }

  // PERFORMANCE: Comprehensive cache invalidation
  async invalidateAllBlogCaches() {
    try {
      // Use pattern-based deletion for efficiency
      await Promise.all([
        cacheService.delPattern('blogs:*'),
        cacheService.delPattern('blog:*'),
        cacheService.delPattern('related:*'),
        cacheService.invalidateBlogCaches() // Legacy method for compatibility
      ]);
      console.log('✅ All blog caches invalidated');
    } catch (error) {
      console.error('❌ Cache invalidation error:', error);
    }
  }

  // Related posts based on category + store, excluding current
  async getRelatedPosts(categoryId, storeId, excludeId, limit = 3) {
    // PERFORMANCE: Check cache first
    const cacheKey = this.generateCacheKey('related', { categoryId, storeId, excludeId, limit });
    const cachedRelated = await cacheService.get(cacheKey);
    
    if (cachedRelated) {
      console.log(`✅ Cache hit: Related posts - ${excludeId}`);
      return cachedRelated;
    }

    const relatedPosts = await BlogPost.find({
      'category.id': categoryId,
      'store.id': storeId,
      _id: { $ne: excludeId },
      status: 'published'
    })
    .sort('-publishDate')
    .limit(limit)
    .select('title slug image.url image.alt shortDescription publishDate')
    .lean();

    // PERFORMANCE: Cache related posts with 15-minute TTL
    await cacheService.set(cacheKey, relatedPosts, 900);
    console.log(`✅ Cache set: Related posts - ${excludeId}`);

    return relatedPosts;
  }

  // Engagement update: likes, shares, comments (always non-negative)
  async updateEngagementMetrics(id, metrics) {
    const allowedMetrics = ['likes', 'shares', 'comments'];
    const update = {};
    for (const [key, value] of Object.entries(metrics)) {
      if (allowedMetrics.includes(key)) {
        update[`engagement.${key}`] = Math.max(0, value);
      }
    }
    return BlogPost.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  }
  // 🚨 NEW OPTIMIZED METHOD: Get related posts with minimal data transfer
  async getRelatedPostsOptimized(blogId) {
    const cacheKey = `related_posts:${blogId}`;
    const cachedRelated = await cacheService.get(cacheKey);
    if (cachedRelated) {
      console.log(`✅ Cache hit: Related posts - ${blogId}`);
      return cachedRelated;
    }

    // Get the current blog's category for related posts
    const currentBlog = await BlogPost.findById(blogId).select('category.id store.id').lean();
    if (!currentBlog) return [];

    // 🚨 CRITICAL: Optimized related posts query with compound index usage
    const relatedPosts = await BlogPost.find({
      'category.id': currentBlog.category.id,
      'store.id': currentBlog.store.id,
      _id: { $ne: blogId },
      status: 'published'
    })
    .sort({ publishDate: -1 })
    .limit(5)
    .select('title slug shortDescription image.url image.alt publishDate engagement.readingTime') // Minimal fields
    .lean();

    // 🚨 CRITICAL: Cache related posts for 30 minutes
    await cacheService.set(cacheKey, relatedPosts, 1800);
    console.log(`✅ Cache set: Related posts - ${blogId} (TTL: 1800s)`);

    return relatedPosts;
  }
}

module.exports = new BlogService();
