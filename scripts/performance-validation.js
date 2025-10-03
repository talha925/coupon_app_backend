/**
 * Performance Validation Script
 * Tests all API endpoints and measures performance improvements
 */

const http = require('http');
const { URL } = require('url');
const { buildApiURL, getBaseURL } = require('../utils/configUtils');

const BASE_URL = buildApiURL('', getBaseURL(5000));
const TEST_ITERATIONS = 5;

class PerformanceValidator {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    async measureEndpoint(name, url, iterations = TEST_ITERATIONS) {
        console.log(`\n🔍 Testing ${name}...`);
        const times = [];
        
        for (let i = 0; i < iterations; i++) {
            const start = Date.now();
            try {
                const response = await this.makeRequest(`${BASE_URL}${url}`);
                const end = Date.now();
                const responseTime = end - start;
                times.push(responseTime);
                
                console.log(`  Iteration ${i + 1}: ${responseTime}ms (Status: ${response.statusCode}, Size: ${response.data.length} bytes)`);
            } catch (error) {
                console.error(`  ❌ Error in iteration ${i + 1}:`, error.message);
                times.push(null);
            }
        }

        const validTimes = times.filter(t => t !== null);
        if (validTimes.length === 0) {
            console.log(`  ❌ All requests failed for ${name}`);
            return null;
        }

        const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
        const min = Math.min(...validTimes);
        const max = Math.max(...validTimes);
        
        const result = {
            endpoint: name,
            url,
            iterations: validTimes.length,
            averageTime: Math.round(avg),
            minTime: min,
            maxTime: max,
            successRate: (validTimes.length / iterations) * 100
        };

        this.results.push(result);
        
        console.log(`  📊 Results: Avg: ${result.averageTime}ms, Min: ${result.minTime}ms, Max: ${result.maxTime}ms, Success: ${result.successRate}%`);
        
        // Performance assessment
        if (avg < 500) {
            console.log(`  ⚡ EXCELLENT performance`);
        } else if (avg < 1000) {
            console.log(`  🟢 GOOD performance`);
        } else if (avg < 2000) {
            console.log(`  🟡 ACCEPTABLE performance`);
        } else {
            console.log(`  🔴 NEEDS IMPROVEMENT`);
        }

        return result;
    }

    makeRequest(url) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async runAllTests() {
        console.log('🚀 Starting Performance Validation Tests...\n');
        console.log(`📅 Test started at: ${new Date().toISOString()}`);
        console.log(`🔄 Running ${TEST_ITERATIONS} iterations per endpoint\n`);

        // Test critical endpoints
        await this.measureEndpoint('Blog Categories (All)', '/blogCategories');
        await this.measureEndpoint('Blogs (Front Banner)', '/blogs?frontBanner=true');
        await this.measureEndpoint('Blogs (Default)', '/blogs');
        await this.measureEndpoint('Blogs (Paginated)', '/blogs?page=1&limit=5');
        await this.measureEndpoint('Blogs (Search)', '/blogs?search=test');
        await this.measureEndpoint('Blogs (Category Filter)', '/blogs?categoryId=507f1f77bcf86cd799439011');
        
        // Test cache performance (second request should be faster)
        console.log('\n🔄 Testing Cache Performance...');
        await this.measureEndpoint('Blog Categories (Cached)', '/blogCategories');
        await this.measureEndpoint('Blogs Front Banner (Cached)', '/blogs?frontBanner=true');

        this.generateReport();
    }

    generateReport() {
        const totalTime = Date.now() - this.startTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 PERFORMANCE VALIDATION REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n⏱️  Total test duration: ${totalTime}ms`);
        console.log(`📅 Test completed at: ${new Date().toISOString()}\n`);

        // Summary table
        console.log('📈 ENDPOINT PERFORMANCE SUMMARY:');
        console.log('-'.repeat(80));
        console.log('| Endpoint                    | Avg Time | Min Time | Max Time | Success |');
        console.log('-'.repeat(80));
        
        this.results.forEach(result => {
            if (result) {
                const name = result.endpoint.padEnd(27);
                const avg = `${result.averageTime}ms`.padEnd(8);
                const min = `${result.minTime}ms`.padEnd(8);
                const max = `${result.maxTime}ms`.padEnd(8);
                const success = `${result.successRate}%`.padEnd(7);
                console.log(`| ${name} | ${avg} | ${min} | ${max} | ${success} |`);
            }
        });
        console.log('-'.repeat(80));

        // Performance analysis
        const validResults = this.results.filter(r => r !== null);
        const overallAvg = validResults.reduce((sum, r) => sum + r.averageTime, 0) / validResults.length;
        const fastEndpoints = validResults.filter(r => r.averageTime < 500).length;
        const slowEndpoints = validResults.filter(r => r.averageTime > 2000).length;

        console.log('\n🎯 PERFORMANCE ANALYSIS:');
        console.log(`   Overall average response time: ${Math.round(overallAvg)}ms`);
        console.log(`   Fast endpoints (< 500ms): ${fastEndpoints}/${validResults.length}`);
        console.log(`   Slow endpoints (> 2000ms): ${slowEndpoints}/${validResults.length}`);
        
        if (overallAvg < 1000) {
            console.log('   🎉 EXCELLENT: Performance targets exceeded!');
        } else if (overallAvg < 2000) {
            console.log('   ✅ GOOD: Performance targets met!');
        } else {
            console.log('   ⚠️  WARNING: Performance needs improvement');
        }

        // Recommendations
        console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
        const recommendations = [];
        
        if (slowEndpoints > 0) {
            recommendations.push('- Consider additional caching for slow endpoints');
            recommendations.push('- Review database indexes for slow queries');
        }
        
        if (overallAvg > 1000) {
            recommendations.push('- Implement response compression');
            recommendations.push('- Consider CDN for static assets');
        }
        
        if (recommendations.length === 0) {
            console.log('   🎯 No immediate optimizations needed - performance is excellent!');
        } else {
            recommendations.forEach(rec => console.log(`   ${rec}`));
        }

        console.log('\n' + '='.repeat(80));
        
        // Save results to file
        const reportData = {
            timestamp: new Date().toISOString(),
            testDuration: totalTime,
            results: this.results,
            summary: {
                overallAverage: Math.round(overallAvg),
                fastEndpoints,
                slowEndpoints,
                totalEndpoints: validResults.length
            }
        };

        const fs = require('fs');
        const reportFile = `performance-validation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
        console.log(`📄 Detailed report saved to: ${reportFile}`);
    }
}

// Run the validation if this script is executed directly
if (require.main === module) {
    const validator = new PerformanceValidator();
    validator.runAllTests().catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });
}

module.exports = PerformanceValidator;