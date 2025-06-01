const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
// const { protect, restrictTo } = require('../middlewares/authMiddleware'); // comment out these imports
const validate = require('../middlewares/validationMiddleware');
const blogValidator = require('../validators/blogValidator');

// Public routes - no authentication middleware
router.get('/', blogController.getBlogs);
router.get('/:id', blogController.getBlogById);
router.get('/:id/related', blogController.getRelatedPosts);

// COMMENT OUT PROTECTED MIDDLEWARE
// router.use(protect);
// router.use(restrictTo('author', 'admin'));

// Routes without authentication (temporarily)
router.route('/')
  .post(
    validate(blogValidator.createBlogSchema),
    blogController.createBlog
  );

router.route('/:id')
  .put(
    validate(blogValidator.updateBlogSchema),
    blogController.updateBlog
  )
  .delete(blogController.deleteBlog);

router.patch(
  '/:id/engagement',
  validate(blogValidator.updateEngagementSchema),
  blogController.updateEngagement
);

module.exports = router;
