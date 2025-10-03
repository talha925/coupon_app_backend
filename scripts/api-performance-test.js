const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const { getBaseURL, buildApiURL, TEST_ENDPOINTS } = require('../utils/configUtils');

/**
 * 🚀 API PERFORMANCE TEST
 * Tests optimized API endpoints without requiring direct database access
 */
class APIPerformanceTest {
    constructor() {
        this.baseURL = buildApiURL('', getBaseURL(5000));
        this.results = {
            timestamp: new Date().toISOString(),
            testSuite: 'API Performance Test',
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                averageResponseTime: 0,
                cacheHitRate: 0
            },
            tests: [],
            recommendations: []
        };
    }

    /**
     * Test API endpoint performance
     */
    async testEndpoint(name, url, expectedMaxTime, options = {}) {
        console.log(`🧪 Testing ${name}...`);
        
        const testResult = {
            name,
            url,
            expectedMaxTime,
            attempts: [],
            averageTime: 0,
            status: 'pending',
            cacheStatus: 'unknown'
        };

        try {
            // Perform multiple attempts for accurate measurement
            const attempts = options.attempts || 3;
            
            for (let i = 0; i < attempts; i++) {
                const startTime = performance.now();
                
                const response = await axios.get(url, {
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'API-Performance-Test/1.0'
                    }
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                testResult.attempts.push({
                    attempt: i + 1,
                    responseTime,
                    statusCode: response.status,
                    dataSize: JSON.stringify(response.data).length,
                    cacheHit: response.headers['x-cache-status'] === 'HIT' || 
                             response.headers['x-cache'] === 'HIT'
                });

                // Add delay between attempts to test cache behavior
                if (i < attempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // Calculate average response time
            testResult.averageTime = Math.round(
                testResult.attempts.reduce((sum, attempt) => sum + attempt.responseTime, 0) / attempts
            );

            // Determine test status
            testResult.status = testResult.averageTime <= expectedMaxTime ? 'PASS' : 'FAIL';
            
            // Check cache hit rate
            const cacheHits = testResult.attempts.filter(a => a.cacheHit).length;
            testResult.cacheHitRate = Math.round((cacheHits / attempts) * 100);
            testResult.cacheStatus = cacheHits > 0 ? 'ACTIVE' : 'INACTIVE';

            // Performance analysis
            const improvement = testResult.attempts.length > 1 ? 
                testResult.attempts[0].responseTime - testResult.attempts[testResult.attempts.length - 1].responseTime : 0;
            testResult.cacheImprovement = improvement;

            console.log(`${testResult.status === 'PASS' ? '✅' : '❌'} ${name}: ${testResult.averageTime}ms (target: ${expectedMaxTime}ms)`);
            console.log(`   Cache: ${testResult.cacheStatus} (${testResult.cacheHitRate}% hit rate)`);
            
            if (improvement > 0) {
                console.log(`   🚀 Cache improvement: ${improvement}ms faster on subsequent requests`);
            }
            
            if (testResult.status === 'PASS') {
                this.results.summary.passedTests++;
            } else {
                this.results.summary.failedTests++;
                this.results.recommendations.push({
                    test: name,
                    issue: `Response time ${testResult.averageTime}ms exceeds target ${expectedMaxTime}ms`,
                    suggestion: this.getOptimizationSuggestion(name, testResult.averageTime),
                    cacheStatus: testResult.cacheStatus
                });
            }

        } catch (error) {
            testResult.status = 'ERROR';
            testResult.error = error.message;
            this.results.summary.failedTests++;
            
            console.log(`❌ ${name}: ERROR - ${error.message}`);
            
            this.results.recommendations.push({
                test: name,
                issue: `Test failed with error: ${error.message}`,
                suggestion: 'Check server status and endpoint availability'
            });
        }

        this.results.tests.push(testResult);
        this.results.summary.totalTests++;
        
        return testResult;
    }

    /**
     * Get optimization suggestions based on performance results
     */
    getOptimizationSuggestion(testName, actualTime) {
        const suggestions = {
            'Blog Categories API': [
                'Verify compound indexes on BlogCategory collection are active',
                'Check cache warming strategy execution',
                'Ensure Redis connection is stable',
                'Consider increasing cache TTL if data doesn\'t change frequently'
            ],
            'Front Banner Blogs API': [
                'Verify compound index on (FrontBanner, status, publishDate) is being used',
                'Check if .lean() queries are working properly',
                'Ensure cache TTL is optimized (15 minutes recommended)',
                'Consider implementing pagination for better performance'
            ],
            'Individual Blog Post API': [
                'Verify compound index on (slug, status) exists and is used',
                'Check if related posts caching is working',
                'Ensure parallel execution is implemented correctly',
                'Consider CDN integration for static content'
            ],
            'Blog Listing API': [
                'Verify pagination is working efficiently',
                'Check if proper indexes are used for sorting',
                'Ensure field selection is optimized',
                'Consider implementing cursor-based pagination'
            ]
        };

        return suggestions[testName] || ['Review query optimization and caching strategy'];
    }

    /**
     * Test server health and connectivity
     */
    async testServerHealth() {
        console.log('🏥 Testing server health...');
        
        try {
            const healthResponse = await axios.get(`${this.baseURL.replace('/api', '')}/health`, {
                timeout: 10000
            });
            
            console.log('✅ Server health check passed');
            console.log(`   Status: ${healthResponse.data.status || 'Unknown'}`);
            console.log(`   Database: ${healthResponse.data.database || 'Unknown'}`);
            console.log(`   Cache: ${healthResponse.data.cache || 'Unknown'}`);
            
            return true;
        } catch (error) {
            console.log('❌ Server health check failed:', error.message);
            return false;
        }
    }

    /**
     * Run comprehensive API performance test
     */
    async runTest() {
        console.log('🚀 Starting API Performance Test...\n');
        
        try {
            // Test server health first
            const serverHealthy = await this.testServerHealth();
            if (!serverHealthy) {
                console.log('⚠️ Server health check failed, but continuing with tests...\n');
            }

            // Test Blog Categories API (target: 300ms)
            await this.testEndpoint(
                'Blog Categories API',
                `${this.baseURL}/blogCategories/`,
                300,
                { attempts: 3 }
            );

            // Test Front Banner Blogs API (target: 200ms)
            await this.testEndpoint(
                'Front Banner Blogs API',
                `${this.baseURL}/blogs?FrontBanner=true&limit=10`,
                200,
                { attempts: 3 }
            );

            // Test general blog listing (target: 250ms)
            await this.testEndpoint(
                'Blog Listing API',
                `${this.baseURL}/blogs?limit=10`,
                250,
                { attempts: 3 }
            );

            // Try to get a specific blog for individual testing
            try {
                const blogsResponse = await axios.get(`${this.baseURL}/blogs?limit=1`);
                if (blogsResponse.data.data && blogsResponse.data.data.length > 0) {
                    const blogSlug = blogsResponse.data.data[0].slug;
                    
                    await this.testEndpoint(
                        'Individual Blog Post API',
                        `${this.baseURL}/blogs/${blogSlug}`,
                        100,
                        { attempts: 3 }
                    );
                } else {
                    console.log('⚠️ No blogs available for individual blog testing');
                }
            } catch (error) {
                console.log('⚠️ Could not retrieve blog for individual testing:', error.message);
            }

            // Calculate summary statistics
            this.calculateSummary();

            // Generate report
            await this.generateReport();

            console.log('\n🎯 API Performance Test Complete!');
            console.log(`📊 Results: ${this.results.summary.passedTests}/${this.results.summary.totalTests} tests passed`);
            console.log(`⚡ Average Response Time: ${this.results.summary.averageResponseTime}ms`);
            console.log(`💾 Cache Hit Rate: ${this.results.summary.cacheHitRate}%`);
            
            if (this.results.summary.failedTests > 0) {
                console.log(`⚠️ ${this.results.summary.failedTests} tests need attention`);
                console.log('📋 Check the generated report for detailed recommendations');
            } else {
                console.log('🎉 All performance targets achieved!');
            }

            return this.results.summary.failedTests === 0;

        } catch (error) {
            console.error('💥 API performance test failed:', error);
            throw error;
        }
    }

    /**
     * Calculate summary statistics
     */
    calculateSummary() {
        const successfulTests = this.results.tests.filter(test => test.averageTime > 0);
        
        if (successfulTests.length > 0) {
            this.results.summary.averageResponseTime = Math.round(
                successfulTests.reduce((sum, test) => sum + test.averageTime, 0) / successfulTests.length
            );

            const totalAttempts = successfulTests.reduce((sum, test) => sum + test.attempts.length, 0);
            const totalCacheHits = successfulTests.reduce((sum, test) => 
                sum + test.attempts.filter(attempt => attempt.cacheHit).length, 0
            );
            
            this.results.summary.cacheHitRate = totalAttempts > 0 ? 
                Math.round((totalCacheHits / totalAttempts) * 100) : 0;
        }
    }

    /**
     * Generate performance report
     */
    async generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, `api-performance-report-${timestamp}.json`);
        
        // Add final recommendations
        if (this.results.summary.failedTests === 0) {
            this.results.recommendations.push({
                type: 'SUCCESS',
                message: 'All API performance targets achieved!',
                nextSteps: [
                    'Monitor performance in production environment',
                    'Set up automated performance testing',
                    'Implement alerting for response time degradation',
                    'Continue cache warming strategies'
                ]
            });
        } else {
            this.results.recommendations.push({
                type: 'ACTION_REQUIRED',
                message: 'Some API performance targets not met.',
                nextSteps: [
                    'Review failed tests and implement optimizations',
                    'Check database indexes and query execution plans',
                    'Verify cache service is working properly',
                    'Consider server resource scaling'
                ]
            });
        }

        // Write detailed report
        await fs.promises.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Detailed report saved: ${reportPath}`);

        // Generate summary
        const summaryPath = path.join(__dirname, `api-performance-summary-${timestamp}.md`);
        const summaryContent = this.generateMarkdownSummary();
        await fs.promises.writeFile(summaryPath, summaryContent);
        console.log(`📋 Summary report saved: ${summaryPath}`);
    }

    /**
     * Generate markdown summary report
     */
    generateMarkdownSummary() {
        const { summary, tests, recommendations } = this.results;
        
        return `# API Performance Test Report

## 📊 Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests} ✅
- **Failed**: ${summary.failedTests} ${summary.failedTests > 0 ? '❌' : ''}
- **Average Response Time**: ${summary.averageResponseTime}ms
- **Cache Hit Rate**: ${summary.cacheHitRate}%

## 🎯 Test Results

| API Endpoint | Target | Actual | Status | Cache Hit Rate |
|--------------|--------|--------|--------|----------------|
${tests.map(test => `| ${test.name} | ${test.expectedMaxTime}ms | ${test.averageTime}ms | ${test.status} | ${test.cacheHitRate}% |`).join('\n')}

## 📈 Performance Analysis

${tests.map(test => `### ${test.name}
- **Average Response Time**: ${test.averageTime}ms
- **Target**: ${test.expectedMaxTime}ms
- **Status**: ${test.status}
- **Cache Performance**: ${test.cacheStatus} (${test.cacheHitRate}% hit rate)
${test.cacheImprovement > 0 ? `- **Cache Improvement**: ${test.cacheImprovement}ms faster on cached requests` : ''}
${test.error ? `- **Error**: ${test.error}` : ''}
`).join('\n')}

## 📋 Recommendations

${recommendations.map(rec => `### ${rec.test || rec.type}
**Issue**: ${rec.issue || rec.message}
**Suggestions**: 
${Array.isArray(rec.suggestion) ? rec.suggestion.map(s => `- ${s}`).join('\n') : `- ${rec.suggestion}`}
${rec.nextSteps ? `\n**Next Steps**: \n${rec.nextSteps.map(s => `- ${s}`).join('\n')}` : ''}
`).join('\n')}

---
*Generated on ${new Date().toLocaleString()}*
`;
    }
}

// Run test if called directly
if (require.main === module) {
    const tester = new APIPerformanceTest();
    tester.runTest()
        .then((success) => {
            if (success) {
                console.log('🎉 All API performance tests passed!');
                process.exit(0);
            } else {
                console.log('⚠️ Some performance tests failed. Check the report for details.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 API performance test failed:', error);
            process.exit(1);
        });
}

module.exports = APIPerformanceTest;