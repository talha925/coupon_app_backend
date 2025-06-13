const blogCategoryService = require('../services/blogCategoryService');
const { catchAsync } = require('../utils/errorUtils');

exports.getAllCategories = catchAsync(async (req, res) => {
    const categories = await blogCategoryService.findAll();
    
    res.status(200).json({
        success: true,
        message: 'Blog categories retrieved successfully',
        data: categories
    });
});

exports.getCategory = catchAsync(async (req, res) => {
    const category = await blogCategoryService.findById(req.params.id);
    
    res.status(200).json({
        success: true,
        message: 'Blog category retrieved successfully',
        data: category
    });
});

exports.createCategory = catchAsync(async (req, res) => {
    const category = await blogCategoryService.create(req.body);
    
    res.status(201).json({
        success: true,
        message: 'Blog category created successfully',
        data: category
    });
});

exports.updateCategory = catchAsync(async (req, res) => {
    const category = await blogCategoryService.update(req.params.id, req.body);
    
    res.status(200).json({
        success: true,
        message: 'Blog category updated successfully',
        data: category
    });
});

exports.deleteCategory = catchAsync(async (req, res) => {
    await blogCategoryService.delete(req.params.id);
    
    res.status(200).json({
        success: true,
        message: 'Blog category deleted successfully',
        data: null
    });
});
