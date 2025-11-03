// lib/websocket-server.js - Real-time WebSocket Server with Redis Pub/Sub
const WebSocket = require('ws');
const http = require('http');
const redisConfig = require('../config/redis');
const AppError = require('../errors/AppError');

class WebSocketServer {
    constructor() {
        this.wss = null;
        this.server = null;
        this.redisSubscriber = null;
        this.redisPublisher = null;
        this.isEnabled = process.env.WS_ENABLED === 'true';
        this.port = process.env.WS_PORT || 8080;
        this.connections = new Set();
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            messagesPublished: 0,
            messagesReceived: 0,
            startTime: new Date()
        };
        
        if (!this.isEnabled) {
            console.log('⚠️ WebSocket server disabled (WS_ENABLED=false)');
            return;
        }
        
        // Don't auto-initialize in constructor, let initializeWebSocketServer handle it
    }

    async initialize() {
        try {
            await this.setupRedisSubscriber();
            this.setupWebSocketServer();
            console.log('✅ WebSocket server initialized successfully');
        } catch (error) {
            console.error('❌ WebSocket server initialization failed:', error);
            throw error;
        }
    }

    async setupRedisSubscriber() {
        if (!redisConfig.isReady()) {
            console.log('⚠️ Redis not available - WebSocket will work without cross-instance messaging');
            return;
        }

        try {
            // Create separate Redis clients for pub/sub
            this.redisSubscriber = redisConfig.getClient().duplicate();
            this.redisPublisher = redisConfig.getClient().duplicate();
            
            await this.redisSubscriber.connect();
            await this.redisPublisher.connect();

            // Subscribe to notification channels
            await this.redisSubscriber.subscribe('store_updates', (message) => {
                this.handleRedisMessage('store_updates', message);
            });

            await this.redisSubscriber.subscribe('coupon_updates', (message) => {
                this.handleRedisMessage('coupon_updates', message);
            });

            console.log('✅ Redis Pub/Sub initialized for WebSocket');
        } catch (error) {
            console.error('❌ Redis Pub/Sub setup failed:', error);
            // Continue without Redis pub/sub
        }
    }

    setupWebSocketServer() {
        // Create HTTP server for WebSocket
        this.server = http.createServer();
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
            server: this.server,
            path: '/ws',
            clientTracking: true
        });

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
            console.error('❌ WebSocket server error:', error);
        });

        // Start the server
        this.server.listen(this.port, () => {
            console.log(`🚀 WebSocket server running on port ${this.port}`);
        });
    }

    handleConnection(ws, req) {
        const clientId = this.generateClientId();
        const clientInfo = {
            id: clientId,
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            connectedAt: new Date()
        };

        // Add to connections set
        this.connections.add(ws);
        ws.clientInfo = clientInfo;
        
        // Update stats
        this.stats.totalConnections++;
        this.stats.activeConnections = this.connections.size;

        console.log(`✅ WebSocket client connected: ${clientId} (${this.stats.activeConnections} active)`);

        // Send welcome message
        this.sendToClient(ws, {
            type: 'connection',
            message: 'Connected to real-time updates',
            clientId: clientId,
            timestamp: new Date().toISOString()
        });

        // Handle client messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleClientMessage(ws, message);
            } catch (error) {
                console.error('❌ Invalid WebSocket message:', error);
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            this.connections.delete(ws);
            this.stats.activeConnections = this.connections.size;
            console.log(`❌ WebSocket client disconnected: ${clientId} (${this.stats.activeConnections} active)`);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`❌ WebSocket client error (${clientId}):`, error);
            this.connections.delete(ws);
            this.stats.activeConnections = this.connections.size;
        });
    }

    handleClientMessage(ws, message) {
        // Handle ping/pong for connection health
        if (message.type === 'ping') {
            this.sendToClient(ws, {
                type: 'pong',
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Handle subscription requests
        if (message.type === 'subscribe') {
            ws.subscriptions = ws.subscriptions || new Set();
            if (message.channels && Array.isArray(message.channels)) {
                message.channels.forEach(channel => {
                    ws.subscriptions.add(channel);
                });
                this.sendToClient(ws, {
                    type: 'subscribed',
                    channels: message.channels,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    handleRedisMessage(channel, message) {
        try {
            const data = JSON.parse(message);
            this.broadcastToClients({
                type: 'update',
                channel: channel,
                data: data,
                timestamp: new Date().toISOString()
            });
            this.stats.messagesReceived++;
        } catch (error) {
            console.error('❌ Error handling Redis message:', error);
        }
    }

    // ✅ FIXED WEBSOCKET TIMING: Get fresh data → Invalidate cache → Send message
    async notifyStoreUpdate(storeId, type, data = {}) {
        try {
            console.log(`🔄 Starting WebSocket notification sequence for store ${storeId} (${type})`);
            
            // STEP 1: Get fresh data from database FIRST
            console.log('📊 Step 1: Fetching fresh store data from database...');
            const freshStoreData = await this.getFreshStoreData(storeId);
            
            if (!freshStoreData && (type === 'created' || type === 'updated')) {
                console.warn(`⚠️ No fresh data found for store ${storeId}, notification may be stale`);
            }

            // STEP 2: Invalidate ALL caches SECOND
            console.log('🗑️ Step 2: Invalidating all related caches...');
            await this.forceCacheInvalidation(storeId);

            // STEP 3: Send WebSocket message with verified fresh data THIRD
            console.log('📡 Step 3: Broadcasting WebSocket message with fresh data...');
            const notification = {
                storeId: storeId,
                type: type, // 'created', 'updated', 'deleted'
                data: {
                    ...data,
                    // Critical fields for consistency
                    _id: storeId,
                    updatedAt: new Date().toISOString(),
                    // Include full fresh store data for created/updated operations
                    ...(type === 'created' || type === 'updated' ? freshStoreData : {})
                },
                timestamp: new Date().toISOString(),
                version: Date.now(), // Version for conflict resolution
                cacheInvalidated: true // Confirm cache was invalidated
            };

            // Broadcast to WebSocket clients
            this.broadcastToClients({
                type: 'store_update',
                ...notification
            });

            // Publish to Redis for cross-instance communication
            await this.publishToRedis('store_updates', notification);
            
            console.log(`✅ WebSocket notification sequence completed successfully for store ${storeId}`);
            return { success: true, notification };
            
        } catch (error) {
            console.error(`❌ WebSocket notification sequence failed for store ${storeId}:`, error);
            
            // Fallback: Send basic notification even if sequence fails
            try {
                const fallbackNotification = {
                    storeId: storeId,
                    type: type,
                    data: { ...data, _id: storeId },
                    timestamp: new Date().toISOString(),
                    version: Date.now(),
                    error: 'Partial notification due to sequence failure'
                };

                this.broadcastToClients({
                    type: 'store_update',
                    ...fallbackNotification
                });

                console.log(`⚠️ Sent fallback notification for store ${storeId}`);
                return { success: false, error: error.message, fallbackSent: true };
            } catch (fallbackError) {
                console.error(`💥 Complete notification failure for store ${storeId}:`, fallbackError);
                return { success: false, error: error.message, fallbackSent: false };
            }
        }
    }

    /**
     * ✅ PRODUCTION-READY: Get fresh store data with retry logic and exponential backoff
     * @param {String} storeId - Store ID to fetch
     * @param {Number} maxRetries - Maximum retry attempts (default: 3)
     * @returns {Object|null} Fresh store data or null if not found
     */
    async getFreshStoreData(storeId, maxRetries = 3) {
        console.log(`🔄 Fetching fresh store data for: ${storeId} (max retries: ${maxRetries})`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const Store = require('../models/storeModel');
                
                console.log(`📊 Database fetch attempt ${attempt}/${maxRetries} for store: ${storeId}`);
                const store = await Store.findById(storeId).lean();
                
                if (store) {
                    console.log(`✅ Fresh store data retrieved successfully on attempt ${attempt}:`, {
                        id: store._id,
                        name: store.name,
                        updatedAt: store.updatedAt
                    });
                    return store;
                } else {
                    console.warn(`⚠️ Store not found in database: ${storeId}`);
                    return null; // Don't retry if store doesn't exist
                }
                
            } catch (error) {
                console.error(`❌ Database fetch attempt ${attempt}/${maxRetries} failed for store ${storeId}:`, error.message);
                
                // If this is the last attempt, throw the error
                if (attempt === maxRetries) {
                    console.error(`💥 All ${maxRetries} database fetch attempts failed for store: ${storeId}`);
                    throw new Error(`Database fetch failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // ✅ EXPONENTIAL BACKOFF: Wait before retrying
                const backoffDelay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms, etc.
                console.log(`⏳ Retrying database fetch in ${backoffDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
        
        // This should never be reached due to the throw above, but just in case
        return null;
    }

    /**
     * ✅ PRODUCTION-READY: Force cache invalidation with enhanced error handling and retry logic
     * @param {String} storeId - Store ID for cache invalidation
     * @param {Number} maxRetries - Maximum retry attempts (default: 2)
     * @returns {Object} Invalidation result with success status
     */
    async forceCacheInvalidation(storeId, maxRetries = 2) {
        console.log(`🗑️ Starting cache invalidation for store: ${storeId} (max retries: ${maxRetries})`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const cacheService = require('../services/cacheService');
                
                console.log(`🔄 Cache invalidation attempt ${attempt}/${maxRetries} for store: ${storeId}`);
                
                // ✅ USE SAFE CACHE INVALIDATION METHOD
                const result = await cacheService.invalidateStoreCachesSafely(storeId);
                
                if (result.fallback) {
                    console.warn(`⚠️ Cache invalidation used fallback on attempt ${attempt}:`, result);
                    
                    // If this was a fallback result and we have retries left, try again
                    if (attempt < maxRetries) {
                        const retryDelay = 200 * attempt; // 200ms, 400ms
                        console.log(`⏳ Retrying cache invalidation in ${retryDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        continue;
                    }
                }
                
                console.log(`✅ Cache invalidation completed on attempt ${attempt}:`, {
                    totalDeleted: result.totalDeleted,
                    fallback: result.fallback || false,
                    storeId: storeId
                });
                
                return {
                    success: !result.fallback,
                    totalDeleted: result.totalDeleted,
                    attempt: attempt,
                    fallback: result.fallback || false,
                    error: result.error || null
                };
                
            } catch (error) {
                console.error(`❌ Cache invalidation attempt ${attempt}/${maxRetries} failed for store ${storeId}:`, error.message);
                
                // If this is the last attempt, return failure result
                if (attempt === maxRetries) {
                    console.error(`💥 All ${maxRetries} cache invalidation attempts failed for store: ${storeId}`);
                    return {
                        success: false,
                        totalDeleted: 0,
                        attempt: attempt,
                        fallback: true,
                        error: error.message
                    };
                }
                
                // Wait before retrying
                const retryDelay = 200 * attempt;
                console.log(`⏳ Retrying cache invalidation in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        // Fallback result if all attempts failed
        return {
            success: false,
            totalDeleted: 0,
            attempt: maxRetries,
            fallback: true,
            error: 'All cache invalidation attempts failed'
        };
    }

    async notifyCouponUpdate(couponId, storeId, type, data = {}) {
        const notification = {
            couponId: couponId,
            storeId: storeId,
            type: type, // 'created', 'updated', 'deleted'
            data: data,
            timestamp: new Date().toISOString()
        };

        // Broadcast to local WebSocket connections
        this.broadcastToClients({
            type: 'coupon_update',
            ...notification
        });

        // Publish to Redis for cross-instance communication
        await this.publishToRedis('coupon_updates', notification);
    }

    async publishToRedis(channel, data) {
        if (!this.redisPublisher) return;
        
        try {
            await this.redisPublisher.publish(channel, JSON.stringify(data));
            this.stats.messagesPublished++;
        } catch (error) {
            console.error('❌ Redis publish error:', error);
        }
    }

    broadcastToClients(message, filter = null) {
        if (!this.wss) return;

        let sentCount = 0;
        this.connections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                // Apply filter if provided
                if (filter && !filter(ws)) return;
                
                // Check subscriptions if client has them
                if (ws.subscriptions && ws.subscriptions.size > 0) {
                    const messageChannel = message.type || message.channel;
                    if (!ws.subscriptions.has(messageChannel) && !ws.subscriptions.has('all')) {
                        return;
                    }
                }
                
                this.sendToClient(ws, message);
                sentCount++;
            }
        });

        console.log(`📡 Broadcast message to ${sentCount} clients:`, message.type);
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            } catch (error) {
                console.error('❌ Error sending message to client:', error);
            }
        }
    }

    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Health monitoring
    getHealthStatus() {
        return {
            enabled: this.isEnabled,
            running: !!this.wss,
            port: this.port,
            stats: {
                ...this.stats,
                uptime: Date.now() - this.stats.startTime.getTime(),
                redisConnected: !!(this.redisSubscriber && this.redisPublisher)
            }
        };
    }

    // Graceful shutdown
    async shutdown() {
        console.log('🔄 Shutting down WebSocket server...');
        
        if (this.wss) {
            // Close all connections
            this.connections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, 'Server shutting down');
                }
            });
            
            this.wss.close();
        }

        if (this.server) {
            this.server.close();
        }

        // Close Redis connections
        if (this.redisSubscriber) {
            await this.redisSubscriber.disconnect();
        }
        if (this.redisPublisher) {
            await this.redisPublisher.disconnect();
        }

        console.log('✅ WebSocket server shutdown complete');
    }
}

// Singleton instance
let wsServerInstance = null;

function getWebSocketServer() {
    if (!wsServerInstance) {
        wsServerInstance = new WebSocketServer();
    }
    return wsServerInstance;
}

async function initializeWebSocketServer() {
    if (!wsServerInstance) {
        wsServerInstance = new WebSocketServer();
        // Wait for initialization to complete
        if (wsServerInstance.isEnabled) {
            await wsServerInstance.initialize();
        }
    }
    return wsServerInstance;
}

async function shutdownWebSocketServer() {
    if (wsServerInstance) {
        await wsServerInstance.shutdown();
        wsServerInstance = null;
    }
}

module.exports = {
    WebSocketServer,
    getWebSocketServer,
    initializeWebSocketServer,
    shutdownWebSocketServer
};