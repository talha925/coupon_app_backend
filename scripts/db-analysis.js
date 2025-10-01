/**
 * Database Analysis Script for Performance Optimization
 * Run with: node scripts/db-analysis.js
 */

const mongoose = require('mongoose');

// Connect to MongoDB
async function connectDB() {
    try {
        // Use the same connection string as the main app
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/couponDB';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB for analysis');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Analyze current indexes
async function analyzeIndexes() {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('blogposts');
        
        console.log('\n📊 CURRENT INDEXES:');
        console.log('==================');
        const indexes = await collection.indexes();
        indexes.forEach((index, i) => {
            console.log(`${i + 1}. ${JSON.stringify(index.key)} - ${index.name}`);
        });
        
        return indexes;
    } catch (error) {
        console.error('❌ Error analyzing indexes:', error);
        return [];
    }
}

// Analyze query performance BEFORE optimization
async function analyzeQueryPerformance() {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('blogposts');
        
        console.log('\n🔍 QUERY PERFORMANCE ANALYSIS (BEFORE):');
        console.log('=====================================');
        
        // Test query: frontBanner blogs with publishDate sort
        const query = { FrontBanner: true };
        const sort = { publishDate: -1 };
        
        console.log('Query:', JSON.stringify(query));
        console.log('Sort:', JSON.stringify(sort));
        
        const explainResult = await collection.find(query).sort(sort).limit(10).explain('executionStats');
        
        console.log('\n📈 EXECUTION STATS:');
        console.log('- Execution Time:', explainResult.executionStats.executionTimeMillis, 'ms');
        console.log('- Documents Examined:', explainResult.executionStats.totalDocsExamined);
        console.log('- Documents Returned:', explainResult.executionStats.totalDocsReturned);
        console.log('- Index Used:', explainResult.executionStats.executionStages.indexName || 'NONE (Collection Scan)');
        
        // Save full explain output
        console.log('\n📋 FULL EXPLAIN OUTPUT:');
        console.log(JSON.stringify(explainResult, null, 2));
        
        return explainResult;
    } catch (error) {
        console.error('❌ Error analyzing query performance:', error);
        return null;
    }
}

// Create the recommended compound index
async function createOptimizedIndex() {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('blogposts');
        
        console.log('\n🔧 CREATING OPTIMIZED INDEX:');
        console.log('============================');
        
        const indexSpec = { FrontBanner: 1, publishDate: -1 };
        const indexOptions = { 
            name: 'frontBanner_publishDate_compound',
            background: true // Safe for production
        };
        
        console.log('Index Specification:', JSON.stringify(indexSpec));
        console.log('Index Options:', JSON.stringify(indexOptions));
        
        const result = await collection.createIndex(indexSpec, indexOptions);
        console.log('✅ Index created successfully:', result);
        
        return result;
    } catch (error) {
        if (error.code === 85) {
            console.log('ℹ️ Index already exists, skipping creation');
            return 'already_exists';
        }
        console.error('❌ Error creating index:', error);
        return null;
    }
}

// Analyze query performance AFTER optimization
async function analyzeOptimizedPerformance() {
    try {
        const db = mongoose.connection.db;
        const collection = db.collection('blogposts');
        
        console.log('\n🚀 QUERY PERFORMANCE ANALYSIS (AFTER):');
        console.log('====================================');
        
        // Same test query
        const query = { FrontBanner: true };
        const sort = { publishDate: -1 };
        
        const explainResult = await collection.find(query).sort(sort).limit(10).explain('executionStats');
        
        console.log('\n📈 OPTIMIZED EXECUTION STATS:');
        console.log('- Execution Time:', explainResult.executionStats.executionTimeMillis, 'ms');
        console.log('- Documents Examined:', explainResult.executionStats.totalDocsExamined);
        console.log('- Documents Returned:', explainResult.executionStats.totalDocsReturned);
        console.log('- Index Used:', explainResult.executionStats.executionStages.indexName || 'NONE');
        
        console.log('\n📋 OPTIMIZED EXPLAIN OUTPUT:');
        console.log(JSON.stringify(explainResult, null, 2));
        
        return explainResult;
    } catch (error) {
        console.error('❌ Error analyzing optimized performance:', error);
        return null;
    }
}

// Main analysis function
async function runAnalysis() {
    console.log('🔍 Starting Database Performance Analysis...\n');
    
    await connectDB();
    
    // Step 1: Analyze current indexes
    const currentIndexes = await analyzeIndexes();
    
    // Step 2: Analyze current query performance
    const beforeStats = await analyzeQueryPerformance();
    
    // Step 3: Create optimized index
    const indexResult = await createOptimizedIndex();
    
    // Step 4: Analyze optimized performance
    const afterStats = await analyzeOptimizedPerformance();
    
    // Step 5: Performance comparison
    if (beforeStats && afterStats) {
        console.log('\n📊 PERFORMANCE COMPARISON:');
        console.log('=========================');
        console.log('Before Optimization:');
        console.log('- Execution Time:', beforeStats.executionStats.executionTimeMillis, 'ms');
        console.log('- Documents Examined:', beforeStats.executionStats.totalDocsExamined);
        
        console.log('\nAfter Optimization:');
        console.log('- Execution Time:', afterStats.executionStats.executionTimeMillis, 'ms');
        console.log('- Documents Examined:', afterStats.executionStats.totalDocsExamined);
        
        const timeDiff = beforeStats.executionStats.executionTimeMillis - afterStats.executionStats.executionTimeMillis;
        const examDiff = beforeStats.executionStats.totalDocsExamined - afterStats.executionStats.totalDocsExamined;
        
        console.log('\nImprovement:');
        console.log('- Time Saved:', timeDiff, 'ms');
        console.log('- Documents Scan Reduction:', examDiff);
    }
    
    console.log('\n✅ Analysis Complete');
    await mongoose.disconnect();
}

// Run the analysis
if (require.main === module) {
    runAnalysis().catch(console.error);
}

module.exports = { runAnalysis, analyzeIndexes, analyzeQueryPerformance, createOptimizedIndex };