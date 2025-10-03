#!/usr/bin/env node

/**
 * Production Monitoring Setup Script
 * 
 * This script sets up comprehensive monitoring for the optimized blog system:
 * - Performance alerts and thresholds
 * - Cache monitoring and alerts
 * - Database query performance tracking
 * - Automated health checks
 * - Performance report generation
 */

const fs = require('fs').promises;
const path = require('path');

class ProductionMonitoringSetup {
    constructor() {
        this.monitoringConfig = {
            performance: {
                apiResponseThresholds: {
                    blogCategories: 300,      // ms
                    frontBannerBlogs: 200,    // ms
                    blogListing: 250,         // ms
                    individualBlog: 500,      // ms
                    relatedPosts: 300         // ms
                },
                dbQueryThresholds: {
                    blogCategories: 50,       // ms
                    blogPosts: 100,           // ms
                    relatedPosts: 150         // ms
                },
                cacheTargets: {
                    hitRate: 80,              // %
                    responseImprovement: 70   // %
                }
            },
            alerts: {
                email: {
                    enabled: false,
                    recipients: ['admin@example.com'],
                    cooldownMinutes: 30
                },
                slack: {
                    enabled: false,
                    webhook: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
                    channel: '#alerts'
                },
                console: {
                    enabled: true,
                    logLevel: 'warn'
                }
            },
            healthChecks: {
                interval: 300000,            // 5 minutes
                endpoints: [
                    '/api/blogCategories/',
                    '/api/blogs?FrontBanner=true&limit=5',
                    '/api/blogs?limit=5'
                ]
            },
            reporting: {
                dailyReports: true,
                weeklyReports: true,
                performanceBaseline: {
                    blogCategories: 10000,    // Original 10s
                    frontBannerBlogs: 9000,   // Original 9s
                    individualBlog: 4800      // Original 4.8s
                }
            }
        };
    }

    async setupMonitoring() {
        console.log('🚀 Setting up Production Monitoring...\n');

        try {
            // 1. Create monitoring configuration
            await this.createMonitoringConfig();
            
            // 2. Setup health check service
            await this.createHealthCheckService();
            
            // 3. Create alert manager
            await this.createAlertManager();
            
            // 4. Setup performance reporter
            await this.createPerformanceReporter();
            
            // 5. Create monitoring dashboard
            await this.createMonitoringDashboard();
            
            // 6. Generate deployment guide
            await this.generateDeploymentGuide();
            
            console.log('✅ Production monitoring setup complete!\n');
            this.printSummary();
            
        } catch (error) {
            console.error('❌ Monitoring setup failed:', error.message);
            throw error;
        }
    }

    async createMonitoringConfig() {
        console.log('📋 Creating monitoring configuration...');
        
        const configPath = path.join(__dirname, '..', 'config', 'monitoring.json');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        
        await fs.writeFile(
            configPath,
            JSON.stringify(this.monitoringConfig, null, 2)
        );
        
        console.log('✅ Monitoring config created at:', configPath);
    }

    async createHealthCheckService() {
        console.log('🏥 Creating health check service...');
        
        const healthCheckCode = `
const axios = require('axios');
const { performanceMonitor } = require('../middleware/performanceMonitoring');

class HealthCheckService {
    constructor() {
        this.baseURL = process.env.BASE_URL || 'http://localhost:5000';
        this.config = require('../config/monitoring.json');
        this.isRunning = false;
    }

    async start() {
        if (this.isRunning) return;
        
        console.log('🏥 Starting health check service...');
        this.isRunning = true;
        
        // Run initial health check
        await this.runHealthCheck();
        
        // Schedule periodic health checks
        this.interval = setInterval(async () => {
            await this.runHealthCheck();
        }, this.config.healthChecks.interval);
        
        console.log(\`✅ Health checks scheduled every \${this.config.healthChecks.interval / 1000}s\`);
    }

    async stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('🛑 Health check service stopped');
    }

    async runHealthCheck() {
        const results = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: []
        };

        for (const endpoint of this.config.healthChecks.endpoints) {
            const checkResult = await this.checkEndpoint(endpoint);
            results.checks.push(checkResult);
            
            if (!checkResult.healthy) {
                results.status = 'unhealthy';
            }
        }

        // Log results
        if (results.status === 'unhealthy') {
            console.warn('⚠️ Health check failed:', results);
            performanceMonitor.generateAlert('health_check_failed', results);
        } else {
            console.log('✅ Health check passed');
        }

        return results;
    }

    async checkEndpoint(endpoint) {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(\`\${this.baseURL}\${endpoint}\`, {
                timeout: 10000,
                headers: { 'User-Agent': 'HealthCheck/1.0' }
            });
            
            const responseTime = Date.now() - startTime;
            const healthy = response.status === 200 && responseTime < 5000;
            
            return {
                endpoint,
                healthy,
                responseTime,
                statusCode: response.status,
                error: null
            };
            
        } catch (error) {
            return {
                endpoint,
                healthy: false,
                responseTime: Date.now() - startTime,
                statusCode: error.response?.status || 0,
                error: error.message
            };
        }
    }
}

module.exports = new HealthCheckService();
`;

        const healthCheckPath = path.join(__dirname, '..', 'services', 'healthCheckService.js');
        await fs.writeFile(healthCheckPath, healthCheckCode.trim());
        
        console.log('✅ Health check service created');
    }

    async createAlertManager() {
        console.log('🚨 Creating alert manager...');
        
        const alertManagerCode = `
const nodemailer = require('nodemailer');
const axios = require('axios');

class AlertManager {
    constructor() {
        this.config = require('../config/monitoring.json').alerts;
        this.alertCooldowns = new Map();
        this.setupEmailTransporter();
    }

    setupEmailTransporter() {
        if (this.config.email.enabled) {
            this.emailTransporter = nodemailer.createTransporter({
                // Configure your email service here
                service: 'gmail', // or your preferred service
                auth: {
                    user: process.env.ALERT_EMAIL_USER,
                    pass: process.env.ALERT_EMAIL_PASS
                }
            });
        }
    }

    async sendAlert(type, data, severity = 'warning') {
        const alertKey = \`\${type}_\${severity}\`;
        
        // Check cooldown
        if (this.isInCooldown(alertKey)) {
            return;
        }

        const alert = {
            type,
            severity,
            timestamp: new Date().toISOString(),
            data,
            message: this.formatAlertMessage(type, data, severity)
        };

        // Send to configured channels
        await Promise.all([
            this.sendConsoleAlert(alert),
            this.sendEmailAlert(alert),
            this.sendSlackAlert(alert)
        ]);

        // Set cooldown
        this.setCooldown(alertKey);
    }

    isInCooldown(alertKey) {
        const cooldownEnd = this.alertCooldowns.get(alertKey);
        return cooldownEnd && Date.now() < cooldownEnd;
    }

    setCooldown(alertKey) {
        const cooldownMs = this.config.email.cooldownMinutes * 60 * 1000;
        this.alertCooldowns.set(alertKey, Date.now() + cooldownMs);
    }

    formatAlertMessage(type, data, severity) {
        switch (type) {
            case 'performance_threshold_exceeded':
                return \`🐌 Performance Alert: \${data.endpoint} took \${data.responseTime}ms (threshold: \${data.threshold}ms)\`;
            case 'cache_hit_rate_low':
                return \`💾 Cache Alert: Hit rate dropped to \${data.hitRate}% (target: \${data.target}%)\`;
            case 'health_check_failed':
                return \`🏥 Health Check Failed: \${data.checks.filter(c => !c.healthy).length} endpoints unhealthy\`;
            case 'database_query_slow':
                return \`🗄️ Database Alert: Query took \${data.queryTime}ms (threshold: \${data.threshold}ms)\`;
            default:
                return \`⚠️ Alert: \${type} - \${JSON.stringify(data)}\`;
        }
    }

    async sendConsoleAlert(alert) {
        if (!this.config.console.enabled) return;
        
        const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
        console.log(\`\${emoji} ALERT [\${alert.severity.toUpperCase()}]: \${alert.message}\`);
    }

    async sendEmailAlert(alert) {
        if (!this.config.email.enabled || !this.emailTransporter) return;
        
        try {
            await this.emailTransporter.sendMail({
                from: process.env.ALERT_EMAIL_USER,
                to: this.config.email.recipients.join(','),
                subject: \`[\${alert.severity.toUpperCase()}] Blog System Alert: \${alert.type}\`,
                html: \`
                    <h2>Blog System Alert</h2>
                    <p><strong>Type:</strong> \${alert.type}</p>
                    <p><strong>Severity:</strong> \${alert.severity}</p>
                    <p><strong>Time:</strong> \${alert.timestamp}</p>
                    <p><strong>Message:</strong> \${alert.message}</p>
                    <pre>\${JSON.stringify(alert.data, null, 2)}</pre>
                \`
            });
        } catch (error) {
            console.error('Failed to send email alert:', error.message);
        }
    }

    async sendSlackAlert(alert) {
        if (!this.config.slack.enabled) return;
        
        try {
            await axios.post(this.config.slack.webhook, {
                channel: this.config.slack.channel,
                text: alert.message,
                attachments: [{
                    color: alert.severity === 'critical' ? 'danger' : 'warning',
                    fields: [
                        { title: 'Type', value: alert.type, short: true },
                        { title: 'Severity', value: alert.severity, short: true },
                        { title: 'Time', value: alert.timestamp, short: false }
                    ]
                }]
            });
        } catch (error) {
            console.error('Failed to send Slack alert:', error.message);
        }
    }
}

module.exports = new AlertManager();
`;

        const alertManagerPath = path.join(__dirname, '..', 'services', 'alertManager.js');
        await fs.writeFile(alertManagerPath, alertManagerCode.trim());
        
        console.log('✅ Alert manager created');
    }

    async createPerformanceReporter() {
        console.log('📊 Creating performance reporter...');
        
        const reporterCode = `
const fs = require('fs').promises;
const path = require('path');
const { performanceMonitor } = require('../middleware/performanceMonitoring');

class PerformanceReporter {
    constructor() {
        this.config = require('../config/monitoring.json');
        this.reportsDir = path.join(__dirname, '..', 'reports');
    }

    async generateDailyReport() {
        const report = await this.createReport('daily');
        const filename = \`daily-performance-\${new Date().toISOString().split('T')[0]}.json\`;
        
        await this.saveReport(filename, report);
        console.log(\`📊 Daily report generated: \${filename}\`);
        
        return report;
    }

    async generateWeeklyReport() {
        const report = await this.createReport('weekly');
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const filename = \`weekly-performance-\${weekStart.toISOString().split('T')[0]}.json\`;
        
        await this.saveReport(filename, report);
        console.log(\`📊 Weekly report generated: \${filename}\`);
        
        return report;
    }

    async createReport(period) {
        const stats = performanceMonitor.getStats();
        const baseline = this.config.reporting.performanceBaseline;
        
        return {
            period,
            timestamp: new Date().toISOString(),
            summary: {
                totalRequests: stats.totalRequests,
                averageResponseTime: stats.averageResponseTime,
                slowRequests: stats.slowRequests,
                cacheHitRate: stats.cacheHitRate,
                dbQueryCount: stats.dbQueryCount,
                averageDbQueryTime: stats.averageDbQueryTime
            },
            improvements: {
                blogCategories: {
                    baseline: baseline.blogCategories,
                    current: stats.endpoints?.blogCategories?.averageTime || 0,
                    improvement: this.calculateImprovement(baseline.blogCategories, stats.endpoints?.blogCategories?.averageTime)
                },
                frontBannerBlogs: {
                    baseline: baseline.frontBannerBlogs,
                    current: stats.endpoints?.frontBannerBlogs?.averageTime || 0,
                    improvement: this.calculateImprovement(baseline.frontBannerBlogs, stats.endpoints?.frontBannerBlogs?.averageTime)
                },
                individualBlog: {
                    baseline: baseline.individualBlog,
                    current: stats.endpoints?.individualBlog?.averageTime || 0,
                    improvement: this.calculateImprovement(baseline.individualBlog, stats.endpoints?.individualBlog?.averageTime)
                }
            },
            alerts: stats.alerts || [],
            recommendations: this.generateRecommendations(stats)
        };
    }

    calculateImprovement(baseline, current) {
        if (!current || current === 0) return 0;
        return Math.round(((baseline - current) / baseline) * 100);
    }

    generateRecommendations(stats) {
        const recommendations = [];
        
        if (stats.cacheHitRate < this.config.performance.cacheTargets.hitRate) {
            recommendations.push({
                type: 'cache',
                priority: 'high',
                message: \`Cache hit rate (\${stats.cacheHitRate}%) is below target (\${this.config.performance.cacheTargets.hitRate}%)\`,
                action: 'Review cache TTL settings and warming strategy'
            });
        }
        
        if (stats.averageResponseTime > 500) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: \`Average response time (\${stats.averageResponseTime}ms) is high\`,
                action: 'Review slow endpoints and optimize queries'
            });
        }
        
        if (stats.averageDbQueryTime > 100) {
            recommendations.push({
                type: 'database',
                priority: 'medium',
                message: \`Average database query time (\${stats.averageDbQueryTime}ms) is high\`,
                action: 'Review database indexes and query optimization'
            });
        }
        
        return recommendations;
    }

    async saveReport(filename, report) {
        await fs.mkdir(this.reportsDir, { recursive: true });
        const filepath = path.join(this.reportsDir, filename);
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    }

    async scheduleDailyReports() {
        // Run daily at midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.generateDailyReport();
            // Then every 24 hours
            setInterval(() => this.generateDailyReport(), 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
        
        console.log(\`📅 Daily reports scheduled (next in \${Math.round(msUntilMidnight / 1000 / 60)} minutes)\`);
    }

    async scheduleWeeklyReports() {
        // Run weekly on Sundays at midnight
        const now = new Date();
        const nextSunday = new Date(now);
        nextSunday.setDate(now.getDate() + (7 - now.getDay()));
        nextSunday.setHours(0, 0, 0, 0);
        
        const msUntilSunday = nextSunday.getTime() - now.getTime();
        
        setTimeout(() => {
            this.generateWeeklyReport();
            // Then every week
            setInterval(() => this.generateWeeklyReport(), 7 * 24 * 60 * 60 * 1000);
        }, msUntilSunday);
        
        console.log(\`📅 Weekly reports scheduled (next in \${Math.round(msUntilSunday / 1000 / 60 / 60 / 24)} days)\`);
    }
}

module.exports = new PerformanceReporter();
`;

        const reporterPath = path.join(__dirname, '..', 'services', 'performanceReporter.js');
        await fs.writeFile(reporterPath, reporterCode.trim());
        
        console.log('✅ Performance reporter created');
    }

    async createMonitoringDashboard() {
        console.log('📈 Creating monitoring dashboard...');
        
        const dashboardCode = `
const express = require('express');
const { performanceMonitor } = require('../middleware/performanceMonitoring');
const healthCheckService = require('../services/healthCheckService');
const performanceReporter = require('../services/performanceReporter');

const router = express.Router();

// Dashboard home page
router.get('/', async (req, res) => {
    const stats = performanceMonitor.getStats();
    const healthStatus = await healthCheckService.runHealthCheck();
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        performance: {
            totalRequests: stats.totalRequests,
            averageResponseTime: stats.averageResponseTime,
            slowRequests: stats.slowRequests,
            cacheHitRate: stats.cacheHitRate,
            dbQueryCount: stats.dbQueryCount,
            averageDbQueryTime: stats.averageDbQueryTime
        },
        health: healthStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// Performance metrics endpoint
router.get('/metrics', (req, res) => {
    const stats = performanceMonitor.getStats();
    res.json(stats);
});

// Health check endpoint
router.get('/health', async (req, res) => {
    const healthStatus = await healthCheckService.runHealthCheck();
    res.status(healthStatus.status === 'healthy' ? 200 : 503).json(healthStatus);
});

// Generate performance report
router.get('/report/:type', async (req, res) => {
    const { type } = req.params;
    
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
`;

        const dashboardPath = path.join(__dirname, '..', 'routes', 'monitoringRoutes.js');
        await fs.writeFile(dashboardPath, dashboardCode.trim());
        
        console.log('✅ Monitoring dashboard created');
    }

    async generateDeploymentGuide() {
        console.log('📖 Generating deployment guide...');
        
        const deploymentGuide = `# Production Monitoring Deployment Guide

## Overview
This guide helps you deploy the comprehensive monitoring system for your optimized blog application.

## 🚀 Quick Start

### 1. Environment Variables
Add these to your production environment:

\`\`\`bash
# Email Alerts (optional)
ALERT_EMAIL_USER=your-email@gmail.com
ALERT_EMAIL_PASS=your-app-password

# Base URL for health checks
BASE_URL=https://your-domain.com

# Redis Configuration (if using external Redis)
REDIS_URL=redis://your-redis-server:6379
\`\`\`

### 2. Update app.js
Add monitoring routes to your main app:

\`\`\`javascript
// Add after other route imports
const monitoringRoutes = require('./routes/monitoringRoutes');

// Add monitoring routes
app.use('/monitoring', monitoringRoutes);

// Start health checks and reporting
const healthCheckService = require('./services/healthCheckService');
const performanceReporter = require('./services/performanceReporter');

// Start monitoring services
healthCheckService.start();
if (process.env.NODE_ENV === 'production') {
    performanceReporter.scheduleDailyReports();
    performanceReporter.scheduleWeeklyReports();
}
\`\`\`

### 3. Configure Alerts
Edit \`config/monitoring.json\` to enable your preferred alert channels:

\`\`\`json
{
  "alerts": {
    "email": {
      "enabled": true,
      "recipients": ["admin@yourdomain.com"]
    },
    "slack": {
      "enabled": true,
      "webhook": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
      "channel": "#alerts"
    }
  }
}
\`\`\`

## 📊 Monitoring Endpoints

Once deployed, access these endpoints:

- **Dashboard**: \`GET /monitoring\` - Overall system status
- **Metrics**: \`GET /monitoring/metrics\` - Detailed performance metrics
- **Health**: \`GET /monitoring/health\` - Health check status
- **Reports**: \`GET /monitoring/report/daily\` - Generate daily report
- **Reports**: \`GET /monitoring/report/weekly\` - Generate weekly report

## 🎯 Performance Targets

The system monitors these performance targets:

| Endpoint | Target | Original | Improvement |
|----------|--------|----------|-------------|
| Blog Categories | 300ms | 10,000ms | 97% faster |
| Front Banner Blogs | 200ms | 9,000ms | 98% faster |
| Individual Blog | 500ms | 4,800ms | 90% faster |
| Cache Hit Rate | 80% | 0% | New feature |

## 🚨 Alert Types

The system generates alerts for:

- **Performance**: API responses exceeding thresholds
- **Cache**: Hit rate below 80%
- **Database**: Slow queries (>100ms)
- **Health**: Endpoint failures
- **System**: High memory usage or errors

## 📈 Reports

### Daily Reports
- Generated automatically at midnight
- Include performance metrics and improvements
- Saved to \`reports/\` directory
- Available via API endpoint

### Weekly Reports
- Generated every Sunday at midnight
- Include trend analysis and recommendations
- Compare against performance baselines

## 🔧 Customization

### Adjust Thresholds
Edit \`config/monitoring.json\` to modify:
- API response time thresholds
- Database query thresholds
- Cache hit rate targets
- Alert cooldown periods

### Add Custom Metrics
Extend the \`performanceMonitor\` in your controllers:

\`\`\`javascript
const { performanceMonitor } = require('../middleware/performanceMonitoring');

// Track custom metrics
performanceMonitor.trackCustomMetric('custom_operation', responseTime);
\`\`\`

## 🛠️ Troubleshooting

### Common Issues

1. **Email alerts not working**
   - Check ALERT_EMAIL_USER and ALERT_EMAIL_PASS
   - Enable "Less secure app access" or use app passwords

2. **Health checks failing**
   - Verify BASE_URL is correct
   - Check if endpoints are accessible
   - Review firewall settings

3. **Reports not generating**
   - Check file permissions on reports directory
   - Verify disk space availability

### Debug Mode
Enable debug logging:

\`\`\`bash
DEBUG=monitoring:* npm start
\`\`\`

## 📋 Maintenance

### Regular Tasks
- Review weekly reports for performance trends
- Update alert thresholds based on usage patterns
- Clean up old report files (>30 days)
- Monitor disk space usage

### Performance Optimization
- Adjust cache TTL based on hit rates
- Review and optimize slow queries
- Scale resources based on usage patterns

## 🎉 Success Metrics

Your monitoring is working well when you see:
- ✅ Cache hit rate >80%
- ✅ API response times within targets
- ✅ Zero health check failures
- ✅ Performance improvements maintained
- ✅ Proactive alert notifications

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review application logs
3. Monitor the dashboard endpoints
4. Check alert notifications for patterns

---

**Next Steps:**
1. Deploy the monitoring system
2. Configure alerts for your team
3. Set up automated report reviews
4. Monitor performance trends
5. Optimize based on insights
`;

        const guidePath = path.join(__dirname, 'PRODUCTION_MONITORING_GUIDE.md');
        await fs.writeFile(guidePath, deploymentGuide);
        
        console.log('✅ Deployment guide created');
    }

    printSummary() {
        console.log(`
🎉 Production Monitoring Setup Complete!

📁 Files Created:
├── config/monitoring.json              - Monitoring configuration
├── services/healthCheckService.js      - Automated health checks
├── services/alertManager.js            - Alert notifications
├── services/performanceReporter.js     - Report generation
├── routes/monitoringRoutes.js          - Monitoring dashboard
└── scripts/PRODUCTION_MONITORING_GUIDE.md - Deployment guide

🚀 Next Steps:
1. Review and customize config/monitoring.json
2. Add monitoring routes to your app.js
3. Configure email/Slack alerts
4. Deploy and test the monitoring system
5. Set up automated report reviews

📊 Monitoring Features:
✅ Real-time performance tracking
✅ Automated health checks every 5 minutes
✅ Smart alerting with cooldown periods
✅ Daily and weekly performance reports
✅ Cache hit rate monitoring
✅ Database query performance tracking
✅ RESTful monitoring dashboard

🎯 Performance Targets:
• Blog Categories: <300ms (was 10s) - 97% improvement
• Front Banner: <200ms (was 9s) - 98% improvement  
• Individual Blog: <500ms (was 4.8s) - 90% improvement
• Cache Hit Rate: >80% (new feature)

📖 Read PRODUCTION_MONITORING_GUIDE.md for detailed deployment instructions.
        `);
    }
}

// Run the setup
async function main() {
    try {
        const setup = new ProductionMonitoringSetup();
        await setup.setupMonitoring();
        process.exit(0);
    } catch (error) {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = ProductionMonitoringSetup;