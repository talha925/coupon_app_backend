const Store = require('../models/storeModel');
const mongoose = require('mongoose');
const AppError = require('../errors/AppError');

/**
 * Get stores with filtering, pagination, and sorting
 * @param {Object} queryParams - Query parameters from request
 * @returns {Object} Stores with pagination info
 */

exports.getStores = async (queryParams) => {
    try {
        const { page = 1, limit = 10, language, category, isTopStore, isEditorsChoice } = queryParams;
        const query = {};
        
        if (language) query.language = language;
        if (category) query.categories = category;
        if (isTopStore !== undefined) query.isTopStore = isTopStore === 'true';
        if (isEditorsChoice !== undefined) query.isEditorsChoice = isEditorsChoice === 'true';
        
        const stores = await Store.find(query)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('categories')
            .populate({
                path: 'coupons',
                select: '_id offerDetails code active isValid featuredForHome hits lastAccessed order',
                options: { sort: { order: 1 } }  // Sorting applied here
            })
            .lean();
        
        const totalStores = await Store.countDocuments(query);
        
        return {
            stores,
            totalStores,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error in storeService.getStores:', error);
        throw error;
    }
};


/**
 * Get store by slug
 * @param {String} slug - Store slug
 * @returns {Object} Store data
 */
exports.getStoreBySlug = async (slug) => {
    try {
        const store = await Store.findOne({ slug }).lean().populate('categories');
        if (!store) {
            throw new AppError('Store not found', 404);
        }
        return store;
    } catch (error) {
        console.error('Error in storeService.getStoreBySlug:', error);
        throw error;
    }
};

/**
 * Search stores with text indexing
 * @param {Object} params - Search parameters
 * @returns {Object} Search results with pagination
 */
exports.searchStores = async ({ query, page = 1, limit = 10 }) => {
    try {
        if (!query) {
            throw new AppError('Search query is required', 400);
        }

        // Full-text search using MongoDB's $text index
        const stores = await Store.find(
            { $text: { $search: query } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .select('name slug image categories short_description')
            .lean()
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('categories');

        const totalStores = await Store.countDocuments({ $text: { $search: query } });

        return {
            stores,
            totalPages: Math.ceil(totalStores / limit),
            currentPage: parseInt(page)
        };
    } catch (error) {
        console.error('Error in storeService.searchStores:', error);
        throw error;
    }
};

/**
 * Create a new store
 * @param {Object} storeData - Store data to create
 * @returns {Object} Created store
 */
exports.createStore = async (storeData) => {
    try {
        const {
            name, trackingUrl, short_description, long_description,
            image, categories, seo, language, isTopStore, isEditorsChoice, heading
        } = storeData;

        // Create store with processed data
        const newStore = await Store.create({
            name,
            trackingUrl,
            short_description,
            long_description,
            image: {
                url: image?.url || '',
                alt: image?.alt || 'Default Alt Text',
            },
            categories,
            seo,
            language,
            isTopStore: Boolean(isTopStore),
            isEditorsChoice: Boolean(isEditorsChoice),
            heading
        });

        return newStore;
    } catch (error) {
        console.error('Error in storeService.createStore:', error);
        throw error;
    }
};

/**
 * Update store by ID
 * @param {String} id - Store ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated store
 */
exports.updateStore = async (id, updateData) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid store ID', 400);
        }

        const updatedStore = await Store.findByIdAndUpdate(
            id, 
            updateData, 
            { 
                new: true,
                runValidators: true
            }
        );

        if (!updatedStore) {
            throw new AppError('Store not found', 404);
        }

        return updatedStore;
    } catch (error) {
        console.error('Error in storeService.updateStore:', error);
        throw error;
    }
};

/**
 * Delete store by ID
 * @param {String} id - Store ID to delete
 * @returns {Object} Deleted store
 */
exports.deleteStore = async (id) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError('Invalid store ID', 400);
        }

        const deletedStore = await Store.findByIdAndDelete(id);
        
        if (!deletedStore) {
            throw new AppError('Store not found', 404);
        }

        return deletedStore;
    } catch (error) {
        console.error('Error in storeService.deleteStore:', error);
        throw error;
    }
}; 