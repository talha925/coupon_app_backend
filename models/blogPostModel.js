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
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
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

// --- Indexes for Performance ---

blogPostSchema.index({ title: 'text', shortDescription: 'text' });
blogPostSchema.index({ 'category.id': 1, status: 1 });
blogPostSchema.index({ 'store.id': 1, status: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ status: 1, publishDate: -1 });
blogPostSchema.index({ isFeaturedForHome: 1, status: 1, publishDate: -1 });

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
  if (!this.isModified('title')) return next();

  let slug = slugify(this.title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });

  let suffix = 0, unique = false;
  while (!unique) {
    const testSlug = suffix ? `${slug}-${suffix}` : slug;
    const exists = await this.constructor.exists({ slug: testSlug, _id: { $ne: this._id } });
    if (!exists) {
      slug = testSlug;
      unique = true;
    } else {
      suffix++;
    }
  }
  this.slug = slug;
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
