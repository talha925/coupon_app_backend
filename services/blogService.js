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

    // Build optimized query
    const query = {};
    if (status) query.status = status;
    if (categoryId) query['category.id'] = categoryId;
    if (storeId) query['store.id'] = storeId;
    if (tags) {
      query.tags = Array.isArray(tags) ? { $in: tags } : { $in: tags.split(',') };
    }
    if (FrontBanner !== undefined) query.FrontBanner = FrontBanner === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // PERFORMANCE: Use lean() and optimized field selection
    const [blogs, total] = await Promise.all([
      BlogPost.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('title slug shortDescription image.url image.alt author.name category.name category.slug store.name store.url tags status publishDate engagement.readingTime FrontBanner isFeaturedForHome createdAt')
        .lean(), // Critical for performance
      BlogPost.countDocuments(query)
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

    // PERFORMANCE: Cache all results with 5-minute TTL (300 seconds)
    await cacheService.set(cacheKey, result, 300);
    console.log(`✅ Cache set: Blog query - ${cacheKey}`);

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

  // Find one blog by ID with enhanced data
  async findById(id) {
    // PERFORMANCE: Check cache first
    const cacheKey = this.generateCacheKey('blog', { id });
    const cachedBlog = await cacheService.get(cacheKey);
    
    if (cachedBlog) {
      console.log(`✅ Cache hit: Blog by ID - ${id}`);
      return cachedBlog;
    }

    // PERFORMANCE: Parallel execution for blog data and category info
    const [blog, categoryInfo] = await Promise.all([
      BlogPost.findById(id).lean(),
      // Get additional category information if blog has category
      BlogPost.findById(id).select('category.id').lean().then(async (blogData) => {
        if (blogData?.category?.id) {
          const BlogCategory = require('../models/blogCategoryModel');
          return BlogCategory.findById(blogData.category.id).select('name slug').lean();
        }
        return null;
      })
    ]);

    if (!blog) throw new AppError('Blog post not found', 404);
    
    // Enhance blog with additional category info if available
    if (categoryInfo) {
      blog.category = { ...blog.category, ...categoryInfo };
    }
    
    // PERFORMANCE: Cache individual blog with 30-minute TTL
    await cacheService.set(cacheKey, blog, 1800);
    console.log(`✅ Cache set: Blog by ID - ${id}`);
    
    return blog;
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
}

module.exports = new BlogService();
