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
}, { timestamps: true });

// Create a text index for full-text search
storeSchema.index({ name: 'text', slug: 'text', short_description: 'text', long_description: 'text' });

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

const Store = mongoose.model('Store', storeSchema);
module.exports = Store;
