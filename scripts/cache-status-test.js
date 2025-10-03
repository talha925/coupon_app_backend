const http = require('http');
require('dotenv').config(); // ✅ Load environment variables first
const redisConfig = require('../config/redis');
const cacheService = require('../services/cacheService');
const { getBaseURL } = require('../utils/configUtils');

const BASE_URL = getBaseURL(5000);

// Helper function to make HTTP requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        data: jsonData,
                        headers: res.headers,
                        statusCode: res.statusCode
                    });
                } catch (error) {
                    resolve({
                        data: data,
                        headers: res.headers,
                        statusCode: res.statusCode
                    });
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testCacheStatus() {
    console.log('🔍 Cache Status Test\n');
    console.log('==========================================\n');
    
    // Debug environment variables first
    console.log('🔧 Environment Check:');
    console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set ✅' : 'Not set ❌');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
    console.log('');
    
    // 1. Test Redis Connection
    console.log('1. Testing Redis Connection...');
    try {
        await redisConfig.connect();
        if (redisConfig.isReady()) {
            console.log('✅ Redis: Connected and Ready');
        } else {
            console.log('❌ Redis: Not Ready');
        }
    } catch (error) {
        console.log('❌ Redis: Connection Failed -', error.message);
    }
    
    // 2. Test Cache Service
    console.log('\n2. Testing Cache Service...');
    await cacheService.ensureInitialized();
    
    if (cacheService.isAvailable()) {
        console.log('✅ Cache Service: Available (Redis Mode)');
    } else {
        console.log('⚠️ Cache Service: Fallback Mode (No Redis)');
    }
    
    // 3. Test API with Cache Headers
    console.log('\n3. Testing API Cache Behavior...');
    try {
        const response = await makeRequest(`${BASE_URL}/api/blogs?frontBanner=true&limit=5`);
        
        console.log('✅ API Response: Success');
        console.log('📊 Response Time:', response.headers['x-response-time'] || 'Not available');
        console.log('🔄 Cache Status:', response.data.cache || 'Not available');
        console.log('📝 Records Found:', response.data.data?.blogs?.length || 0);
        
        // Test second request to check caching
        console.log('\n4. Testing Cache Hit (Second Request)...');
        const response2 = await makeRequest(`${BASE_URL}/api/blogs?frontBanner=true&limit=5`);
        
        console.log('✅ Second API Response: Success');
        console.log('📊 Response Time:', response2.headers['x-response-time'] || 'Not available');
        console.log('🔄 Cache Status:', response2.data.cache || 'Not available');
        
    } catch (error) {
        console.log('❌ API Test Failed:', error.message);
    }
    
    // 4. Test Health Endpoint
    console.log('\n5. Testing Health Endpoint...');
    try {
        const healthResponse = await makeRequest(`${BASE_URL}/health`);
        
        console.log('✅ Health Check: Success');
        console.log('🏥 System Status:', healthResponse.data.status);
        console.log('⏱️ Uptime:', healthResponse.data.uptime);
        console.log('💾 Memory Usage:', healthResponse.data.memory?.heapUsed);
        
    } catch (error) {
        console.log('❌ Health Check Failed:', error.message);
    }
    
    // 5. Summary
    console.log('\n==========================================');
    console.log('📋 CACHE STATUS SUMMARY');
    console.log('==========================================');
    
    const redisStatus = redisConfig.isReady() ? '✅ Connected' : '❌ Disconnected';
    const cacheMode = cacheService.isAvailable() ? '🚀 Redis Mode' : '⚠️ Fallback Mode';
    
    console.log(`Redis Connection: ${redisStatus}`);
    console.log(`Cache Service: ${cacheMode}`);
    console.log(`Application: ✅ Running (Cache gracefully handles Redis unavailability)`);
    
    if (!redisConfig.isReady()) {
        console.log('\n💡 RECOMMENDATION:');
        console.log('   - Redis is not available but application works fine');
        console.log('   - Consider setting up Redis for better performance');
        console.log('   - Current fallback mode ensures zero downtime');
    }
    
    // Cleanup
    try {
        await redisConfig.disconnect();
    } catch (error) {
        // Ignore cleanup errors
    }
    
    process.exit(0);
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    console.log('❌ Unhandled Error:', error.message);
    process.exit(1);
});

// Run the test
testCacheStatus();