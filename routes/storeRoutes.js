const express = require('express');
const storeController = require('../controllers/storeController');
const validator = require('../middlewares/validator');
const { createStoreSchema, updateStoreSchema } = require('../validators/storeValidator');

const router = express.Router();

// Search stores
router.get('/search', storeController.searchStores);

// Get all stores (with pagination and filtering)
router.get('/', storeController.getStores);

// Create a new store with validation
router.post('/', validator(createStoreSchema), storeController.createStore);

// Get store by slug
router.get('/slug/:slug', storeController.getStoreBySlug);

// Update store by id with validation
router.put('/:id', validator(updateStoreSchema), storeController.updateStore);

// Delete store by id
router.delete('/:id', storeController.deleteStore);

module.exports = router;
