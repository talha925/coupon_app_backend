const BlogCategory = require('../models/blogCategoryModel');
const AppError = require('../errors/AppError');
const cacheService = require('./cacheService');

class BlogCategoryService {
    async findAll() {
        // PERFORMANCE: Check cache first with optimized key
        const cacheKey = 'blog_categories:all';
        const cachedCategories = await cacheService.get(cacheKey);
        
        if (cachedCategories) {
            console.log('✅ Cache hit: Blog categories');
            return cachedCategories;
        }

        // 🚨 CRITICAL OPTIMIZATION: Use lean() + select only needed fields
        const categories = await BlogCategory.find()
            .select('name slug createdAt updatedAt') // Only select essential fields
            .sort({ name: 1 })
            .lean(); // Critical for performance - returns plain JS objects
        
        // PERFORMANCE: Cache with 10-minute TTL (600 seconds) - longer for categories
        await cacheService.set(cacheKey, categories, 600);
        console.log('✅ Cache set: Blog categories');
        
        return categories;
    }

    async findById(id) {
        // PERFORMANCE: Check cache first
        const cacheKey = `blog_category:${id}`;
        const cachedCategory = await cacheService.get(cacheKey);
        
        if (cachedCategory) {
            console.log(`✅ Cache hit: Blog category - ${id}`);
            return cachedCategory;
        }

        // 🚨 CRITICAL OPTIMIZATION: Use lean() for better performance
        const category = await BlogCategory.findById(id)
            .select('name slug createdAt updatedAt') // Only essential fields
            .lean();
            
        if (!category) {
            throw new AppError('Blog category not found', 404);
        }

        // PERFORMANCE: Cache individual category with 1-hour TTL (3600 seconds)
        await cacheService.set(cacheKey, category, 3600);
        console.log(`✅ Cache set: Blog category - ${id}`);
        
        return category;
    }

    async create(categoryData) {
        try {
            const category = await BlogCategory.create(categoryData);
            
            // PERFORMANCE: Invalidate all category-related caches
            await this.invalidateAllCategoryCaches();
            
            return category.toObject();
        } catch (error) {
            if (error.code === 11000) {
                throw new AppError('A category with this name already exists', 400);
            }
            throw error;
        }
    }

    async update(id, updateData) {
        try {
            const category = await BlogCategory.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!category) {
                throw new AppError('Blog category not found', 404);
            }

            // PERFORMANCE: Invalidate all category-related caches
            await this.invalidateAllCategoryCaches();

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
        const postsCount = await BlogPost.countDocuments({ 'category.id': id });
        
        if (postsCount > 0) {
            throw new AppError(
                'Cannot delete category that has associated blog posts. Please remove or reassign the posts first.',
                400
            );
        }

        await category.deleteOne();
        
        // PERFORMANCE: Invalidate all category-related caches
        await this.invalidateAllCategoryCaches();
        
        return true;
    }

    // PERFORMANCE: Comprehensive cache invalidation for categories
    async invalidateAllCategoryCaches() {
        try {
            await Promise.all([
                cacheService.delPattern('blog_categories:*'),
                cacheService.delPattern('blog_category:*'),
                cacheService.invalidateCategoryCaches() // Legacy method for compatibility
            ]);
            console.log('✅ All category caches invalidated');
        } catch (error) {
            console.error('❌ Category cache invalidation error:', error);
        }
    }
}

module.exports = new BlogCategoryService();
