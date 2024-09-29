// controllers/categoryController.js
const Category = require('../models/categoryModel');

// Get all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error); // Log the error for debugging
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};

// Create a new category with error handling for duplicates
exports.createCategory = async (req, res) => {
    const { name, icon } = req.body;

    try {
        // Check for missing fields
        if (!name || !icon) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }

        const newCategory = new Category({ name, icon });
        await newCategory.save();

        res.status(201).json({ status: 'success', data: newCategory });
    } catch (error) {
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                status: 'error',
                error: 'Duplicate Category',
                message: `Category with name "${name}" already exists.`
            });
        }

        // Log and return other server errors
        console.error('Error creating category:', error);  // Log the error for debugging
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};

// Get a category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ status: 'error', error: 'Category not found' });
        }
        res.status(200).json({ status: 'success', data: category });
    } catch (error) {
        console.error('Error fetching category:', error);  // Log the error for debugging
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    const { name, icon } = req.body;
    try {
        if (!name || !icon) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }
        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, { name, icon }, { new: true });
        if (!updatedCategory) {
            return res.status(404).json({ status: 'error', error: 'Category not found' });
        }
        res.status(200).json({ status: 'success', data: updatedCategory });
    } catch (error) {
        console.error('Error updating category:', error);  // Log the error for debugging
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if (!deletedCategory) {
            return res.status(404).json({ status: 'error', error: 'Category not found' });
        }
        res.status(200).json({ status: 'success', message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);  // Log the error for debugging
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};
