const mongoose = require('mongoose');
require('dotenv').config();

/**
 * 🚨 CRITICAL PERFORMANCE AUDIT SCRIPT
 * Identifies slow queries, missing indexes, and performance bottlenecks
 */

class MongoDBPerformanceAuditor {
    constructor() {
        this.results = {
            slowQueries: [],
            indexAnalysis: {},
            recommendations: [],
            performanceMetrics: {}
        };
    }

    async connect() {
        try {
            await mongoose.connect(process.env.MONGO_URI, {
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 5000
            });
            console.log('✅ Connected to MongoDB for performance audit');
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            process.exit(1);
        }
    }

    async enableProfiling() {
        try {
            const db = mongoose.connection.db;
            
            // Enable profiling for operations slower than 100ms
            await db.admin().command({ profile: 2, slowms: 100 });
            console.log('✅ MongoDB profiling enabled (slowms: 100)');
            
            // Clear existing profile data
            await db.collection('system.profile').deleteMany({});
            console.log('✅ Profile collection cleared');
            
        } catch (error) {
            console.error('❌ Failed to enable profiling:', error);
        }
    }

    async analyzeIndexes() {
        console.log('\n🔍 ANALYZING DATABASE INDEXES...\n');
        
        const collections = ['blogposts', 'blogcategories', 'coupons', 'stores', 'categories'];
        
        for (const collectionName of collections) {
            try {
                const collection = mongoose.connection.db.collection(collectionName);
                
                // Get existing indexes
                const indexes = await collection.indexes();
                
                // Get collection stats
                const stats = await collection.stats();
                
                this.results.indexAnalysis[collectionName] = {
                    indexes: indexes,
                    documentCount: stats.count,
                    avgDocSize: stats.avgObjSize,
                    totalSize: stats.size,
                    indexSize: stats.totalIndexSize
                };
                
                console.log(`📊 ${collectionName.toUpperCase()}:`);
                console.log(`   Documents: ${stats.count.toLocaleString()}`);
                console.log(`   Avg Doc Size: ${Math.round(stats.avgObjSize)} bytes`);
                console.log(`   Total Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
                console.log(`   Indexes: ${indexes.length}`);
                
                indexes.forEach(index => {
                    const keys = Object.keys(index.key).join(', ');
                    console.log(`     - ${keys} ${index.unique ? '(UNIQUE)' : ''}`);
                });
                console.log('');
                
            } catch (error) {
                console.error(`❌ Error analyzing ${collectionName}:`, error.message);
            }
        }
    }

    async simulateSlowQueries() {
        console.log('\n🚨 SIMULATING CRITICAL SLOW QUERIES...\n');
        
        const BlogPost = require('../models/blogPostModel');
        const BlogCategory = require('../models/blogCategoryModel');
        
        const queries = [
            {
                name: 'Blog Categories (ALL)',
                operation: () => BlogCategory.find().sort({ name: 1 })
            },
            {
                name: 'Blogs with FrontBanner=true',
                operation: () => BlogPost.find({ FrontBanner: true }).sort('-publishDate')
            },
            {
                name: 'Published Blogs (Recent)',
                operation: () => BlogPost.find({ status: 'published' }).sort('-publishDate').limit(10)
            },
            {
                name: 'Blog by Category (No Index)',
                operation: () => BlogPost.find({ 'category.name': 'Technology' }).sort('-publishDate')
            },
            {
                name: 'Featured Home Blogs',
                operation: () => BlogPost.find({ isFeaturedForHome: true, status: 'published' }).sort('-publishDate')
            },
            {
                name: 'Text Search (No Index)',
                operation: () => BlogPost.find({ $text: { $search: 'coupon discount' } })
            }
        ];

        for (const query of queries) {
            try {
                console.log(`⏱️  Testing: ${query.name}`);
                
                const startTime = Date.now();
                const result = await query.operation().explain('executionStats');
                const endTime = Date.now();
                
                const executionTime = endTime - startTime;
                const executionStats = result.executionStats;
                
                const queryResult = {
                    name: query.name,
                    executionTime,
                    totalDocsExamined: executionStats.totalDocsExamined,
                    totalDocsReturned: executionStats.totalDocsReturned,
                    indexesUsed: result.queryPlanner.winningPlan.inputStage?.indexName || 'NONE',
                    stage: result.queryPlanner.winningPlan.stage,
                    isSlowQuery: executionTime > 500
                };
                
                this.results.slowQueries.push(queryResult);
                
                console.log(`   ⏰ Execution Time: ${executionTime}ms`);
                console.log(`   📄 Docs Examined: ${executionStats.totalDocsExamined.toLocaleString()}`);
                console.log(`   📋 Docs Returned: ${executionStats.totalDocsReturned.toLocaleString()}`);
                console.log(`   🔍 Index Used: ${queryResult.indexesUsed}`);
                console.log(`   🎯 Stage: ${queryResult.stage}`);
                
                if (queryResult.isSlowQuery) {
                    console.log(`   🚨 SLOW QUERY DETECTED!`);
                }
                console.log('');
                
            } catch (error) {
                console.error(`❌ Error testing ${query.name}:`, error.message);
            }
        }
    }

    async analyzeProfiledQueries() {
        console.log('\n📊 ANALYZING PROFILED QUERIES...\n');
        
        try {
            const db = mongoose.connection.db;
            const profileData = await db.collection('system.profile')
                .find({})
                .sort({ ts: -1 })
                .limit(20)
                .toArray();
            
            if (profileData.length === 0) {
                console.log('⚠️  No profiled queries found. Run some operations first.');
                return;
            }
            
            console.log(`📈 Found ${profileData.length} profiled operations:\n`);
            
            profileData.forEach((op, index) => {
                console.log(`${index + 1}. ${op.command?.find || op.command?.aggregate || 'Unknown'}`);
                console.log(`   Duration: ${op.millis}ms`);
                console.log(`   Namespace: ${op.ns}`);
                console.log(`   Timestamp: ${new Date(op.ts).toISOString()}`);
                
                if (op.planSummary) {
                    console.log(`   Plan: ${op.planSummary}`);
                }
                
                if (op.millis > 1000) {
                    console.log(`   🚨 CRITICAL: >1 second execution time!`);
                }
                console.log('');
            });
            
        } catch (error) {
            console.error('❌ Error analyzing profiled queries:', error);
        }
    }

    generateRecommendations() {
        console.log('\n💡 PERFORMANCE RECOMMENDATIONS:\n');
        
        // Analyze slow queries and generate recommendations
        const slowQueries = this.results.slowQueries.filter(q => q.isSlowQuery);
        
        if (slowQueries.length > 0) {
            console.log('🚨 CRITICAL ISSUES FOUND:');
            slowQueries.forEach(query => {
                console.log(`\n❌ ${query.name}:`);
                console.log(`   - Execution Time: ${query.executionTime}ms`);
                console.log(`   - Documents Examined: ${query.totalDocsExamined.toLocaleString()}`);
                console.log(`   - Index Used: ${query.indexesUsed}`);
                
                // Generate specific recommendations
                if (query.indexesUsed === 'NONE') {
                    console.log(`   💡 RECOMMENDATION: Add compound index for this query pattern`);
                }
                
                if (query.totalDocsExamined > query.totalDocsReturned * 10) {
                    console.log(`   💡 RECOMMENDATION: Query is examining too many documents - optimize filtering`);
                }
            });
        }
        
        console.log('\n🎯 SPECIFIC INDEX RECOMMENDATIONS:');
        console.log('');
        console.log('1. BlogPost Collection:');
        console.log('   db.blogposts.createIndex({ "FrontBanner": 1, "status": 1, "publishDate": -1 })');
        console.log('   db.blogposts.createIndex({ "isFeaturedForHome": 1, "status": 1, "publishDate": -1 })');
        console.log('   db.blogposts.createIndex({ "category.id": 1, "status": 1, "publishDate": -1 })');
        console.log('   db.blogposts.createIndex({ "store.id": 1, "status": 1, "publishDate": -1 })');
        console.log('');
        console.log('2. BlogCategory Collection:');
        console.log('   db.blogcategories.createIndex({ "name": 1 })');
        console.log('   db.blogcategories.createIndex({ "slug": 1 })');
        console.log('');
        console.log('3. Query Optimization:');
        console.log('   - Use .lean() for read-only operations');
        console.log('   - Implement field projection to reduce data transfer');
        console.log('   - Add pagination to limit result sets');
        console.log('   - Use aggregation pipelines with $match early in pipeline');
    }

    async generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = `./mongodb-performance-audit-${timestamp}.json`;
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalSlowQueries: this.results.slowQueries.filter(q => q.isSlowQuery).length,
                averageQueryTime: this.results.slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / this.results.slowQueries.length,
                collectionsAnalyzed: Object.keys(this.results.indexAnalysis).length
            },
            ...this.results
        };
        
        require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        return report;
    }

    async runFullAudit() {
        console.log('🚀 STARTING MONGODB PERFORMANCE AUDIT...\n');
        
        await this.connect();
        await this.enableProfiling();
        await this.analyzeIndexes();
        await this.simulateSlowQueries();
        await this.analyzeProfiledQueries();
        this.generateRecommendations();
        await this.generateReport();
        
        console.log('\n✅ PERFORMANCE AUDIT COMPLETED!');
        console.log('🎯 Next Steps:');
        console.log('   1. Review the generated recommendations');
        console.log('   2. Create the suggested indexes');
        console.log('   3. Optimize slow queries');
        console.log('   4. Re-run this audit to measure improvements');
        
        await mongoose.connection.close();
    }
}

// Run the audit
if (require.main === module) {
    const auditor = new MongoDBPerformanceAuditor();
    auditor.runFullAudit().catch(console.error);
}

module.exports = MongoDBPerformanceAuditor;