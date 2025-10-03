const mongoose = require('mongoose');
require('dotenv').config();

/**
 * 🚨 CRITICAL INDEX CREATION SCRIPT
 * Creates missing compound indexes to fix 10-second API response times
 */

class CriticalIndexCreator {
    constructor() {
        this.indexesCreated = [];
        this.indexesFailed = [];
    }

    async connect() {
        try {
            await mongoose.connect(process.env.MONGO_URI, {
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 5000
            });
            console.log('✅ Connected to MongoDB for index creation');
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            process.exit(1);
        }
    }

    async createIndex(collection, indexSpec, options = {}) {
        try {
            const startTime = Date.now();
            await collection.createIndex(indexSpec, options);
            const endTime = Date.now();
            
            const indexName = Object.keys(indexSpec).join('_');
            console.log(`✅ Created index: ${indexName} (${endTime - startTime}ms)`);
            
            this.indexesCreated.push({
                collection: collection.collectionName,
                index: indexSpec,
                options,
                creationTime: endTime - startTime
            });
            
        } catch (error) {
            const indexName = Object.keys(indexSpec).join('_');
            console.error(`❌ Failed to create index ${indexName}:`, error.message);
            
            this.indexesFailed.push({
                collection: collection.collectionName,
                index: indexSpec,
                error: error.message
            });
        }
    }

    async createBlogPostIndexes() {
        console.log('\n🔍 CREATING BLOGPOST CRITICAL INDEXES...\n');
        
        const BlogPost = require('../models/blogPostModel');
        const collection = BlogPost.collection;
        
        // 🚨 CRITICAL: FrontBanner queries (9.7s → <200ms target)
        await this.createIndex(collection, 
            { "FrontBanner": 1, "status": 1, "publishDate": -1 },
            { name: "frontbanner_status_publishdate_idx" }
        );
        
        // 🚨 CRITICAL: Featured home queries
        await this.createIndex(collection, 
            { "isFeaturedForHome": 1, "status": 1, "publishDate": -1 },
            { name: "featured_status_publishdate_idx" }
        );
        
        // 🚨 CRITICAL: Category-based queries
        await this.createIndex(collection, 
            { "category.id": 1, "status": 1, "publishDate": -1 },
            { name: "category_status_publishdate_idx" }
        );
        
        // 🚨 CRITICAL: Store-based queries
        await this.createIndex(collection, 
            { "store.id": 1, "status": 1, "publishDate": -1 },
            { name: "store_status_publishdate_idx" }
        );
        
        // 🚨 CRITICAL: Tag-based queries with status
        await this.createIndex(collection, 
            { "tags": 1, "status": 1, "publishDate": -1 },
            { name: "tags_status_publishdate_idx" }
        );
        
        // 🚨 CRITICAL: General status + publishDate (most common query)
        await this.createIndex(collection, 
            { "status": 1, "publishDate": -1 },
            { name: "status_publishdate_idx" }
        );
        
        // 🚨 CRITICAL: Slug lookup optimization
        await this.createIndex(collection, 
            { "slug": 1 },
            { name: "slug_idx", unique: true }
        );
        
        // 🚨 CRITICAL: Text search optimization
        await this.createIndex(collection, 
            { "title": "text", "shortDescription": "text", "tags": "text" },
            { name: "text_search_idx" }
        );
    }

    async createBlogCategoryIndexes() {
        console.log('\n🔍 CREATING BLOG CATEGORY CRITICAL INDEXES...\n');
        
        const BlogCategory = require('../models/blogCategoryModel');
        const collection = BlogCategory.collection;
        
        // 🚨 CRITICAL: Name-based sorting (10s → <300ms target)
        await this.createIndex(collection, 
            { "name": 1 },
            { name: "name_idx" }
        );
        
        // 🚨 CRITICAL: Slug lookup
        await this.createIndex(collection, 
            { "slug": 1 },
            { name: "slug_idx", unique: true }
        );
    }

    async createCouponIndexes() {
        console.log('\n🔍 CREATING COUPON CRITICAL INDEXES...\n');
        
        try {
            const Coupon = require('../models/couponModel');
            const collection = Coupon.collection;
            
            // 🚨 CRITICAL: Store-based coupon queries
            await this.createIndex(collection, 
                { "store.id": 1, "status": 1, "expiryDate": 1 },
                { name: "store_status_expiry_idx" }
            );
            
            // 🚨 CRITICAL: Category-based coupon queries
            await this.createIndex(collection, 
                { "category.id": 1, "status": 1, "expiryDate": 1 },
                { name: "category_status_expiry_idx" }
            );
            
            // 🚨 CRITICAL: Featured coupons
            await this.createIndex(collection, 
                { "isFeatured": 1, "status": 1, "expiryDate": 1 },
                { name: "featured_status_expiry_idx" }
            );
            
        } catch (error) {
            console.log('⚠️  Coupon model not found or error creating coupon indexes:', error.message);
        }
    }

    async createStoreIndexes() {
        console.log('\n🔍 CREATING STORE CRITICAL INDEXES...\n');
        
        try {
            const Store = require('../models/storeModel');
            const collection = Store.collection;
            
            // 🚨 CRITICAL: Store name and slug lookups
            await this.createIndex(collection, 
                { "name": 1 },
                { name: "name_idx" }
            );
            
            await this.createIndex(collection, 
                { "slug": 1 },
                { name: "slug_idx", unique: true }
            );
            
            // 🚨 CRITICAL: Category-based store queries
            await this.createIndex(collection, 
                { "category.id": 1, "isActive": 1 },
                { name: "category_active_idx" }
            );
            
        } catch (error) {
            console.log('⚠️  Store model not found or error creating store indexes:', error.message);
        }
    }

    async verifyIndexes() {
        console.log('\n🔍 VERIFYING CREATED INDEXES...\n');
        
        const collections = ['blogposts', 'blogcategories', 'coupons', 'stores'];
        
        for (const collectionName of collections) {
            try {
                const collection = mongoose.connection.db.collection(collectionName);
                const indexes = await collection.indexes();
                
                console.log(`📊 ${collectionName.toUpperCase()} - ${indexes.length} indexes:`);
                indexes.forEach(index => {
                    const keys = Object.keys(index.key).map(key => 
                        `${key}:${index.key[key]}`
                    ).join(', ');
                    console.log(`   ✓ ${index.name}: { ${keys} }`);
                });
                console.log('');
                
            } catch (error) {
                console.log(`⚠️  Could not verify indexes for ${collectionName}:`, error.message);
            }
        }
    }

    async measurePerformanceImprovement() {
        console.log('\n⚡ MEASURING PERFORMANCE IMPROVEMENTS...\n');
        
        const BlogPost = require('../models/blogPostModel');
        const BlogCategory = require('../models/blogCategoryModel');
        
        const testQueries = [
            {
                name: 'Blog Categories (ALL)',
                query: () => BlogCategory.find().sort({ name: 1 }).explain('executionStats')
            },
            {
                name: 'Blogs with FrontBanner=true',
                query: () => BlogPost.find({ FrontBanner: true }).sort('-publishDate').explain('executionStats')
            },
            {
                name: 'Published Blogs (Recent)',
                query: () => BlogPost.find({ status: 'published' }).sort('-publishDate').limit(10).explain('executionStats')
            },
            {
                name: 'Featured Home Blogs',
                query: () => BlogPost.find({ isFeaturedForHome: true, status: 'published' }).sort('-publishDate').explain('executionStats')
            }
        ];

        for (const test of testQueries) {
            try {
                const startTime = Date.now();
                const result = await test.query();
                const endTime = Date.now();
                
                const executionTime = endTime - startTime;
                const stats = result.executionStats;
                
                console.log(`⚡ ${test.name}:`);
                console.log(`   ⏰ Query Time: ${executionTime}ms`);
                console.log(`   📄 Docs Examined: ${stats.totalDocsExamined}`);
                console.log(`   📋 Docs Returned: ${stats.totalDocsReturned}`);
                console.log(`   🔍 Index Used: ${result.queryPlanner.winningPlan.inputStage?.indexName || 'NONE'}`);
                console.log(`   🎯 Stage: ${result.queryPlanner.winningPlan.stage}`);
                
                if (executionTime < 500) {
                    console.log(`   ✅ PERFORMANCE TARGET MET (<500ms)`);
                } else {
                    console.log(`   ⚠️  Still needs optimization (>${executionTime}ms)`);
                }
                console.log('');
                
            } catch (error) {
                console.error(`❌ Error testing ${test.name}:`, error.message);
            }
        }
    }

    async generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = `./index-creation-report-${timestamp}.json`;
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                indexesCreated: this.indexesCreated.length,
                indexesFailed: this.indexesFailed.length,
                totalCreationTime: this.indexesCreated.reduce((sum, idx) => sum + idx.creationTime, 0)
            },
            indexesCreated: this.indexesCreated,
            indexesFailed: this.indexesFailed
        };
        
        require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Index creation report saved to: ${reportPath}`);
        
        return report;
    }

    async createAllCriticalIndexes() {
        console.log('🚀 CREATING ALL CRITICAL INDEXES FOR PERFORMANCE OPTIMIZATION...\n');
        
        await this.connect();
        
        // Create indexes for all collections
        await this.createBlogPostIndexes();
        await this.createBlogCategoryIndexes();
        await this.createCouponIndexes();
        await this.createStoreIndexes();
        
        // Verify and measure improvements
        await this.verifyIndexes();
        await this.measurePerformanceImprovement();
        await this.generateReport();
        
        console.log('\n✅ CRITICAL INDEX CREATION COMPLETED!');
        console.log(`📊 Summary:`);
        console.log(`   ✅ Indexes Created: ${this.indexesCreated.length}`);
        console.log(`   ❌ Indexes Failed: ${this.indexesFailed.length}`);
        
        if (this.indexesFailed.length > 0) {
            console.log('\n⚠️  Failed Indexes:');
            this.indexesFailed.forEach(failed => {
                console.log(`   - ${failed.collection}: ${Object.keys(failed.index).join('_')}`);
                console.log(`     Error: ${failed.error}`);
            });
        }
        
        console.log('\n🎯 Expected Performance Improvements:');
        console.log('   - blog-categories API: 10s → <300ms (97% improvement)');
        console.log('   - blogs?frontBanner=true: 9.7s → <200ms (98% improvement)');
        console.log('   - Individual blogs: 4.8s → <100ms (98% improvement)');
        
        await mongoose.connection.close();
    }
}

// Run the index creation
if (require.main === module) {
    const creator = new CriticalIndexCreator();
    creator.createAllCriticalIndexes().catch(console.error);
}

module.exports = CriticalIndexCreator;