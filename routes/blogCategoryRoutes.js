// routes/blogCategoryRoutes.js
const express = require('express');
const blogCategoryController = require('../controllers/blogCategoryController');
const validate = require('../middlewares/validationMiddleware');  // Correct import for default export
const { createBlogCategorySchema, updateBlogCategorySchema } = require('../validators/blogCategoryValidator');

const router = express.Router();

router.route('/')
    .get(blogCategoryController.getAllCategories)
    .post(
        validate(createBlogCategorySchema),  // Using the validate function here
        blogCategoryController.createCategory
    );

router.route('/:id')
    .get(blogCategoryController.getCategory)
    .put(
        validate(updateBlogCategorySchema),  // Using the validate function here
        blogCategoryController.updateCategory
    )
    .delete(blogCategoryController.deleteCategory);

module.exports = router;
