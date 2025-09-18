import { useState, useEffect, useRef } from 'react';
import webSocketManager from '../services/WebSocketManager';

export const usePriceData = (symbol, marketType = 'spot') => {
  const [priceData, setPriceData] = useState({
    lastPrice: '--',
    priceChange: { value: 0, percent: 0 },
    volume: 0,
    timestamp: null
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeRef = useRef(null);
  const currentSymbolRef = useRef(null);
  const currentMarketTypeRef = useRef(null);

  // Format price for display
  const formatPrice = (price) => {
    if (Number.isNaN(price) || price === null || price === undefined) return '--';
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(8);
  };

  // Format change value for display
  const formatChange = (change) => {
    if (Number.isNaN(change) || change === null || change === undefined) return '0.00';
    if (Math.abs(change) >= 1) return change.toFixed(2);
    if (Math.abs(change) >= 0.01) return change.toFixed(4);
    return change.toFixed(8);
  };

  useEffect(() => {
    if (!symbol) {
      setPriceData({
        lastPrice: '--',
        priceChange: { value: 0, percent: 0 },
        volume: 0,
        timestamp: null
      });
      return;
    }

    // Clean up previous subscription if symbol or market type changed
    if (unsubscribeRef.current && 
        (currentSymbolRef.current !== symbol || currentMarketTypeRef.current !== marketType)) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Update refs
    currentSymbolRef.current = symbol;
    currentMarketTypeRef.current = marketType;

    // Check for existing data first
    const existingData = webSocketManager.getCurrentPrice(symbol, marketType);
    if (existingData) {
      setPriceData({
        lastPrice: formatPrice(existingData.lastPrice),
        priceChange: {
          value: formatChange(existingData.priceChange),
          percent: existingData.priceChangePercent ? existingData.priceChangePercent.toFixed(2) : '0.00'
        },
        volume: existingData.volume || 0,
        timestamp: existingData.timestamp
      });
    }

    // Subscribe to updates
    const handlePriceUpdate = (data) => {
      if (!data || !data.lastPrice || isNaN(data.lastPrice)) {
        console.warn('Invalid price data received:', data);
        return;
      }
      setPriceData({
        lastPrice: formatPrice(data.lastPrice),
        priceChange: {
          value: formatChange(data.priceChange),
          percent: data.priceChangePercent ? data.priceChangePercent.toFixed(2) : '0.00'
        },
        volume: data.volume || 0,
        timestamp: data.timestamp
      });
    };

    // Subscribe to price updates
    try {
      unsubscribeRef.current = webSocketManager.subscribe(symbol, marketType, handlePriceUpdate);
    } catch (error) {
      console.error('Failed to subscribe to price updates:', error);
    }

    // Monitor connection status
    const checkConnectionStatus = () => {
      const status = webSocketManager.getConnectionStatus();
      const connected = marketType === 'spot' ? status.spot : status.futures;
      setIsConnected(connected);
    };

    checkConnectionStatus();
    const statusInterval = setInterval(checkConnectionStatus, 2000);

    return () => {
      clearInterval(statusInterval);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [symbol, marketType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  return {
    lastPrice: priceData.lastPrice,
    priceChange: priceData.priceChange,
    volume: priceData.volume,
    timestamp: priceData.timestamp,
    isConnected,
    rawLastPrice: priceData.lastPrice === '--' ? 0 : parseFloat(priceData.lastPrice.replace(',', ''))
  };
};