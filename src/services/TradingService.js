// src/services/TradingService.js
import { supabase } from '../lib/supabase';

class TradingService {
  
  constructor() {
    this.transactionInProgress = false;
    this.debugMode = true;
    this.initialized = false;
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

  async initialize() {
    if (this.initialized) return;
    
    try {
      this.log('Initializing TradingService...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        this.log('Session error:', sessionError);
        throw new Error(`Authentication check failed: ${sessionError.message}`);
      }
      
      if (!session || !session.user) {
        this.log('No session found');
        throw new Error('User not authenticated. Please login first.');
      }

      this.log('User authenticated:', session.user.id);
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

  // Update user balance with safe error handling
  async updateUserBalance(userId, changeAmount, changeType, description) {
    try {
      this.log('Updating user balance', { userId, changeAmount, changeType, description });

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
    } catch (error) {
      this.log('Error in updateUserBalance:', error);
      throw error;
    }
  }

  async updateSpotHolding(userId, symbol, quantity, price, side) {
    try {
      const baseAsset = symbol.replace('USDT', '');
      this.log('Updating spot holding', { baseAsset, quantity, price, side });

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
          const newQuantity = parseFloat(existing.quantity) - parseFloat(quantity);
          
          this.log('Selling from holding', {
            oldQuantity: existing.quantity,
            sellQuantity: quantity,
            newQuantity
          });
          
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
    } catch (error) {
      this.log('Error in updateSpotHolding:', error);
      throw error;
    }
  }

  // Submit spot order with proper error handling
  async submitSpotOrder(userId, orderData) {
    if (this.transactionInProgress) {
      throw new Error('Another transaction is in progress. Please wait.');
    }

    try {
      this.transactionInProgress = true;
      await this.ensureInitialized();

      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      this.validateOrderData(orderData);
      
      const { symbol, side, type, quantity, price } = orderData;
      
      this.log('🟦 Starting spot order submission', { userId, symbol, side, type, quantity, price });

      // Calculate execution price
      const executionPrice = type === 'MARKET' ? price : price;
      if (!executionPrice || isNaN(executionPrice) || executionPrice <= 0) {
        throw new Error('Invalid execution price calculated');
      }

      const totalValue = quantity * executionPrice;
      const feeRate = 0.001; // 0.1% fee
      const fees = totalValue * feeRate;

      this.log('Spot order calculations', {
        executionPrice,
        totalValue,
        fees,
        side
      });

      if (side === 'BUY') {
        // Check balance
        const balance = await this.getUserBalance(userId);
        const totalCost = totalValue + fees;

        this.log('BUY order validation', { balance, totalCost });

        if (totalCost > balance) {
          throw new Error(`Insufficient balance. Required: ${totalCost.toFixed(2)}, Available: ${balance.toFixed(2)}`);
        }

        // Update balance (deduct cost)
        this.log('Updating balance for BUY order...');
        await this.updateUserBalance(userId, -totalCost, 'TRADE', `Spot ${side} ${symbol}`);

        // Update or create spot holding
        this.log('Updating spot holding for BUY order...');
        await this.updateSpotHolding(userId, symbol, quantity, executionPrice, 'BUY');

      } else { // SELL
        const baseAsset = symbol.replace('USDT', '');
        
        this.log('SELL order - checking holdings for:', baseAsset);
        
        // Check holding
        const { data: holding, error: holdingError } = await supabase
          .from('spot_holdings')
          .select('*')
          .eq('user_id', userId)
          .eq('symbol', baseAsset)
          .maybeSingle();

        if (holdingError) {
          this.log('Error checking holding:', holdingError);
          throw holdingError;
        }

        if (!holding || holding.quantity < quantity) {
          const availableQuantity = holding ? holding.quantity : 0;
          throw new Error(`Insufficient ${baseAsset} balance. Required: ${quantity}, Available: ${availableQuantity}`);
        }

        this.log('SELL validation passed', { holding: holding.quantity, required: quantity });

        this.log('Updating spot holding for SELL order...');
        await this.updateSpotHolding(userId, symbol, quantity, executionPrice, 'SELL');

        const proceeds = totalValue - fees;
        this.log('Updating balance for SELL order...');
        await this.updateUserBalance(userId, proceeds, 'TRADE', `Spot ${side} ${symbol}`);
      }

      // Record order
      this.log('Recording order in database...');
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          price: parseFloat(executionPrice),
          filled_quantity: parseFloat(quantity),
          average_fill_price: parseFloat(executionPrice),
          status: 'FILLED',
          market_type: 'SPOT',
          fee: parseFloat(fees),
          filled_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        this.log('Error recording order:', orderError);
        throw orderError;
      }

      this.log('Order recorded successfully:', order.id);

      try {
        const { error: tradeError } = await supabase
          .from('trade_history')
          .insert({
            user_id: userId,
            order_id: order.id,
            symbol,
            side,
            quantity: parseFloat(quantity),
            price: parseFloat(executionPrice),
            fee: parseFloat(fees),
            market_type: 'SPOT',
            created_at: new Date().toISOString()
          });

        if (tradeError) {
          this.log('Warning: Failed to record trade history (non-critical):', tradeError);
        }
      } catch (tradeError) {
        this.log('Warning: Trade history recording failed (non-critical):', tradeError);
      }

      const result = {
        success: true,
        orderId: order.id,
        executionPrice,
        quantity,
        fees,
        totalValue
      };

      this.log('✅ Spot order completed successfully', result);
      return result;

    } catch (error) {
      this.log('❌ Spot order failed:', error);
      throw error; // Don't transform the error, just re-throw it
    } finally {
      this.transactionInProgress = false;
    }
  }

  async submitFuturesOrder(userId, orderData) {
    if (this.transactionInProgress) {
      throw new Error('Another transaction is in progress. Please wait.');
    }

    try {
      this.transactionInProgress = true;
      await this.ensureInitialized();

      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      this.validateOrderData(orderData);
      
      const { symbol, side, type, quantity, price, leverage } = orderData;

      this.log('🟨 Starting futures order submission', { userId, symbol, side, type, quantity, price, leverage });

      // Calculate execution price
      const executionPrice = type === 'MARKET' ? price : price;
      if (!executionPrice || isNaN(executionPrice) || executionPrice <= 0) {
        throw new Error('Invalid execution price calculated');
      }

      const positionValue = quantity * executionPrice;
      const margin = positionValue / leverage;
      const feeRate = 0.0004; // 0.04% fee for futures
      const fees = positionValue * feeRate;
      const totalRequired = margin + fees;

      this.log('Futures order calculations', {
        executionPrice,
        positionValue,
        margin,
        fees,
        totalRequired,
        leverage
      });

      // Check available margin
      const balance = await this.getUserBalance(userId);
      if (totalRequired > balance) {
        throw new Error(`Insufficient margin. Required: ${totalRequired.toFixed(2)}, Available: ${balance.toFixed(2)}`);
      }

      // Map order side to position side
      const positionSide = this.mapOrderSideToPositionSide(side);
      this.log('Position side mapping', { orderSide: side, positionSide });

      // Check for existing open position for the same symbol
      const existingPosition = await this.getExistingPosition(userId, symbol);
      
      if (existingPosition) {
        // Modify existing position instead of creating new one
        this.log('Found existing position, modifying...');
        await this.modifyExistingPosition(userId, existingPosition, positionSide, quantity, executionPrice, leverage, margin);
      } else {
        // Create new position
        this.log('Creating new futures position...');
        await this.createFuturesPosition(userId, symbol, positionSide, quantity, executionPrice, leverage, margin);
      }

      // Update balance (deduct margin + fees)
      this.log('Updating user balance...');
      await this.updateUserBalance(userId, -totalRequired, 'TRADE', `Futures ${side} ${symbol}`);

      // Record order
      this.log('Recording futures order...');
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          symbol,
          side,
          type,
          quantity: parseFloat(quantity),
          price: parseFloat(executionPrice),
          filled_quantity: parseFloat(quantity),
          average_fill_price: parseFloat(executionPrice),
          status: 'FILLED',
          market_type: 'FUTURES',
          leverage: parseInt(leverage),
          fee: parseFloat(fees),
          filled_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        this.log('Error recording futures order:', orderError);
        throw orderError;
      }

      // Record trade history (non-critical)
      try {
        const { error: tradeError } = await supabase
          .from('trade_history')
          .insert({
            user_id: userId,
            order_id: order.id,
            symbol,
            side,
            quantity: parseFloat(quantity),
            price: parseFloat(executionPrice),
            fee: parseFloat(fees),
            market_type: 'FUTURES',
            created_at: new Date().toISOString()
          });

        if (tradeError) {
          this.log('Warning: Failed to record trade history (non-critical):', tradeError);
        }
      } catch (tradeError) {
        this.log('Warning: Trade history recording failed (non-critical):', tradeError);
      }

      const result = {
        success: true,
        orderId: order.id,
        executionPrice,
        quantity,
        fees,
        margin,
        leverage
      };

      this.log('✅ Futures order completed successfully', result);
      return result;

    } catch (error) {
      this.log('❌ Futures order failed:', error);
      throw error; // Don't transform the error, just re-throw it
    } finally {
      this.transactionInProgress = false;
    }
  }

  async getExistingPosition(userId, symbol) {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .eq('status', 'OPEN')
        .maybeSingle();

      if (error) {
        this.log('Error checking existing position:', error);
        throw error;
      }

      return data;
    } catch (error) {
      this.log('Error in getExistingPosition:', error);
      throw error;
    }
  }

  async modifyExistingPosition(userId, existingPosition, newPositionSide, quantity, price, leverage, margin) {
    try {
      this.log('Modifying existing position', {
        existingPositionId: existingPosition.id,
        existingSide: existingPosition.side,
        newPositionSide,
        quantity,
        price
      });

      if (existingPosition.side === newPositionSide) {
        // Same side - increase position size
        const totalQuantity = parseFloat(existingPosition.quantity) + parseFloat(quantity);
        const totalValue = (parseFloat(existingPosition.quantity) * parseFloat(existingPosition.entry_price)) + 
                          (parseFloat(quantity) * parseFloat(price));
        const newAvgPrice = totalValue / totalQuantity;
        const newMargin = parseFloat(existingPosition.margin) + parseFloat(margin);
        const newLiquidationPrice = this.calculateLiquidationPrice(newAvgPrice, newPositionSide, leverage);

        const { error } = await supabase
          .from('positions')
          .update({
            quantity: totalQuantity,
            entry_price: newAvgPrice,
            current_price: parseFloat(price),
            margin: newMargin,
            liquidation_price: newLiquidationPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPosition.id);

        if (error) {
          this.log('Error updating existing position:', error);
          throw error;
        }

        this.log('Position size increased successfully');
      } else {
        // Opposite side - reduce or close position
        const existingQty = parseFloat(existingPosition.quantity);
        const newQty = parseFloat(quantity);

        if (newQty >= existingQty) {
          // Close existing position and potentially open new one in opposite direction
          const pnl = this.calculatePnL(existingPosition, price);
          await this.closeFuturesPosition(userId, existingPosition, price, pnl);

          if (newQty > existingQty) {
            // Create new position with remaining quantity
            const remainingQty = newQty - existingQty;
            await this.createFuturesPosition(userId, existingPosition.symbol, newPositionSide, remainingQty, price, leverage, margin * (remainingQty / newQty));
          }
        } else {
          // Reduce position size
          const remainingQty = existingQty - newQty;
          const proportionalMargin = parseFloat(existingPosition.margin) * (remainingQty / existingQty);

          const { error } = await supabase
            .from('positions')
            .update({
              quantity: remainingQty,
              margin: proportionalMargin,
              current_price: parseFloat(price),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPosition.id);

          if (error) {
            this.log('Error reducing position size:', error);
            throw error;
          }

          // Refund partial margin
          const marginRefund = parseFloat(existingPosition.margin) - proportionalMargin;
          await this.updateUserBalance(userId, marginRefund, 'TRADE', `Partial position close ${existingPosition.symbol}`);

          this.log('Position size reduced successfully');
        }
      }
    } catch (error) {
      this.log('Error in modifyExistingPosition:', error);
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

  async closeFuturesPosition(userId, position, closePrice, pnl) {
    if (this.transactionInProgress) {
      throw new Error('Another transaction is in progress. Please wait.');
    }

    try {
      this.transactionInProgress = true;
      await this.ensureInitialized();
      
      this.log('🟥 Closing futures position', { positionId: position.id, closePrice, pnl });

      const { error } = await supabase
        .from('positions')
        .update({
          status: 'CLOSED',
          current_price: parseFloat(closePrice),
          realized_pnl: parseFloat(pnl),
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', position.id)
        .eq('user_id', userId); // Add user_id check for security

      if (error) {
        this.log('Error closing position:', error);
        throw error;
      }

      const balanceChange = position.margin + pnl;
      await this.updateUserBalance(userId, balanceChange, 'PNL', 
        `Closed ${position.side} ${position.symbol} position`);

      const result = {
        success: true,
        pnl,
        closedQuantity: position.quantity
      };

      this.log('✅ Position closed successfully', result);
      return result;

    } catch (error) {
      this.log('❌ Error closing futures position:', error);
      throw error;
    } finally {
      this.transactionInProgress = false;
    }
  }

  async updatePositionPnL(userId, symbol, currentPrice) {
    try {
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
    } catch (error) {
      this.log('Error updating position PnL:', error);
    }
  }

  async updateSpotHoldingCurrentPrice(userId, baseSymbol, currentPrice) {
    try {
      const { data: holding, error } = await supabase
        .from('spot_holdings')
        .select('quantity, average_price')
        .eq('user_id', userId)
        .eq('symbol', baseSymbol)
        .single();

      if (error || !holding) return;

      const { quantity, average_price } = holding;
      const newCurrentValue = parseFloat(quantity) * parseFloat(currentPrice);
      const unrealizedPnL = (parseFloat(currentPrice) - parseFloat(average_price)) * parseFloat(quantity);

      await supabase
        .from('spot_holdings')
        .update({
          current_price: parseFloat(currentPrice),
          current_value: newCurrentValue,
          unrealized_pnl: unrealizedPnL,
          updated_at: new Date().toISOString()