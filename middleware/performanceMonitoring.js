/**
 * 🚨 CRITICAL: Advanced Performance Monitoring System
 * Real-time API performance tracking with alerting
 */

const mongoose = require('mongoose');
const { PERFORMANCE, MONITORING } = require('../config/constants');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: new Map(),
      dbQueries: new Map(),
      cacheStats: {
        hits: 0,
        misses: 0,
        totalRequests: 0
      },
      alerts: [],
      startTime: Date.now()
    };
    
    this.thresholds = {
      apiResponseTime: PERFORMANCE.API_RESPONSE_TIME_THRESHOLD,
      dbQueryTime: PERFORMANCE.DB_QUERY_TIME_THRESHOLD,
      cacheHitRate: PERFORMANCE.CACHE_HIT_RATE_THRESHOLD,
      alertCooldown: MONITORING.ALERT_COOLDOWN
    };

    this.lastAlerts = new Map();
  }

  // 🚨 CRITICAL: API Response Time Monitoring
  trackApiCall(req, res, next) {
    const startTime = Date.now();
    const originalSend = res.send;
    
    res.send = function(data) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      // Track API metrics
      if (!performanceMonitor.metrics.apiCalls.has(endpoint)) {
        performanceMonitor.metrics.apiCalls.set(endpoint, {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          maxTime: 0,
          minTime: Infinity,
          slowCalls: 0
        });
      }
      
      const apiMetric = performanceMonitor.metrics.apiCalls.get(endpoint);
      apiMetric.count++;
      apiMetric.totalTime += responseTime;
      apiMetric.avgTime = apiMetric.totalTime / apiMetric.count;
      apiMetric.maxTime = Math.max(apiMetric.maxTime, responseTime);
      apiMetric.minTime = Math.min(apiMetric.minTime, responseTime);
      
      // Track slow calls
      if (responseTime > performanceMonitor.thresholds.apiResponseTime) {
        apiMetric.slowCalls++;
        performanceMonitor.generateAlert('SLOW_API', {
          endpoint,
          responseTime,
          threshold: performanceMonitor.thresholds.apiResponseTime,
          timestamp: new Date().toISOString()
        });
      }
      
      // Log performance data
      console.log(`📊 API: ${endpoint} - ${responseTime}ms ${responseTime > performanceMonitor.thresholds.apiResponseTime ? '🚨' : '✅'}`);
      
      originalSend.call(this, data);
    };
    
    next();
  }

  // 🚨 CRITICAL: Database Query Performance Monitoring
  setupDatabaseMonitoring() {
    // Monitor MongoDB queries
    mongoose.set('debug', (collectionName, method, query, doc, options) => {
      const startTime = Date.now();
      
      // Create a unique query identifier
      const queryId = `${collectionName}.${method}`;
      
      if (!this.metrics.dbQueries.has(queryId)) {
        this.metrics.dbQueries.set(queryId, {
          count: 0,
          totalTime: 0,
          avgTime: 0,
          maxTime: 0,
          minTime: Infinity,
          slowQueries: 0
        });
      }
      
      // Simulate query completion (in real implementation, this would be in a callback)
      setTimeout(() => {
        const endTime = Date.now();
        const queryTime = endTime - startTime;
        
        const dbMetric = this.metrics.dbQueries.get(queryId);
        dbMetric.count++;
        dbMetric.totalTime += queryTime;
        dbMetric.avgTime = dbMetric.totalTime / dbMetric.count;
        dbMetric.maxTime = Math.max(dbMetric.maxTime, queryTime);
        dbMetric.minTime = Math.min(dbMetric.minTime, queryTime);
        
        if (queryTime > this.thresholds.dbQueryTime) {
          dbMetric.slowQueries++;
          this.generateAlert('SLOW_QUERY', {
            queryId,
            queryTime,
            threshold: this.thresholds.dbQueryTime,
            query: JSON.stringify(query),
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`🗄️  DB: ${queryId} - ${queryTime}ms ${queryTime > this.thresholds.dbQueryTime ? '🚨' : '✅'}`);
      }, 1);
    });
  }

  // 🚨 CRITICAL: Cache Performance Monitoring
  trackCacheOperation(operation, key, hit = false) {
    this.metrics.cacheStats.totalRequests++;
    
    if (hit) {
      this.metrics.cacheStats.hits++;
      console.log(`💾 Cache HIT: ${key} ✅`);
    } else {
      this.metrics.cacheStats.misses++;
      console.log(`💾 Cache MISS: ${key} ❌`);
    }
    
    const hitRate = this.metrics.cacheStats.hits / this.metrics.cacheStats.totalRequests;
    
    // Alert on low cache hit rate
    if (hitRate < this.thresholds.cacheHitRate && this.metrics.cacheStats.totalRequests > 10) {
      this.generateAlert('LOW_CACHE_HIT_RATE', {
        hitRate: (hitRate * 100).toFixed(2),
        threshold: (this.thresholds.cacheHitRate * 100).toFixed(2),
        totalRequests: this.metrics.cacheStats.totalRequests,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🚨 CRITICAL: Alert Generation System
  generateAlert(type, data) {
    const alertKey = `${type}_${data.endpoint || data.queryId || 'cache'}`;
    const now = Date.now();
    
    // Implement alert cooldown to prevent spam
    if (this.lastAlerts.has(alertKey)) {
      const lastAlert = this.lastAlerts.get(alertKey);
      if (now - lastAlert < this.thresholds.alertCooldown) {
        return; // Skip alert due to cooldown
      }
    }
    
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity: this.getAlertSeverity(type, data),
      message: this.generateAlertMessage(type, data),
      data,
      timestamp: new Date().toISOString()
    };
    
    this.metrics.alerts.push(alert);
    this.lastAlerts.set(alertKey, now);
    
    // Log alert
    console.log(`🚨 ALERT [${alert.severity}]: ${alert.message}`);
    
    // In production, send to monitoring service (e.g., Slack, email, etc.)
    this.sendAlert(alert);
    
    return alert;
  }

  getAlertSeverity(type, data) {
    switch (type) {
      case 'SLOW_API':
        return data.responseTime > 2000 ? 'CRITICAL' : 'WARNING';
      case 'SLOW_QUERY':
        return data.queryTime > 500 ? 'CRITICAL' : 'WARNING';
      case 'LOW_CACHE_HIT_RATE':
        return parseFloat(data.hitRate) < 50 ? 'CRITICAL' : 'WARNING';
      default:
        return 'INFO';
    }
  }

  generateAlertMessage(type, data) {
    switch (type) {
      case 'SLOW_API':
        return `Slow API response: ${data.endpoint} took ${data.responseTime}ms (threshold: ${data.threshold}ms)`;
      case 'SLOW_QUERY':
        return `Slow database query: ${data.queryId} took ${data.queryTime}ms (threshold: ${data.threshold}ms)`;
      case 'LOW_CACHE_HIT_RATE':
        return `Low cache hit rate: ${data.hitRate}% (threshold: ${data.threshold}%)`;
      default:
        return `Performance alert: ${type}`;
    }
  }

  sendAlert(alert) {
    // In production, implement actual alerting (Slack, email, monitoring service)
    // For now, just log to console with enhanced formatting
    console.log(`
🚨 PERFORMANCE ALERT 🚨
Type: ${alert.type}
Severity: ${alert.severity}
Message: ${alert.message}
Timestamp: ${alert.timestamp}
Data: ${JSON.stringify(alert.data, null, 2)}
    `);
  }

  // 🚨 PERFORMANCE DASHBOARD: Get current metrics
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const cacheHitRate = this.metrics.cacheStats.totalRequests > 0 
      ? (this.metrics.cacheStats.hits / this.metrics.cacheStats.totalRequests * 100).toFixed(2)
      : 0;

    return {
      uptime: `${Math.floor(uptime / 1000)}s`,
      apiCalls: Object.fromEntries(this.metrics.apiCalls),
      dbQueries: Object.fromEntries(this.metrics.dbQueries),
      cacheStats: {
        ...this.metrics.cacheStats,
        hitRate: `${cacheHitRate}%`
      },
      alerts: this.metrics.alerts.slice(-10), // Last 10 alerts
      summary: {
        totalApiCalls: Array.from(this.metrics.apiCalls.values()).reduce((sum, metric) => sum + metric.count, 0),
        totalDbQueries: Array.from(this.metrics.dbQueries.values()).reduce((sum, metric) => sum + metric.count, 0),
        avgApiResponseTime: this.calculateOverallAverage(this.metrics.apiCalls),
        avgDbQueryTime: this.calculateOverallAverage(this.metrics.dbQueries),
        cacheHitRate: `${cacheHitRate}%`,
        totalAlerts: this.metrics.alerts.length
      }
    };
  }

  calculateOverallAverage(metricsMap) {
    const metrics = Array.from(metricsMap.values());
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.totalTime, 0);
    const totalCount = metrics.reduce((sum, metric) => sum + metric.count, 0);
    
    return totalCount > 0 ? Math.round(totalTime / totalCount) : 0;
  }

  // 🚨 PERFORMANCE REPORT: Generate detailed performance report
  generatePerformanceReport() {
    const metrics = this.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      performance: {
        api: {
          totalCalls: metrics.summary.totalApiCalls,
          avgResponseTime: `${metrics.summary.avgApiResponseTime}ms`,
          slowEndpoints: this.getSlowEndpoints(),
          targetAchieved: metrics.summary.avgApiResponseTime < this.thresholds.apiResponseTime
        },
        database: {
          totalQueries: metrics.summary.totalDbQueries,
          avgQueryTime: `${metrics.summary.avgDbQueryTime}ms`,
          slowQueries: this.getSlowQueries(),
          targetAchieved: metrics.summary.avgDbQueryTime < this.thresholds.dbQueryTime
        },
        cache: {
          hitRate: metrics.summary.cacheHitRate,
          totalRequests: this.metrics.cacheStats.totalRequests,
          targetAchieved: parseFloat(metrics.summary.cacheHitRate) >= (this.thresholds.cacheHitRate * 100)
        }
      },
      alerts: {
        total: metrics.summary.totalAlerts,
        recent: metrics.alerts
      },
      recommendations: this.generateRecommendations(metrics)
    };

    console.log('\n📊 PERFORMANCE REPORT GENERATED');
    console.log('='.repeat(50));
    console.log(`🕐 Uptime: ${report.uptime}`);
    console.log(`📡 API Calls: ${report.performance.api.totalCalls} (avg: ${report.performance.api.avgResponseTime})`);
    console.log(`🗄️  DB Queries: ${report.performance.database.totalQueries} (avg: ${report.performance.database.avgQueryTime})`);
    console.log(`💾 Cache Hit Rate: ${report.performance.cache.hitRate}`);
    console.log(`🚨 Total Alerts: ${report.alerts.total}`);
    console.log('='.repeat(50));

    return report;
  }

  getSlowEndpoints() {
    return Array.from(this.metrics.apiCalls.entries())
      .filter(([_, metric]) => metric.avgTime > this.thresholds.apiResponseTime)
      .map(([endpoint, metric]) => ({
        endpoint,
        avgTime: `${Math.round(metric.avgTime)}ms`,
        slowCalls: metric.slowCalls,
        totalCalls: metric.count
      }));
  }

  getSlowQueries() {
    return Array.from(this.metrics.dbQueries.entries())
      .filter(([_, metric]) => metric.avgTime > this.thresholds.dbQueryTime)
      .map(([queryId, metric]) => ({
        queryId,
        avgTime: `${Math.round(metric.avgTime)}ms`,
        slowQueries: metric.slowQueries,
        totalQueries: metric.count
      }));
  }

  generateRecommendations(metrics) {
    const recommendations = [];

    // API performance recommendations
    if (metrics.summary.avgApiResponseTime > this.thresholds.apiResponseTime) {
      recommendations.push({
        type: 'API_OPTIMIZATION',
        priority: 'HIGH',
        message: 'API response times exceed target. Consider implementing additional caching or query optimization.'
      });
    }

    // Database performance recommendations
    if (metrics.summary.avgDbQueryTime > this.thresholds.dbQueryTime) {
      recommendations.push({
        type: 'DATABASE_OPTIMIZATION',
        priority: 'HIGH',
        message: 'Database queries are slow. Review indexes and query patterns.'
      });
    }

    // Cache performance recommendations
    const cacheHitRate = parseFloat(metrics.summary.cacheHitRate);
    if (cacheHitRate < (this.thresholds.cacheHitRate * 100)) {
      recommendations.push({
        type: 'CACHE_OPTIMIZATION',
        priority: 'MEDIUM',
        message: 'Cache hit rate is below target. Consider cache warming or TTL adjustments.'
      });
    }

    return recommendations;
  }

  // 🚨 RESET METRICS: Clear all metrics (useful for testing)
  resetMetrics() {
    this.metrics = {
      apiCalls: new Map(),
      dbQueries: new Map(),
      cacheStats: {
        hits: 0,
        misses: 0,
        totalRequests: 0
      },
      alerts: [],
      startTime: Date.now()
    };
    console.log('📊 Performance metrics reset');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// 🚨 MIDDLEWARE EXPORT: Express middleware for API monitoring
const performanceMiddleware = (req, res, next) => {
  performanceMonitor.trackApiCall(req, res, next);
};

// 🚨 CACHE MONITORING HELPER: Track cache operations
const trackCache = (operation, key, hit = false) => {
  performanceMonitor.trackCacheOperation(operation, key, hit);
};

module.exports = {
  performanceMonitor,
  performanceMiddleware,
  trackCache
};