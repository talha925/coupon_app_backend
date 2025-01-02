const mongoose = require('mongoose');
const slugify = require('slugify');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true }, // Unique slug for the store
    website: { type: String, required: true },
    short_description: { type: String, required: true },
    long_description: { type: String, required: true },
    image: { type: String, required: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    seo: {
        meta_title: { type: String, maxlength: 60 },
        meta_description: { type: String, maxlength: 160 },
        meta_keywords: { type: String, maxlength: 200 },
    },
    language: { type: String, default: 'English' },
}, { timestamps: true });

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
