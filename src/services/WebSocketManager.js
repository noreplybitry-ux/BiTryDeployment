import { useState, useEffect, useRef } from 'react';
import tradingService from './TradingService';

class WebSocketManager {
  constructor() {
    this.spotWs = null;
    this.futuresWs = null;
    this.subscribers = new Map(); // symbol -> Set of callback functions
    this.priceData = new Map(); // symbol -> latest price data
    this.reconnectAttempts = new Map(); // connection type -> attempt count
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isReconnecting = new Map(); // connection type -> boolean
    this.subscribedSymbols = new Set();
    
    // Batch subscription management
    this.pendingSubscriptions = new Set();
    this.subscriptionBatchDelay = 500; // 500ms delay for batching
    this.subscriptionTimeout = null;
    
    // Initialize connections
    this.initializeConnections();
  }

  initializeConnections() {
    this.connectSpotStream();
    this.connectFuturesStream();
  }

  connectSpotStream() {
    if (this.spotWs?.readyState === WebSocket.OPEN || this.isReconnecting.get('spot')) {
      return;
    }

    this.isReconnecting.set('spot', true);
    
    try {
      this.spotWs = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
      
      this.spotWs.onopen = () => {
        console.log('Spot WebSocket connected');
        this.reconnectAttempts.set('spot', 0);
        this.isReconnecting.set('spot', false);
      };

      this.spotWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            data.forEach(ticker => {
              this.processTicker(ticker, 'spot');
            });
          } else {
            this.processTicker(data, 'spot');
          }
        } catch (error) {
          console.error('Error processing spot WebSocket message:', error);
        }
      };

      this.spotWs.onerror = (error) => {
        console.error('Spot WebSocket error:', error);
      };

      this.spotWs.onclose = () => {
        console.log('Spot WebSocket closed');
        this.isReconnecting.set('spot', false);
        this.handleReconnect('spot');
      };

    } catch (error) {
      console.error('Error creating spot WebSocket:', error);
      this.isReconnecting.set('spot', false);
      this.handleReconnect('spot');
    }
  }

  connectFuturesStream() {
    if (this.futuresWs?.readyState === WebSocket.OPEN || this.isReconnecting.get('futures')) {
      return;
    }

    this.isReconnecting.set('futures', true);
    
    try {
      this.futuresWs = new WebSocket('wss://fstream.binance.com/ws/!ticker@arr');
      
      this.futuresWs.onopen = () => {
        console.log('Futures WebSocket connected');
        this.reconnectAttempts.set('futures', 0);
        this.isReconnecting.set('futures', false);
      };

      this.futuresWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (Array.isArray(data)) {
            data.forEach(ticker => {
              this.processTicker(ticker, 'futures');
            });
          } else {
            this.processTicker(data, 'futures');
          }
        } catch (error) {
          console.error('Error processing futures WebSocket message:', error);
        }
      };

      this.futuresWs.onerror = (error) => {
        console.error('Futures WebSocket error:', error);
      };

      this.futuresWs.onclose = () => {
        console.log('Futures WebSocket closed');
        this.isReconnecting.set('futures', false);
        this.handleReconnect('futures');
      };

    } catch (error) {
      console.error('Error creating futures WebSocket:', error);
      this.isReconnecting.set('futures', false);
      this.handleReconnect('futures');
    }
  }

  async processTicker(ticker, marketType) {
    try {
      const symbol = ticker.s; // symbol
      const key = `${symbol}_${marketType}`;
      
      // Handle ticker array data
      if (!ticker.c || isNaN(parseFloat(ticker.c))) {
        console.warn('Invalid ticker data received:', ticker);
        return;
      }
      
      // Always store price data for all symbols
      const priceData = {
        symbol,
        marketType,
        lastPrice: parseFloat(ticker.c),
        priceChange: parseFloat(ticker.p) || 0,
        priceChangePercent: parseFloat(ticker.P) || 0,
        volume: parseFloat(ticker.v) || 0,
        timestamp: Date.now()
      };

      this.priceData.set(key, priceData);

      // Notify only if there are subscribers
      const symbolSubscribers = this.subscribers.get(key);
      if (symbolSubscribers) {
        symbolSubscribers.forEach(callback => {
          try {
            callback(priceData);
          } catch (error) {
            console.error('Error calling subscriber callback:', error);
          }
        });
      }

      // Process pending orders for this symbol
      try {
        await tradingService.processPendingOrdersForSymbol(symbol, priceData.lastPrice);
      } catch (error) {
        console.error('Error processing pending orders:', error);
      }
    } catch (error) {
      console.error('Error processing ticker:', error);
    }
  }

  subscribe(symbol, marketType, callback) {
    const key = `${symbol}_${marketType}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key).add(callback);

    if (this.priceData.has(key)) {
      try {
        callback(this.priceData.get(key));
      } catch (error) {
        console.error('Error calling immediate callback:', error);
      }
    }

    return () => this.unsubscribe(symbol, marketType, callback);
  }

  unsubscribe(symbol, marketType, callback) {
    const key = `${symbol}_${marketType}`;
    const symbolSubscribers = this.subscribers.get(key);
    
    if (symbolSubscribers) {
      symbolSubscribers.delete(callback);
      
      if (symbolSubscribers.size === 0) {
        this.subscribers.delete(key);
        this.priceData.delete(key);
      }
    }
  }

  handleReconnect(connectionType) {
    const attempts = this.reconnectAttempts.get(connectionType) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached for ${connectionType}`);
      return;
    }

    this.reconnectAttempts.set(connectionType, attempts + 1);
    
    const delay = this.reconnectDelay * Math.pow(2, attempts);
    
    console.log(`Attempting to reconnect ${connectionType} in ${delay}ms (attempt ${attempts + 1})`);
    
    setTimeout(() => {
      if (connectionType === 'spot') {
        this.connectSpotStream();
      } else if (connectionType === 'futures') {
        this.connectFuturesStream();
      }
    }, delay);
  }

  getCurrentPrice(symbol, marketType) {
    const key = `${symbol}_${marketType}`;
    return this.priceData.get(key) || null;
  }

  getConnectionStatus() {
    return {
      spot: this.spotWs?.readyState === WebSocket.OPEN,
      futures: this.futuresWs?.readyState === WebSocket.OPEN,
      spotReconnecting: this.isReconnecting.get('spot') || false,
      futuresReconnecting: this.isReconnecting.get('futures') || false
    };
  }

  destroy() {
    if (this.spotWs) {
      this.spotWs.close();
      this.spotWs = null;
    }
    
    if (this.futuresWs) {
      this.futuresWs.close();
      this.futuresWs = null;
    }
    
    this.subscribers.clear();
    this.priceData.clear();
    this.reconnectAttempts.clear();
    this.isReconnecting.clear();
    
    if (this.subscriptionTimeout) {
      clearTimeout(this.subscriptionTimeout);
    }
  }
}

const webSocketManager = new WebSocketManager();

export default webSocketManager;