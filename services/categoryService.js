const mongoose = require('mongoose');
const Category = require('../models/categoryModel');
const AppError = require('../errors/AppError');

/**
 * Get all categories with pagination
 * @param {Object} queryParams - Query parameters
 * @returns {Object} Categories with pagination info
 */
exports.getCategories = async (queryParams) => {
    try {
        const { page = 1, limit = 50, active } = queryParams;
        
        // Build query based on parameters
        const query = {};
        if (active !== undefined) query.active = active === 'true';
        
        // Execute query with pagination
        const categories = await Category.find(query)
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .sort({ name: 1 })
            .lean();
            
        // Get total count for pagination
        const totalCategories = await Category.countDocuments(query);
        
        return {
            categories,
            totalPages: Math.ceil(totalCategories / parseInt(limit)),
            currentPage: parseInt(page),
            totalCategories
        };
    } catch (error) {
        console.error('Error in categoryService.getCategories:', error);
        throw error;
    }
};

/**
 * Get category by ID
 * @param {String} id - Category ID
 * @returns {Object} Category
 */
exports.getCategoryById = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid Category ID', 400);
        }
        
        const category = await Category.findById(id).lean();
        
        if (!category) {
            throw new AppError('Category not found', 404);
        }
        
        return category;
    } catch (error) {
        console.error('Error in categoryService.getCategoryById:', error);
        throw error;
    }
};

/**
 * Create a new category
 * @param {Object} categoryData - Category data
 * @returns {Object} Created category
 */
exports.createCategory = async (categoryData) => {
    try {
        const { name } = categoryData;
        
        // Check if category with same name exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            throw new AppError('Category with this name already exists', 400);
        }
        
        // Create category
        const newCategory = await Category.create(categoryData);
        
        return newCategory;
    } catch (error) {
        console.error('Error in categoryService.createCategory:', error);
        throw error;
    }
};

/**
 * Update a category
 * @param {String} id - Category ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated category
 */
exports.updateCategory = async (id, updateData) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid Category ID', 400);
        }
        
        // Check for duplicate name if name is being updated
        if (updateData.name) {
            const existingCategory = await Category.findOne({ 
                name: updateData.name,
                _id: { $ne: id }
            });
            
            if (existingCategory) {
                throw new AppError('Category with this name already exists', 400);
            }
        }
        
        // Update category
        const updatedCategory = await Category.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );
        
        if (!updatedCategory) {
            throw new AppError('Category not found', 404);
        }
        
        return updatedCategory;
    } catch (error) {
        console.error('Error in categoryService.updateCategory:', error);
        throw error;
    }
};

/**
 * Delete a category
 * @param {String} id - Category ID
 * @returns {Object} Deleted category
 */
exports.deleteCategory = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid Category ID', 400);
        }
        
        const deletedCategory = await Category.findByIdAndDelete(id);
        
        if (!deletedCategory) {
            throw new AppError('Category not found', 404);
        }
        
        return deletedCategory;
    } catch (error) {
        console.error('Error in categoryService.deleteCategory:', error);
        throw error;
    }
}; 