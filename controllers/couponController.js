const Coupon = require('../models/couponModel');
const Store = require('../models/storeModel');

//  Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().populate({
            path: 'store',
            select: 'name directUrl trackingUrl image' //  Ensure directUrl is fetched
        });

        const formattedCoupons = coupons.map(coupon => ({
            ...coupon._doc,
            storeLink: coupon.store && coupon.store.directUrl ? coupon.store.directUrl : "N/A", //  Ensure Store Link is present
            affiliateLink: coupon.store && coupon.store.trackingUrl ? coupon.store.trackingUrl : "N/A",
            image: coupon.store && coupon.store.image ? coupon.store.image.url : "N/A"
        }));

        res.status(200).json({ status: 'success', data: formattedCoupons });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching coupons' });
    }
};

//  Create a new coupon
exports.createCoupon = async (req, res) => {
    const {
        offerName, offerBox, offerDetails, code, store,
        discount, expirationDate, active,
        featuredForHome, flickerButton, verifiedButton, exclusiveButton
    } = req.body;

    if (!offerName || !offerBox || !offerDetails || !store || !discount) {
        return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    try {
        const storeExists = await Store.findById(store);
        if (!storeExists) {
            return res.status(400).json({ status: 'error', message: 'Invalid Store ID' });
        }

        const newCoupon = await Coupon.create({
            offerName,
            offerBox,
            offerDetails,
            code: active ? null : code, //  If Active, remove the code
            store: storeExists._id,
            discount,
            expirationDate,
            active,
            featuredForHome,
            flickerButton,
            verifiedButton,
            exclusiveButton
        });

        await Store.findByIdAndUpdate(store, { $push: { coupons: newCoupon._id } });

        res.status(201).json({ status: 'success', data: newCoupon });
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ status: 'error', message: 'Error creating coupon' });
    }
};

//  Get a coupon by ID
exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id).populate({
            path: 'store',
            select: 'name directUrl trackingUrl image'
        });

        if (!coupon) {
            return res.status(404).json({ status: 'error', message: 'Coupon not found' });
        }

        const formattedCoupon = {
            ...coupon._doc,
            storeLink: coupon.store && coupon.store.directUrl ? coupon.store.directUrl : "N/A",
            affiliateLink: coupon.store && coupon.store.trackingUrl ? coupon.store.trackingUrl : "N/A",
            image: coupon.store && coupon.store.image ? coupon.store.image.url : "N/A"
        };

        res.status(200).json({ status: 'success', data: formattedCoupon });
    } catch (error) {
        console.error('Error fetching coupon by ID:', error);
        res.status(500).json({ status: 'error', message: 'Error fetching coupon' });
    }
};


//  Update a coupon
exports.updateCoupon = async (req, res) => {
    try {
        const { active, code } = req.body;

        if (active === false && !code) {
            return res.status(400).json({ status: 'error', message: "Either 'Code' or 'Active' must be provided" });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('store');

        if (!updatedCoupon) {
            return res.status(404).json({ status: 'error', message: 'Coupon not found' });
        }

        res.status(200).json({ status: 'success', data: updatedCoupon });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ status: 'error', message: 'Error updating coupon' });
    }
};

//  Delete a coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!deletedCoupon) {
            return res.status(404).json({ status: 'error', message: 'Coupon not found' });
        }

        await Store.findByIdAndUpdate(deletedCoupon.store, { $pull: { coupons: deletedCoupon._id } });

        res.status(200).json({ status: 'success', message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ status: 'error', message: 'Error deleting coupon' });
    }
};
