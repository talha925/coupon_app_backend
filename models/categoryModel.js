// models/categoryModel.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // Name of the category
    icon: { type: String, required: true }, // Icon for the category, could be a URL or an icon name
    createdAt: { type: Date, default: Date.now } // Timestamp for when the category was created
});

module.exports = mongoose.model('Category', categorySchema);
