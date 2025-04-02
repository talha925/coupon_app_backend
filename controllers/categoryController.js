const Category = require('../models/categoryModel');
const categoryService = require('../services/categoryService');
const AppError = require('../errors/AppError');

// Get all categories
exports.getCategories = async (req, res, next) => {
    try {
        const result = await categoryService.getCategories(req.query);
        res.status(200).json({
            status: 'success',
            data: {
                categories: result.categories,
                totalCategories: result.totalCategories,
                currentPage: result.currentPage,
                totalPages: result.totalPages
            }
        });
    } catch (error) {
        next(new AppError(error.message || 'Error fetching categories', error.statusCode || 500));
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ status: 'error', message: 'Category name is required' });
    }

    try {
        const newCategory = await Category.create({ name });
        res.status(201).json({ status: 'success', data: { id: newCategory._id, name: newCategory.name } });
    } catch (error) {
        if (error.code === 11000) {
            res.status(409).json({ status: 'error', message: 'Category name must be unique' });
        } else {
            res.status(500).json({ status: 'error', message: 'Error creating category', error: error.message });
        }
    }
};


// Get a category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).select('-__v');
        if (!category) {
            return res.status(404).json({ status: 'error', message: 'Category not found' });
        }
        res.status(200).json({ status: 'success', data: category });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching category', error: error.message });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ status: 'error', message: 'Category name is required' });
    }
    try {
        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true }).select('-__v');
        if (!updatedCategory) {
            return res.status(404).json({ status: 'error', message: 'Category not found' });
        }
        res.status(200).json({ status: 'success', data: updatedCategory });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ status: 'error', message: 'Error updating category', error: error.message });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ status: 'error', message: 'Category not found' });
        }
        res.status(200).json({ status: 'success', message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ status: 'error', message: 'Error deleting category', error: error.message });
    }
};
