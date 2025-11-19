const mongoose = require('mongoose');
const Store = require('../models/storeModel');
const storeService = require('../services/storeService');
const AppError = require('../errors/AppError');


// ✅ Fix missing function
const htmlDecode = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&#x2F;/g, '/')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
  };


  // Get stores with pagination
  exports.getStores = async (req, res, next) => {
    try {
      const result = await storeService.getStores(req.query);
      
      res.status(200).json({
        status: 'success',
        data: result.stores,
        metadata: {
          totalStores: result.totalStores,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  };


// Fetch a store by slug
exports.getStoreBySlug = async (req, res, next) => {
    try {
        const store = await storeService.getStoreBySlug(req.params.slug);
        res.status(200).json({ status: 'success', data: store });
    } catch (error) {
        next(error);
    }
};

// Get store by ID with populated coupons
exports.getStoreById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const store = await storeService.getStoreById(id);
        
        res.status(200).json({
            status: 'success',
            data: store
        });
    } catch (error) {
        next(error);
    }
 };

exports.searchStores = async (req, res, next) => {
    try {
        const result = await storeService.searchStores(req.query);
        res.status(200).json({
            status: 'success',
            totalPages: result.totalPages,
            currentPage: result.currentPage,
            data: result.stores,
        });
    } catch (error) {
        next(new AppError(error.message || 'Error searching stores', error.statusCode || 500));
    }
};


// Create a new store
// Create a new store
exports.createStore = async (req, res, next) => {
    try {
      console.log("Received Data for Store Creation:", JSON.stringify(req.body, null, 2));
  
      //  Decode HTML-encoded fields
      if (req.body.trackingUrl) {
        req.body.trackingUrl = htmlDecode(req.body.trackingUrl);
      }
      if (req.body.heading) {
        req.body.heading = htmlDecode(req.body.heading);
      }
  
      const newStore = await storeService.createStore(req.body);
      console.log(" Store Created Successfully:", newStore);
  
      res.status(201).json({ status: 'success', data: newStore });
    } catch (error) {
      console.error("Error creating store:", error);
  
      let errorMessage = 'Error creating store';
      let statusCode = 500;
  
      if (error.name === 'ValidationError') {
        errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
        statusCode = 400;
      } else if (error.code === 11000) {
        errorMessage = 'Duplicate entry for name or slug';
        statusCode = 400;
      }
  
      next(new AppError(errorMessage, statusCode));
    }
  };


// Update a store by ID
exports.updateStore = async (req, res, next) => {
    try {
        const updatedStore = await storeService.updateStore(req.params.id, req.body);
        res.status(200).json({ status: 'success', data: updatedStore });
    } catch (error) {
        next(new AppError(error.message || 'Error updating store', error.statusCode || 500));
    }
};


// Delete a store by ID
exports.deleteStore = async (req, res, next) => {
    try {
        await storeService.deleteStore(req.params.id);
        res.status(200).json({ status: 'success', message: 'Store deleted successfully' });
    } catch (error) {
        next(new AppError(error.message || 'Error deleting store', error.statusCode || 500));
    }
};