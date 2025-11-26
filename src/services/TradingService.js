import { supabase } from '../lib/supabase';
import webSocketManager from './WebSocketManager';
class TradingService {
 
  constructor() {
    this.transactionQueue = [];
    this.isProcessingQueue = false;
    this.debugMode = true;
    this.initialized = false;
    this.userId = null;
    this.pendingOrders = new Map(); // symbol -> Map<id, order>
    this.realtimeChannel = null;
    this.symbolLocks = new Map(); // symbol -> Promise for serialization
  }
  log(message, data = null) {
    if (this.debugMode) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[TradingService ${timestamp}] ${message}`, data || '');
    }
  }
  handleError(operation, error) {
    this.log(`❌ Error in ${operation}:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      name: error.name
    });
   
    throw error;
  }
  async retryOperation(operation, maxRetries = 3) {
    let attempt = 0;
    let lastError;
    let delay = 1000;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt++;
        this.log(`Retry attempt ${attempt}/${maxRetries} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    throw lastError;
  }
  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    while (this.transactionQueue.length > 0) {
      const { action, resolve, reject } = this.transactionQueue.shift();
      try {
        const result = await action();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    this.isProcessingQueue = false;
  }
  queueTransaction(action) {
    return new Promise((resolve, reject) => {
      this.transactionQueue.push({ action, resolve, reject });
      this.processQueue();
    });
  }
  async initialize() {
    if (this.initialized) return;
   
    try {
      this.log('Initializing TradingService...');
     
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        this.log('Session refresh error:', refreshError);
      }
     
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
     
      if (sessionError) {
        this.log('Session error:', sessionError);
        throw new Error(`Authentication check failed: ${sessionError.message}`);
      }
     
      if (!session || !session.user) {
        this.log('No session found');
        throw new Error('User not authenticated. Please login first.');
      }
     
      this.userId = session.user.id;
      this.log('User authenticated:', this.userId);
      await this.initializePendingOrdersCache();
      this.setupRealtime();
     
      this.initialized = true;
      this.log('✅ TradingService initialized successfully');
    } catch (error) {
      this.log('❌ TradingService initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  async getCurrentUser() {
    const { data: { session }, error } = await supabase.auth.getSession();
   
    if (error) {
      throw new Error(`Failed to get user session: ${error.message}`);
    }
   
    if (!session || !session.user) {
      throw new Error('No authenticated user found');
    }
   
    return session.user;
  }
  mapOrderSideToPositionSide(orderSide) {
    return orderSide === 'BUY' ? 'LONG' : 'SHORT';
  }
  mapPositionSideToOrderSide(positionSide) {
    return positionSide === 'LONG' ? 'SELL' : 'BUY';
  }
  async getUserBalance(userId) {
    try {
      await this.ensureInitialized();
      this.log('Getting user balance for:', userId);
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const { data, error } = await supabase
          .from('user_balances')
          .select('balance')
          .eq('user_id', userId)
          .eq('currency', 'USD')
          .single();
        if (error) {
          if (error.code === 'PGRST116') { // No row found
            this.log('No balance found, initializing...');
            return await this.initializeUserBalance(userId);
          }
          this.log('Balance query error:', error);
          throw error;
        }
        const balance = parseFloat(data.balance) || 0;
        this.log('Balance retrieved:', balance);
        return balance;
      });
    } catch (error) {
      this.handleError('getUserBalance', error);
    }
  }
  async initializeUserBalance(userId) {
    try {
      await this.ensureInitialized();
      this.log('Initializing balance for user:', userId);
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const { error } = await supabase
          .from('user_balances')
          .insert({
            user_id: userId,
            balance: 10000.00,
            currency: 'USD',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        if (error) {
          this.log('Balance insertion error:', error);
          // If balance already exists, just return it
          if (error.code === '23505') {
            const { data } = await supabase
              .from('user_balances')
              .select('balance')
              .eq('user_id', userId)
              .eq('currency', 'USD')
              .single();
            return parseFloat(data?.balance) || 10000;
          }
          throw error;
        }
        const { error: historyError } = await supabase
          .from('balance_history')
          .insert({
            user_id: userId,
            change_amount: 10000.00,
            balance_after: 10000.00,
            change_type: 'DEPOSIT',
            description: 'Initial virtual balance',
            created_at: new Date().toISOString()
          });
        if (historyError) {
          this.log('Warning: Failed to record balance history:', historyError);
        }
        this.log('✅ User balance initialized successfully');
        return 10000.00;
      });
    } catch (error) {
      this.handleError('initializeUserBalance', error);
    }
  }
  async getOpenPositions(userId) {
    try {
      await this.ensureInitialized();
      this.log('Getting open positions for user:', userId);
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const { data, error } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'OPEN')
          .order('opened_at', { ascending: false });
        if (error) {
          this.log('Positions query error:', error);
          throw error;
        }
       
        this.log('Open positions retrieved:', data?.length || 0);
        return data || [];
      });
    } catch (error) {
      this.handleError('getOpenPositions', error);
    }
  }
  async getSpotHoldings(userId) {
    try {
      await this.ensureInitialized();
      this.log('Getting spot holdings for user:', userId);
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const { data, error } = await supabase
          .from('spot_holdings')
          .select('*')
          .eq('user_id', userId)
          .gt('quantity', 0)
          .order('created_at', { ascending: false });
        if (error) {
          this.log('Holdings query error:', error);
          throw error;
        }
       
        this.log('Spot holdings retrieved:', data?.length || 0);
        return data || [];
      });
    } catch (error) {
      this.handleError('getSpotHoldings', error);
    }
  }
  async getOrderHistory(userId, limit = 100) {
    try {
      await this.ensureInitialized();
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) {
          this.log('Order history query error:', error);
          throw error;
        }
        return data || [];
      });
    } catch (error) {
      this.handleError('getOrderHistory', error);
    }
  }
  async getTradeHistory(userId, limit = 100) {
    try {
      await this.ensureInitialized();
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const { data, error } = await supabase
          .from('trade_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) {
          this.log('Trade history query error:', error);
          throw error;
        }
        return data || [];
      });
    } catch (error) {
      this.handleError('getTradeHistory', error);
    }
  }
  async getBalanceHistory(userId, limit = 100) {
    try {
      await this.ensureInitialized();
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const { data, error } = await supabase
          .from('balance_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) {
          this.log('Balance history query error:', error);
          throw error;
        }
        return data || [];
      });
    } catch (error) {
      this.handleError('getBalanceHistory', error);
    }
  }
  async getPortfolioSummary(userId) {
    try {
      await this.ensureInitialized();
     
      if (!userId) {
        throw new Error('User ID is required');
      }
     
      return await this.retryOperation(async () => {
        const [balance, positions, holdings] = await Promise.all([
          this.getUserBalance(userId),
          this.getOpenPositions(userId),
          this.getSpotHoldings(userId)
        ]);
        const totalPnL = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0) +
                        holdings.reduce((sum, hold) => sum + (hold.unrealized_pnl || 0), 0);
        const usedMargin = positions.reduce((sum, pos) => sum + (pos.margin || 0), 0);
        const spotValue = holdings.reduce((sum, hold) =>
          sum + (hold.current_value || hold.quantity * hold.average_price), 0);
        return {
          balance,
          totalPnL,
          usedMargin,
          spotValue,
          totalPortfolioValue: balance + spotValue + usedMargin + totalPnL,
          positionsCount: positions.length,
          holdingsCount: holdings.length
        };
      });
    } catch (error) {
      this.handleError('getPortfolioSummary', error);
    }
  }
  validateOrderData(orderData) {
    if (!orderData) {
      throw new Error('Order data is required');
    }
    const { symbol, side, type, quantity, price, marketType, leverage } = orderData;
    if (!symbol || typeof symbol !== 'string') {
      throw new Error('Invalid symbol');
    }
    if (!['BUY', 'SELL'].includes(side)) {
      throw new Error('Invalid order side. Must be BUY or SELL');
    }
    if (!['MARKET', 'LIMIT'].includes(type)) {
      throw new Error('Invalid order type. Must be MARKET or LIMIT');
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      throw new Error('Invalid quantity. Must be a positive number');
    }
    if (type === 'LIMIT' && (!price || isNaN(price) || price <= 0)) {
      throw new Error('Invalid price for limit order. Must be a positive number');
    }
    if (!['SPOT', 'FUTURES'].includes(marketType)) {
      throw new Error('Invalid market type. Must be SPOT or FUTURES');
    }
    if (marketType === 'FUTURES' && (!leverage || isNaN(leverage) || leverage < 1 || leverage > 100)) {
      throw new Error('Invalid leverage. Must be between 1 and 100 for futures orders');
    }
    return true;
  }
  async updateUserBalance(userId, changeAmount, changeType, description) {
    try {
      this.log('Updating user balance', { userId, changeAmount, changeType, description });
      return await this.retryOperation(async () => {
        // Get current balance first
        const currentBalance = await this.getUserBalance(userId);
        const newBalance = currentBalance + changeAmount;
        this.log('Balance calculation', { currentBalance, changeAmount, newBalance });
        if (newBalance < -0.01) { // Allow small negative values for rounding
          throw new Error('Insufficient balance for this operation');
        }
        const { error: balanceError } = await supabase
          .from('user_balances')
          .update({
            balance: Math.max(0, newBalance),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('currency', 'USD');
        if (balanceError) {
          this.log('Error updating balance:', balanceError);
          throw balanceError;
        }
        try {
          const { error: historyError } = await supabase
            .from('balance_history')
            .insert({
              user_id: userId,
              change_amount: parseFloat(changeAmount),
              balance_after: Math.max(0, newBalance),
              change_type: changeType,
              description,
              created_at: new Date().toISOString()
            });
          if (historyError) {
            this.log('Warning: Failed to record balance history (non-critical):', historyError);
          }
        } catch (historyError) {
          this.log('Warning: Balance history update failed (non-critical):', historyError);
        }
        this.log('✅ Balance updated successfully', { newBalance: Math.max(0, newBalance) });
        return Math.max(0, newBalance);
      });
    } catch (error) {
      this.log('Error in updateUserBalance:', error);
      throw error;
    }
  }
  async updateSpotHolding(userId, symbol, quantity, price, side, fees = 0, order_id = null) {
    try {
      const baseAsset = symbol.replace('USDT', '');
      this.log('Updating spot holding', { baseAsset, quantity, price, side, fees });
      return await this.retryOperation(async () => {
        const { data: existing, error: fetchError } = await supabase
          .from('spot_holdings')
          .select('*')
          .eq('user_id', userId)
          .eq('symbol', baseAsset)
          .maybeSingle();
        if (fetchError) {
          this.log('Error fetching existing holding:', fetchError);
          throw fetchError;
        }
        if (side === 'BUY') {
          if (existing) {
            const totalQuantity = parseFloat(existing.quantity) + parseFloat(quantity);
            const totalValue = (parseFloat(existing.quantity) * parseFloat(existing.average_price)) + (parseFloat(quantity) * parseFloat(price));
            const newAvgPrice = totalValue / totalQuantity;
            this.log('Updating existing holding', {
              oldQuantity: existing.quantity,
              addQuantity: quantity,
              totalQuantity,
              newAvgPrice
            });
            const { error } = await supabase
              .from('spot_holdings')
              .update({
                quantity: totalQuantity,
                average_price: newAvgPrice,
                current_price: price,
                current_value: totalQuantity * price,
                unrealized_pnl: (price - newAvgPrice) * totalQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            if (error) {
              this.log('Error updating existing holding:', error);
              throw error;
            }
          } else {
            // Create new holding
            this.log('Creating new holding');
           
            const { error } = await supabase
              .from('spot_holdings')
              .insert({
                user_id: userId,
                symbol: baseAsset,
                quantity: parseFloat(quantity),
                average_price: parseFloat(price),
                current_price: parseFloat(price),
                current_value: parseFloat(quantity) * parseFloat(price),
                unrealized_pnl: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            if (error) {
              this.log('Error creating new holding:', error);
              throw error;
            }
          }
        } else { // SELL
          if (existing) {
            const oldQuantity = parseFloat(existing.quantity);
            const newQuantity = oldQuantity - parseFloat(quantity);
           
            this.log('Selling from holding', {
              oldQuantity,
              sellQuantity: quantity,
              newQuantity
            });
           
            // Calculate gross PnL for this sale
            const grossPnl = (parseFloat(price) - parseFloat(existing.average_price)) * parseFloat(quantity);
           
            // Insert closed trade record
            const { error: tradeError } = await supabase
              .from('trade_history')
              .insert({
                user_id: userId,
                order_id: order_id,
                symbol: symbol, // Full symbol e.g., BTCUSDT
                side: 'SELL',
                quantity: parseFloat(quantity),
                price: parseFloat(price), // Exit price
                entry_price: parseFloat(existing.average_price),
                exit_price: parseFloat(price),
                fee: parseFloat(fees),
                market_type: 'SPOT',
                pnl: grossPnl,
                created_at: new Date().toISOString()
              });
            if (tradeError) {
              this.log('Warning: Failed to record spot sell trade (non-critical):', tradeError);
            } else {
              this.log('✅ Spot sell trade recorded', { grossPnl, fees });
            }
           
            if (newQuantity <= 0.00000001) {
              // Delete holding if quantity becomes effectively 0
              const { error } = await supabase
                .from('spot_holdings')
                .delete()
                .eq('id', existing.id);
              if (error) {
                this.log('Error deleting holding:', error);
                throw error;
              }
              this.log('Holding deleted (quantity became 0)');
            } else {
              // Update quantity
              const newCurrentValue = newQuantity * parseFloat(price);
              const newUnrealizedPnl = (parseFloat(price) - parseFloat(existing.average_price)) * newQuantity;
             
              const { error } = await supabase
                .from('spot_holdings')
                .update({
                  quantity: newQuantity,
                  current_price: parseFloat(price),
                  current_value: newCurrentValue,
                  unrealized_pnl: newUnrealizedPnl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
              if (error) {
                this.log('Error updating holding after sale:', error);
                throw error;
              }
              this.log('Holding updated after sale');
            }
          }
        }
      });
    } catch (error) {
      this.log('Error in updateSpotHolding:', error);
      throw error;
    }
  }
  async getCurrentPrice(symbol, marketType = 'SPOT') {
    const wsMarketType = marketType === 'FUTURES' ? 'futures' : 'spot';
    const cached = webSocketManager.getCurrentPrice(symbol, wsMarketType);
    if (cached && cached.lastPrice > 0) {
      return cached.lastPrice;
    }
    console.warn(`No cached price for ${symbol} (${marketType}), falling back to API fetch`);
    try {
      const baseUrl = marketType === 'FUTURES' ? 'https://fapi.binance.com/fapi/v1' : 'https://api.binance.com/api/v3';
      const response = await fetch(`${baseUrl}/ticker/price?symbol=${symbol}`);
      if (!response.ok) throw new Error('Failed to fetch price');
      const data = await response.json();
      return parseFloat(data.price) || 0;
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw error;
    }
  }
  async submitSpotOrder(userId, orderData) {
    return await this.queueTransaction(async () => {
      try {
        await this.ensureInitialized();
        // Validate inputs
        if (!userId) {
          throw new Error('User ID is required');
        }
        this.validateOrderData(orderData);
       
        const { symbol, side, type, quantity, price } = orderData;
       
        this.log('🟦 Starting spot order submission', { userId, symbol, side, type, quantity, price });
        const orderDataToInsert = {
          user_id: userId,
          symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          filled_quantity: 0,
          fee: 0,
          market_type: 'SPOT',
          leverage: 1,
          created_at: new Date().toISOString()
        };
        if (type === 'MARKET') {
          if (price <= 0) {
            throw new Error('Invalid market price provided');
          }
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('submit_spot_market_order', {
              p_user_id: userId,
              p_symbol: symbol,
              p_side: side,
              p_quantity: quantity,
              p_price: price
            });
          if (rpcError) {
            this.log('RPC error for spot market order:', rpcError);
            throw rpcError;
          }
          return rpcResult;
        } else {
          // For limit, insert pending
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert(orderDataToInsert)
            .select()
            .single();
          if (orderError) {
            this.log('Error recording pending order:', orderError);
            throw orderError;
          }
          // Manually add to cache (realtime will also, but for immediacy)
          this.handleOrderChange({ eventType: 'INSERT', new: order });
          if (side === 'SELL') {
            // Check holding for limit sell
            const baseAsset = symbol.replace('USDT', '');
            const { data: holding, error: holdingError } = await supabase
              .from('spot_holdings')
              .select('*')
              .eq('user_id', userId)
              .eq('symbol', baseAsset)
              .maybeSingle();
            if (holdingError) {
              this.log('Error checking holding for limit sell:', holdingError);
              throw holdingError;
            }
            if (!holding || holding.quantity < quantity) {
              // Cancel the order if insufficient
              await supabase
                .from('orders')
                .update({ status: 'REJECTED' })
                .eq('id', order.id);
              this.handleOrderChange({ eventType: 'UPDATE', new: { ...order, status: 'REJECTED' } });
              throw new Error(`Insufficient ${baseAsset} balance for sell limit order`);
            }
          }
          this.log('✅ Spot limit order placed successfully', { orderId: order.id });
          return { success: true, orderId: order.id, status: 'PENDING' };
        }
      } catch (error) {
        this.log('❌ Spot order failed:', error);
        throw error;
      }
    });
  }
  async submitFuturesOrder(userId, orderData) {
    return await this.queueTransaction(async () => {
      try {
        await this.ensureInitialized();
        // Validate inputs
        if (!userId) {
          throw new Error('User ID is required');
        }
        this.validateOrderData(orderData);
       
        const { symbol, side, type, quantity, price, leverage } = orderData;
        this.log('🟨 Starting futures order submission', { userId, symbol, side, type, quantity, price, leverage });
        const orderDataToInsert = {
          user_id: userId,
          symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          filled_quantity: 0,
          fee: 0,
          market_type: 'FUTURES',
          leverage: parseInt(leverage),
          created_at: new Date().toISOString()
        };
        if (type === 'MARKET') {
          if (price <= 0) {
            throw new Error('Invalid market price provided');
          }
          const { data: rpcResult, error: rpcError } = await supabase
            .rpc('submit_futures_market_order', {
              p_user_id: userId,
              p_symbol: symbol,
              p_side: side,
              p_quantity: quantity,
              p_price: price,
              p_leverage: leverage
            });
          if (rpcError) {
            this.log('RPC error for futures market order:', rpcError);
            throw rpcError;
          }
          return rpcResult;
        } else {
          // For limit, insert pending
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert(orderDataToInsert)
            .select()
            .single();
          if (orderError) {
            this.log('Error recording pending futures order:', orderError);
            throw orderError;
          }
          // Manually add to cache
          this.handleOrderChange({ eventType: 'INSERT', new: order });
          this.log('✅ Futures limit order placed successfully', { orderId: order.id });
          return { success: true, orderId: order.id, status: 'PENDING' };
        }
      } catch (error) {
        this.log('❌ Futures order failed:', error);
        throw error;
      }
    });
  }
  async updateOrCreateFuturesPosition(userId, symbol, side, quantity, executionPrice, leverage, margin) {
    try {
      return await this.retryOperation(async () => {
        const { data: existing, error: fetchError } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId)
          .eq('symbol', symbol)
          .eq('status', 'OPEN')
          .maybeSingle();
        if (fetchError) {
          this.log('Error fetching existing position:', fetchError);
          throw fetchError;
        }
        if (existing) {
          if (existing.side !== side) {
            // Close existing opposite position
            this.log('Closing opposite position before opening new...');
            await this.closeFuturesPosition(userId, existing, executionPrice);
           
            // Verify the position is now CLOSED before proceeding
            const { data: updatedPosition } = await supabase
              .from('positions')
              .select('status')
              .eq('id', existing.id)
              .single();
           
            if (updatedPosition && updatedPosition.status !== 'CLOSED') {
              throw new Error('Failed to close existing position. Cannot open new position.');
            }
           
            this.log('Existing position verified as closed');
           
            // Create new position
            await this.createFuturesPosition(userId, symbol, side, quantity, executionPrice, leverage, margin);
          } else {
            // Add to existing position (same side)
            this.log('Adding to existing position...');
            const newQuantity = parseFloat(existing.quantity) + parseFloat(quantity);
            const newMargin = parseFloat(existing.margin) + parseFloat(margin);
            const weightedEntry = (parseFloat(existing.quantity) * parseFloat(existing.entry_price) + parseFloat(quantity) * parseFloat(executionPrice)) / newQuantity;
            const newLiquidationPrice = this.calculateLiquidationPrice(weightedEntry, side, leverage);
            const { error } = await supabase
              .from('positions')
              .update({
                quantity: newQuantity,
                entry_price: weightedEntry,
                margin: newMargin,
                liquidation_price: newLiquidationPrice,
                current_price: parseFloat(executionPrice),
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);
            if (error) {
              this.log('Error updating existing position:', error);
              throw error;
            }
          }
        } else {
          // Create new position
          await this.createFuturesPosition(userId, symbol, side, quantity, executionPrice, leverage, margin);
        }
      });
    } catch (error) {
      this.log('Error in updateOrCreateFuturesPosition:', error);
      throw error;
    }
  }
  async createFuturesPosition(userId, symbol, positionSide, quantity, entryPrice, leverage, margin) {
    const liquidationPrice = this.calculateLiquidationPrice(entryPrice, positionSide, leverage);
    this.log('Creating futures position', {
      symbol,
      positionSide,
      quantity,
      entryPrice,
      leverage,
      margin,
      liquidationPrice
    });
    return await this.retryOperation(async () => {
      const { error } = await supabase
        .from('positions')
        .insert({
          user_id: userId,
          symbol,
          side: positionSide,
          quantity: parseFloat(quantity),
          entry_price: parseFloat(entryPrice),
          current_price: parseFloat(entryPrice),
          leverage: parseInt(leverage),
          margin: parseFloat(margin),
          unrealized_pnl: 0,
          realized_pnl: 0,
          liquidation_price: parseFloat(liquidationPrice),
          status: 'OPEN',
          opened_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (error) {
        this.log('Error creating position:', error);
        throw error;
      }
      this.log('✅ Position created successfully');
    });
  }
  calculateLiquidationPrice(entryPrice, side, leverage, maintenanceMarginRate = 0.005) {
    const entry = parseFloat(entryPrice);
    const lev = parseInt(leverage);
   
    if (side === 'LONG') {
      return entry * (1 - (1.0 / lev) + maintenanceMarginRate);
    } else {
      return entry * (1 + (1.0 / lev) - maintenanceMarginRate);
    }
  }
  calculatePnL(position, currentPrice) {
    const entryPrice = parseFloat(position.entry_price);
    const quantity = parseFloat(position.quantity);
    const current = parseFloat(currentPrice);
    if (position.side === 'LONG') {
      return (current - entryPrice) * quantity;
    } else {
      return (entryPrice - current) * quantity;
    }
  }
  async closeFuturesPosition(userId, position, closePrice) {
    return await this.queueTransaction(async () => {
      try {
        this.log('🟥 Closing futures position', { positionId: position.id, closePrice });
        return await this.retryOperation(async () => {
          const { data, error } = await supabase.rpc('close_futures_position', {
            p_user_id: userId,
            p_position_id: position.id,
            p_close_price: closePrice
          });
          if (error) {
            this.log('RPC error closing position:', error);
            throw error;
          }
          if (!data.success) {
            this.log('DB function failed closing position:', data.error);
            throw new Error(data.error || 'Failed to close position');
          }
          const result = {
            success: true,
            grossPnl: data.gross_pnl,
            closedQuantity: data.closed_quantity,
            closeFee: data.close_fee
          };
          this.log('✅ Position closed successfully', result);
          return result;
        });
      } catch (error) {
        this.log('❌ Error closing futures position:', error);
        throw error;
      }
    });
  }
  async updatePositionPnL(userId, symbol, currentPrice) {
    try {
      return await this.retryOperation(async () => {
        const { data: positions, error } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId)
          .eq('symbol', symbol)
          .eq('status', 'OPEN');
        if (error || !positions.length) return;
        for (const position of positions) {
          const unrealizedPnL = this.calculatePnL(position, currentPrice);
         
          await supabase
            .from('positions')
            .update({
              current_price: parseFloat(currentPrice),
              unrealized_pnl: parseFloat(unrealizedPnL),
              updated_at: new Date().toISOString()
            })
            .eq('id', position.id);
        }
      });
    } catch (error) {
      this.log('Error updating position PnL:', error);
    }
  }
  async updateSpotHoldingCurrentPrice(userId, baseSymbol, currentPrice) {
    try {
      return await this.retryOperation(async () => {
        const { data: holding, error } = await supabase
          .from('spot_holdings')
          .select('quantity, average_price')
          .eq('user_id', userId)
          .eq('symbol', baseSymbol)
          .single();
        if (error || !holding) return;
        const { quantity, average_price } = holding;
        const newCurrentValue = parseFloat(quantity) * parseFloat(currentPrice);
        const unrealizedPnl = (parseFloat(currentPrice) - parseFloat(average_price)) * parseFloat(quantity);
        await supabase
          .from('spot_holdings')
          .update({
            current_price: parseFloat(currentPrice),
            current_value: newCurrentValue,
            unrealized_pnl: unrealizedPnl,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('symbol', baseSymbol);
      });
    } catch (error) {
      this.log('Error updating spot holding price:', error);
    }
  }
  async closeAllPositions(userId) {
    try {
      await this.ensureInitialized();
      this.log('Closing all positions for user:', userId);
     
      return await this.retryOperation(async () => {
        const positions = await this.getOpenPositions(userId);
        if (positions.length === 0) {
          this.log('No positions to close');
          return { success: true, closedCount: 0 };
        }
        // Process sequentially to avoid races
        let successCount = 0;
        for (const position of positions) {
          try {
            let currentPrice = position.current_price || position.entry_price;
            const fetchedPrice = await this.getCurrentPrice(position.symbol, 'FUTURES');
            if (fetchedPrice > 0) {
              currentPrice = fetchedPrice;
            }
            if (currentPrice <= 0) {
              this.log(`Skipping position ${position.id} due to invalid price`);
              continue;
            }
            await this.closeFuturesPosition(userId, position, currentPrice);
            successCount++;
          } catch (error) {
            this.log(`Failed to close position ${position.id}:`, error);
          }
        }
       
        this.log(`Closed ${successCount}/${positions.length} positions`);
        return { success: true, closedCount: successCount };
      });
    } catch (error) {
      this.log('Error closing all positions:', error);
      throw error;
    }
  }
  calculateFillFees(quantity, price, marketType) {
    const value = quantity * price;
    const rate = marketType === 'FUTURES' ? 0.0004 : 0.001;
    return value * rate;
  }
  async processPendingOrdersForSymbol(symbol, currentPrice) {
    if (!currentPrice || isNaN(currentPrice) || currentPrice <= 0) return;
    if (!this.pendingOrders.has(symbol)) return;

    // Wait for any ongoing processing for this symbol
    while (this.symbolLocks.has(symbol)) {
      await this.symbolLocks.get(symbol);
    }

    // Create and set new lock
    const lock = this.processOrdersInternal(symbol, currentPrice);
    this.symbolLocks.set(symbol, lock);

    try {
      await lock;
    } finally {
      this.symbolLocks.delete(symbol);
    }
  }

  async processOrdersInternal(symbol, currentPrice) {
    try {
      this.log(`Processing pending orders for ${symbol} at price ${currentPrice}`);
      const orders = Array.from(this.pendingOrders.get(symbol).values())
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      for (const order of orders) {
        const shouldFill =
          (order.side === 'BUY' && currentPrice <= order.price) ||
          (order.side === 'SELL' && currentPrice >= order.price);
        if (shouldFill) {
          this.log(`Filling order ${order.id}: ${order.side} ${order.quantity} at ${order.price}`);
          await this.fillOrder(order, currentPrice);
        }
      }
    } catch (error) {
      this.log('Error processing pending orders:', error);
    }
  }
  async fillOrder(order, fillPrice) {
    const { id, symbol, side, type, quantity, market_type, leverage } = order;
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single();
    if (fetchError || currentOrder.status !== 'PENDING') {
      this.log(`Skipping fill for order ${id}: already ${currentOrder?.status || 'error'}`);
      if (this.pendingOrders.has(symbol)) {
        this.pendingOrders.get(symbol).delete(id);
        if (this.pendingOrders.get(symbol).size === 0) {
          this.pendingOrders.delete(symbol);
        }
      }
      return;
    }
    const fees = this.calculateFillFees(quantity, order.price, market_type);
    const fillQuantity = quantity; // full fill
    const averageFillPrice = order.price; // Use limit price for fill in simulator
    // Update order
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        filled_quantity: fillQuantity,
        average_fill_price: averageFillPrice,
        status: 'FILLED',
        fee: fees,
        filled_at: new Date().toISOString()
      })
      .eq('id', id);
    if (orderError) throw orderError;
    // Execute fill (trade_history handled inside for closes)
    if (market_type === 'SPOT') {
      await this.executeSpotFill(order.user_id, symbol, side, fillQuantity, averageFillPrice, fees, id);
    } else {
      await this.executeFuturesFill(order.user_id, symbol, side, fillQuantity, averageFillPrice, leverage, fees, id);
    }
    // Remove from pending cache after successful fill
    if (this.pendingOrders.has(symbol)) {
      this.pendingOrders.get(symbol).delete(id);
      if (this.pendingOrders.get(symbol).size === 0) {
        this.pendingOrders.delete(symbol);
      }
    }
  }
  async executeSpotFill(userId, symbol, side, quantity, price, fees, order_id) {
    const totalValue = quantity * price;
    if (side === 'BUY') {
      const totalCost = totalValue + fees;
      await this.updateUserBalance(userId, -totalCost, 'TRADE', `Spot fill ${side} ${symbol}`);
      await this.updateSpotHolding(userId, symbol, quantity, price, 'BUY'); // No trade_history
    } else {
      await this.updateSpotHolding(userId, symbol, quantity, price, 'SELL', fees, order_id); // Handles trade_history
      const proceeds = totalValue - fees;
      await this.updateUserBalance(userId, proceeds, 'TRADE', `Spot fill ${side} ${symbol}`);
    }
  }
  async executeFuturesFill(userId, symbol, side, quantity, price, leverage, fees, order_id) {
    const positionValue = quantity * price;
    const margin = positionValue / leverage;
    const totalRequired = margin + fees;
    // Check balance
    const balance = await this.getUserBalance(userId);
    if (totalRequired > balance) {
      throw new Error(`Insufficient margin for fill`);
    }
    const positionSide = this.mapOrderSideToPositionSide(side);
    await this.updateOrCreateFuturesPosition(userId, symbol, positionSide, quantity, price, leverage, margin);
    await this.updateUserBalance(userId, -totalRequired, 'TRADE', `Futures fill ${side} ${symbol}`);
  }
  async cancelOrder(userId, orderId) {
    try {
      await this.ensureInitialized();
      this.log('Cancelling order', { orderId });
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'CANCELLED',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('user_id', userId)
        .eq('status', 'PENDING')
        .select()
        .maybeSingle();
      if (error) {
        this.log('Error cancelling order:', error);
        throw error;
      }
      if (!data) {
        throw new Error('Order not found or not pending');
      }
      this.log('✅ Order cancelled successfully');
      return { success: true };
    } catch (error) {
      this.log('❌ Error cancelling order:', error);
      throw error;
    }
  }
  async initializePendingOrdersCache() {
    try {
      this.log('Initializing pending orders cache');
      this.pendingOrders.clear();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'PENDING');
      if (error) {
        this.log('Error fetching initial pending orders:', error);
        throw error;
      }
      data.forEach(order => {
        const sym = order.symbol;
        if (!this.pendingOrders.has(sym)) {
          this.pendingOrders.set(sym, new Map());
        }
        this.pendingOrders.get(sym).set(order.id, order);
      });
      this.log(`Cached ${data.length} pending orders`);
    } catch (error) {
      this.log('Error initializing pending orders cache:', error);
    }
  }
  setupRealtime() {
    if (this.realtimeChannel) return;
    this.log('Setting up realtime for orders');
    this.realtimeChannel = supabase
      .channel(`orders_${this.userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${this.userId}`
      }, (payload) => {
        this.handleOrderChange(payload);
      })
      .subscribe((status) => {
        this.log('Realtime subscription status:', status);
      });
  }
  handleOrderChange(payload) {
    try {
      this.log('Handling order change:', payload.eventType);
      const { eventType, new: newRecord, old: oldRecord } = payload;
      let order, symbol, id;
      switch (eventType) {
        case 'INSERT':
          order = newRecord;
          if (order.status === 'PENDING') {
            symbol = order.symbol;
            id = order.id;
            if (!this.pendingOrders.has(symbol)) {
              this.pendingOrders.set(symbol, new Map());
            }
            this.pendingOrders.get(symbol).set(id, order);
            this.log(`Added new pending order ${id} for ${symbol}`);
          }
          break;
        case 'UPDATE':
          order = newRecord;
          symbol = order.symbol;
          id = order.id;
          if (order.status !== 'PENDING') {
            if (this.pendingOrders.has(symbol)) {
              this.pendingOrders.get(symbol).delete(id);
              if (this.pendingOrders.get(symbol).size === 0) {
                this.pendingOrders.delete(symbol);
              }
              this.log(`Removed non-pending order ${id} for ${symbol}`);
            }
          } else {
            if (this.pendingOrders.has(symbol)) {
              this.pendingOrders.get(symbol).set(id, order);
            } else {
              this.pendingOrders.set(symbol, new Map([[id, order]]));
            }
            this.log(`Updated pending order ${id} for ${symbol}`);
          }
          break;
        case 'DELETE':
          if (oldRecord) {
            symbol = oldRecord.symbol;
            id = oldRecord.id;
            if (this.pendingOrders.has(symbol)) {
              this.pendingOrders.get(symbol).delete(id);
              if (this.pendingOrders.get(symbol).size === 0) {
                this.pendingOrders.delete(symbol);
              }
              this.log(`Deleted order ${id} for ${symbol}`);
            }
          }
          break;
      }
    } catch (error) {
      this.log('Error handling order change:', error);
    }
  }
}
const tradingService = new TradingService();
export default tradingService;