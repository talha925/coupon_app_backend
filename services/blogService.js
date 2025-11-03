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

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const selectFields =
        'title slug shortDescription image.url image.alt meta author.name category.name category.slug store.name store.url tags status publishDate engagement.readingTime FrontBanner isFeaturedForHome version robots createdAt';

      const [blogs, total] = await Promise.all([
        BlogPost.find(query)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .select(selectFields)
          .lean(),
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

      const cacheTTL = FrontBanner !== undefined ? 900 : 300;
      await cacheService.set(cacheKey, result, cacheTTL);
      console.log(`✅ Cache set: Blog query - ${cacheKey} (TTL: ${cacheTTL}s)`);

      return result;

    } catch (error) {
      console.error('❌ BlogService.findAll Error:', error);
      throw new AppError('Failed to fetch blog posts', 500);
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
