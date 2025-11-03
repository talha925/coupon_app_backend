const mongoose = require('mongoose');
const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');
const AppError = require('../errors/AppError');
const { formatCoupon } = require('../utils/couponUtils');
const { getWebSocketServer } = require('../lib/websocket-server');
const cacheService = require('./cacheService');

// Circuit breaker for external dependencies
const circuitBreaker = {
    websocket: {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        threshold: 5,
        timeout: 30000 // 30 seconds
    },
    cache: {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
        threshold: 3,
        timeout: 15000 // 15 seconds
    }
};

/**
 * Execute operation with circuit breaker protection
 */
const callWithCircuitBreaker = async (service, operation, fallback = null) => {
    const breaker = circuitBreaker[service];
    
    // Check if circuit breaker is open
    if (breaker.isOpen) {
        if (Date.now() - breaker.lastFailure < breaker.timeout) {
            console.warn(`⚠️ Circuit breaker OPEN for ${service}, using fallback`);
            return fallback ? await fallback() : { success: false, circuitBreakerOpen: true };
        } else {
            // Reset circuit breaker after timeout
            breaker.isOpen = false;
            breaker.failures = 0;
            console.log(`🔄 Circuit breaker RESET for ${service}`);
        }
    }
    
    try {
        const result = await operation();
        // Reset failure count on success
        breaker.failures = 0;
        return result;
    } catch (error) {
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        if (breaker.failures >= breaker.threshold) {
            breaker.isOpen = true;
            console.error(`🚨 Circuit breaker OPENED for ${service} after ${breaker.failures} failures`);
        }
        
        console.error(`❌ ${service} operation failed:`, error.message);
        
        if (fallback) {
            return await fallback();
        }
        throw error;
    }
};

/**
 * Call frontend revalidation endpoint to refresh Next.js cache
 */
const callFrontendRevalidation = async (type, identifier, metadata = {}) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const revalidationEndpoint = `${frontendUrl}/api/revalidate`;
        
        const payload = {
            type,
            identifier,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        console.log(`🔄 Calling frontend revalidation: ${type}:${identifier}`);
        
        const response = await fetch(revalidationEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.REVALIDATION_SECRET || 'default-secret'}`
            },
            body: JSON.stringify(payload),
            timeout: 5000 // 5 second timeout
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Frontend revalidation successful: ${type}:${identifier}`, result);
            return { success: true, result };
        } else {
            console.warn(`⚠️ Frontend revalidation failed: ${response.status} ${response.statusText}`);
            return { success: false, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        console.error(`❌ Frontend revalidation error for ${type}:${identifier}:`, error.message);
        return { success: false, error: error.message };
    }
};

// Get all coupons for a specific store with pagination (20 coupons per page)
exports.getCouponsByStore = async (queryParams, storeId) => {
  try {
    const { page = 1, active, isValid = true, featuredForHome } = queryParams;

    const query = { store: storeId }; // Filter by store
    if (active !== undefined) query.active = active === 'true';
    if (featuredForHome !== undefined) query.featuredForHome = featuredForHome === 'true';
    if (isValid !== undefined) query.isValid = isValid === 'true';

    // Fetch coupons with pagination (limit 20 per page)
    const coupons = await Coupon.find(query)
      .sort({ order: 1 })  // **Add this line**
      .skip((parseInt(page) - 1) * 20) // Skip based on the page number
      .limit(20) // Limit the number of coupons per page to 20
      .select('-__v') // Exclude the `__v` field from the response
      .lean(); // Use lean to return plain JavaScript objects

    console.log('Coupons after sorting by order:', coupons); // Log the sorted coupons

      
    // Get the total count of coupons for pagination
    const totalCoupons = await Coupon.countDocuments(query);

    return {
      coupons,
      totalCoupons,
      totalPages: Math.ceil(totalCoupons / 20), // Calculate total pages (based on 20 items per page)
      currentPage: parseInt(page),
    };
  } catch (error) {
    console.error('Error in couponService.getCouponsByStore:', error);
    throw error;
  }
};

// Get all coupons with pagination (for general coupons list)
exports.getCoupons = async (queryParams) => {
  try {
    const { page = 1, limit = 10, store, active, isValid = true, featuredForHome } = queryParams;
    const query = { isValid };

    if (store) query.store = store;
    if (active !== undefined) query.active = active === 'true';
    if (featuredForHome !== undefined) query.featuredForHome = featuredForHome === 'true';

    // Execute query with pagination
    const coupons = await Coupon.find(query)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .select('-__v')
      .lean();

    // Get total count for pagination
    const totalCoupons = await Coupon.countDocuments(query);

    // Format coupons
    const formattedCoupons = coupons.map(coupon => ({
      _id: coupon._id,
      offerDetails: coupon.offerDetails,
      code: coupon.code,
      active: coupon.active,
      isValid: coupon.isValid,
      featuredForHome: coupon.featuredForHome,
      hits: coupon.hits,
      lastAccessed: coupon.lastAccessed,
      storeId: coupon.store,
    }));

    return {
      coupons: formattedCoupons,
      totalPages: Math.ceil(totalCoupons / parseInt(limit)),
      currentPage: parseInt(page),
      totalCoupons,
    };
  } catch (error) {
    console.error('Error in couponService.getCoupons:', error);
    throw error;
  }
};

// Create a new coupon
exports.createCoupon = async (couponData) => {
  try {
    const storeExists = await Store.findById(couponData.store);
    if (!storeExists) {
      throw new AppError('Invalid Store ID', 400);
    }    const newCoupon = await Coupon.create(couponData);

    // Add coupon to store
    await Store.findByIdAndUpdate(couponData.store, {
      $push: { coupons: newCoupon._id },
    });

    // 🚀 WebSocket: Notify real-time coupon creation
    try {
      const wsServer = getWebSocketServer();
      await wsServer.notifyCouponUpdate(newCoupon._id.toString(), 'created', {
        title: newCoupon.title,
        storeId: newCoupon.store.toString(),
        type: newCoupon.type,
        active: newCoupon.active
      });
    } catch (wsError) {
      console.error('⚠️ WebSocket notification failed (coupon creation):', wsError.message);
      // Don't throw - WebSocket errors shouldn't break coupon creation
    }

    return newCoupon;
  } catch (error) {
    console.error('Error in couponService.createCoupon:', error);
    throw error;
  }
};

// Update a coupon
exports.updateCoupon = async (id, updateData) => {
  try {
    console.log(`🔄 Starting ATOMIC coupon update for: ${id}`);

    if (typeof updateData.active !== 'undefined' && updateData.active === false) {
      throw new AppError("Cannot update inactive coupon", 400);
    }

    if (updateData.expirationDate && isNaN(Date.parse(updateData.expirationDate))) {
      throw new AppError("Invalid expiration date format", 400);
    }

    // ✅ STEP 1: DATABASE UPDATE
    console.log('💾 Step 1: Performing database update...');
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      throw new AppError('Coupon not found', 404);
    }

    console.log('✅ Database update completed');

    // ✅ STEP 2: CLEAR REDIS CACHE
    console.log('🗑️ Step 2: Clearing Redis cache...');
    const cacheResult = await callWithCircuitBreaker(
      'cache',
      async () => {
        // Clear coupon-specific caches
        await cacheService.invalidateCouponCache(id);
        
        // Clear store-related coupon caches
        const storeId = updatedCoupon.store.toString();
        const patterns = [
          `coupon:${id}`,
          `store:${storeId}:coupons`,
          'coupons:*' // Clear all coupon list caches
        ];
        
        let totalDeleted = 0;
        for (const pattern of patterns) {
          const deleted = await cacheService.delPattern(pattern);
          totalDeleted += deleted;
        }
        
        console.log(`✅ Cache cleared: ${totalDeleted} keys deleted`);
        return { success: true, totalDeleted };
      },
      async () => {
        console.warn('⚠️ Cache circuit breaker open, skipping cache invalidation');
        return { success: false, fallback: true };
      }
    );

    // ✅ STEP 3: TRIGGER WEBSOCKET NOTIFICATION
    console.log('📡 Step 3: Triggering WebSocket notification...');
    const wsResult = await callWithCircuitBreaker(
      'websocket',
      async () => {
        const wsServer = getWebSocketServer();
        return await wsServer.notifyCouponUpdate(updatedCoupon._id.toString(), 'updated', {
          title: updatedCoupon.title,
          storeId: updatedCoupon.store.toString(),
          type: updatedCoupon.type,
          active: updatedCoupon.active,
          updatedFields: Object.keys(updateData),
          timestamp: new Date().toISOString()
        });
      },
      async () => {
        console.warn('⚠️ WebSocket circuit breaker open, skipping notification');
        return { success: false, fallback: true };
      }
    );

    // ✅ STEP 4: CALL FRONTEND REVALIDATION
    console.log('🔄 Step 4: Calling frontend revalidation...');
    const revalidationResult = await callFrontendRevalidation('coupon', id, {
      couponTitle: updatedCoupon.title,
      storeId: updatedCoupon.store.toString(),
      updatedFields: Object.keys(updateData)
    });

    console.log(`✅ ATOMIC coupon update completed successfully for: ${id}`);

    return {
      coupon: formatCoupon(updatedCoupon),
      atomicUpdateResults: {
        database: { success: true },
        cache: cacheResult,
        websocket: wsResult,
        revalidation: revalidationResult,
        fieldsUpdated: Object.keys(updateData),
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error(`❌ ATOMIC coupon update failed for ${id}:`, error);
    throw error;
  }
};

// Delete a coupon
exports.deleteCoupon = async (id) => {
  try {
    console.log(`🔄 Starting ATOMIC coupon deletion for: ${id}`);

    // ✅ STEP 1: DATABASE DELETE
    console.log('💾 Step 1: Performing database deletion...');
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      throw new AppError('Coupon not found', 404);
    }

    // Remove from store's coupons array
    await Store.findByIdAndUpdate(
      deletedCoupon.store,
      { $pull: { coupons: deletedCoupon._id } }
    );

    console.log('✅ Database deletion completed');

    // ✅ STEP 2: CLEAR REDIS CACHE
    console.log('🗑️ Step 2: Clearing Redis cache...');
    const cacheResult = await callWithCircuitBreaker(
      'cache',
      async () => {
        const storeId = deletedCoupon.store.toString();
        const patterns = [
          `coupon:${id}`,
          `store:${storeId}:coupons`,
          'coupons:*'
        ];
        
        let totalDeleted = 0;
        for (const pattern of patterns) {
          const deleted = await cacheService.delPattern(pattern);
          totalDeleted += deleted;
        }
        
        console.log(`✅ Cache cleared: ${totalDeleted} keys deleted`);
        return { success: true, totalDeleted };
      },
      async () => {
        console.warn('⚠️ Cache circuit breaker open, skipping cache invalidation');
        return { success: false, fallback: true };
      }
    );

    // ✅ STEP 3: TRIGGER WEBSOCKET NOTIFICATION
    console.log('📡 Step 3: Triggering WebSocket notification...');
    const wsResult = await callWithCircuitBreaker(
      'websocket',
      async () => {
        const wsServer = getWebSocketServer();
        return await wsServer.notifyCouponUpdate(deletedCoupon._id.toString(), 'deleted', {
          title: deletedCoupon.title,
          storeId: deletedCoupon.store.toString(),
          type: deletedCoupon.type,
          timestamp: new Date().toISOString()
        });
      },
      async () => {
        console.warn('⚠️ WebSocket circuit breaker open, skipping notification');
        return { success: false, fallback: true };
      }
    );

    // ✅ STEP 4: CALL FRONTEND REVALIDATION
    console.log('🔄 Step 4: Calling frontend revalidation...');
    const revalidationResult = await callFrontendRevalidation('coupon', id, {
      action: 'deleted',
      couponTitle: deletedCoupon.title,
      storeId: deletedCoupon.store.toString()
    });

    console.log(`✅ ATOMIC coupon deletion completed successfully for: ${id}`);

    return {
      coupon: deletedCoupon,
      atomicUpdateResults: {
        database: { success: true },
        cache: cacheResult,
        websocket: wsResult,
        revalidation: revalidationResult,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error(`❌ ATOMIC coupon deletion failed for ${id}:`, error);
    throw error;
  }
};

// Track coupon usage
exports.trackCouponUsage = async (couponId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      throw new AppError('Invalid Coupon ID', 400);
    }

    const coupon = await Coupon.findByIdAndUpdate(
      couponId,
      { $inc: { hits: 1 }, $set: { lastAccessed: new Date() } },
      { new: true }
    );

    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    return formatCoupon(coupon);
  } catch (error) {
    console.error('Error in couponService.trackCouponUsage:', error);
    throw error;
  }
};

// Get coupon by ID
exports.getCouponById = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid Coupon ID', 400);
    }

    const coupon = await Coupon.findById(id).lean();

    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    return formatCoupon(coupon);
  } catch (error) {
    console.error('Error in couponService.getCouponById:', error);
    throw error;
  }
};

/**
 * Update the order of coupons for a specific store
 * @param {string} storeId - The ID of the store
 * @param {string[]} orderedCouponIds - Array of coupon IDs in their new order
 * @returns {Promise<Object>} - Success message
 */
// Update the order of coupons for a specific store
exports.updateCouponOrder = async (storeId, orderedCouponIds) => {
  try {
    // Validate storeId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      throw new AppError('Invalid store ID', 400);
    }

    // Validate orderedCouponIds array
    if (!Array.isArray(orderedCouponIds) || orderedCouponIds.length === 0) {
      throw new AppError('Ordered coupon IDs array is required', 400);
    }

    // Check store existence
    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Validate all coupon IDs
    const invalidCouponIds = orderedCouponIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidCouponIds.length > 0) {
      throw new AppError(`Invalid coupon IDs: ${invalidCouponIds.join(', ')}`, 400);
    }

    // Verify coupons belong to store
    const coupons = await Coupon.find({ _id: { $in: orderedCouponIds }, store: storeId }).select('_id').lean();

    if (coupons.length !== orderedCouponIds.length) {
      const foundIds = coupons.map(c => c._id.toString());
      const missingIds = orderedCouponIds.filter(id => !foundIds.includes(id));
      throw new AppError(`Coupons missing or not belonging to store: ${missingIds.join(', ')}`, 400);
    }

    // Fetch current orders to optimize updates
    const currentCoupons = await Coupon.find({
      _id: { $in: orderedCouponIds },
      store: storeId
    }).select('_id order').lean();

    const currentOrderMap = new Map(currentCoupons.map(c => [c._id.toString(), c.order]));

    // Prepare bulk operations only for coupons with changed order
    const bulkOps = orderedCouponIds.map((couponId, index) => {
      const currentOrder = currentOrderMap.get(couponId);
      if (currentOrder !== index) {
        return {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(couponId) },  // <-- 'new' keyword here
            update: { $set: { order: index, updatedAt: new Date() } },
          }
        };
      }
      return null;
    }).filter(Boolean);

    if (bulkOps.length > 0) {
      console.log(`Updating ${bulkOps.length} coupons with new order...`);
      const result = await Coupon.bulkWrite(bulkOps);
      console.log('BulkWrite result:', JSON.stringify(result, null, 2));

      if (result.matchedCount < bulkOps.length) {
        throw new AppError(`Some coupons updates failed. Expected: ${bulkOps.length}, Updated: ${result.matchedCount}`, 500);
      }
    } else {
      console.log('No coupons needed order update — already in correct order.');
    }


    // **Here update the Store document coupons array order**
    await Store.findByIdAndUpdate(storeId, { coupons: orderedCouponIds });
    console.log('Store coupons array updated to:', orderedCouponIds);

    // Confirm updated order from DB
    const updatedCoupons = await Coupon.find({ store: storeId }).sort({ order: 1 }).select('_id order').lean();
    console.log('Updated coupons order:', updatedCoupons.map(c => ({ id: c._id.toString(), order: c.order })));

    return { message: 'Coupon order updated successfully', totalUpdated: bulkOps.length };
  } catch (error) {
    console.error('Error updating coupon order:', error);
    throw error instanceof AppError ? error : new AppError(error.message || 'Internal Server Error', 500);
  }
};

