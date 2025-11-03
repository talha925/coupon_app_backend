/**
 * 🧪 WebSocket Client Test
 * Tests real-time notifications for store and coupon updates
 * 
 * Usage:
 * 1. Start the backend server with WS_ENABLED=true
 * 2. Run: node websocket-client-test.js
 * 3. Perform CRUD operations on stores/coupons via API
 * 4. Watch real-time notifications in this console
 */

const WebSocket = require('ws');
const axios = require('axios');

class WebSocketTester {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.messageCount = 0;
        this.receivedMessages = [];
        
        // Configuration
        this.config = {
            wsUrl: process.env.WS_URL || 'ws://localhost:8080/ws',
            apiUrl: process.env.API_URL || 'http://localhost:5000/api',
            testDuration: 30000, // 30 seconds
            reconnectAttempts: 3,
            reconnectDelay: 2000
        };
    }

    async connect() {
        return new Promise((resolve, reject) => {
            console.log(`🔌 Connecting to WebSocket: ${this.config.wsUrl}`);
            
            this.ws = new WebSocket(this.config.wsUrl);
            
            this.ws.on('open', () => {
                this.connected = true;
                console.log('✅ WebSocket connected successfully');
                console.log('📡 Listening for real-time notifications...\n');
                resolve();
            });
            
            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });
            
            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error.message);
                reject(error);
            });
            
            this.ws.on('close', (code, reason) => {
                this.connected = false;
                console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
            });
            
            // Connection timeout
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        });
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());
            this.messageCount++;
            this.receivedMessages.push({
                timestamp: new Date().toISOString(),
                message
            });
            
            console.log(`📨 Message #${this.messageCount}:`);
            console.log(`   Message Type: ${message.type}`);
            
            // Handle store_update messages
            if (message.type === 'store_update') {
                console.log(`   Store ID: ${message.storeId}`);
                console.log(`   Operation: ${message.type} (${message.data?.name || 'Unknown Store'})`);
                console.log(`   Force Refresh: ${message.forceRefresh}`);
                console.log(`   Cache Invalidated: ${message.cacheInvalidated}`);
                console.log(`   Version: ${message.version}`);
                
                if (message.data) {
                    console.log(`   Store Data:`, JSON.stringify({
                        _id: message.data._id,
                        name: message.data.name,
                        slug: message.data.slug,
                        updatedAt: message.data.updatedAt,
                        isTopStore: message.data.isTopStore,
                        isEditorsChoice: message.data.isEditorsChoice
                    }, null, 6));
                }
            }
            // Handle coupon_update messages  
            else if (message.type === 'coupon_update') {
                console.log(`   Coupon ID: ${message.couponId}`);
                console.log(`   Store ID: ${message.storeId}`);
                console.log(`   Operation: ${message.type}`);
            }
            // Handle other message types
            else {
                console.log(`   Action: ${message.action || 'N/A'}`);
                console.log(`   ID: ${message.id || message.storeId || message.couponId || 'N/A'}`);
                
                if (message.data) {
                    console.log(`   Data:`, JSON.stringify(message.data, null, 6));
                }
            }
            
            console.log(`   Timestamp: ${message.timestamp}`);
            console.log('─'.repeat(50));
            
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error.message);
            console.log('Raw message:', data.toString());
        }
    }

    async testStoreOperations() {
        console.log('\n🏪 Testing Store Operations...');
        
        try {
            // First create a category to use
            console.log('Creating test category...');
            let categoryId;
            try {
                const categoryResponse = await axios.post(`${this.config.apiUrl}/categories`, {
                    name: 'Test Category for WebSocket'
                });
                categoryId = categoryResponse.data.data.id;
                console.log(`✅ Category created with ID: ${categoryId}`);
            } catch (error) {
                // If category already exists, use a default ObjectId format
                categoryId = '507f1f77bcf86cd799439011'; // Valid ObjectId format
                console.log(`⚠️ Using default category ID: ${categoryId}`);
            }
            
            // Test store creation with proper data
            console.log('Creating test store...');
            const createResponse = await axios.post(`${this.config.apiUrl}/stores`, {
                name: 'WebSocket Test Store ' + Date.now(),
                trackingUrl: 'https://example.com?ref=test',
                short_description: 'Test store for WebSocket notifications',
                long_description: 'This is a detailed test store created to verify WebSocket notifications work correctly. It includes all required fields for proper validation.',
                image: {
                    url: 'https://example.com/image.jpg',
                    alt: 'Test Store Image'
                },
                categories: [categoryId],
                seo: {
                    meta_title: 'Test Store - WebSocket Testing',
                    meta_description: 'Test store for WebSocket real-time notifications',
                    meta_keywords: 'test, websocket, store'
                },
                language: 'English',
                isTopStore: true,
                isEditorsChoice: false,
                heading: 'Coupons & Promo Codes'
            });
            
            const storeId = createResponse.data.data._id;
            console.log(`✅ Store created with ID: ${storeId}`);
            
            // Wait for WebSocket notification
            await this.wait(2000);
            
            // Test store update
            console.log('Updating test store...');
            await axios.put(`${this.config.apiUrl}/stores/${storeId}`, {
                name: 'Updated WebSocket Test Store',
                isEditorsChoice: true
            });
            console.log('✅ Store updated');
            
            // Wait for WebSocket notification
            await this.wait(2000);
            
            // Test store deletion
            console.log('Deleting test store...');
            await axios.delete(`${this.config.apiUrl}/stores/${storeId}`);
            console.log('✅ Store deleted');
            
            // Wait for WebSocket notification
            await this.wait(2000);
            
        } catch (error) {
            console.error('❌ Store operation error:', error.response?.data || error.message);
        }
    }

    async testCouponOperations() {
        console.log('\n🎫 Testing Coupon Operations...');
        
        try {
            // First, we need a store for the coupon
            const storeResponse = await axios.post(`${this.config.apiUrl}/stores`, {
                name: 'Coupon Test Store',
                trackingUrl: 'https://coupon-test.com',
                short_description: 'Store for coupon testing',
                categories: ['fashion'],
                language: 'en'
            });
            
            const storeId = storeResponse.data.data._id;
            console.log(`✅ Created test store for coupons: ${storeId}`);
            
            // Wait for store creation notification
            await this.wait(2000);
            
            // Test coupon creation
            console.log('Creating test coupon...');
            const createResponse = await axios.post(`${this.config.apiUrl}/coupons`, {
                title: 'WebSocket Test Coupon',
                description: 'Test coupon for WebSocket notifications',
                code: 'WSTEST50',
                discount: 50,
                type: 'percentage',
                store: storeId,
                active: true,
                expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            });
            
            const couponId = createResponse.data.data._id;
            console.log(`✅ Coupon created with ID: ${couponId}`);
            
            // Wait for WebSocket notification
            await this.wait(2000);
            
            // Test coupon update
            console.log('Updating test coupon...');
            await axios.put(`${this.config.apiUrl}/coupons/${couponId}`, {
                title: 'Updated WebSocket Test Coupon',
                discount: 75
            });
            console.log('✅ Coupon updated');
            
            // Wait for WebSocket notification
            await this.wait(2000);
            
            // Test coupon deletion
            console.log('Deleting test coupon...');
            await axios.delete(`${this.config.apiUrl}/coupons/${couponId}`);
            console.log('✅ Coupon deleted');
            
            // Wait for WebSocket notification
            await this.wait(2000);
            
            // Clean up: delete the test store
            await axios.delete(`${this.config.apiUrl}/stores/${storeId}`);
            console.log('✅ Test store cleaned up');
            
        } catch (error) {
            console.error('❌ Coupon operation error:', error.response?.data || error.message);
        }
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runTests() {
        try {
            await this.connect();
            
            console.log('🚀 Starting WebSocket notification tests...\n');
            
            // Run store tests
            await this.testStoreOperations();
            
            // Run coupon tests
            await this.testCouponOperations();
            
            console.log('\n⏱️ Waiting for any remaining notifications...');
            await this.wait(5000);
            
            this.printSummary();
            
        } catch (error) {
            console.error('❌ Test execution error:', error.message);
        } finally {
            this.disconnect();
        }
    }

    printSummary() {
        console.log('\n📊 Test Summary:');
        console.log(`   Total messages received: ${this.messageCount}`);
        console.log(`   Connection status: ${this.connected ? 'Connected' : 'Disconnected'}`);
        
        if (this.receivedMessages.length > 0) {
            console.log('\n📋 Message Types Received:');
            const messageTypes = {};
            this.receivedMessages.forEach(msg => {
                const key = `${msg.message.type}:${msg.message.action}`;
                messageTypes[key] = (messageTypes[key] || 0) + 1;
            });
            
            Object.entries(messageTypes).forEach(([type, count]) => {
                console.log(`   ${type}: ${count} messages`);
            });
        }
        
        console.log('\n✅ WebSocket test completed!');
    }

    disconnect() {
        if (this.ws && this.connected) {
            this.ws.close();
            console.log('🔌 WebSocket connection closed');
        }
    }
}

// Run the test
async function main() {
    console.log('🧪 WebSocket Client Test Starting...');
    console.log('Make sure your backend server is running with WS_ENABLED=true\n');
    
    const tester = new WebSocketTester();
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n⚠️ Test interrupted by user');
        tester.disconnect();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('\n⚠️ Test terminated');
        tester.disconnect();
        process.exit(0);
    });
    
    await tester.runTests();
}

// Check if this file is being run directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });
}

module.exports = WebSocketTester;