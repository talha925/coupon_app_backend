const Store = require('../models/storeModel');

// Get all stores
exports.getStores = async (req, res) => {
    try {
        const stores = await Store.find().populate({
            path: 'coupons',
            select: 'code description discount expirationDate affiliateLink' // Include only necessary fields
        });
        res.status(200).json({ status: 'success', data: stores });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Create a new store
exports.createStore = async (req, res) => {
    const { name, website, description, image, categories, coupons } = req.body;

    // Check if categories is an empty array or not provided
    if (!categories || categories.length === 0) {
        return res.status(400).json({
            status: 'error',
            error: 'Categories required',
            message: 'Please provide valid categories for the store.'
        });
    }

    try {
        const newStore = new Store({
            name,
            website,
            description,
            image,
            categories,
            coupons
        });
        await newStore.save();
        res.status(201).json({ status: 'success', data: newStore });
    } catch (error) {
        console.error('Error creating store:', error);
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};




// Get a store by ID
exports.getStoreById = async (req, res) => {
    try {
        const store = await Store.findById(req.params.id).populate({
            path: 'coupons',
            select: 'code description discount expirationDate affiliateLink' // Include only necessary fields
        });
        if (!store) return res.status(404).json({ status: 'error', error: 'Store not found' });
        res.status(200).json({ status: 'success', data: store });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};

// Update a store
exports.updateStore = async (req, res) => {
    try {
        const updatedStore = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('coupons');
        if (!updatedStore) return res.status(404).json({ status: 'error', error: 'Store not found' });
        res.status(200).json({ status: 'success', data: updatedStore });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
}

// Delete a store
exports.deleteStore = async (req, res) => {
    try {
        const deletedStore = await Store.findByIdAndDelete(req.params.id);
        if (!deletedStore) return res.status(404).json({ status: 'error', error: 'Store not found' });
        res.status(200).json({ status: 'success', message: 'Store deleted successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'Server Error' });
    }
};
