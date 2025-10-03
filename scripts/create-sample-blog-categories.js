/**
 * 🎯 CREATE SAMPLE BLOG CATEGORIES
 * 
 * This script creates sample blog categories to test the API endpoints
 * and ensure the blog categories functionality is working properly.
 */

const mongoose = require('mongoose');
const BlogCategory = require('../models/blogCategoryModel');
const { getConfig } = require('../config/env');

class SampleCategoryCreator {
    constructor() {
        this.config = getConfig();
        this.sampleCategories = [
            {
                name: 'Technology',
                slug: 'technology'
            },
            {
                name: 'Health & Wellness',
                slug: 'health-wellness'
            },
            {
                name: 'Fashion & Beauty',
                slug: 'fashion-beauty'
            },
            {
                name: 'Travel & Lifestyle',
                slug: 'travel-lifestyle'
            },
            {
                name: 'Food & Dining',
                slug: 'food-dining'
            }
        ];
    }

    async connectDB() {
        try {
            const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/coupon-backend';
            await mongoose.connect(mongoUri);
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            throw error;
        }
    }

    async createSampleCategories() {
        try {
            console.log('🔍 Checking existing blog categories...');
            const existingCount = await BlogCategory.countDocuments();
            console.log(`📊 Found ${existingCount} existing categories`);

            if (existingCount > 0) {
                console.log('✅ Blog categories already exist, skipping creation');
                return;
            }

            console.log('📝 Creating sample blog categories...');
            
            for (const categoryData of this.sampleCategories) {
                try {
                    const category = new BlogCategory(categoryData);
                    await category.save();
                    console.log(`✅ Created category: ${categoryData.name}`);
                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`⚠️ Category already exists: ${categoryData.name}`);
                    } else {
                        console.error(`❌ Failed to create ${categoryData.name}:`, error.message);
                    }
                }
            }

            const finalCount = await BlogCategory.countDocuments();
            console.log(`🎯 Total blog categories: ${finalCount}`);

        } catch (error) {
            console.error('❌ Failed to create sample categories:', error.message);
            throw error;
        }
    }

    async testCategoryAPI() {
        try {
            console.log('🧪 Testing blog category retrieval...');
            const categories = await BlogCategory.find().lean();
            console.log(`✅ Successfully retrieved ${categories.length} categories`);
            
            if (categories.length > 0) {
                console.log('📋 Sample categories:');
                categories.forEach(cat => {
                    console.log(`  - ${cat.name} (${cat.slug})`);
                });
            }

        } catch (error) {
            console.error('❌ Failed to test category API:', error.message);
            throw error;
        }
    }

    async run() {
        try {
            await this.connectDB();
            await this.createSampleCategories();
            await this.testCategoryAPI();
            
            console.log('\n🎉 Sample blog categories setup complete!');
            console.log('🔗 You can now test: GET /api/blogCategories/');
            
        } catch (error) {
            console.error('💥 Sample category creation failed:', error.message);
            throw error;
        } finally {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the script
if (require.main === module) {
    const creator = new SampleCategoryCreator();
    creator.run()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Script failed:', error.message);
            process.exit(1);
        });
}

module.exports = SampleCategoryCreator;