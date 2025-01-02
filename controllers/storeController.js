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

// Create a new store
exports.createStore = async (req, res) => {
    const { name, website, short_description, long_description, image, categories, seo, language } = req.body;

    try {
        const newStore = await Store.create({
            name,
            website,
            short_description,
            long_description,
            image,
            categories,
            seo,
            language,
        });

        res.status(201).json({ status: 'success', data: newStore });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ status: 'error', message: 'Duplicate entry for name or slug' });
        }
        console.error('Error creating store:', error);
        res.status(500).json({ status: 'error', message: 'Error creating store' });
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

// Update a store by ID
exports.updateStore = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ status: 'error', message: 'Invalid store ID' });
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
