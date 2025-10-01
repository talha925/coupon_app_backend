const redisConfig = require('../config/redis');
const cacheService = require('../services/cacheService');

async function checkRedisStatus() {
    console.log('🔍 Redis Status Check in Application Context');
    console.log('==========================================');
    
    try {
        // Check Redis config status
        console.log('1. Redis Config Status:');
        console.log('   - isConnected:', redisConfig.isConnected);
        console.log('   - client exists:', !!redisConfig.client);
        console.log('   - client.isReady:', redisConfig.client ? redisConfig.client.isReady : 'No client');
        console.log('   - isReady():', redisConfig.isReady());
        
        // Check cache service status
        console.log('\n2. Cache Service Status:');
        console.log('   - redis client:', !!cacheService.redis);
        console.log('   - isAvailable():', cacheService.isAvailable());
        
        // Test cache operations
        console.log('\n3. Testing Cache Operations:');
        const testKey = 'test-cache-key';
        const testValue = { message: 'Hello Redis!', timestamp: new Date().toISOString() };
        
        // Try to set cache
        const setResult = await cacheService.set(testKey, testValue, 60);
        console.log('   - Set operation result:', setResult);
        
        // Try to get cache
        const getValue = await cacheService.get(testKey);
        console.log('   - Get operation result:', getValue);
        
        // Clean up
        await cacheService.delete(testKey);
        console.log('   - Delete operation completed');
        
        console.log('\n✅ Redis status check completed');
        
    } catch (error) {
        console.error('❌ Error during Redis status check:', error);
    }
}

checkRedisStatus();