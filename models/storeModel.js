const mongoose = require('mongoose');
const slugify = require('slugify');

const ALLOWED_HEADINGS = [
  'Promo Codes & Coupon',
  'Coupons & Promo Codes',
  'Voucher & Discount Codes'
];

const storeSchema = new mongoose.Schema({
  name: { type: String, required: true, index: 'text' },
  slug: { type: String, unique: true, index: 'text' },
  trackingUrl: { type: String, required: true },
  short_description: { type: String, required: true, index: 'text' },
  long_description: { type: String, required: true, index: 'text' },
  image: {
    url: { type: String, required: true },
    alt: { type: String, required: true },
  },
  coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],
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
    default: 'Coupons & Promo Codes',
    set: (v) => v?.replace(/&amp;/g, '&').trim(),
    validate: {
      validator: function (v) {
        return ALLOWED_HEADINGS.includes(v);
      },
      message: props => `Invalid heading: ${props.value}`
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔍 Indexes
storeSchema.index({ name: 'text', slug: 'text', short_description: 'text', long_description: 'text' });
storeSchema.index({ language: 1, isTopStore: 1 });
storeSchema.index({ language: 1, isEditorsChoice: 1 });
storeSchema.index({ language: 1, categories: 1 });
storeSchema.index({ createdAt: -1 });

// 🧠 Slug pre-save
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

// 📊 Virtuals
storeSchema.virtual('couponCount').get(function () {
  return this.coupons ? this.coupons.length : 0;
});

// 📘 Statics
storeSchema.statics.findTopStores = function (limit = 10) {
  return this.find({ isTopStore: true })
    .select('name slug image short_description')
    .limit(limit)
    .lean();
};

// 💡 Instance methods
storeSchema.methods.hasActiveCoupons = async function () {
  const Coupon = mongoose.model('Coupon');
  const activeCoupons = await Coupon.countDocuments({
    store: this._id,
    active: true
  });
  return activeCoupons > 0;
};

const Store = mongoose.model('Store', storeSchema);
module.exports = Store;
