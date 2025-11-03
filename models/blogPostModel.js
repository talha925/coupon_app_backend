const mongoose = require('mongoose');
const slugify = require('slugify');
const sanitizeHtml = require('sanitize-html');

// --- Sub Schemas ---

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  width: Number,
  height: Number,
  format: String
});

const metaSchema = new mongoose.Schema({
  title: String,
  description: String,
  keywords: [{ type: String }],
  canonicalUrl: String,
  robots: String
});

const authorSchema = new mongoose.Schema({
  // id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, required: true },
  profileUrl: String,
  image: String
});

const categorySchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true }
});

const storeSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  url: { type: String, required: true }
});

const seoSchema = new mongoose.Schema({
  schemaMarkup: mongoose.Schema.Types.Mixed,
  openGraph: mongoose.Schema.Types.Mixed,
  twitterCard: mongoose.Schema.Types.Mixed
});

const engagementSchema = new mongoose.Schema({
  readingTime: String,
  wordCount: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  shares: { type: Number, default: 0, min: 0 },
  comments: { type: Number, default: 0, min: 0 }
});

const navigationSchema = new mongoose.Schema({
  breadcrumbs: [{ label: String, url: String }],
  relatedPosts: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' },
    title: String,
    slug: String
  }],
  tableOfContents: [{ title: String, anchor: String, level: Number }]
});

const faqSchema = new mongoose.Schema({
  question: String,
  answer: String
});

// --- Main Schema ---

const blogPostSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Blog post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },  slug: {
    type: String,
    unique: true,
    lowercase: true
    // Removed duplicate index: true to fix warning
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  longDescription: { type: String, required: [true, 'Content is required'] },
  image: imageSchema,
  meta: metaSchema,
  author: authorSchema,
  category: categorySchema,
  store: storeSchema,
  seo: seoSchema,
  engagement: { type: engagementSchema, default: () => ({}) },
  navigation: { type: navigationSchema, default: () => ({}) },
  tags: [{ type: String, trim: true }],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  isFeaturedForHome: { type: Boolean, default: false },
  FrontBanner: { type: Boolean, default: false },

  publishDate: Date,
  lastUpdated: Date,
  version: { type: String, default: 'v1' },
  robots: { type: String, default: 'index, follow' },
  faqs: [faqSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// --- OPTIMIZED INDEXES FOR PERFORMANCE ---

// Text search index for title and description
blogPostSchema.index({ title: 'text', shortDescription: 'text' });

// CRITICAL: Compound indexes for common query patterns
blogPostSchema.index({ status: 1, publishDate: -1 }); // Most common: published posts by date
blogPostSchema.index({ FrontBanner: 1, status: 1, publishDate: -1 }); // Critical for front banner queries
blogPostSchema.index({ isFeaturedForHome: 1, status: 1, publishDate: -1 }); // Featured posts
blogPostSchema.index({ 'category.id': 1, status: 1, publishDate: -1 }); // Category filtering
blogPostSchema.index({ 'store.id': 1, status: 1, publishDate: -1 }); // Store filtering

// Additional performance indexes
blogPostSchema.index({ tags: 1, status: 1 }); // Tag filtering with status
// Removed duplicate slug index - already defined via unique: true in schema
blogPostSchema.index({ createdAt: -1 }); // Recent posts sorting
blogPostSchema.index({ lastUpdated: -1 }); // Recently updated posts

// --- Helpers & Pre-save Hooks ---

function safeHtml(input) {
  return sanitizeHtml(input, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h2', 'h3']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height'],
    }
  });
}

blogPostSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('title')) {
    try {
      // Generate base slug from title
      let baseSlug = slugify(this.title, {
        lower: true,          // convert to lowercase
        strict: true,         // strip special characters except replacement
        trim: true,          // trim leading and trailing replacement chars
        remove: /[*+~.()'"!:@]/g  // remove characters that might be unsafe in URLs
      });

      // Ensure the slug isn't empty after processing
      if (!baseSlug) {
        baseSlug = 'untitled';
      }

      // Find existing slugs that match our pattern
      const slugRegEx = new RegExp(`^${baseSlug}(-[0-9]*)?$`, 'i');
      const existingSlugs = await this.constructor.find({ 
        slug: slugRegEx,
        _id: { $ne: this._id }  // exclude current document when updating
      }).select('slug').lean();

      if (existingSlugs.length > 0) {
        // Find the highest number suffix
        const suffixes = existingSlugs
          .map(doc => {
            const match = doc.slug.match(/-(\d+)$/);
            return match ? parseInt(match[1]) : 0;
          })
          .sort((a, b) => b - a);

        // Add one to the highest suffix
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

blogPostSchema.pre('save', function (next) {
  if (this.isModified('longDescription')) {
    this.longDescription = safeHtml(this.longDescription);
  }
  next();
});

blogPostSchema.pre('save', function(next) {
  this.robots = this.status === 'published' ? 'index, follow' : 'noindex, nofollow';
  next();
});

blogPostSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

blogPostSchema.pre('save', function(next) {
  if (this.isModified('longDescription')) {
    const wordCount = this.longDescription
      .replace(/<[^>]*>/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;

    const wordsPerMinute = 200;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);

    this.engagement = {
      ...this.engagement,
      wordCount,
      readingTime: `${readingTime} min read`
    };
  }
  next();
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);
module.exports = BlogPost;
