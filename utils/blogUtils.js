const slugify = require('slugify');
const sanitizeHtml = require('sanitize-html');

// Generate SEO-friendly slug from blog title
exports.generateSlug = (title) => slugify(title, {
  lower: true,
  strict: true,
  remove: /[*+~.()'"!:@]/g
});

// Sanitize HTML content to prevent XSS and unwanted tags/attrs
exports.sanitizeContent = (content) => sanitizeHtml(content, {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
    'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
    'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img'
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'loading'],
    a: ['href', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'data'],
  transformTags: {
    'a': (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    })
  }
});

// Calculate reading time (in minutes) from plain text (200 words per min)
exports.calculateReadingTime = (content) => {
  const text = content.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordsPerMinute = 200;
  return Math.ceil(words.length / wordsPerMinute);
};

// Standardize blog response (convert _id to id, etc.)
exports.formatBlogResponse = (blog) => ({
  id: blog._id,
  title: blog.title,
  slug: blog.slug,
  shortDescription: blog.shortDescription,
  longDescription: blog.longDescription,
  image: blog.image,
  meta: blog.meta,
  author: blog.author,
  category: blog.category,
  store: blog.store,
  seo: blog.seo,
  engagement: blog.engagement,
  navigation: blog.navigation,
  tags: blog.tags,
  status: blog.status,
  isFeaturedForHome: blog.isFeaturedForHome,
  publishDate: blog.publishDate,
  lastUpdated: blog.lastUpdated,
  version: blog.version,
  createdAt: blog.createdAt,
  updatedAt: blog.updatedAt
});
