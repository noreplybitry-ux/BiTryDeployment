import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import tradingService from '../services/TradingService';
import webSocketManager from '../services/WebSocketManager';

export const usePortfolio = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [positions, setPositions] = useState([]);
  const [spotHoldings, setSpotHoldings] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [portfolioSummary, setPortfolioSummary] = useState({});
  const [initializationError, setInitializationError] = useState(null);

  const positionSubscriptions = useRef(new Map());
  const spotSubscriptions = useRef(new Map());
  const priceUpdateQueue = useRef(new Map());
  const updateTimer = useRef(null);
  const isInitialized = useRef(false);
  const isLoadingPortfolio = useRef(false); // New load lock

  // Debug logging
  const debug = (message, data = null) => {
    console.log(`[usePortfolio] ${message}`, data || '');
  };

  // Minimal error handler - don't transform errors, just log and re-throw
  const handlePortfolioError = (operation, error) => {
    debug(`Error in ${operation}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      name: error.name
    });
    
    // Just re-throw the original error without transformation
    throw error;
  };

  const initializeService = useCallback(async () => {
    if (isInitialized.current) return true;

    try {
      debug('Initializing trading service...');
      setInitializationError(null);
      
      await tradingService.initialize();
      
      isInitialized.current = true;
      debug('Trading service initialized successfully');
      return true;
    } catch (error) {
      const errorMessage = error.message || 'Service initialization failed';
      debug('Trading service initialization failed:', errorMessage);
      setInitializationError(errorMessage);
      isInitialized.current = false;
      return false;
    }
  }, []);

  // Debounced price update function
  const debouncedPriceUpdate = useCallback((symbol, price, type) => {
    try {
      if (!symbol || !price || isNaN(price)) return;
      
      priceUpdateQueue.current.set(`${symbol}_${type}`, { symbol, price, type });
      
      if (updateTimer.current) {
        clearTimeout(updateTimer.current);
      }
      
      updateTimer.current = setTimeout(() => {
        try {
          const updates = Array.from(priceUpdateQueue.current.values());
          priceUpdateQueue.current.clear();
          
          updates.forEach(({ symbol, price, type }) => {
            try {
              if (type === 'futures') {
                updatePositionPnL(symbol, price);
              } else {
                updateSpotHoldingValue(symbol, price);
              }
            } catch (error) {
              debug(`Error processing price update for ${symbol}:`, error);
            }
          });
        } catch (error) {
          debug('Error in price update batch:', error);
        }
      }, 100);
    } catch (error) {
      debug('Error in debouncedPriceUpdate:', error);
    }
  }, []);

  // Load portfolio data with load lock
  const loadPortfolioData = async (retries = 1) => {
    if (isLoadingPortfolio.current) {
      debug('Portfolio load already in progress, skipping');
      return;
    }

    isLoadingPortfolio.current = true;

    if (!user?.id) {
      debug('No user ID, resetting portfolio state');
      resetPortfolioState();
      setLoading(false);
      isLoadingPortfolio.current = false;
      return;
    }

    try {
      debug('Loading portfolio data for user:', user.id);
      setLoading(true);
      setInitializationError(null);

      const serviceReady = await initializeService();
      if (!serviceReady) {
        throw new Error('Unable to initialize trading service');
      }

      const results = await Promise.allSettled([
        tradingService.getUserBalance(user.id),
        tradingService.getOpenPositions(user.id),
        tradingService.getSpotHoldings(user.id),
        tradingService.getOrderHistory(user.id, 100),
        tradingService.getTradeHistory(user.id, 100),
        tradingService.getPortfolioSummary(user.id)
      ]);

      const [
        balanceResult,
        positionsResult,
        holdingsResult,
        orderHistoryResult,
        tradeHistoryResult,
        summaryResult
      ] = results;

      if (balanceResult.status === 'fulfilled') {
        setBalance(balanceResult.value || 0);
      } else {
        debug('Failed to load balance:', balanceResult.reason?.message);
        setBalance(0);
      }

      if (positionsResult.status === 'fulfilled') {
        const positions = positionsResult.value || [];
        setPositions(positions);
        if (positions.length > 0) {
          subscribeToPositionUpdates(positions);
        }
      } else {
        debug('Failed to load positions:', positionsResult.reason?.message);
        setPositions([]);
      }

      if (holdingsResult.status === 'fulfilled') {
        const holdings = holdingsResult.value || [];
        setSpotHoldings(holdings);
        if (holdings.length > 0) {
          subscribeToSpotHoldingUpdates(holdings);
        }
      } else {
        debug('Failed to load holdings:', holdingsResult.reason?.message);
        setSpotHoldings([]);
      }

      if (orderHistoryResult.status === 'fulfilled') {
        setOrderHistory(orderHistoryResult.value || []);
      } else {
        debug('Failed to load order history:', orderHistoryResult.reason?.message);
        setOrderHistory([]);
      }

      if (tradeHistoryResult.status === 'fulfilled') {
        setTradeHistory(tradeHistoryResult.value || []);
      } else {
        debug('Failed to load trade history:', tradeHistoryResult.reason?.message);
        setTradeHistory([]);
      }

      if (summaryResult.status === 'fulfilled') {
        setPortfolioSummary(summaryResult.value || {});
      } else {
        debug('Failed to load portfolio summary:', summaryResult.reason?.message);
        setPortfolioSummary({});
      }

      debug('Portfolio data loaded successfully');

    } catch (error) {
      console.error('Error loading portfolio data:', error);
      
      if (retries > 0) {
        debug(`Retrying portfolio load (${retries} attempts left)...`);
        setTimeout(() => loadPortfolioData(retries - 1), 2000);
        isLoadingPortfolio.current = false;
        return;
      }
      
      debug('Portfolio data load failed');
      setInitializationError(error.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
      isLoadingPortfolio.current = false;
    }
  };

  const resetPortfolioState = () => {
    setBalance(0);
    setPositions([]);
    setSpotHoldings([]);
    setOrderHistory([]);
    setTradeHistory([]);
    setBalanceHistory([]);
    setTotalPnL(0);
    setTotalPortfolioValue(0);
    setPortfolioSummary({});
    setInitializationError(null);
    cleanupSubscriptions();
  };

  const cleanupSubscriptions = () => {
    try {
      positionSubscriptions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          debug('Error unsubscribing from position updates:', error);
        }
      });
      spotSubscriptions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          debug('Error unsubscribing from spot updates:', error);
        }
      });
      positionSubscriptions.current.clear();
      spotSubscriptions.current.clear();
      
      if (updateTimer.current) {
        clearTimeout(updateTimer.current);
        updateTimer.current = null;
      }
    } catch (error) {
      debug('Error during subscription cleanup:', error);
    }
  };

  const subscribeToPositionUpdates = (positions) => {
    try {
      positionSubscriptions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          debug('Error unsubscribing from position updates:', error);
        }
      });
      positionSubscriptions.current.clear();

      positions.forEach(position => {
        try {
          if (!webSocketManager || typeof webSocketManager.subscribe !== 'function') {
            debug('WebSocket manager not available for position updates');
            return;
          }

          const unsubscribe = webSocketManager.subscribe(
            position.symbol,
            'futures',
            (priceData) => {
              if (priceData && priceData.lastPrice) {
                debouncedPriceUpdate(position.symbol, priceData.lastPrice, 'futures');
              }
            }
          );
          positionSubscriptions.current.set(position.id, unsubscribe);
        } catch (error) {
          debug(`Error subscribing to position updates for ${position.symbol}:`, error);
        }
      });
    } catch (error) {
      debug('Error in subscribeToPositionUpdates:', error);
    }
  };

  const subscribeToSpotHoldingUpdates = (holdings) => {
    try {
      spotSubscriptions.current.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          debug('Error unsubscribing from spot updates:', error);
        }
      });
      spotSubscriptions.current.clear();

      holdings.forEach(holding => {
        try {
          if (!webSocketManager || typeof webSocketManager.subscribe !== 'function') {
            debug('WebSocket manager not available for spot updates');
            return;
          }

          const symbol = `${holding.symbol}USDT`;
          const unsubscribe = webSocketManager.subscribe(
            symbol,
            'spot',
            (priceData) => {
              if (priceData && priceData.lastPrice) {
                debouncedPriceUpdate(holding.symbol, priceData.lastPrice, 'spot');
              }
            }
          );
          spotSubscriptions.current.set(holding.id, unsubscribe);
        } catch (error) {
          debug(`Error subscribing to spot updates for ${holding.symbol}:`, error);
        }
      });
    } catch (error) {
      debug('Error in subscribeToSpotHoldingUpdates:', error);
    }
  };

  const updatePositionPnL = (symbol, currentPrice) => {
    try {
      if (!symbol || !currentPrice || isNaN(currentPrice)) return;

      setPositions(prevPositions => 
        prevPositions.map(pos => {
          if (pos.symbol === symbol) {
            const priceDiff = pos.side === 'LONG' 
              ? currentPrice - pos.entry_price 
              : pos.entry_price - currentPrice;
            const unrealizedPnL = priceDiff * pos.quantity;

            return {
              ...pos,
              current_price: currentPrice,
              unrealized_pnl: unrealizedPnL
            };
          }
          return pos;
        })
      );

      if (user?.id && isInitialized.current) {
        tradingService.updatePositionPnL(user.id, symbol, currentPrice).catch(error => {
          debug('Background position PnL update failed:', error);
        });
      }
    } catch (error) {
      debug('Error updating position PnL:', error);
    }
  };

  const updateSpotHoldingValue = (baseSymbol, currentPrice) => {
    try {
      if (!baseSymbol || !currentPrice || isNaN(currentPrice)) return;

      setSpotHoldings(prevHoldings =>
        prevHoldings.map(h => {
          if (h.symbol === baseSymbol) {
            const currentValue = h.quantity * currentPrice;
            const unrealizedPnl = (currentPrice - h.average_price) * h.quantity;
            
            return {
              ...h,
              current_price: currentPrice,
              current_value: currentValue,
              unrealized_pnl: unrealizedPnl
            };
          }
          return h;
        })
      );

      if (user?.id && isInitialized.current) {
        tradingService.updateSpotHoldingCurrentPrice(user.id, baseSymbol, currentPrice).catch(error => {
          debug('Background spot holding update failed:', error);
        });
      }
    } catch (error) {
      debug('Error updating spot holding value:', error);
    }
  };

  useEffect(() => {
    try {
      const futuresPnL = positions.reduce((total, pos) => {
        const pnl = pos.unrealized_pnl || 0;
        return total + (isNaN(pnl) ? 0 : pnl);
      }, 0);
      
      const spotPnL = spotHoldings.reduce((total, holding) => {
        const pnl = holding.unrealized_pnl || 0;
        return total + (isNaN(pnl) ? 0 : pnl);
      }, 0);
      
      const totalPnL = futuresPnL + spotPnL;
      setTotalPnL(isNaN(totalPnL) ? 0 : totalPnL);
    } catch (error) {
      debug('Error calculating total PnL:', error);
      setTotalPnL(0);
    }
  }, [positions, spotHoldings]);

  useEffect(() => {
    try {
      const spotValue = spotHoldings.reduce((total, holding) => {
        const value = holding.current_value || (holding.quantity * holding.average_price) || 0;
        return total + (isNaN(value) ? 0 : value);
      }, 0);
      
      const futuresValue = positions.reduce((total, pos) => {
        const margin = pos.margin || 0;
        const pnl = pos.unrealized_pnl || 0;
        return total + (isNaN(margin) ? 0 : margin) + (isNaN(pnl) ? 0 : pnl);
      }, 0);
      
      const portfolioValue = balance + spotValue + futuresValue;
      setTotalPortfolioValue(isNaN(portfolioValue) ? balance : portfolioValue);
    } catch (error) {
      debug('Error calculating total portfolio value:', error);
      setTotalPortfolioValue(balance || 0);
    }
  }, [balance, positions, spotHoldings]);

  useEffect(() => {
    if (user?.id) {
      debug('User authenticated, loading portfolio data');
      loadPortfolioData();
    } else {
      debug('User not authenticated, resetting state');
      resetPortfolioState();
      isInitialized.current = false;
    }

    return () => {
      cleanupSubscriptions();
    };
  }, [user?.id]);

  const submitOrder = async (orderData) => {
    if (!user?.id) {
      throw new Error('Please login to start trading');
    }

    debug('🚀 Starting order submission process');
    debug('Order data received:', orderData);

    const serviceReady = await initializeService();
    if (!serviceReady) {
      throw new Error('Trading service is not ready. Please wait a moment and try again.');
    }

    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Invalid order data provided');
    }

    const { symbol, side, type, quantity, price, marketType } = orderData;

    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid trading symbol');
    }

    if (!side || !['BUY', 'SELL'].includes(side)) {
      throw new Error('Invalid order side. Must be BUY or SELL');
    }

    if (!type || !['MARKET', 'LIMIT'].includes(type)) {
      throw new Error('Invalid order type. Must be MARKET or LIMIT');
    }

    if (!quantity || isNaN(quantity) || quantity <= 0) {
      throw new Error('Invalid quantity. Must be a positive number');
    }

    if (type === 'LIMIT' && (!price || isNaN(price) || price <= 0)) {
      throw new Error('Limit orders require a valid positive price');
    }

    if (!marketType || !['SPOT', 'FUTURES'].includes(marketType)) {
      throw new Error('Invalid market type. Must be SPOT or FUTURES');
    }

    debug('✅ Pre-validation passed');

    try {
      let result;
      
      if (orderData.marketType === 'SPOT') {
        debug('📈 Submitting spot order...');
        result = await tradingService.submitSpotOrder(user.id, orderData);
      } else {
        debug('📊 Submitting futures order...');
        result = await tradingService.submitFuturesOrder(user.id, orderData);
      }

      debug('✅ Order submitted successfully, refreshing portfolio...');

      try {
        await loadPortfolioData();
        debug('✅ Portfolio data refreshed');
      } catch (refreshError) {
        debug('⚠️ Portfolio refresh failed (non-critical):', refreshError);
      }
      
      return result;
    } catch (error) {
      debug('❌ Order submission failed:', error);
      throw error;
    }
  };

  const closePosition = async (positionId, closePrice) => {
    if (!user?.id) {
      throw new Error('Please login to manage positions');
    }

    try {
      debug('Closing position:', { positionId, closePrice });
      
      const serviceReady = await initializeService();
      if (!serviceReady) {
        throw new Error('Trading service is not ready. Please wait a moment and try again.');
      }
      
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        throw new Error('Position not found or may have already been closed');
      }

      if (!closePrice || isNaN(closePrice) || closePrice <= 0) {
        throw new Error('Invalid close price provided');
      }

      const pnl = tradingService.calculatePnL(position, closePrice);
      const result = await tradingService.closeFuturesPosition(user.id, position, closePrice, pnl);

      debug('Position closed successfully:', result);

      try {
        await loadPortfolioData();
      } catch (refreshError) {
        debug('Portfolio refresh after close failed (non-critical):', refreshError);
      }
      
      return result;
    } catch (error) {
      debug('Position closing failed:', error);
      throw error;
    }
  };

  const closeAllPositions = async () => {
    if (!user?.id) {
      throw new Error('Please login to manage positions');
    }
    
    try {
      debug('Closing all positions');
      
      const serviceReady = await initializeService();
      if (!serviceReady) {
        throw new Error('Trading service is not ready. Please wait a moment and try again.');
      }
      
      if (positions.length === 0) {
        return { success: true, closedCount: 0, message: 'No positions to close' };
      }

      const result = await tradingService.closeAllPositions(user.id);
      
      debug(`Close all positions result:`, result);
      
      try {
        await loadPortfolioData();
      } catch (refreshError) {
        debug('Portfolio refresh after close all failed (non-critical):', refreshError);
      }
      
      return result;
    } catch (error) {
      debug('Close all positions failed:', error);
      throw error;
    }
  };

  const getBalanceHistory = async () => {
    if (!user?.id) return [];
    
    try {
      const serviceReady = await initializeService();
      if (!serviceReady) {
        throw new Error('Trading service is not ready');
      }
      
      const history = await tradingService.getBalanceHistory(user.id);
      setBalanceHistory(history || []);
      return history || [];
    } catch (error) {
      debug('Error getting balance history:', error);
      return [];
    }
  };

  const refreshPortfolio = async () => {
    debug('Manual portfolio refresh requested');
    await loadPortfolioData();
  };

  const refreshBalance = async () => {
    if (!user?.id) return 0;
    
    try {
      const serviceReady = await initializeService();
      if (!serviceReady) {
        throw new Error('Trading service is not ready');
      }
      
      const newBalance = await tradingService.getUserBalance(user.id);
      setBalance(newBalance || 0);
      return newBalance || 0;
    } catch (error) {
      debug('Error refreshing balance:', error);
      throw error;
    }
  };

  const getPortfolioMetrics = useCallback(() => {
    try {
      const totalInvested = 10000;
      const currentValue = totalPortfolioValue || 0;
      const totalReturn = currentValue - totalInvested;
      const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
      
      const todaysPnL = positions.reduce((total, pos) => total + (pos.unrealized_pnl || 0), 0) +
                       spotHoldings.reduce((total, holding) => total + (holding.unrealized_pnl || 0), 0);
      
      const completedTrades = tradeHistory.filter(t => t.pnl !== null && t.pnl !== undefined);
      const winningTrades = completedTrades.filter(t => parseFloat(t.pnl) > 0);
      const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0;
      
      return {
        totalReturn: isNaN(totalReturn) ? 0 : totalReturn,
        totalReturnPercent: isNaN(totalReturnPercent) ? 0 : totalReturnPercent,
        todaysPnL: isNaN(todaysPnL) ? 0 : todaysPnL,
        winRate: isNaN(winRate) ? 0 : winRate,
        totalTrades: completedTrades.length,
        winningTrades: winningTrades.length,
        sharpeRatio: 0,
        maxDrawdown: 0,
      };
    } catch (error) {
      debug('Error calculating portfolio metrics:', error);
      return {
        totalReturn: 0,
        totalReturnPercent: 0,
        todaysPnL: 0,
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      };
    }
  }, [totalPortfolioValue, positions, spotHoldings, tradeHistory]);

  const usedMargin = positions.reduce((total, pos) => {
    const margin = pos.margin || 0;
    return total + (isNaN(margin) ? 0 : margin);
  }, 0);
  
  const freeMargin = Math.max(0, balance - usedMargin);
  
  const spotValue = spotHoldings.reduce((total, holding) => {
    const value = holding.current_value || (holding.quantity * holding.average_price) || 0;
    return total + (isNaN(value) ? 0 : value);
  }, 0);
  
  const futuresValue = positions.reduce((total, pos) => {
    const margin = pos.margin || 0;
    const pnl = pos.unrealized_pnl || 0;
    return total + (isNaN(margin) ? 0 : margin) + (isNaN(pnl) ? 0 : pnl);
  }, 0);

  const totalExposure = positions.reduce((total, pos) => {
    const quantity = pos.quantity || 0;
    const price = pos.current_price || pos.entry_price || 0;
    const leverage = pos.leverage || 1;
    const exposure = quantity * price * leverage;
    return total + (isNaN(exposure) ? 0 : exposure);
  }, 0);

  const marginUtilization = balance > 0 ? (usedMargin / balance) * 100 : 0;

  return {
    balance: balance || 0,
    positions: positions || [],
    spotHoldings: spotHoldings || [],
    orderHistory: orderHistory || [],
    tradeHistory: tradeHistory || [],
    balanceHistory: balanceHistory || [],
    totalPnL: totalPnL || 0,
    totalPortfolioValue: totalPortfolioValue || 0,
    portfolioSummary: portfolioSummary || {},
    loading,
    initializationError,

    usedMargin: usedMargin || 0,
    freeMargin: freeMargin || 0,
    spotValue: spotValue || 0,
    futuresValue: futuresValue || 0,
    availableBalance: balance || 0,

    submitOrder,
    closePosition,
    closeAllPositions,
    refreshPortfolio,
    refreshBalance,
    getBalanceHistory,
    getPortfolioMetrics,

    portfolioMetrics: getPortfolioMetrics(),
    
    hasPositions: positions.length > 0,
    hasHoldings: spotHoldings.length > 0,
    isMarginSufficient: freeMargin > 0,
    isServiceReady: isInitialized.current,
    
    marginUtilization: isNaN(marginUtilization) ? 0 : marginUtilization,
    totalExposure: isNaN(totalExposure) ? 0 : totalExposure
  };
};