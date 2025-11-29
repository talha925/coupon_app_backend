const BlogService = require('../services/blogService');
const AppError = require('../errors/AppError');
const { catchAsync } = require('../utils/errorUtils');

exports.getBlogs = catchAsync(async (req, res) => {
  const result = await BlogService.findAll(req.query);

  res.status(200).json({
    success: true,
    message: 'Blog posts retrieved successfully',
    data: result
  });
});

exports.getBlogById = catchAsync(async (req, res) => {
  // PERFORMANCE: Parallel execution for blog and related data
  const [blog, relatedPosts] = await Promise.all([
    BlogService.findById(req.params.id),
    BlogService.getRelatedPosts(null, null, req.params.id, 3) // Get 3 related posts
  ]);

  res.status(200).json({
    success: true,
    message: 'Blog post retrieved successfully',
    data: {
      blog,
      relatedPosts
    }
  });
});

exports.createBlog = catchAsync(async (req, res) => {
  const blog = await BlogService.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Blog post created successfully',
    data: blog
  });
});

exports.updateBlog = catchAsync(async (req, res) => {
  const blog = await BlogService.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Blog post updated successfully',
    data: blog
  });
});

exports.deleteBlog = catchAsync(async (req, res) => {
  await BlogService.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Blog post deleted successfully',
    data: null
  });
});

// Additional endpoints for engagement
exports.getRelatedPosts = catchAsync(async (req, res) => {
  const { categoryId, storeId, limit } = req.query;
  const relatedPosts = await BlogService.getRelatedPosts(
    categoryId,
    storeId,
    req.params.id,
    parseInt(limit)
  );

  res.status(200).json({
    success: true,
    message: 'Related posts retrieved successfully',
    data: relatedPosts
  });
});

exports.updateEngagement = catchAsync(async (req, res) => {
  const blog = await BlogService.updateEngagementMetrics(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: 'Engagement metrics updated successfully',
    data: blog
  });
});
