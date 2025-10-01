const redisConfig = require('../config/redis');

async function testRedisConnection() {
    console.log('🔍 Testing Redis Connection...\n');
    
    try {
        // Connect to Redis
        console.log('1. Attempting to connect to Redis...');
        await redisConfig.connect();
        
        // Check if connected
        if (redisConfig.isReady()) {
            console.log('✅ Redis connection successful!\n');
            
            // Test basic operations
            console.log('2. Testing basic Redis operations...');
            const client = redisConfig.getClient();
            
            // Test SET operation
            await client.set('test_key', 'Hello Redis!');
            console.log('✅ SET operation successful');
            
            // Test GET operation
            const value = await client.get('test_key');
            console.log('✅ GET operation successful:', value);
            
            // Test DELETE operation
            await client.del('test_key');
            console.log('✅ DELETE operation successful');
            
            // Test with expiration
            await client.setEx('temp_key', 5, 'This will expire in 5 seconds');
            console.log('✅ SET with expiration successful');
            
            // Get TTL
            const ttl = await client.ttl('temp_key');
            console.log('✅ TTL check successful:', ttl, 'seconds remaining');
            
            console.log('\n🎉 All Redis operations working perfectly!');
            
        } else {
            console.log('❌ Redis connection failed - not ready');
        }
        
    } catch (error) {
        console.log('❌ Redis connection error:', error.message);
        console.log('⚠️ Application will run without caching');
    } finally {
        // Cleanup
        try {
            await redisConfig.disconnect();
            console.log('\n✅ Redis connection closed');
        } catch (error) {
            console.log('⚠️ Error closing Redis connection:', error.message);
        }
        process.exit(0);
    }
}

// Run the test
testRedisConnection();