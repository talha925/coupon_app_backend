const mongoose = require('mongoose');
const slugify = require('slugify');

// Define Blog Category Schema
const blogCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name cannot exceed 50 characters']
        // Remove `index: true` from here
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
        // Remove `index: true` from here as well
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Note: `unique: true` on name and slug already creates indexes automatically

// Pre-save middleware to generate slug
blogCategorySchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('name')) {
        try {
            let baseSlug = slugify(this.name, {
                lower: true,
                strict: true,
                trim: true,
                remove: /[*+~.()'"!:@]/g
            });

            // Find existing similar slugs
            const slugRegEx = new RegExp(`^${baseSlug}(-[0-9]*)?$`, 'i');
            const existingSlugs = await this.constructor.find({ 
                slug: slugRegEx,
                _id: { $ne: this._id }
            }).select('slug');

            if (existingSlugs.length > 0) {
                const suffixes = existingSlugs
                    .map(doc => {
                        const match = doc.slug.match(/-(\d+)$/);
                        return match ? parseInt(match[1]) : 0;
                    })
                    .sort((a, b) => b - a);

                const nextSuffix = (suffixes[0] || 0) + 1;
                this.slug = `${baseSlug}-${nextSuffix}`;
            } else {
                this.slug = baseSlug;
            }
        } catch (error) {
            return next(error);
        }
    }
    next();
});

const BlogCategory = mongoose.model('BlogCategory', blogCategorySchema);
module.exports = BlogCategory;
