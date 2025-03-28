/**
 * Environment variable validation and configuration
 */

/**
 * Required environment variables
 * Each app needs these to function properly
 */
const REQUIRED_ENV_VARS = [
    'MONGO_URI',
    'PORT'
];

/**
 * Optional environment variables with defaults
 */
const ENV_DEFAULTS = {
    NODE_ENV: 'development',
    PORT: '5000',
    ALLOWED_ORIGINS: 'http://localhost:3000'
};

/**
 * Validate required environment variables
 * @returns {boolean} - true if valid, false otherwise
 */
const validateEnv = () => {
    let isValid = true;
    const missing = [];

    // Check required variables
    REQUIRED_ENV_VARS.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
            isValid = false;
        }
    });

    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    }

    // Set defaults for missing optional variables
    Object.entries(ENV_DEFAULTS).forEach(([key, value]) => {
        if (!process.env[key]) {
            process.env[key] = value;
            console.log(`ℹ️ Setting default value for ${key}: ${value}`);
        }
    });

    // Additional validation
    if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('mongodb')) {
        console.error('❌ MONGO_URI does not appear to be a valid MongoDB connection string');
        isValid = false;
    }

    return isValid;
};

/**
 * Gets current environment configuration
 * @returns {object} - Environment configuration
 */
const getConfig = () => {
    return {
        // Application
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '5000', 10),
        isDev: (process.env.NODE_ENV || 'development') === 'development',
        
        // Database
        mongoUri: process.env.MONGO_URI,
        
        // Security
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
        allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
        
        // AWS (for file uploads)
        awsRegion: process.env.AWS_REGION,
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsBucketName: process.env.AWS_BUCKET_NAME
    };
};

module.exports = {
    validateEnv,
    getConfig
}; 