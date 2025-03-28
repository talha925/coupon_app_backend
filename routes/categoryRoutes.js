// routes/categoryRoutes.js
const express = require('express');
const {
    getCategories,
    createCategory,
    getCategoryById,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');
const validator = require('../middlewares/validator');
const { createCategorySchema, updateCategorySchema } = require('../validators/categoryValidator');

const router = express.Router();

// Get all categories
router.get('/', getCategories);

// Create a new category with validation
router.post('/', validator(createCategorySchema), createCategory);

// Get category by ID
router.get('/:id', getCategoryById);

// Update category by ID with validation
router.put('/:id', validator(updateCategorySchema), updateCategory);

// Delete category by ID
router.delete('/:id', deleteCategory);

module.exports = router;
