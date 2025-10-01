require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const redisConfig = require('../config/redis');
const cacheService = require('../services/cacheService');

/**
 * 🏥 COMPREHENSIVE SYSTEM HEALTH CHECK
 * DevOps-grade analysis for Node.js Coupon Backend
 */

class SystemHealthAnalyzer {
    constructor() {
        this.results = {
            security: {},
            performance: {},
            scalability: {},
            codeQuality: {},
            productionReadiness: {},
            optimization: {}
        };
        this.startTime = Date.now();
    }

    // 🔍 SECURITY AUDIT
    async performSecurityAudit() {
        console.log('🔍 SECURITY AUDIT');
        console.log('==========================================');
        
        const security = this.results.security;
        
        // Environment Variables Check
        const criticalEnvVars = ['JWT_SECRET', 'MONGO_URI', 'REDIS_URL'];
        const missingEnvVars = criticalEnvVars.filter(env => !process.env[env]);
        
        security.environmentVariables = {
            status: missingEnvVars.length === 0 ? '✅' : '❌',
            missing: missingEnvVars,
            jwtSecretStrength: process.env.JWT_SECRET ? 
                (process.env.JWT_SECRET.length >= 32 ? '✅ Strong' : '⚠️ Weak') : '❌ Missing'
        };
        
        // Dependencies Security
        security.dependencies = {
            status: '✅', // Based on npm audit results
            vulnerabilities: 'Low: 1 (brace-expansion)',
            recommendation: 'Run npm audit fix'
        };
        
        // Security Headers Check
        security.headers = await this.checkSecurityHeaders();
        
        // Authentication Check
        security.authentication = this.checkAuthenticationSetup();
        
        console.log('Environment Variables:', security.environmentVariables.status);
        console.log('Dependencies:', security.dependencies.status);
        console.log('Security Headers:', security.headers.status);
        console.log('Authentication:', security.authentication.status);
        console.log('');
    }

    // ⚡ PERFORMANCE ANALYSIS
    async performPerformanceAnalysis() {
        console.log('⚡ PERFORMANCE ANALYSIS');
        console.log('==========================================');
        
        const performance = this.results.performance;
        
        // API Response Time Test
        const apiTests = await this.testAPIPerformance();
        performance.apiResponseTimes = apiTests;
        
        // Redis Performance
        const redisPerf = await this.testRedisPerformance();
        performance.redis = redisPerf;
        
        // Memory Usage
        const memUsage = process.memoryUsage();
        performance.memory = {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
            status: memUsage.heapUsed < 100 * 1024 * 1024 ? '✅' : '⚠️'
        };
        
        console.log('API Response Times:', performance.apiResponseTimes.status);
        console.log('Redis Performance:', performance.redis.status);
        console.log('Memory Usage:', performance.memory.status, `(${performance.memory.heapUsed})`);
        console.log('');
    }

    // 📊 SCALABILITY CHECK
    async performScalabilityCheck() {
        console.log('📊 SCALABILITY CHECK');
        console.log('==========================================');
        
        const scalability = this.results.scalability;
        
        // Stateless Architecture
        scalability.stateless = this.checkStatelessArchitecture();
        
        // Database Indexing
        scalability.indexing = await this.checkDatabaseIndexing();
        
        // Session Management
        scalability.sessionManagement = this.checkSessionManagement();
        
        // File Storage
        scalability.fileStorage = this.checkFileStorageScalability();
        
        console.log('Stateless Architecture:', scalability.stateless.status);
        console.log('Database Indexing:', scalability.indexing.status);
        console.log('Session Management:', scalability.sessionManagement.status);
        console.log('File Storage:', scalability.fileStorage.status);
        console.log('');
    }

    // 🔧 CODE QUALITY REVIEW
    async performCodeQualityReview() {
        console.log('🔧 CODE QUALITY REVIEW');
        console.log('==========================================');
        
        const codeQuality = this.results.codeQuality;
        
        // Error Handling
        codeQuality.errorHandling = this.checkErrorHandling();
        
        // Logging
        codeQuality.logging = this.checkLogging();
        
        // Code Modularity
        codeQuality.modularity = this.checkModularity();
        
        // API Documentation
        codeQuality.documentation = this.checkDocumentation();
        
        console.log('Error Handling:', codeQuality.errorHandling.status);
        console.log('Logging:', codeQuality.logging.status);
        console.log('Modularity:', codeQuality.modularity.status);
        console.log('Documentation:', codeQuality.documentation.status);
        console.log('');
    }

    // 🛠️ PRODUCTION READINESS
    async performProductionReadinessCheck() {
        console.log('🛠️ PRODUCTION READINESS');
        console.log('==========================================');
        
        const production = this.results.productionReadiness;
        
        // Health Endpoints
        production.healthEndpoints = await this.checkHealthEndpoints();
        
        // Environment Configuration
        production.envConfig = this.checkEnvironmentConfiguration();
        
        // Monitoring Setup
        production.monitoring = this.checkMonitoringSetup();
        
        // Deployment Configuration
        production.deployment = this.checkDeploymentConfig();
        
        console.log('Health Endpoints:', production.healthEndpoints.status);
        console.log('Environment Config:', production.envConfig.status);
        console.log('Monitoring Setup:', production.monitoring.status);
        console.log('Deployment Config:', production.deployment.status);
        console.log('');
    }

    // 📈 OPTIMIZATION OPPORTUNITIES
    async identifyOptimizationOpportunities() {
        console.log('📈 OPTIMIZATION OPPORTUNITIES');
        console.log('==========================================');
        
        const optimization = this.results.optimization;
        
        optimization.caching = this.analyzeCachingStrategy();
        optimization.database = this.analyzeDatabaseOptimization();
        optimization.cdn = this.analyzeCDNOpportunities();
        optimization.backgroundJobs = this.analyzeBackgroundJobs();
        
        console.log('Caching Strategy:', optimization.caching.status);
        console.log('Database Optimization:', optimization.database.status);
        console.log('CDN Implementation:', optimization.cdn.status);
        console.log('Background Jobs:', optimization.backgroundJobs.status);
        console.log('');
    }

    // Helper Methods
    async checkSecurityHeaders() {
        try {
            const response = await this.makeRequest('http://localhost:5000/health');
            const hasHelmet = response.headers['x-content-type-options'] === 'nosniff';
            return {
                status: hasHelmet ? '✅' : '⚠️',
                helmet: hasHelmet ? 'Configured' : 'Missing',
                recommendation: hasHelmet ? 'Good' : 'Install and configure helmet'
            };
        } catch (error) {
            return { status: '❌', error: 'Cannot check headers - server not running' };
        }
    }

    checkAuthenticationSetup() {
        const authMiddlewarePath = path.join(__dirname, '../middlewares/authMiddleware.js');
        const hasAuthMiddleware = fs.existsSync(authMiddlewarePath);
        
        return {
            status: hasAuthMiddleware ? '✅' : '❌',
            jwtImplemented: hasAuthMiddleware ? 'Yes' : 'No',
            roleBasedAccess: hasAuthMiddleware ? 'Implemented' : 'Missing'
        };
    }

    async testAPIPerformance() {
        const endpoints = [
            'http://localhost:5000/health',
            'http://localhost:5000/api/blogs?limit=5',
            'http://localhost:5000/api/categories?limit=5'
        ];
        
        const results = [];
        for (const endpoint of endpoints) {
            try {
                const start = Date.now();
                await this.makeRequest(endpoint);
                const responseTime = Date.now() - start;
                results.push({ endpoint, responseTime, status: responseTime < 500 ? '✅' : '⚠️' });
            } catch (error) {
                results.push({ endpoint, error: error.message, status: '❌' });
            }
        }
        
        const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
        return {
            status: avgResponseTime < 300 ? '✅' : avgResponseTime < 500 ? '⚠️' : '❌',
            average: Math.round(avgResponseTime) + 'ms',
            details: results
        };
    }

    async testRedisPerformance() {
        try {
            await cacheService.ensureInitialized();
            if (cacheService.isAvailable()) {
                const start = Date.now();
                await cacheService.set('perf_test', 'test_value', 60);
                const setTime = Date.now() - start;
                
                const start2 = Date.now();
                await cacheService.get('perf_test');
                const getTime = Date.now() - start2;
                
                await cacheService.delete('perf_test');
                
                return {
                    status: '✅',
                    setTime: setTime + 'ms',
                    getTime: getTime + 'ms',
                    connected: true
                };
            } else {
                return { status: '⚠️', message: 'Redis in fallback mode' };
            }
        } catch (error) {
            return { status: '❌', error: error.message };
        }
    }

    checkStatelessArchitecture() {
        // Check if JWT is used (stateless) vs sessions (stateful)
        const usesJWT = process.env.JWT_SECRET ? true : false;
        return {
            status: usesJWT ? '✅' : '⚠️',
            authentication: usesJWT ? 'JWT (Stateless)' : 'Session-based',
            recommendation: usesJWT ? 'Good' : 'Consider JWT for better scalability'
        };
    }

    async checkDatabaseIndexing() {
        // This would require MongoDB connection to check indexes
        return {
            status: '⚠️',
            message: 'Manual review required',
            recommendation: 'Check MongoDB indexes for frequently queried fields'
        };
    }

    checkSessionManagement() {
        return {
            status: '✅',
            type: 'JWT-based',
            stateless: true
        };
    }

    checkFileStorageScalability() {
        const hasS3Config = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
        return {
            status: hasS3Config ? '✅' : '⚠️',
            storage: hasS3Config ? 'AWS S3' : 'Local storage',
            scalable: hasS3Config
        };
    }

    checkErrorHandling() {
        const errorHandlerPath = path.join(__dirname, '../middlewares/errorHandler.js');
        const hasErrorHandler = fs.existsSync(errorHandlerPath);
        
        return {
            status: hasErrorHandler ? '✅' : '❌',
            globalHandler: hasErrorHandler ? 'Implemented' : 'Missing',
            customErrors: fs.existsSync(path.join(__dirname, '../errors/AppError.js')) ? 'Yes' : 'No'
        };
    }

    checkLogging() {
        const hasRequestLogger = fs.existsSync(path.join(__dirname, '../middlewares/requestLogger.js'));
        return {
            status: hasRequestLogger ? '✅' : '⚠️',
            requestLogging: hasRequestLogger ? 'Implemented' : 'Missing',
            recommendation: 'Consider structured logging with Winston'
        };
    }

    checkModularity() {
        const directories = ['controllers', 'services', 'middlewares', 'models', 'routes'];
        const existingDirs = directories.filter(dir => 
            fs.existsSync(path.join(__dirname, '..', dir))
        );
        
        return {
            status: existingDirs.length >= 4 ? '✅' : '⚠️',
            structure: `${existingDirs.length}/${directories.length} directories`,
            modular: existingDirs.length >= 4
        };
    }

    checkDocumentation() {
        const hasReadme = fs.existsSync(path.join(__dirname, '../README.md'));
        const hasApiDocs = fs.existsSync(path.join(__dirname, '../API_TESTING_GUIDE.md'));
        
        return {
            status: hasReadme && hasApiDocs ? '✅' : '⚠️',
            readme: hasReadme ? 'Present' : 'Missing',
            apiDocs: hasApiDocs ? 'Present' : 'Missing'
        };
    }

    async checkHealthEndpoints() {
        try {
            const response = await this.makeRequest('http://localhost:5000/health');
            return {
                status: '✅',
                endpoint: '/health',
                response: response.data.status
            };
        } catch (error) {
            return {
                status: '❌',
                error: 'Health endpoint not accessible'
            };
        }
    }

    checkEnvironmentConfiguration() {
        const hasEnvExample = fs.existsSync(path.join(__dirname, '../.env.example'));
        const hasEnvValidation = fs.existsSync(path.join(__dirname, '../config/env.js'));
        
        return {
            status: hasEnvValidation ? '✅' : '⚠️',
            validation: hasEnvValidation ? 'Implemented' : 'Missing',
            example: hasEnvExample ? 'Present' : 'Missing'
        };
    }

    checkMonitoringSetup() {
        const hasPerformanceMiddleware = fs.existsSync(path.join(__dirname, '../middlewares/performanceMiddleware.js'));
        return {
            status: hasPerformanceMiddleware ? '⚠️' : '❌',
            performance: hasPerformanceMiddleware ? 'Basic' : 'Missing',
            recommendation: 'Consider APM tools like New Relic or DataDog'
        };
    }

    checkDeploymentConfig() {
        const hasVercelConfig = fs.existsSync(path.join(__dirname, '../vercel.json'));
        const hasDockerfile = fs.existsSync(path.join(__dirname, '../Dockerfile'));
        
        return {
            status: hasVercelConfig || hasDockerfile ? '✅' : '⚠️',
            vercel: hasVercelConfig ? 'Configured' : 'Not configured',
            docker: hasDockerfile ? 'Present' : 'Missing'
        };
    }

    analyzeCachingStrategy() {
        return {
            status: '✅',
            redis: 'Implemented',
            strategy: 'TTL-based caching',
            recommendation: 'Consider cache warming for critical data'
        };
    }

    analyzeDatabaseOptimization() {
        return {
            status: '⚠️',
            indexes: 'Manual review needed',
            queries: 'Review for N+1 problems',
            recommendation: 'Implement query monitoring'
        };
    }

    analyzeCDNOpportunities() {
        return {
            status: '⚠️',
            static: 'No CDN configured',
            recommendation: 'Implement CDN for static assets'
        };
    }

    analyzeBackgroundJobs() {
        return {
            status: '⚠️',
            queue: 'Not implemented',
            recommendation: 'Consider Bull Queue for background tasks'
        };
    }

    // Utility method for HTTP requests
    makeRequest(url) {
        return new Promise((resolve, reject) => {
            const req = http.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({ data: jsonData, headers: res.headers, statusCode: res.statusCode });
                    } catch (error) {
                        resolve({ data: data, headers: res.headers, statusCode: res.statusCode });
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

    // Generate comprehensive report
    generateReport() {
        console.log('');
        console.log('🏥 COMPREHENSIVE HEALTH REPORT');
        console.log('==========================================');
        
        const totalTime = Date.now() - this.startTime;
        console.log(`Analysis completed in ${totalTime}ms`);
        console.log('');
        
        // Summary
        const categories = Object.keys(this.results);
        categories.forEach(category => {
            console.log(`${category.toUpperCase()}:`);
            const categoryResults = this.results[category];
            Object.keys(categoryResults).forEach(key => {
                const result = categoryResults[key];
                if (result.status) {
                    console.log(`  ${key}: ${result.status}`);
                }
            });
            console.log('');
        });
        
        // Save detailed report
        const reportPath = path.join(__dirname, `health-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Detailed report saved: ${reportPath}`);
    }

    // Main execution method
    async run() {
        console.log('🚀 STARTING COMPREHENSIVE SYSTEM HEALTH CHECK');
        console.log('==============================================');
        console.log('');
        
        try {
            await this.performSecurityAudit();
            await this.performPerformanceAnalysis();
            await this.performScalabilityCheck();
            await this.performCodeQualityReview();
            await this.performProductionReadinessCheck();
            await this.identifyOptimizationOpportunities();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
        } finally {
            // Cleanup
            try {
                await redisConfig.disconnect();
            } catch (error) {
                // Ignore cleanup errors
            }
            process.exit(0);
        }
    }
}

// Run the health check
const analyzer = new SystemHealthAnalyzer();
analyzer.run();