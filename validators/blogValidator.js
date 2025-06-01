const Joi = require('joi');
const mongoose = require('mongoose');

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'MongoDB ObjectId validation');

const imageSchema = Joi.object({
  url: Joi.string().required().uri(),
  alt: Joi.string().required(),
  width: Joi.number(),
  height: Joi.number(),
  format: Joi.string()
});

const metaSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  keywords: Joi.array().items(Joi.string()),
  canonicalUrl: Joi.string().uri(),
  robots: Joi.string()
});

const authorSchema = Joi.object({
  id: objectId.optional(),
  name: Joi.string().optional(),
  profileUrl: Joi.string().uri().optional(),
  image: Joi.string().uri().optional()
}).optional();


const categorySchema = Joi.object({
  id: objectId.required(),
  name: Joi.string().required(),
  slug: Joi.string().required()
});

const storeSchema = Joi.object({
  id: objectId.required(),
  name: Joi.string().required(),
  url: Joi.string().required().uri()
});

const seoSchema = Joi.object({
  schemaMarkup: Joi.object(),
  openGraph: Joi.object(),
  twitterCard: Joi.object()
});

const engagementSchema = Joi.object({
  readingTime: Joi.string(),
  wordCount: Joi.number(),
  likes: Joi.number(),
  shares: Joi.number(),
  comments: Joi.number()
});

const navigationSchema = Joi.object({
  breadcrumbs: Joi.array().items(Joi.object({
    label: Joi.string(),
    url: Joi.string()
  })),
  relatedPosts: Joi.array().items(Joi.object({
    id: objectId,
    title: Joi.string(),
    slug: Joi.string()
  })),
  tableOfContents: Joi.array().items(Joi.object({
    title: Joi.string(),
    anchor: Joi.string(),
    level: Joi.number()
  }))
});

exports.createBlogSchema = Joi.object({
  title: Joi.string().required().max(200),
  shortDescription: Joi.string().max(500),
  longDescription: Joi.string().required(),
  image: imageSchema.required(),
  meta: metaSchema,
  author: authorSchema,
  category: categorySchema.required(),
  store: storeSchema.required(),
  seo: seoSchema,
  engagement: engagementSchema,
  navigation: navigationSchema,
  tags: Joi.array().items(Joi.string()),
  status: Joi.string().valid('draft', 'published'),
  isFeaturedForHome: Joi.boolean(),
  publishDate: Joi.date(),
  version: Joi.string()
});

exports.updateBlogSchema = Joi.object({
  title: Joi.string().max(200),
  shortDescription: Joi.string().max(500),
  longDescription: Joi.string(),
  image: imageSchema,
  meta: metaSchema,
  author: authorSchema,
  category: categorySchema,
  store: storeSchema,
  seo: seoSchema,
  engagement: engagementSchema,
  navigation: navigationSchema,
  tags: Joi.array().items(Joi.string()),
  status: Joi.string().valid('draft', 'published'),
  isFeaturedForHome: Joi.boolean(),
  publishDate: Joi.date(),
  version: Joi.string()
}).min(1);

exports.updateEngagementSchema = Joi.object({
  likes: Joi.number().min(0),
  shares: Joi.number().min(0),
  comments: Joi.number().min(0)
}).min(1);
