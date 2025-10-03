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
        const filename = `daily-performance-${new Date().toISOString().split('T')[0]}.json`;
        
        await this.saveReport(filename, report);
        console.log(`📊 Daily report generated: ${filename}`);
        
        return report;
    }

    async generateWeeklyReport() {
        const report = await this.createReport('weekly');
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const filename = `weekly-performance-${weekStart.toISOString().split('T')[0]}.json`;
        
        await this.saveReport(filename, report);
        console.log(`📊 Weekly report generated: ${filename}`);
        
        return report;
    }

    async createReport(period) {
        const stats = performanceMonitor.getMetrics();
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
                message: `Cache hit rate (${stats.cacheHitRate}%) is below target (${this.config.performance.cacheTargets.hitRate}%)`,
                action: 'Review cache TTL settings and warming strategy'
            });
        }
        
        if (stats.averageResponseTime > 500) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: `Average response time (${stats.averageResponseTime}ms) is high`,
                action: 'Review slow endpoints and optimize queries'
            });
        }
        
        if (stats.averageDbQueryTime > 100) {
            recommendations.push({
                type: 'database',
                priority: 'medium',
                message: `Average database query time (${stats.averageDbQueryTime}ms) is high`,
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
        
        console.log(`📅 Daily reports scheduled (next in ${Math.round(msUntilMidnight / 1000 / 60)} minutes)`);
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
        
        console.log(`📅 Weekly reports scheduled (next in ${Math.round(msUntilSunday / 1000 / 60 / 60 / 24)} days)`);
    }
}

module.exports = new PerformanceReporter();