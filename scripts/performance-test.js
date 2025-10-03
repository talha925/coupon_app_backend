/**
 * Performance Testing Script for Blog API
 * Tests the current performance and measures improvements
 */

const https = require('https');
const http = require('http');
const { getBaseURL } = require('../utils/configUtils');

// Configuration
const BASE_URL = getBaseURL(5000);
const TEST_ITERATIONS = 5;

/**
 * Make HTTP request and measure response time
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const req = http.request(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                try {
                    const parsedData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        responseTime,
                        dataSize: data.length,
                        recordCount: Array.isArray(parsedData.data) ? parsedData.data.length : 0,
                        data: parsedData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        responseTime,
                        dataSize: data.length,
                        recordCount: 0,
                        error: 'Failed to parse JSON',
                        rawData: data
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

/**
 * Run performance test for a specific endpoint
 */
async function runPerformanceTest(endpoint, description) {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`📍 Endpoint: ${endpoint}`);
    console.log('=' .repeat(50));
    
    const results = [];
    
    for (let i = 1; i <= TEST_ITERATIONS; i++) {
        try {
            console.log(`Run ${i}/${TEST_ITERATIONS}...`);
            const result = await makeRequest(`${BASE_URL}${endpoint}`);
            results.push(result);
            
            console.log(`  ✅ ${result.responseTime}ms | ${result.recordCount} records | ${(result.dataSize/1024).toFixed(2)}KB`);
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            results.push({ error: error.message, responseTime: null });
        }
    }
    
    // Calculate statistics
    const validResults = results.filter(r => r.responseTime !== null);
    if (validResults.length > 0) {
        const responseTimes = validResults.map(r => r.responseTime);
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minTime = Math.min(...responseTimes);
        const maxTime = Math.max(...responseTimes);
        
        const avgDataSize = validResults.reduce((a, b) => a + b.dataSize, 0) / validResults.length;
        const avgRecordCount = validResults.reduce((a, b) => a + b.recordCount, 0) / validResults.length;
        
        console.log('\n📊 STATISTICS:');
        console.log(`  Average Response Time: ${avgTime.toFixed(2)}ms`);
        console.log(`  Min Response Time: ${minTime}ms`);
        console.log(`  Max Response Time: ${maxTime}ms`);
        console.log(`  Average Data Size: ${(avgDataSize/1024).toFixed(2)}KB`);
        console.log(`  Average Record Count: ${avgRecordCount.toFixed(1)}`);
        
        return {
            endpoint,
            description,
            avgTime,
            minTime,
            maxTime,
            avgDataSize,
            avgRecordCount,
            successRate: (validResults.length / TEST_ITERATIONS) * 100
        };
    } else {
        console.log('\n❌ All requests failed');
        return {
            endpoint,
            description,
            avgTime: null,
            error: 'All requests failed'
        };
    }
}

/**
 * Main performance testing function
 */
async function runPerformanceTests() {
    console.log('🚀 Starting Performance Analysis...\n');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Test Iterations: ${TEST_ITERATIONS}`);
    
    const testCases = [
        {
            endpoint: '/api/blogs?frontBanner=true&limit=10',
            description: 'Front Banner Blogs (Current Query - BEFORE optimization)'
        },
        {
            endpoint: '/api/blogs?frontBanner=true&limit=5',
            description: 'Front Banner Blogs - Small Limit'
        },
        {
            endpoint: '/api/blogs?frontBanner=true&limit=20',
            description: 'Front Banner Blogs - Large Limit'
        },
        {
            endpoint: '/api/blogs?limit=10',
            description: 'All Blogs - No Filter'
        }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
        const result = await runPerformanceTest(testCase.endpoint, testCase.description);
        results.push(result);
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary Report
    console.log('\n' + '='.repeat(70));
    console.log('📋 PERFORMANCE SUMMARY REPORT');
    console.log('='.repeat(70));
    
    results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.description}`);
        console.log(`   Endpoint: ${result.endpoint}`);
        if (result.avgTime) {
            console.log(`   Average Time: ${result.avgTime.toFixed(2)}ms`);
            console.log(`   Data Size: ${(result.avgDataSize/1024).toFixed(2)}KB`);
            console.log(`   Records: ${result.avgRecordCount.toFixed(1)}`);
            console.log(`   Success Rate: ${result.successRate}%`);
        } else {
            console.log(`   Status: FAILED - ${result.error}`);
        }
    });
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportData = {
        timestamp: new Date().toISOString(),
        testConfig: {
            baseUrl: BASE_URL,
            iterations: TEST_ITERATIONS
        },
        results: results
    };
    
    require('fs').writeFileSync(
        `scripts/performance-report-${timestamp}.json`,
        JSON.stringify(reportData, null, 2)
    );
    
    console.log(`\n💾 Report saved to: scripts/performance-report-${timestamp}.json`);
    console.log('\n✅ Performance analysis complete!');
    
    return results;
}

// Run the tests
if (require.main === module) {
    runPerformanceTests().catch(console.error);
}

module.exports = { runPerformanceTests, makeRequest };