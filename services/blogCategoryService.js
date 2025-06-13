const BlogCategory = require('../models/blogCategoryModel');
const AppError = require('../errors/AppError');

class BlogCategoryService {
    async findAll() {
        const categories = await BlogCategory.find()
            .sort({ name: 1 })
            .lean();
        return categories;
    }

    async findById(id) {
        const category = await BlogCategory.findById(id).lean();
        if (!category) {
            throw new AppError('Blog category not found', 404);
        }
        return category;
    }

    async create(categoryData) {
        try {
            const category = await BlogCategory.create(categoryData);
            return category.toObject();
        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('A category with this name already exists', 400);
            }
            throw error;
        }
    }    async update(id, updateData) {
        try {
            const category = await BlogCategory.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!category) {
                throw new AppError('Blog category not found', 404);
            }

            return category.toObject();
        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('A category with this name already exists', 400);
            }
            throw error;
        }
    }

    async delete(id) {
        const category = await BlogCategory.findById(id);
        
        if (!category) {
            throw new AppError('Blog category not found', 404);
        }

        // Check if category is being used by any blog posts
        const BlogPost = require('../models/blogPostModel');
        const postsCount = await BlogPost.countDocuments({ category: id });
        
        if (postsCount > 0) {
            throw new AppError(
                'Cannot delete category that has associated blog posts. Please remove or reassign the posts first.',
                400
            );
        }

        await category.deleteOne();
        return true;
    }

    async delete(id) {
        const category = await BlogCategory.findByIdAndDelete(id);
        
        if (!category) {
            throw new AppError('Blog category not found', 404);
        }

        return { message: 'Blog category deleted successfully' };
    }
}

module.exports = new BlogCategoryService();
