/**
 * Market Data WebSocket Handler
 * -----------------------------
 * Manages WebSocket connections for real-time market data
 * Falls back to polling if Upstox WebSocket unavailable
 */

const WebSocket = require('ws');
const { UPSTOX_CONFIG } = require('../config/upstox');
const logger = require('../utils/logger');

class MarketDataSocket {
  constructor() {
    this.clients = new Map(); // ws -> { subscriptions: [], authenticated: bool }
    this.upstoxWs = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  init(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/market-data'
    });

    this.wss.on('connection', (ws, req) => {
      logger.info('New WebSocket client connected');
      
      this.clients.set(ws, {
        subscriptions: [],
        authenticated: false,
        ip: req.socket.remoteAddress
      });

      ws.on('message', (data) => this.handleClientMessage(ws, data));
      ws.on('close', () => this.handleClientDisconnect(ws));
      ws.on('error', (error) => logger.error('WebSocket client error:', error));

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Indian Stock Market Data Stream',
        timestamp: new Date().toISOString()
      }));
    });

    // Connect to Upstox WebSocket
    this.connectToUpstox();

    logger.info('Market Data WebSocket initialized');
  }

  /**
   * Connect to Upstox WebSocket
   */
  connectToUpstox() {
    if (!UPSTOX_CONFIG.accessToken) {
      logger.warn('Cannot connect to Upstox WS: No access token');
      return;
    }

    try {
      const wsUrl = `${UPSTOX_CONFIG.WS_URL}?apiKey=${UPSTOX_CONFIG.apiKey}`;
      
      this.upstoxWs = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${UPSTOX_CONFIG.accessToken}`
        }
      });

      this.upstoxWs.on('open', () => {
        logger.info('Connected to Upstox WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Resubscribe to all instruments
        this.resubscribeAll();
      });

      this.upstoxWs.on('message', (data) => {
        this.handleUpstoxMessage(data);
      });

      this.upstoxWs.on('close', () => {
        logger.warn('Upstox WebSocket disconnected');
        this.isConnected = false;
        this.attemptReconnect();
      });

      this.upstoxWs.on('error', (error) => {
        logger.error('Upstox WebSocket error:', error);
      });

    } catch (error) {
      logger.error('Failed to connect to Upstox WS:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect to Upstox
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
    
    logger.info(`Reconnecting to Upstox in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectToUpstox();
    }, delay);
  }

  /**
   * Handle messages from clients
   */
  handleClientMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      const client = this.clients.get(ws);

      switch (message.type) {
        case 'subscribe':
          this.subscribeInstrument(ws, message.instruments);
          break;
          
        case 'unsubscribe':
          this.unsubscribeInstrument(ws, message.instruments);
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
          
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      logger.error('Failed to handle client message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  }

  /**
   * Subscribe to instruments
   */
  subscribeInstrument(ws, instruments) {
    const client = this.clients.get(ws);
    
    if (!Array.isArray(instruments)) {
      instruments = [instruments];
    }

    // Add to client subscriptions
    instruments.forEach(inst => {
      if (!client.subscriptions.includes(inst)) {
        client.subscriptions.push(inst);
      }
    });

    // Subscribe via Upstox
    if (this.isConnected && this.upstoxWs) {
      this.upstoxWs.send(JSON.stringify({
        type: 'subscribe',
        instrumentKeys: instruments
      }));
    }

    ws.send(JSON.stringify({
      type: 'subscribed',
      instruments: client.subscriptions
    }));
  }

  /**
   * Unsubscribe from instruments
   */
  unsubscribeInstrument(ws, instruments) {
    const client = this.clients.get(ws);
    
    if (!Array.isArray(instruments)) {
      instruments = [instruments];
    }

    client.subscriptions = client.subscriptions.filter(
      inst => !instruments.includes(inst)
    );

    if (this.isConnected && this.upstoxWs) {
      this.upstoxWs.send(JSON.stringify({
        type: 'unsubscribe',
        instrumentKeys: instruments
      }));
    }

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      instruments: client.subscriptions
    }));
  }

  /**
   * Handle messages from Upstox
   */
  handleUpstoxMessage(data) {
    try {
      const message = JSON.parse(data);
      
      // Broadcast to all subscribed clients
      this.broadcast(message);
    } catch (error) {
      logger.error('Failed to handle Upstox message:', error);
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message) {
    const messageStr = JSON.stringify(message);
    
    this.clients.forEach((client, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Only send if client is subscribed to this instrument
        if (message.instrumentKey && client.subscriptions.includes(message.instrumentKey)) {
          ws.send(messageStr);
        }
      }
    });
  }

  /**
   * Handle client disconnect
   */
  handleClientDisconnect(ws) {
    logger.info('WebSocket client disconnected');
    this.clients.delete(ws);
  }

  /**
   * Resubscribe to all instruments on reconnect
   */
  resubscribeAll() {
    const allSubscriptions = new Set();
    
    this.clients.forEach(client => {
      client.subscriptions.forEach(sub => allSubscriptions.add(sub));
    });

    if (allSubscriptions.size > 0 && this.upstoxWs) {
      this.upstoxWs.send(JSON.stringify({
        type: 'subscribe',
        instrumentKeys: Array.from(allSubscriptions)
      }));
    }
  }

  /**
   * Get active connection count
   */
  getConnectionCount() {
    return this.clients.size;
  }
}

module.exports = new MarketDataSocket();
