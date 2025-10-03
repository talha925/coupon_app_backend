const mongoose = require('mongoose');
const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

/**
 * 🚀 FINAL PERFORMANCE VALIDATION SCRIPT
 * Tests all optimizations and generates comprehensive performance report
 */
class FinalPerformanceValidator {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.results = {
            timestamp: new Date().toISOString(),
            testSuite: 'Final Performance Validation',
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                averageResponseTime: 0,
                cacheHitRate: 0
            },
            tests: [],
            recommendations: [],
            performanceMetrics: {
                blogCategories: { target: 300, actual: null, status: 'pending' },
                frontBannerBlogs: { target: 200, actual: null, status: 'pending' },
                individualBlogs: { target: 100, actual: null, status: 'pending' },
                relatedPosts: { target: 150, actual: null, status: 'pending' }
            }
        };
    }

    /**
     * Connect to MongoDB for direct testing
     */
    async connectDB() {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coupon_backend');
            console.log('✅ Connected to MongoDB for validation');
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error);
            throw error;
        }
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
                        'User-Agent': 'Performance-Validator/1.0'
                    }
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                testResult.attempts.push({
                    attempt: i + 1,
                    responseTime,
                    statusCode: response.status,
                    dataSize: JSON.stringify(response.data).length,
                    cacheHit: response.headers['x-cache-status'] === 'HIT'
                });

                // Add delay between attempts to avoid overwhelming the server
                if (i < attempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
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

            console.log(`${testResult.status === 'PASS' ? '✅' : '❌'} ${name}: ${testResult.averageTime}ms (target: ${expectedMaxTime}ms)`);
            
            if (testResult.status === 'PASS') {
                this.results.summary.passedTests++;
            } else {
                this.results.summary.failedTests++;
                this.results.recommendations.push({
                    test: name,
                    issue: `Response time ${testResult.averageTime}ms exceeds target ${expectedMaxTime}ms`,
                    suggestion: this.getOptimizationSuggestion(name, testResult.averageTime)
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
                'Ensure compound indexes on BlogCategory collection',
                'Verify cache warming is active',
                'Check Redis connection and cache hit rates',
                'Consider implementing database connection pooling'
            ],
            'Front Banner Blogs API': [
                'Verify compound index on (FrontBanner, status, publishDate)',
                'Ensure cache TTL is optimized (15 minutes recommended)',
                'Check if .lean() is applied to queries',
                'Consider pagination for large result sets'
            ],
            'Individual Blog Post API': [
                'Verify compound index on (slug, status)',
                'Ensure related posts are cached separately',
                'Check if parallel execution is working for blog + related posts',
                'Consider implementing CDN for static content'
            ],
            'Related Posts API': [
                'Verify compound indexes on (category.id, status, publishDate)',
                'Ensure related posts cache is working (30-minute TTL)',
                'Check if query uses optimized field selection',
                'Consider limiting related posts count'
            ]
        };

        return suggestions[testName] || ['Review query optimization and caching strategy'];
    }

    /**
     * Test database query performance directly
     */
    async testDatabaseQueries() {
        console.log('🔍 Testing database query performance...');
        
        try {
            const BlogPost = require('../models/blogPostModel');
            const BlogCategory = require('../models/blogCategoryModel');

            // Test blog categories query
            const categoryStart = performance.now();
            const categories = await BlogCategory.find({}).lean().select('name slug createdAt updatedAt');
            const categoryTime = Math.round(performance.now() - categoryStart);
            
            this.results.performanceMetrics.blogCategories.actual = categoryTime;
            this.results.performanceMetrics.blogCategories.status = 
                categoryTime <= this.results.performanceMetrics.blogCategories.target ? 'PASS' : 'FAIL';

            // Test front banner blogs query
            const frontBannerStart = performance.now();
            const frontBannerBlogs = await BlogPost.find({
                FrontBanner: true,
                status: 'published'
            })
            .sort({ publishDate: -1 })
            .limit(10)
            .lean()
            .select('title slug excerpt featuredImage publishDate category store');
            const frontBannerTime = Math.round(performance.now() - frontBannerStart);
            
            this.results.performanceMetrics.frontBannerBlogs.actual = frontBannerTime;
            this.results.performanceMetrics.frontBannerBlogs.status = 
                frontBannerTime <= this.results.performanceMetrics.frontBannerBlogs.target ? 'PASS' : 'FAIL';

            // Test individual blog query
            if (frontBannerBlogs.length > 0) {
                const blogSlug = frontBannerBlogs[0].slug;
                const individualStart = performance.now();
                const individualBlog = await BlogPost.findOne({ slug: blogSlug, status: 'published' })
                    .lean()
                    .select('title content slug excerpt featuredImage publishDate category store tags seoTitle seoDescription');
                const individualTime = Math.round(performance.now() - individualStart);
                
                this.results.performanceMetrics.individualBlogs.actual = individualTime;
                this.results.performanceMetrics.individualBlogs.status = 
                    individualTime <= this.results.performanceMetrics.individualBlogs.target ? 'PASS' : 'FAIL';

                // Test related posts query
                if (individualBlog && individualBlog.category) {
                    const relatedStart = performance.now();
                    const relatedPosts = await BlogPost.find({
                        'category.id': individualBlog.category.id,
                        status: 'published',
                        _id: { $ne: individualBlog._id }
                    })
                    .sort({ publishDate: -1 })
                    .limit(5)
                    .lean()
                    .select('title slug excerpt featuredImage publishDate category');
                    const relatedTime = Math.round(performance.now() - relatedStart);
                    
                    this.results.performanceMetrics.relatedPosts.actual = relatedTime;
                    this.results.performanceMetrics.relatedPosts.status = 
                        relatedTime <= this.results.performanceMetrics.relatedPosts.target ? 'PASS' : 'FAIL';
                }
            }

            console.log('✅ Database query performance tests completed');
            
        } catch (error) {
            console.error('❌ Database query testing failed:', error);
            this.results.recommendations.push({
                test: 'Database Queries',
                issue: `Database testing failed: ${error.message}`,
                suggestion: 'Check MongoDB connection and model imports'
            });
        }
    }

    /**
     * Run comprehensive performance validation
     */
    async runValidation() {
        console.log('🚀 Starting Final Performance Validation...\n');
        
        try {
            // Connect to database
            await this.connectDB();

            // Test API endpoints
            await this.testEndpoint(
                'Blog Categories API',
                `${this.baseURL}/blogCategories`,
                300 // 300ms target
            );

            await this.testEndpoint(
                'Front Banner Blogs API',
                `${this.baseURL}/blogs?FrontBanner=true&limit=10`,
                200 // 200ms target
            );

            // Get a blog slug for individual testing
            try {
                const blogsResponse = await axios.get(`${this.baseURL}/blogs?limit=1`);
                if (blogsResponse.data.data && blogsResponse.data.data.length > 0) {
                    const blogSlug = blogsResponse.data.data[0].slug;
                    
                    await this.testEndpoint(
                        'Individual Blog Post API',
                        `${this.baseURL}/blogs/${blogSlug}`,
                        100 // 100ms target
                    );
                }
            } catch (error) {
                console.log('⚠️ Could not test individual blog post - no blogs available');
            }

            // Test database queries directly
            await this.testDatabaseQueries();

            // Calculate summary statistics
            this.calculateSummary();

            // Generate final report
            await this.generateReport();

            console.log('\n🎯 Final Performance Validation Complete!');
            console.log(`📊 Results: ${this.results.summary.passedTests}/${this.results.summary.totalTests} tests passed`);
            console.log(`⚡ Average Response Time: ${this.results.summary.averageResponseTime}ms`);
            
            if (this.results.summary.failedTests > 0) {
                console.log(`⚠️ ${this.results.summary.failedTests} tests need attention`);
                console.log('📋 Check the generated report for detailed recommendations');
            } else {
                console.log('🎉 All performance targets achieved!');
            }

        } catch (error) {
            console.error('💥 Validation failed:', error);
            throw error;
        } finally {
            await mongoose.disconnect();
        }
    }

    /**
     * Calculate summary statistics
     */
    calculateSummary() {
        const apiTests = this.results.tests.filter(test => test.averageTime > 0);
        
        if (apiTests.length > 0) {
            this.results.summary.averageResponseTime = Math.round(
                apiTests.reduce((sum, test) => sum + test.averageTime, 0) / apiTests.length
            );

            const totalCacheAttempts = apiTests.reduce((sum, test) => sum + test.attempts.length, 0);
            const totalCacheHits = apiTests.reduce((sum, test) => 
                sum + test.attempts.filter(attempt => attempt.cacheHit).length, 0
            );
            
            this.results.summary.cacheHitRate = totalCacheAttempts > 0 ? 
                Math.round((totalCacheHits / totalCacheAttempts) * 100) : 0;
        }

        // Add database performance to summary
        const dbMetrics = Object.values(this.results.performanceMetrics)
            .filter(metric => metric.actual !== null);
        
        if (dbMetrics.length > 0) {
            const avgDbTime = Math.round(
                dbMetrics.reduce((sum, metric) => sum + metric.actual, 0) / dbMetrics.length
            );
            this.results.summary.averageDatabaseTime = avgDbTime;
        }
    }

    /**
     * Generate comprehensive performance report
     */
    async generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, `final-performance-report-${timestamp}.json`);
        
        // Add final recommendations
        if (this.results.summary.failedTests === 0) {
            this.results.recommendations.push({
                type: 'SUCCESS',
                message: 'All performance targets achieved! Consider monitoring these metrics in production.',
                nextSteps: [
                    'Set up automated performance monitoring',
                    'Implement alerting for response time degradation',
                    'Schedule regular cache warming',
                    'Monitor database query performance trends'
                ]
            });
        } else {
            this.results.recommendations.push({
                type: 'ACTION_REQUIRED',
                message: 'Some performance targets not met. Immediate optimization needed.',
                nextSteps: [
                    'Review failed tests and implement suggested optimizations',
                    'Verify all indexes are created and being used',
                    'Check cache service status and hit rates',
                    'Consider scaling database resources if needed'
                ]
            });
        }

        // Write detailed report
        await fs.promises.writeFile(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Detailed report saved: ${reportPath}`);

        // Generate summary report
        const summaryPath = path.join(__dirname, `performance-summary-${timestamp}.md`);
        const summaryContent = this.generateMarkdownSummary();
        await fs.promises.writeFile(summaryPath, summaryContent);
        console.log(`📋 Summary report saved: ${summaryPath}`);
    }

    /**
     * Generate markdown summary report
     */
    generateMarkdownSummary() {
        const { summary, performanceMetrics, recommendations } = this.results;
        
        return `# Final Performance Validation Report

## 📊 Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests} ✅
- **Failed**: ${summary.failedTests} ${summary.failedTests > 0 ? '❌' : ''}
- **Average Response Time**: ${summary.averageResponseTime}ms
- **Cache Hit Rate**: ${summary.cacheHitRate}%
${summary.averageDatabaseTime ? `- **Average Database Time**: ${summary.averageDatabaseTime}ms` : ''}

## 🎯 Performance Targets vs Actual

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Blog Categories | ${performanceMetrics.blogCategories.target}ms | ${performanceMetrics.blogCategories.actual || 'N/A'}ms | ${performanceMetrics.blogCategories.status} |
| Front Banner Blogs | ${performanceMetrics.frontBannerBlogs.target}ms | ${performanceMetrics.frontBannerBlogs.actual || 'N/A'}ms | ${performanceMetrics.frontBannerBlogs.status} |
| Individual Blogs | ${performanceMetrics.individualBlogs.target}ms | ${performanceMetrics.individualBlogs.actual || 'N/A'}ms | ${performanceMetrics.individualBlogs.status} |
| Related Posts | ${performanceMetrics.relatedPosts.target}ms | ${performanceMetrics.relatedPosts.actual || 'N/A'}ms | ${performanceMetrics.relatedPosts.status} |

## 📋 Recommendations

${recommendations.map(rec => `### ${rec.test || rec.type}
**Issue**: ${rec.issue || rec.message}
**Suggestion**: ${Array.isArray(rec.suggestion) ? rec.suggestion.join(', ') : rec.suggestion}
${rec.nextSteps ? `**Next Steps**: ${rec.nextSteps.join(', ')}` : ''}
`).join('\n')}

## 🚀 Next Steps

1. **Monitor Production Performance**: Set up continuous monitoring
2. **Cache Optimization**: Ensure cache warming strategies are active
3. **Database Monitoring**: Track query performance trends
4. **Alerting**: Implement alerts for performance degradation
5. **Regular Validation**: Schedule weekly performance validation runs

---
*Generated on ${new Date().toLocaleString()}*
`;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new FinalPerformanceValidator();
    validator.runValidation()
        .then(() => {
            console.log('🎉 Performance validation completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Performance validation failed:', error);
            process.exit(1);
        });
}

module.exports = FinalPerformanceValidator;