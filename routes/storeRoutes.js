const express = require('express');
const storeController = require('../controllers/storeController'); // Correct Import

const router = express.Router();

// Define routes using storeController
router.get('/search', storeController.searchStores);
router.get('/', storeController.getStores);
router.post('/', storeController.createStore);
router.get('/slug/:slug', storeController.getStoreBySlug);
router.put('/:id', storeController.updateStore);
router.delete('/:id', storeController.deleteStore);

module.exports = router;
