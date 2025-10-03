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
        const alertKey = `${type}_${severity}`;
        
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
                return `🐌 Performance Alert: ${data.endpoint} took ${data.responseTime}ms (threshold: ${data.threshold}ms)`;
            case 'cache_hit_rate_low':
                return `💾 Cache Alert: Hit rate dropped to ${data.hitRate}% (target: ${data.target}%)`;
            case 'health_check_failed':
                return `🏥 Health Check Failed: ${data.checks.filter(c => !c.healthy).length} endpoints unhealthy`;
            case 'database_query_slow':
                return `🗄️ Database Alert: Query took ${data.queryTime}ms (threshold: ${data.threshold}ms)`;
            default:
                return `⚠️ Alert: ${type} - ${JSON.stringify(data)}`;
        }
    }

    async sendConsoleAlert(alert) {
        if (!this.config.console.enabled) return;
        
        const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    }

    async sendEmailAlert(alert) {
        if (!this.config.email.enabled || !this.emailTransporter) return;
        
        try {
            await this.emailTransporter.sendMail({
                from: process.env.ALERT_EMAIL_USER,
                to: this.config.email.recipients.join(','),
                subject: `[${alert.severity.toUpperCase()}] Blog System Alert: ${alert.type}`,
                html: `
                    <h2>Blog System Alert</h2>
                    <p><strong>Type:</strong> ${alert.type}</p>
                    <p><strong>Severity:</strong> ${alert.severity}</p>
                    <p><strong>Time:</strong> ${alert.timestamp}</p>
                    <p><strong>Message:</strong> ${alert.message}</p>
                    <pre>${JSON.stringify(alert.data, null, 2)}</pre>
                `
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