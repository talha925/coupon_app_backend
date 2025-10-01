const redis = require('redis');
require('dotenv').config();

async function debugRedisConnection() {
    console.log('🔍 Redis Debug Information:');
    console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set' : 'Not set');
    console.log('REDIS_HOST:', process.env.REDIS_HOST || 'Not set');
    console.log('REDIS_PORT:', process.env.REDIS_PORT || 'Not set');
    console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'Set' : 'Not set');
    
    if (process.env.REDIS_URL) {
        console.log('Full REDIS_URL:', process.env.REDIS_URL);
    }
    
    console.log('\n🔗 Attempting Redis connection with detailed logging...');
    
    try {
        const client = redis.createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 10000,
                commandTimeout: 5000,
                reconnectStrategy: false
            }
        });

        client.on('connect', () => {
            console.log('✅ Redis client connecting...');
        });

        client.on('ready', () => {
            console.log('✅ Redis client ready!');
        });

        client.on('error', (err) => {
            console.log('❌ Redis error:', err.message);
            console.log('Error code:', err.code);
            console.log('Error errno:', err.errno);
        });

        client.on('end', () => {
            console.log('🔚 Redis connection ended');
        });

        await client.connect();
        
        // Test basic operations
        console.log('\n🧪 Testing Redis operations...');
        await client.set('test-key', 'test-value');
        const value = await client.get('test-key');
        console.log('✅ SET/GET test successful:', value);
        
        await client.del('test-key');
        console.log('✅ DEL test successful');
        
        await client.disconnect();
        console.log('✅ Redis connection test completed successfully!');
        
    } catch (error) {
        console.log('❌ Redis connection failed:');
        console.log('Error message:', error.message);
        console.log('Error code:', error.code);
        console.log('Error stack:', error.stack);
    }
}

debugRedisConnection();