const mongoose = require('mongoose');
const slugify = require('slugify');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true, index: 'text' },
    slug: { type: String, unique: true, index: 'text' },
    directUrl: { type: String, required: true },
    trackingUrl: { type: String, required: true },
    short_description: { type: String, required: true, index: 'text' },
    long_description: { type: String, required: true, index: 'text' },
    image: {
        url: { type: String, required: true },
        alt: { type: String, required: true },
    },  
      coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }] ,

    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    seo: {
        meta_title: { type: String, maxlength: 60 },
        meta_description: { type: String, maxlength: 160 },
        meta_keywords: { type: String, maxlength: 200 },
    },
    language: { type: String, default: 'English' },
    isTopStore: { type: Boolean, default: false },
    isEditorsChoice: { type: Boolean, default: false },
    heading: { 
        type: String, 
        enum: [
            'Promo Codes & Coupon', 
            'Coupons & Promo Codes', 
            'Voucher & Discount Codes'
        ], 
        default: 'Coupons & Promo Codes' // Set a default
    },
}, { 
    timestamps: true,
    // Add option to make all queries lean by default
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create a text index for full-text search
storeSchema.index({ name: 'text', slug: 'text', short_description: 'text', long_description: 'text' });

// Create compound indexes for common query patterns
storeSchema.index({ language: 1, isTopStore: 1 });
storeSchema.index({ language: 1, isEditorsChoice: 1 });
storeSchema.index({ language: 1, categories: 1 });
storeSchema.index({ createdAt: -1 }); // For sorting by newest

// Pre-save hook to generate unique slug
storeSchema.pre('save', async function (next) {
    if (this.isModified('name')) {
        let slug = slugify(this.name, { lower: true, strict: true });
        let slugExists = await mongoose.model('Store').findOne({ slug });

        let counter = 1;
        while (slugExists) {
            slug = `${slug}-${counter}`;
            slugExists = await mongoose.model('Store').findOne({ slug });
            counter++;
        }

        this.slug = slug;
    }
    next();
});

// Add any virtual properties here
storeSchema.virtual('couponCount').get(function() {
    return this.coupons ? this.coupons.length : 0;
});

// Static methods
storeSchema.statics.findTopStores = function(limit = 10) {
    return this.find({ isTopStore: true })
        .select('name slug image short_description')
        .limit(limit)
        .lean();
};

// Instance methods
storeSchema.methods.hasActiveCoupons = async function() {
    const Coupon = mongoose.model('Coupon');
    const activeCoupons = await Coupon.countDocuments({ 
        store: this._id,
        active: true
    });
    return activeCoupons > 0;
};

const Store = mongoose.model('Store', storeSchema);
module.exports = Store;
