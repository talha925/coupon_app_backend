const express = require('express');
const { performanceMonitor } = require('../middlewares/performanceMonitoring');
const healthCheckService = require('../services/healthCheckService');
const performanceReporter = require('../services/performanceReporter');
const storeService = require('../services/storeService');

const router = express.Router();

// Dashboard home page
router.get('/', async (req, res) => {
    const stats = performanceMonitor.getMetrics();
    const healthStatus = await healthCheckService.runHealthCheck();

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        performance: {
            totalRequests: stats.summary.totalApiCalls,
            averageResponseTime: stats.summary.avgApiResponseTime,
            slowRequests: stats.alerts.filter(alert => alert.type === 'SLOW_API').length,
            cacheHitRate: stats.summary.cacheHitRate,
            dbQueryCount: stats.summary.totalDbQueries,
            averageDbQueryTime: stats.summary.avgDbQueryTime
        },
        health: healthStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Performance metrics endpoint
router.get('/metrics', (req, res) => {
    const stats = performanceMonitor.getMetrics();
    res.json(stats);
});

// Health check endpoint
router.get('/health', async (req, res) => {
    const healthStatus = await healthCheckService.runHealthCheck();
    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
});

router.get('/system-health', async (req, res) => {
    const health = await storeService.getSystemHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Generate performance report
router.get('/report/:type', async (req, res) => {
    const { type } = req.params;
    const stats = performanceMonitor.getMetrics();

    try {
        let report;
        if (type === 'daily') {
            report = await performanceReporter.generateDailyReport();
        } else if (type === 'weekly') {
            report = await performanceReporter.generateWeeklyReport();
        } else {
            return res.status(400).json({ error: 'Invalid report type' });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset performance stats
router.post('/reset', (req, res) => {
    performanceMonitor.resetStats();
    res.json({ message: 'Performance stats reset' });
});

module.exports = router;