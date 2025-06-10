// Utility to truncate text with ellipsis
const truncate = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength - 3) + "...";
};

// Utility to remove HTML tags from string
const stripHtml = (html) => html.replace(/<[^>]*>/g, "");

// Anchor generator for table of contents (h2/h3 titles)
const generateAnchor = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Generates meta tags object for a blog post
const generateMetaTags = (blogData) => ({
  title: truncate(blogData.title, 60),
  description: truncate(blogData.shortDescription || stripHtml(blogData.longDescription), 160),
  keywords: generateKeywords(blogData),
  canonicalUrl: `${process.env.SITE_URL}/blog/${blogData.slug}`,
  robots: blogData.robots || 'index, follow'
});

// Generates JSON-LD Schema Markup (includes FAQPage if present)
const generateSchemaMarkup = (blogData) => {
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${process.env.SITE_URL}/blog/${blogData.slug}`
    },
    "headline": blogData.title,
    "description": blogData.shortDescription,
    "image": blogData.image?.url,
    "author": {
      "@type": "Person",
      "name": blogData.author?.name,
      "url": blogData.author?.profileUrl
    },
    "publisher": {
      "@type": "Organization",
      "name": process.env.SITE_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.SITE_URL}/logo.png`
      }
    },
    "datePublished": blogData.publishDate,
    "dateModified": blogData.lastUpdated
  };

  // Add FAQ schema if available
  if (Array.isArray(blogData.faqs) && blogData.faqs.length) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": blogData.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
    return [baseSchema, faqSchema];
  }

  return baseSchema;
};

// Generates OpenGraph tags for Facebook, LinkedIn, etc.
const generateOpenGraph = (blogData) => ({
  "og:title": blogData.title,
  "og:description": blogData.shortDescription || stripHtml(blogData.longDescription).substring(0, 160),
  "og:url": `${process.env.SITE_URL}/blog/${blogData.slug}`,
  "og:type": "article",
  "og:image": blogData.image?.url,
  "article:published_time": blogData.publishDate,
  "article:modified_time": blogData.lastUpdated,
  "article:author": blogData.author?.name,
  "article:section": blogData.category?.name,
  "article:tag": (blogData.tags || []).join(", ")
});

// Generates Twitter Card meta tags
const generateTwitterCard = (blogData) => ({
  "twitter:card": "summary_large_image",
  "twitter:title": truncate(blogData.title, 70),
  "twitter:description": truncate(blogData.shortDescription || stripHtml(blogData.longDescription), 200),
  "twitter:image": blogData.image?.url,
  "twitter:site": process.env.TWITTER_HANDLE
});

// Generates breadcrumbs for navigation and SEO
const generateBreadcrumbs = (blogData) => [
  { name: "Home", url: "/" },
  { name: "Blog", url: "/blog" },
  { name: blogData.category?.name, url: `/blog/category/${blogData.category?.slug}` },
  { name: blogData.title, url: `/blog/${blogData.slug}` }
];

// Table of Contents from h2/h3 headings in blog HTML content
const generateTableOfContents = (content) => {
  const headingRegex = /<h([2-3])[^>]*>(.*?)<\/h\1>/g;
  const toc = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const title = stripHtml(match[2]);
    const anchor = generateAnchor(title);
    toc.push({ title, anchor, level });
  }
  return toc;
};

// Keywords generator for meta keywords
const generateKeywords = (blogData) => {
  const keywords = new Set([
    ...(blogData.tags || []),
    blogData.category?.name,
    blogData.store?.name,
    ...blogData.title?.toLowerCase().split(" ").filter(word => word.length > 3)
  ].filter(Boolean));
  return Array.from(keywords);
};

module.exports = {
  generateMetaTags,
  generateSchemaMarkup,
  generateOpenGraph,
  generateTwitterCard,
  generateBreadcrumbs,
  generateTableOfContents,
  generateKeywords
};
