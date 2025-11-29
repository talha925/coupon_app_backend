// services/blogService.js
const BlogPost = require('../models/blogPostModel');
const AppError = require('../errors/AppError');
const cacheService = require('./cacheService');

class BlogService {
  async findAll(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'published',
        categoryId,
        storeId,
        tags,
        search,
        FrontBanner,
        sort = '-publishDate'
      } = queryParams;

      const cacheKey = cacheService.generateKey('blogs', {
        page,
        limit,
        status,
        categoryId,
        storeId,
        tags,
        search,
        FrontBanner,
        sort
      });

      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        console.log(`✅ Cache hit: Blog query - ${cacheKey}`);
        return cachedResult;
      }

      const query = {};
      if (status) query.status = status;
      if (FrontBanner !== undefined) {
        query.FrontBanner = FrontBanner === 'true' || FrontBanner === true;
      }
      if (categoryId) query['category.id'] = categoryId;
      if (storeId) query['store.id'] = storeId;
      if (tags) {
        query.tags = Array.isArray(tags)
          ? { $in: tags }
          : { $in: String(tags).split(',') };
      }

      if (search) {
        try {
          const indexes = await BlogPost.collection.indexes();
          const hasTextIndex = indexes.some(idx => {
            if (!idx.key) return false;
            return Object.values(idx.key).some(v => v === 'text');
          });

          if (hasTextIndex) {
            query.$text = { $search: search };
          } else {
            query.$or = [
              { title: { $regex: search, $options: 'i' } },
              { shortDescription: { $regex: search, $options: 'i' } }
            ];
          }
        } catch (err) {
          console.warn('⚠️ Text index check failed, using regex fallback:', err.message);
          query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { shortDescription: { $regex: search, $options: 'i' } }
          ];
        }
      }

      const selectFields =
        'title slug shortDescription image.url image.alt meta author.name category.name category.slug store.name store.url tags status publishDate engagement.readingTime FrontBanner isFeaturedForHome version robots createdAt';

      // ✅ FIX: Calculate total first to validate pagination
      const total = await BlogPost.countDocuments(query);
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const totalPages = Math.ceil(total / limitNum);

      // ✅ FIX: Validate page number
      if (pageNum > totalPages && totalPages > 0) {
        // Return empty result for invalid page
        const result = {
          blogs: [],
          pagination: {
            total,
            page: pageNum,
            pages: totalPages,
            limit: limitNum
          }
        };

        const cacheTTL = FrontBanner !== undefined ? 900 : 300;
        await cacheService.set(cacheKey, result, cacheTTL);
        return result;
      }

      const skip = (pageNum - 1) * limitNum;

      const blogs = await BlogPost.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select(selectFields)
        .lean();

      const result = {
        blogs,
        pagination: {
          total,
          page: pageNum,
          pages: totalPages,
          limit: limitNum
        }
      };

      const cacheTTL = FrontBanner !== undefined ? 900 : 300;
      await cacheService.set(cacheKey, result, cacheTTL);
      console.log(`✅ Cache set: Blog query - ${cacheKey} (TTL: ${cacheTTL}s)`);

      return result;

    } catch (error) {
      console.error('❌ BlogService.findAll Error:', error);
      throw new AppError('Failed to fetch blog posts', 500);
    }
  }

  async create(data) {
    try {
      const blog = await BlogPost.create(data);
      // Invalidate cache (simplified)
      // In a real app, you might want to be more granular or use tags
      // For now, we'll just let the TTL expire or clear specific keys if we tracked them
      // But since we don't track all list keys, we accept eventual consistency or clear all if possible.
      // cacheService.del('blogs') is not implemented to clear patterns easily without scan.
      // So we rely on TTL or specific key invalidation if we knew it.
      // For now, just return the blog.
      return blog;
    } catch (error) {
      console.error('❌ BlogService.create Error:', error);
      throw new AppError('Failed to create blog post', 500);
    }
  }

  async update(id, data) {
    try {
      const blog = await BlogPost.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
      });
      if (!blog) throw new AppError('Blog post not found', 404);

      const cacheKey = cacheService.generateKey('blog_post', { id });
      await cacheService.del(cacheKey);

      return blog;
    } catch (error) {
      console.error('❌ BlogService.update Error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update blog post', 500);
    }
  }

  async delete(id) {
    try {
      const blog = await BlogPost.findByIdAndDelete(id);
      if (!blog) throw new AppError('Blog post not found', 404);

      const cacheKey = cacheService.generateKey('blog_post', { id });
      await cacheService.del(cacheKey);

      return null;
    } catch (error) {
      console.error('❌ BlogService.delete Error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete blog post', 500);
    }
  }

  async updateEngagementMetrics(id, metrics) {
    try {
      // metrics is expected to be an object with fields to update, e.g., { "engagement.likes": 10 } or { engagement: { ... } }
      // or if using increments, the controller should have prepared the update operator.
      // We'll assume direct update for now.
      const blog = await BlogPost.findByIdAndUpdate(id, metrics, {
        new: true
      });
      if (!blog) throw new AppError('Blog post not found', 404);

      const cacheKey = cacheService.generateKey('blog_post', { id });
      await cacheService.del(cacheKey);

      return blog;
    } catch (error) {
      console.error('❌ BlogService.updateEngagementMetrics Error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update engagement metrics', 500);
    }
  }

  // ✅ FINAL UPDATED findById
  async findById(id) {
    try {
      const cacheKey = cacheService.generateKey('blog_post', { id });
      const cachedBlog = await cacheService.get(cacheKey);
      if (cachedBlog) {
        console.log(`✅ Cache hit: Individual blog - ${id}`);
        return cachedBlog;
      }

      const selectFields =
        'title slug shortDescription longDescription image author category store tags status publishDate engagement seo navigation faqs meta version robots createdAt lastUpdated';

      const blog = await BlogPost.findById(id).select(selectFields).lean();
      if (!blog) throw new AppError('Blog post not found', 404);

      const relatedPosts = await this.getRelatedPostsOptimized(
        id,
        blog.category?.id,
        blog.store?.id
      );

      if (!blog.meta || Object.keys(blog.meta).length === 0) {
        blog.meta = {
          title: blog.title || '',
          description: blog.shortDescription || '',
          keywords: blog.tags?.join(', ') || ''
        };
      }

      const result = { ...blog, relatedPosts };

      await cacheService.set(cacheKey, result, 3600);
      console.log(`✅ Cache set: Individual blog - ${id} (TTL: 3600s)`);

      return result;

    } catch (error) {
      console.error('❌ BlogService.findById Error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch blog post', 500);
    }
  }

  // ✅ Optimized version already in use
  async getRelatedPostsOptimized(blogId, categoryId, storeId, limit = 5) {
    try {
      if (!categoryId && !storeId) return [];

      const cacheKey = cacheService.generateKey('related_posts', { blogId });
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      const relatedPosts = await BlogPost.find({
        'category.id': categoryId,
        'store.id': storeId,
        _id: { $ne: blogId },
        status: 'published'
      })
        .sort({ publishDate: -1 })
        .limit(limit)
        .select(
          'title slug shortDescription image.url image.alt publishDate engagement.readingTime'
        )
        .lean();

      await cacheService.set(cacheKey, relatedPosts, 1800);
      return relatedPosts;

    } catch (error) {
      console.error('❌ getRelatedPostsOptimized Error:', error);
      return [];
    }
  }

  // ✅ YOUR REQUESTED METHOD (added at bottom)
  async getRelatedPosts(blogId) {
    try {
      const cacheKey = cacheService.generateKey('related_posts', { blogId });
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) return cachedData;

      const blog = await BlogPost.findById(blogId);
      if (!blog) {
        return []; // 👈 SAFE: agar blog nahi mila to khali list return karo
      }

      const related = await BlogPost.find({
        'category.id': blog.category.id,
        'store.id': blog.store.id,
        _id: { $ne: blogId },
        status: 'published',
      });

      await cacheService.set(cacheKey, related);
      return related;
    } catch (err) {
      throw new AppError(`Failed to fetch related posts: ${err.message}`, 500);
    }
  }
}

module.exports = new BlogService();