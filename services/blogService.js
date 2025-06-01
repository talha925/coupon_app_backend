const BlogPost = require('../models/blogPostModel');
const AppError = require('../errors/AppError');
const { sanitizeContent, generateSlug, calculateReadingTime, formatBlogResponse } = require('../utils/blogUtils');

class BlogService {
  async findAll(queryParams) {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      categoryId, 
      storeId, 
      tags, 
      search,
      sort = '-publishDate' 
    } = queryParams;

    const query = {};
    
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
    
    const [blogs, total] = await Promise.all([
      BlogPost.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-longDescription')
        .lean(),
      BlogPost.countDocuments(query)
    ]);

    return {
      blogs: blogs.map(formatBlogResponse),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    };
  }

  async findById(id) {
    const blog = await BlogPost.findById(id).lean();
    
    if (!blog) {
      throw new AppError('Blog post not found', 404);
    }

    return formatBlogResponse(blog);
  }

  async create(blogData) {
    blogData.longDescription = sanitizeContent(blogData.longDescription);
    
    const readingTimeMinutes = calculateReadingTime(blogData.longDescription);
    blogData.engagement = {
      ...blogData.engagement,
      readingTime: `${readingTimeMinutes} min read`,
      wordCount: blogData.longDescription.split(/\s+/).length
    };

    if (blogData.status === 'published' && !blogData.publishDate) {
      blogData.publishDate = new Date();
    }

    const blog = await BlogPost.create(blogData);
    return formatBlogResponse(blog);
  }

  async update(id, updateData) {
    if (updateData.longDescription) {
      updateData.longDescription = sanitizeContent(updateData.longDescription);
      
      const readingTimeMinutes = calculateReadingTime(updateData.longDescription);
      updateData.engagement = {
        ...updateData.engagement,
        readingTime: `${readingTimeMinutes} min read`,
        wordCount: updateData.longDescription.split(/\s+/).length
      };
    }

    if (updateData.status === 'published') {
      const currentBlog = await BlogPost.findById(id);
      if (currentBlog.status !== 'published') {
        updateData.publishDate = new Date();
      }
    }

    const blog = await BlogPost.findByIdAndUpdate(
      id,
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    ).lean();

    if (!blog) {
      throw new AppError('Blog post not found', 404);
    }

    return formatBlogResponse(blog);
  }

  async delete(id) {
    const blog = await BlogPost.findByIdAndDelete(id);
    
    if (!blog) {
      throw new AppError('Blog post not found', 404);
    }

    return null;
  }

  async getRelatedPosts(categoryId, storeId, excludeId, limit = 3) {
    return BlogPost.find({
      'category.id': categoryId,
      'store.id': storeId,
      _id: { $ne: excludeId },
      status: 'published'
    })
    .sort('-publishDate')
    .limit(limit)
    .select('title slug image')
    .lean();
  }

  async updateEngagementMetrics(id, metrics) {
    const allowedMetrics = ['likes', 'shares', 'comments'];
    const update = {};

    for (const [key, value] of Object.entries(metrics)) {
      if (allowedMetrics.includes(key)) {
        update[`engagement.${key}`] = value;  // <-- Fixed here
      }
    }

    return BlogPost.findByIdAndUpdate(id, { $inc: update }, { new: true }).lean();
  }
}

module.exports = new BlogService();
