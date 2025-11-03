const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_STORE = {
    name: 'Cache Test Store',
    slug: 'cache-test-store',
    short_description: 'Testing cache invalidation',
    long_description: 'This store is used to test cache invalidation functionality',
    trackingUrl: 'https://cache-test.com',
    categories: [],
    language: 'English',
    isTopStore: false,
    isEditorsChoice: false,
    heading: 'Coupons & Promo Codes',
    image: {
        url: 'https://example.com/test-image.jpg',
        alt: 'Test Store Logo'
    },
    seo: {
        meta_title: 'Cache Test Store',
        meta_description: 'Testing cache invalidation functionality',
        meta_keywords: 'test, cache, store'
    }
};

class CacheInvalidationTester {
    constructor() {
        this.testStoreId = null;
    }

    async createTestStore() {
        try {
            console.log('🏪 Creating test store...');
            const response = await axios.post(`${BASE_URL}/api/stores`, TEST_STORE);
            
            if (response.status === 201) {
                this.testStoreId = response.data.data.store._id;
                console.log(`✅ Test store created with ID: ${this.testStoreId}`);
                console.log('📊 Creation results:', {
                    hasAtomicResults: !!response.data.data.atomicUpdateResults,
                    cacheResult: response.data.data.atomicUpdateResults?.cache?.success,
                    websocketResult: response.data.data.atomicUpdateResults?.websocket?.success,
                    revalidationResult: response.data.data.atomicUpdateResults?.revalidation?.success
                });
                return response.data;
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error creating test store:', error.response?.data || error.message);
            throw error;
        }
    }

    async testCacheInvalidation() {
        try {
            console.log('\n🔍 Testing cache invalidation sequence...');
            
            // Step 1: First request - should hit database and cache the result
            console.log('📥 Step 1: First GET request (cache miss expected)...');
            const start1 = Date.now();
            const response1 = await axios.get(`${BASE_URL}/api/stores/${this.testStoreId}`);
            const time1 = Date.now() - start1;
            console.log(`   ⏱️ Response time: ${time1}ms`);
            console.log(`   📝 Store name: ${response1.data.data.name}`);
            
            // Step 2: Second request - should hit cache (faster)
            console.log('📥 Step 2: Second GET request (cache hit expected)...');
            const start2 = Date.now();
            const response2 = await axios.get(`${BASE_URL}/api/stores/${this.testStoreId}`);
            const time2 = Date.now() - start2;
            console.log(`   ⏱️ Response time: ${time2}ms`);
            console.log(`   📝 Store name: ${response2.data.data.name}`);
            
            // Step 3: Update the store (should trigger atomic update chain)
            console.log('🔄 Step 3: Updating store (atomic update chain)...');
            const updateData = {
                name: 'Updated Cache Test Store',
                short_description: 'Updated description for cache testing',
                isTopStore: true
            };

            const updateStart = Date.now();
            const updateResponse = await axios.put(`${BASE_URL}/api/stores/${this.testStoreId}`, updateData);
            const updateTime = Date.now() - updateStart;
            console.log(`   ⏱️ Update time: ${updateTime}ms`);
            
            if (updateResponse.data.atomicUpdateResults) {
                const results = updateResponse.data.atomicUpdateResults;
                console.log('   📊 Atomic update results:');
                console.log(`      💾 Database: ${results.database?.success ? '✅' : '❌'}`);
                console.log(`      🗑️ Cache: ${results.cache?.success ? '✅' : '❌'} (${results.cache?.totalDeleted || 0} keys deleted)`);
                console.log(`      📡 WebSocket: ${results.websocket?.success ? '✅' : '❌'}`);
                console.log(`      🔄 Revalidation: ${results.revalidation?.success ? '✅' : '❌'}`);
            }
            
            // Step 4: Third request - should hit database again due to cache invalidation
            console.log('📥 Step 4: Third GET request (cache miss expected after update)...');
            const start3 = Date.now();
            const response3 = await axios.get(`${BASE_URL}/api/stores/${this.testStoreId}`);
            const time3 = Date.now() - start3;
            console.log(`   ⏱️ Response time: ${time3}ms`);
            console.log(`   📝 Store name: ${response3.data.data.name}`);
            
            // Step 5: Fourth request - should hit cache again
            console.log('📥 Step 5: Fourth GET request (cache hit expected)...');
            const start4 = Date.now();
            const response4 = await axios.get(`${BASE_URL}/api/stores/${this.testStoreId}`);
            const time4 = Date.now() - start4;
            console.log(`   ⏱️ Response time: ${time4}ms`);
            console.log(`   📝 Store name: ${response4.data.data.name}`);
            
            return {
                times: { time1, time2, time3, time4 },
                names: {
                    before: response1.data.data.name,
                    cached: response2.data.data.name,
                    afterUpdate: response3.data.data.name,
                    cachedAgain: response4.data.data.name
                },
                atomicResults: updateResponse.data.data?.atomicUpdateResults
            };
        } catch (error) {
            console.error('❌ Error testing cache invalidation:', error.response?.data || error.message);
            throw error;
        }
    }

    async deleteTestStore() {
        try {
            if (!this.testStoreId) return;
            
            console.log('\n🗑️ Deleting test store...');
            const response = await axios.delete(`${BASE_URL}/api/stores/${this.testStoreId}`);
            
            if (response.status === 200) {
                console.log('✅ Test store deleted successfully');
                return response.data;
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error deleting test store:', error.response?.data || error.message);
            throw error;
        }
    }

    async runTest() {
        try {
            console.log('🚀 Starting Cache Invalidation Test...\n');

            // Step 1: Create test store
            await this.createTestStore();

            // Step 2: Test cache invalidation
            const results = await this.testCacheInvalidation();

            // Step 3: Delete test store
            await this.deleteTestStore();

            // Step 4: Analyze results
            this.analyzeResults(results);

        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    analyzeResults(results) {
        console.log('\n📊 TEST RESULTS ANALYSIS');
        console.log('========================');
        
        const { times, names, atomicResults } = results;
        
        console.log('⏱️ Response Times:');
        console.log(`   1st request (cache miss): ${times.time1}ms`);
        console.log(`   2nd request (cache hit): ${times.time2}ms`);
        console.log(`   3rd request (after update): ${times.time3}ms`);
        console.log(`   4th request (cache hit): ${times.time4}ms`);
        
        console.log('\n📝 Store Names:');
        console.log(`   Before update: "${names.before}"`);
        console.log(`   After update: "${names.afterUpdate}"`);
        
        // Analyze cache performance
        const cacheSpeedup1 = times.time1 / times.time2;
        const cacheSpeedup2 = times.time3 / times.time4;
        
        console.log('\n🚀 Cache Performance:');
        console.log(`   Cache speedup (1st vs 2nd): ${cacheSpeedup1.toFixed(2)}x`);
        console.log(`   Cache speedup (3rd vs 4th): ${cacheSpeedup2.toFixed(2)}x`);
        
        // Verify atomic update chain
        console.log('\n✅ ATOMIC UPDATE CHAIN VERIFICATION:');
        if (atomicResults) {
            console.log(`   💾 Database update: ${atomicResults.database?.success ? '✅' : '❌'}`);
            console.log(`   🗑️ Cache invalidation: ${atomicResults.cache?.success ? '✅' : '❌'} (${atomicResults.cache?.totalDeleted || 0} keys)`);
            console.log(`   📡 WebSocket notification: ${atomicResults.websocket?.success ? '✅' : '❌'}`);
            console.log(`   🔄 Frontend revalidation: ${atomicResults.revalidation?.success ? '✅' : '❌'}`);
        } else {
            console.log('   ❌ No atomic update results found');
        }
        
        // Overall assessment
        const nameChanged = names.before !== names.afterUpdate;
        const cacheWorking = cacheSpeedup1 > 1.5 && cacheSpeedup2 > 1.5;
        const atomicWorking = atomicResults?.database?.success && atomicResults?.cache?.success;
        
        console.log('\n🎯 OVERALL ASSESSMENT:');
        console.log(`   📝 Data update: ${nameChanged ? '✅' : '❌'}`);
        console.log(`   🚀 Cache performance: ${cacheWorking ? '✅' : '❌'}`);
        console.log(`   ⚛️ Atomic updates: ${atomicWorking ? '✅' : '❌'}`);
        
        const allPassed = nameChanged && cacheWorking && atomicWorking;
        console.log(`\n🏆 FINAL RESULT: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (allPassed) {
            console.log('🎉 Cache invalidation and atomic updates are working correctly!');
        } else {
            console.log('⚠️ Some issues detected with cache or atomic updates.');
        }
    }
}

// Run the test
const tester = new CacheInvalidationTester();
tester.runTest().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});