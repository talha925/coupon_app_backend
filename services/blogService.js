const BlogPost = require('../models/blogPostModel');
const AppError = require('../errors/AppError');

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
        .select('-longDescription') // hide heavy field for listing
        .lean(),
      BlogPost.countDocuments(query)
    ]);

    return {
      blogs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    };
  }

  // Find one blog by ID
  async findById(id) {
    const blog = await BlogPost.findById(id).lean();
    if (!blog) throw new AppError('Blog post not found', 404);
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
    return blog;
  }

  // Update blog post by ID
  async update(id, updateData) {
    // Data consistency: engagement metrics always non-negative
    if (updateData.engagement) {
      updateData.engagement.likes = Math.max(0, updateData.engagement.likes || 0);
      updateData.engagement.shares = Math.max(0, updateData.engagement.shares || 0);
      updateData.engagement.comments = Math.max(0, updateData.engagement.comments || 0);
    }
    // If moving to published, set publishDate
    if (updateData.status === 'published') {
      const currentBlog = await BlogPost.findById(id);
      if (currentBlog && currentBlog.status !== 'published') {
        updateData.publishDate = new Date();
      }
    }
    const blog = await BlogPost.findByIdAndUpdate(
      id,
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    ).lean();
    if (!blog) throw new AppError('Blog post not found', 404);
    return blog;
  }

  // Delete blog post
  async delete(id) {
    const blog = await BlogPost.findByIdAndDelete(id);
    if (!blog) throw new AppError('Blog post not found', 404);
    return null;
  }

  // Related posts based on category + store, excluding current
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
