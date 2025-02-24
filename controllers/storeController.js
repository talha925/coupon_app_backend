const mongoose = require('mongoose');
const Store = require('../models/storeModel');

// Fetch all stores
exports.getStores = async (req, res) => {
    const { page = 1, limit = 10, language, category } = req.query;

    try {
        const query = {};
        if (language) query.language = language;
        if (category) query.categories = category;

        const stores = await Store.find(query)
            .limit(parseInt(limit, 10))
            .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));

        const totalStores = await Store.countDocuments(query);

        res.status(200).json({
            status: 'success',
            totalPages: Math.ceil(totalStores / limit),
            currentPage: parseInt(page, 10),
            data: stores,
        });
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching stores' });
    }
};


// Fetch a store by slug
exports.getStoreBySlug = async (req, res) => {
    const { slug } = req.params;
    try {
        const store = await Store.findOne({ slug });
        if (!store) {
            return res.status(404).json({ status: 'error', message: 'Store not found' });
        }
        res.status(200).json({ status: 'success', data: store });
    } catch (error) {
        console.error('Error fetching store by slug:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching store' });
    }
};

exports.searchStores = async (req, res) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;

        if (!query) {
            return res.status(400).json({ status: 'error', message: 'Search query is required' });
        }

        // Full-text search using MongoDB's $text index
        const stores = await Store.find(
            { $text: { $search: query } },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('categories'); // Populate category data

        const totalStores = await Store.countDocuments({ $text: { $search: query } });

        res.status(200).json({
            status: 'success',
            totalPages: Math.ceil(totalStores / limit),
            currentPage: parseInt(page),
            data: stores,
        });
    } catch (error) {
        console.error('Error searching stores:', error);
        res.status(500).json({ status: 'error', message: 'Error searching stores' });
    }
};


// Create a new store
exports.createStore = async (req, res) => {
    try {
        console.log("🚀 Received Data for Store Creation:", JSON.stringify(req.body, null, 2));

        const { 
            name, directUrl, trackingUrl, short_description, long_description, 
            image, categories, seo, language, isTopStore, isEditorsChoice, heading 
        } = req.body;

        //  Required fields check
        if (!name || !directUrl || !trackingUrl || !short_description || !long_description || !image || !seo) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Missing required fields. Ensure all fields are provided.' 
            });
        }

        //  Ensure boolean values are properly converted
        const parsedTopStore = Boolean(isTopStore);
        const parsedEditorsChoice = Boolean(isEditorsChoice);

        console.log(" Parsed Boolean Values:");
        console.log("✔ isTopStore:", parsedTopStore);
        console.log("✔ isEditorsChoice:", parsedEditorsChoice);

        //  Validate heading
        const allowedHeadings = ['Promo Codes & Coupon', 'Coupons & Promo Codes', 'Voucher & Discount Codes'];
        if (!allowedHeadings.includes(heading)) {
            return res.status(400).json({ 
                status: 'error', 
                message: `Invalid heading. Allowed values: ${allowedHeadings.join(', ')}` 
            });
        }

        //  Attempt to create store
        const newStore = await Store.create({
            name,
            directUrl,
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
            isTopStore: parsedTopStore,  // Ensure boolean values are stored correctly
            isEditorsChoice: parsedEditorsChoice, // Ensure boolean values are stored correctly
            heading
        });

        console.log(" Store Created Successfully:", newStore);
        res.status(201).json({ status: 'success', data: newStore });
        
    } catch (error) {
        console.error(" Error creating store:", error);

        let errorMessage = 'Error creating store';

        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
        } else if (error.code === 11000) {
            errorMessage = 'Duplicate entry for name or slug';
        }

        res.status(500).json({ status: 'error', message: errorMessage });
    }
};


// Update a store by ID
exports.updateStore = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: 'error', message: 'Invalid store ID' });
    }

    const { heading } = req.body;
    const allowedHeadings = ['Promo Codes & Coupon', 'Coupons & Promo Codes', 'Voucher & Discount Codes'];

    //  Validate heading
    if (heading && !allowedHeadings.includes(heading)) {
        return res.status(400).json({ 
            status: 'error', 
            message: `Invalid heading. Allowed values: ${allowedHeadings.join(', ')}` 
        });
    }

    try {
        const updatedStore = await Store.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedStore) {
            return res.status(404).json({ status: 'error', message: 'Store not found' });
        }
        res.status(200).json({ status: 'success', data: updatedStore });
    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({ status: 'error', message: 'Error updating store' });
    }
};


// Delete a store by ID
exports.deleteStore = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: 'error', message: 'Invalid store ID' });
    }

    try {
        const deletedStore = await Store.findByIdAndDelete(id);
        if (!deletedStore) {
            return res.status(404).json({ status: 'error', message: 'Store not found' });
        }
        res.status(200).json({ status: 'success', message: 'Store deleted successfully' });
    } catch (error) {
        console.error('Error deleting store:', error);
        res.status(500).json({ status: 'error', message: 'Error deleting store' });
    }
};
