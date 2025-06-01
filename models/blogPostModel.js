const mongoose = require('mongoose');
const slugify = require('slugify');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, required: true },
  width: { type: Number },
  height: { type: Number },
  format: { type: String }
});

const metaSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  keywords: [{ type: String }],
  canonicalUrl: { type: String },
  robots: { type: String }
});

const authorSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  profileUrl: { type: String },
  image: { type: String }
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
  schemaMarkup: { type: mongoose.Schema.Types.Mixed },
  openGraph: { type: mongoose.Schema.Types.Mixed },
  twitterCard: { type: mongoose.Schema.Types.Mixed }
});

const engagementSchema = new mongoose.Schema({
  readingTime: { type: String },
  wordCount: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  comments: { type: Number, default: 0 }
});

const navigationSchema = new mongoose.Schema({
  breadcrumbs: [{
    label: String,
    url: String
  }],
  relatedPosts: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' },
    title: String,
    slug: String
  }],
  tableOfContents: [{
    title: String,
    anchor: String,
    level: Number
  }]
});

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
  longDescription: {
    type: String,
    required: [true, 'Content is required']
  },
  image: imageSchema,
  meta: metaSchema,
  author: authorSchema,
  category: categorySchema,
  store: storeSchema,
  seo: seoSchema,
  engagement: {
    type: engagementSchema,
    default: () => ({})
  },
  navigation: {
    type: navigationSchema,
    default: () => ({})
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  isFeaturedForHome: {
    type: Boolean,
    default: false
  },
  publishDate: Date,
  lastUpdated: Date,
  version: {
    type: String,
    default: 'v1'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
blogPostSchema.index({ title: 'text', shortDescription: 'text' });
blogPostSchema.index({ 'category.id': 1, status: 1 });
blogPostSchema.index({ 'store.id': 1, status: 1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ status: 1, publishDate: -1 });
blogPostSchema.index({ isFeaturedForHome: 1, status: 1, publishDate: -1 });

// Pre-save middleware
blogPostSchema.pre('save', async function(next) {
  if (!this.isModified('title')) return next();
  
  // Generate slug from title
  let slug = slugify(this.title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });

  // Ensure slug uniqueness
  const slugRegEx = new RegExp(`^${slug}(-[0-9]*)?$`, 'i');
  const postsWithSlug = await this.constructor.find({ slug: slugRegEx });
  
  if (postsWithSlug.length > 0) {
    slug = `${slug}-${postsWithSlug.length + 1}`;
  }
  
  this.slug = slug;
  next();
});

// Update lastUpdated on modifications
blogPostSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Calculate word count and reading time
blogPostSchema.pre('save', function(next) {
  if (this.isModified('longDescription')) {
    const wordCount = this.longDescription
      .replace(/<[^>]*>/g, '') // Remove HTML tags
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
