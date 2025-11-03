const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:8080/ws';

// Test configuration
const TEST_STORE = {
    name: 'Test Atomic Store',
    slug: 'test-atomic-store',
    short_description: 'Testing atomic updates',
    long_description: 'This store is used to test atomic update functionality',
    trackingUrl: 'https://test-atomic.com',
    categories: [],
    language: 'English',
    isTopStore: false,
    isEditorsChoice: false,
    heading: 'Coupons & Promo Codes',
    image: {
        url: 'https://example.com/test-atomic-image.jpg',
        alt: 'Test Atomic Store Logo'
    },
    seo: {
        meta_title: 'Test Atomic Store',
        meta_description: 'Testing atomic update functionality',
        meta_keywords: 'test, atomic, store'
    }
};

class AtomicUpdateTester {
    constructor() {
        this.ws = null;
        this.receivedMessages = [];
        this.testStoreId = null;
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(WS_URL);
            
            this.ws.on('open', () => {
                console.log('✅ WebSocket connected');
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log('📨 WebSocket message received:', {
                        type: message.type,
                        storeId: message.storeId,
                        action: message.action,
                        timestamp: message.timestamp
                    });
                    this.receivedMessages.push(message);
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('🔌 WebSocket disconnected');
            });
        });
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

    async updateTestStore() {
        try {
            console.log('🔄 Updating test store...');
            const updateData = {
                name: 'Updated Atomic Store',
                short_description: 'Updated description for atomic testing',
                isTopStore: true
            };

            const response = await axios.put(`${BASE_URL}/api/stores/${this.testStoreId}`, updateData);
            
            if (response.status === 200) {
                console.log('✅ Test store updated successfully');
                console.log('📊 Atomic update results:', response.data.data?.atomicUpdateResults);
                return response.data;
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error updating test store:', error.response?.data || error.message);
            throw error;
        }
    }

    async testCacheInvalidation() {
        try {
            console.log('🔍 Testing cache invalidation...');
            
            // First request - should hit database and cache the result
            const response1 = await axios.get(`${BASE_URL}/api/stores/${this.testStoreId}`);
            console.log('📥 First request completed (cache miss expected)');
            
            // Second request - should hit cache
            const response2 = await axios.get(`${BASE_URL}/api/stores/${this.testStoreId}`);
            console.log('📥 Second request completed (cache hit expected)');
            
            // Update the store (should invalidate cache)
            await this.updateTestStore();
            
            // Third request - should hit database again due to cache invalidation
            const response3 = await axios.get(`${BASE_URL}/api/stores/${this.testStoreId}`);
            console.log('📥 Third request completed (cache miss expected after update)');
            
            return {
                beforeUpdate: response1.data,
                cachedResult: response2.data,
                afterUpdate: response3.data
            };
        } catch (error) {
            console.error('❌ Error testing cache invalidation:', error.response?.data || error.message);
            throw error;
        }
    }

    async deleteTestStore() {
        try {
            if (!this.testStoreId) return;
            
            console.log('🗑️ Deleting test store...');
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

    async runFullTest() {
        try {
            console.log('🚀 Starting Atomic Update Chain Test...\n');

            // Step 1: Connect WebSocket
            await this.connectWebSocket();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection

            // Step 2: Create test store
            await this.createTestStore();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for WebSocket messages

            // Step 3: Test cache invalidation
            await this.testCacheInvalidation();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for WebSocket messages

            // Step 4: Delete test store
            await this.deleteTestStore();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for WebSocket messages

            // Step 5: Analyze results
            this.analyzeResults();

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    analyzeResults() {
        console.log('\n📊 TEST RESULTS ANALYSIS');
        console.log('========================');
        
        console.log(`📨 Total WebSocket messages received: ${this.receivedMessages.length}`);
        
        // Filter for store-specific messages with correct type
        const storeMessages = this.receivedMessages.filter(msg => 
            msg.storeId === this.testStoreId && 
            ['created', 'updated', 'deleted'].includes(msg.type)
        );
        
        console.log(`🏪 Store-specific messages: ${storeMessages.length}`);
        
        storeMessages.forEach((msg, index) => {
            console.log(`   ${index + 1}. Type: ${msg.type}, Timestamp: ${msg.timestamp}`);
        });

        // Check if we received expected messages
        const hasCreateMessage = storeMessages.some(msg => msg.type === 'created');
        const hasUpdateMessage = storeMessages.some(msg => msg.type === 'updated');
        const hasDeleteMessage = storeMessages.some(msg => msg.type === 'deleted');

        console.log('\n✅ ATOMIC UPDATE CHAIN VERIFICATION:');
        console.log(`   📝 Create notification: ${hasCreateMessage ? '✅' : '❌'}`);
        console.log(`   🔄 Update notification: ${hasUpdateMessage ? '✅' : '❌'}`);
        console.log(`   🗑️ Delete notification: ${hasDeleteMessage ? '✅' : '❌'}`);

        const allPassed = hasCreateMessage && hasUpdateMessage && hasDeleteMessage;
        console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (allPassed) {
            console.log('🎉 Atomic update chain is working correctly!');
        } else {
            console.log('⚠️ Some atomic update notifications may be missing.');
        }
    }
}

// Run the test
const tester = new AtomicUpdateTester();
tester.runFullTest().then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});