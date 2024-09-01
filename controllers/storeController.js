const Store = require('../models/storeModel');

// Get all stores
exports.getStores = async (req, res) => {
    try {
        const stores = await Store.find().populate({
            path: 'coupons',
            select: '-store' // Exclude the `store` field from the populated coupons
        });
        res.status(200).json(stores);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};


// Create a new store
exports.createStore = async (req, res) => {
    const { name, website, description, coupons } = req.body;
    try {
        const newStore = new Store({ name, website, description, coupons });
        await newStore.save();
        res.status(201).json(newStore);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Get a store by ID
exports.getStoreById = async (req, res) => {
    try {
        const store = await Store.findById(req.params.id).populate({
            path: 'coupons',
            select: '-store' // Exclude the `store` field from the populated coupons
        });
        if (!store) return res.status(404).json({ error: 'Store not found' });
        res.status(200).json(store);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Update a store
exports.updateStore = async (req, res) => {
    try {
        const updatedStore = await Store.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('coupons');
        if (!updatedStore) return res.status(404).json({ error: 'Store not found' });
        res.status(200).json(updatedStore);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

// Delete a store
exports.deleteStore = async (req, res) => {
    try {
        const deletedStore = await Store.findByIdAndDelete(req.params.id);
        if (!deletedStore) return res.status(404).json({ error: 'Store not found' });
        res.status(200).json({ message: 'Store deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};
