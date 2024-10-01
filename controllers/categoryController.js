const Category = require('../models/categoryModel');

// Get all categories
exports.getCategories = async (req, res) => {
    try {
        // Exclude `__v` and return the required fields only
        const categories = await Category.find().select('-__v'); 
        res.status(200).json({ status: 'success', data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};

// Create a new category with error handling for duplicates
exports.createCategory = async (req, res) => {
    const { name } = req.body;

    try {
        // Check for missing fields
        if (!name) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }

        const newCategory = new Category({ name });
        await newCategory.save();

        // Respond with the created category excluding __v
        res.status(201).json({
            status: 'success',
            data: {
                name: newCategory.name,
                _id: newCategory._id,
                // Exclude __v from the response
            }
        });
    } catch (error) {
        // Handle MongoDB duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                status: 'error',
                error: 'Duplicate Category',
                message: `Category with name "${name}" already exists.`
            });
        }

        console.error('Error creating category:', error);
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};

// Get a category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).select('-__v');
        if (!category) {
            return res.status(404).json({ status: 'error', error: 'Category not found' });
        }
        res.status(200).json({ status: 'success', data: category });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    const { name } = req.body;
    try {
        if (!name) {
            return res.status(400).json({ status: 'error', error: 'Missing required fields' });
        }
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id, 
            { name }, 
            { new: true }
        ).select('-__v');

        if (!updatedCategory) {
            return res.status(404).json({ status: 'error', error: 'Category not found' });
        }
        res.status(200).json({ status: 'success', data: updatedCategory });
    } catch (error) {
        console.error('Error updating category:', error);
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
        console.error('Error deleting category:', error);
        res.status(500).json({ status: 'error', error: 'Server Error', message: error.message });
    }
};
