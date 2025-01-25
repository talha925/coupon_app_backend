const express = require('express');
const {
    getStores,
    createStore,
    getStoreBySlug,
    // getStoreById,
    updateStore,
    deleteStore,
} = require('../controllers/storeController');

const router = express.Router();

router.get('/', getStores);
router.post('/', createStore);
router.get('/slug/:slug', getStoreBySlug); // Fetch by slug
// router.get('/:id', getStoreById);         // Fetch by ID
router.put('/:id', updateStore);          // Update by ID
router.delete('/:id', deleteStore);       // Delete by ID

module.exports = router;
