const express = require('express');
const {
    getStores,
    createStore,
    getStoreById,
    updateStore,
    deleteStore
} = require('../controllers/storeController');
const router = express.Router();

router.get('/', getStores);
router.post('/', createStore);
router.get('/:id', getStoreById);
router.put('/:id', updateStore);
router.delete('/:id', deleteStore);

module.exports = router;
