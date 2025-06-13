require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { default: slugify } = require('slugify');
const BlogCategory = require('../models/blogCategoryModel');

let mongoServer;

// Test data
const testCategories = [
    { name: 'Technology' },
    { name: 'Lifestyle' },
    { name: 'Travel' }
];

const runTests = async () => {
    try {
        console.log('\n🚀 Starting Blog Category Tests...\n');
        
        // Clean up existing test data
        await BlogCategory.deleteMany({});
        console.log('🧹 Cleaned up existing test data');
        
        // Log test environment
        console.log('📡 MongoDB Connection:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');

        // Test 1: Create categories
        console.log('\n🔍 Test 1: Creating categories...');
        const createdCategories = await Promise.all(
            testCategories.map(cat => BlogCategory.create(cat))
        );
        console.log('✅ Created categories:', createdCategories.map(c => ({ 
            name: c.name, 
            slug: c.slug 
        })));

        // Test 2: Update a category
        console.log('\n🔍 Test 2: Updating a category...');
        const categoryToUpdate = createdCategories[0];
        const updatedCategory = await BlogCategory.findByIdAndUpdate(
            categoryToUpdate._id,
            { name: 'Tech & Gaming' },
            { new: true }
        );
        console.log('✅ Updated category:', { 
            name: updatedCategory.name, 
            slug: updatedCategory.slug 
        });

        // Test 3: Test duplicate name handling
        console.log('\n🔍 Test 3: Testing duplicate name handling...');
        try {
            await BlogCategory.create({ name: 'Lifestyle' });
            console.log('❌ Failed: Duplicate name was allowed');
        } catch (error) {
            console.log('✅ Successfully prevented duplicate name');
        }

        // Test 4: Test slug generation
        console.log('\n🔍 Test 4: Testing slug generation...');
        const specialCharsCategory = await BlogCategory.create({
            name: 'Web & Mobile Development 2025!'
        });
        console.log('✅ Generated slug for special chars:', {
            name: specialCharsCategory.name,
            slug: specialCharsCategory.slug
        });

        console.log('\n✨ All tests completed successfully!');    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        console.log('\n🔚 Closing database connection...');
        await mongoose.disconnect();
        console.log('✨ Tests completed!\n');
    }
};

// Connect to database and run tests
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('📡 Connected to MongoDB');
        return runTests();
    })
    .catch(error => {
        console.error('❌ Database connection failed:', error);
    });
