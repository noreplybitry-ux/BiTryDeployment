import React, { useEffect, useRef, useState, useMemo } from "react";
import "../css/Trade.css";
import TechnicalAnalysis from "./TechnicalAnalysis";
import { usePriceData } from "../hooks/usePriceData";
import { usePortfolio } from "../hooks/usePortfolio";
import { useAuth } from "../contexts/AuthContext";
import webSocketManager from "../services/WebSocketManager";
import Swal from 'sweetalert2';
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
const DEFAULT_SYMBOL = "BTCUSDT";
const DEFAULT_INTERVAL = "1m";
const getCryptoIcon = (symbol) => {
  const baseSymbol = symbol.replace("USDT", "").toLowerCase();
  const getCryptoImageUrl = (s) => {
    return `https://cryptoicons.org/api/icon/${s}/50`;
  };
  const iconMap = {
    btc: "₿", eth: "Ξ", bnb: "💛", ada: "₳", xrp: "✕", dot: "●", uni: "🦄",
    link: "🔗", ltc: "Ł", bch: "₿", xlm: "🚀", vet: "⚡", theta: "θ",
    fil: "📁", trx: "🔺", etc: "💚", eos: "📱", atom: "⚛️", neo: "●",
    mkr: "🏛️", aave: "👻", comp: "🏛️", sushi: "🍣", yfi: "💙", snx: "⚡",
    "1inch": "1️⃣", cake: "🎂", sol: "☀️", matic: "🔷", avax: "🔺",
    doge: "🐕", shib: "🐕",
  };
  return {
    imageUrl: getCryptoImageUrl(baseSymbol),
    emoji: iconMap[baseSymbol] || "🪙",
  };
};
const TradingViewChart = ({ symbol, interval, isFutures }) => {
  const containerRef = useRef();
  const widgetRef = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState(null);
  const readyTimeoutRef = useRef(null);
  const initTimeoutRef = useRef(null);
  const intervalMap = useMemo(() => ({
    "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "1D",
  }), []);
  const tradingviewSymbol = isFutures ? `BINANCE:${symbol}.P` : `BINANCE:${symbol}`;
  useEffect(() => {
    if (window.TradingView) {
      setScriptLoaded(true);
      return;
    }
    const existingScript = document.querySelector('script[src*="tradingview"]');
    if (existingScript) {
      const checkTradingView = () => {
        if (window.TradingView) {
          setScriptLoaded(true);
        } else {
          setTimeout(checkTradingView, 100);
        }
      };
      checkTradingView();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      setIsLoading(false);
      setError("Failed to load chart");
      console.error("Failed to load TradingView script");
    };
    document.head.appendChild(script);
    return () => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !symbol) return;
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    if (widgetRef.current && typeof widgetRef.current.remove === "function") {
      try {
        widgetRef.current.remove();
      } catch (e) {
        console.error("Error removing previous widget:", e);
      }
      widgetRef.current = null;
    }
    setIsLoading(true);
    setError(null);
    initTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      try {
        const containerId = `tradingview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        containerRef.current.id = containerId;
        containerRef.current.style.width = '100%';
        containerRef.current.style.height = '100%';
        containerRef.current.style.position = 'relative';
        readyTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setError(null);
        }, 5000);
        const widgetConfig = {
          symbol: tradingviewSymbol,
          interval: intervalMap[interval] || "60",
          container_id: containerId,
          autosize: true,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#1e222d",
          enable_publishing: false,
          backgroundColor: "#1e222d",
          gridColor: "#2a2e39",
          hide_top_toolbar: false,
          hide_legend: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          save_image: true,
          studies_overrides: {},
          width: "100%",
          height: "100%",
          enabled_features: [
            "left_toolbar", "header_widget", "timeframes_toolbar",
            "header_chart_type", "header_resolutions", "header_screenshot",
            "header_settings", "header_indicators", "header_compare",
            "header_undo_redo", "header_fullscreen_button", "header_symbol_search",
          ],
          disabled_features: [
            "popup_hints", "header_saveload", "study_templates",
            "volume_force_overlay", "create_volume_indicator_by_default"
          ],
          overrides: {
            "paneProperties.background": "#1e222d",
            "paneProperties.vertGridProperties.color": "#2a2e39",
            "paneProperties.horzGridProperties.color": "#2a2e39",
            "scalesProperties.textColor": "#b7bdc6",
            "paneProperties.crossHairProperties.color": "#b7bdc6",
          },
          onChartReady: function () {
            if (readyTimeoutRef.current) {
              clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
            }
            setIsLoading(false);
            setError(null);
            console.log('TradingView chart ready');
          },
          onLoadError: (err) => {
            console.error("TradingView onLoadError:", err);
            if (readyTimeoutRef.current) {
              clearTimeout(readyTimeoutRef.current);
              readyTimeoutRef.current = null;
            }
            setIsLoading(false);
            tryFallbackSymbol();
          },
        };
        const tryFallbackSymbol = () => {
          if (tradingviewSymbol.endsWith(".P")) {
            try {
              widgetConfig.symbol = `BINANCE:${symbol}`;
              widgetRef.current = new window.TradingView.widget(widgetConfig);
            } catch (err2) {
              console.error("Fallback symbol also failed:", err2);
              setError("Chart unavailable");
            }
          } else {
            setError("Chart unavailable");
          }
        };
        try {
          widgetRef.current = new window.TradingView.widget(widgetConfig);
        } catch (err) {
          console.error("Error creating widget:", err);
          tryFallbackSymbol();
        }
      } catch (e) {
        console.error("Error in widget initialization:", e);
        setIsLoading(false);
        setError("Chart initialization failed");
      }
    }, 100);
    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      if (widgetRef.current && typeof widgetRef.current.remove === "function") {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.error("Error removing widget on cleanup:", e);
        }
        widgetRef.current = null;
      }
    };
  }, [symbol, interval, isFutures, scriptLoaded, tradingviewSymbol, intervalMap]);
  return (
    <div className="chart-wrapper">
      <div
        ref={containerRef}
        className="tradingview-container"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "600px",
          backgroundColor: "#1e222d",
          position: "relative",
        }}
      />
      {isLoading && (
        <div className="chart-loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading chart...</span>
        </div>
      )}
      {error && (
        <div className="chart-error-overlay">
          <div className="error-icon">⚠️</div>
          <span>{error}</span>
          <button onClick={() => {
            setError(null);
            setIsLoading(true);
            if (widgetRef.current) {
              try {
                widgetRef.current.remove();
              } catch (e) {
                console.error("Error removing widget on retry:", e);
              }
              widgetRef.current = null;
            }
          }}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
const CryptoIcon = ({ symbol, size = "small", imageUrl = null }) => {
  const [imageError, setImageError] = useState(false);
  const fallback = getCryptoIcon(symbol);
  const resolvedImage = imageUrl || fallback.imageUrl;
  if (imageError || !resolvedImage) {
    return <div className={`coin-icon ${size}`}>{fallback.emoji}</div>;
  }
  return (
    <div className={`coin-icon ${size}`}>
      <img
        src={resolvedImage}
        alt={symbol}
        onError={() => setImageError(true)}
        style={{ width: "100%", height: "100%", borderRadius: "50%" }}
      />
    </div>
  );
};
const PositionRow = ({ position, onClose, currentPrices, cryptoImages }) => {
  const [isClosing, setIsClosing] = useState(false);
  const currentPrice = currentPrices[position.symbol] || position.current_price;
  const pnl = position.side === 'LONG'
    ? (currentPrice - position.entry_price) * position.quantity
    : (position.entry_price - currentPrice) * position.quantity;
  const pnlPercent = (pnl / position.margin) * 100;
  const isProfit = pnl >= 0;
  const handleClose = async () => {
    if (currentPrice <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid current price for closing position',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Close this ${position.side} position?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, close it!'
    });
    if (result.isConfirmed) {
      setIsClosing(true);
      try {
        await onClose(position.id, currentPrice);
        Swal.fire({
          icon: 'success',
          title: 'Closed',
          text: 'Position closed successfully',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error closing position:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to close position: ' + error.message,
          confirmButtonColor: '#3085d6'
        });
      } finally {
        setIsClosing(false);
      }
    }
  };
  const isNearLiquidation = position.liquidation_price && (
    (position.side === 'LONG' && currentPrice <= position.liquidation_price * 1.1) ||
    (position.side === 'SHORT' && currentPrice >= position.liquidation_price * 0.9)
  );
  const liqPrice = position.liquidation_price || 0;
  const positionImageUrl = cryptoImages[position.symbol];
  return (
    <tr className={`position-row ${isNearLiquidation ? 'near-liquidation' : ''}`}>
      <td>
        <div className="position-symbol">
          <CryptoIcon symbol={position.symbol} size="small" imageUrl={positionImageUrl} />
          <div className="symbol-info">
            <div className="symbol-name">{position.symbol.replace('USDT', '')}/USDT</div>
            <div className={`position-side ${position.side.toLowerCase()}`}>
              {position.side} {position.leverage}x
            </div>
            {isNearLiquidation && <div className="liquidation-warning">⚠️ Near Liquidation</div>}
          </div>
        </div>
      </td>
      <td className="text-right">{Number(position.quantity).toFixed(4)}</td>
      <td className="text-right">${Number(position.entry_price).toFixed(4)}</td>
      <td className="text-right">${Number(currentPrice).toFixed(4)}</td>
      <td className="text-right">${Number(liqPrice).toFixed(4)}</td>
      <td className={`text-right ${isProfit ? 'positive' : 'negative'}`}>
        <div>${pnl.toFixed(2)}</div>
        <div className="pnl-percent">{isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%</div>
      </td>
      <td className="text-center">
        <button
          className="close-btn"
          onClick={handleClose}
          disabled={isClosing || currentPrice <= 0}
          title={currentPrice <= 0 ? 'Invalid price data' : `Close ${position.side} position`}
        >
          {isClosing ? 'Closing...' : 'Close'}
        </button>
      </td>
    </tr>
  );
};
// Enhanced Spot Holding Row Component
const SpotHoldingRow = ({ holding, cryptoImages, onSell }) => {
  const currentValue = holding.current_value || (holding.quantity * holding.average_price);
  const unrealizedPnl = holding.unrealized_pnl || 0;
  const pnlPercent = holding.average_price > 0
    ? ((holding.current_price - holding.average_price) / holding.average_price) * 100
    : 0;
  const isProfit = unrealizedPnl >= 0;
  const holdingSymbol = `${holding.symbol}USDT`;
  const holdingImageUrl = cryptoImages[holdingSymbol];
  const handleSell = async () => {
    const { value: quantity } = await Swal.fire({
      title: 'Sell Quantity',
      input: 'number',
      inputLabel: `Available: ${holding.quantity.toFixed(6)} ${holding.symbol}`,
      inputPlaceholder: 'Enter quantity',
      inputAttributes: {
        min: 0,
        max: holding.quantity,
        step: 0.000001
      },
      showCancelButton: true,
      confirmButtonText: 'Sell',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      inputValidator: (value) => {
        if (!value || value <= 0 || value > holding.quantity) {
          return 'Invalid quantity';
        }
      }
    });
    if (quantity) {
      const result = await Swal.fire({
        title: 'Confirm Sell',
        text: `Sell ${quantity} ${holding.symbol} at market price?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, sell!'
      });
      if (result.isConfirmed) {
        try {
          await onSell(holding.symbol, quantity);
          Swal.fire({
            icon: 'success',
            title: 'Sold',
            text: 'Market sell executed successfully',
            timer: 2000,
            showConfirmButton: false
          });
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonColor: '#3085d6'
          });
        }
      }
    }
  };
  return (
    <tr className="holding-row">
      <td>
        <div className="position-symbol">
          <CryptoIcon symbol={holdingSymbol} size="small" imageUrl={holdingImageUrl} />
          <div className="symbol-info">
            <div className="symbol-name">{holding.symbol}</div>
            <div className="holding-type">Spot</div>
          </div>
        </div>
      </td>
      <td className="text-right">{Number(holding.quantity).toFixed(6)}</td>
      <td className="text-right">${Number(holding.average_price).toFixed(4)}</td>
      <td className="text-right">${Number(holding.current_price || holding.average_price).toFixed(4)}</td>
      <td className="text-right">${currentValue.toFixed(2)}</td>
      <td className={`text-right ${isProfit ? 'positive' : 'negative'}`}>
        <div>${unrealizedPnl.toFixed(2)}</div>
        <div className="pnl-percent">{isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%</div>
      </td>
      <td className="text-center">
        <button className="close-btn" onClick={handleSell}>Sell Market</button>
      </td>
    </tr>
  );
};
const OrderHistoryRow = ({ order, cryptoImages, onCancel }) => {
  const statusColor = {
    'FILLED': 'success',
    'PENDING': 'warning',
    'CANCELLED': 'error',
    'REJECTED': 'error'
  }[order.status] || 'neutral';
  const orderImageUrl = cryptoImages[order.symbol];
  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: 'Are you sure you want to cancel this pending order?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel!'
    });
    if (result.isConfirmed) {
      try {
        await onCancel(order.id);
        Swal.fire({
          icon: 'success',
          title: 'Cancelled',
          text: 'Order cancelled successfully',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message,
          confirmButtonColor: '#3085d6'
        });
      }
    }
  };
  return (
    <tr className="order-history-row">
      <td>{new Date(order.created_at).toLocaleString()}</td>
      <td>
        <div className="position-symbol">
          <CryptoIcon symbol={order.symbol} size="small" imageUrl={orderImageUrl} />
          <span>{order.symbol.replace('USDT', '')}/USDT</span>
        </div>
      </td>
      <td>
        <span className={`side-badge ${order.side.toLowerCase()}`}>
          {order.side}
        </span>
      </td>
      <td>{order.type}</td>
      <td className="text-right">{Number(order.quantity).toFixed(6)}</td>
      <td className="text-right">${Number(order.price || 0).toFixed(4)}</td>
      <td>
        <span className={`status-badge ${statusColor}`}>
          {order.status}
        </span>
      </td>
      <td>{order.market_type}</td>
      <td className="text-center">
        {order.status === 'PENDING' && (
          <button className="close-btn" onClick={handleCancel}>Cancel</button>
        )}
      </td>
    </tr>
  );
};
// Mobile Card Components
const PositionCard = ({ position, onClose, currentPrices, cryptoImages }) => {
  const [isClosing, setIsClosing] = useState(false);
  const currentPrice = currentPrices[position.symbol] || position.current_price;
  const pnl = position.side === 'LONG'
    ? (currentPrice - position.entry_price) * position.quantity
    : (position.entry_price - currentPrice) * position.quantity;
  const pnlPercent = (pnl / position.margin) * 100;
  const isProfit = pnl >= 0;
  const liqPrice = position.liquidation_price || 0;
  const positionImageUrl = cryptoImages[position.symbol];
  const handleClose = async () => {
    if (currentPrice <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid current price for closing position',
        confirmButtonColor: '#3085d6'
      });
      return;
    }
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Close this ${position.side} position?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, close it!'
    });
    if (result.isConfirmed) {
      setIsClosing(true);
      try {
        await onClose(position.id, currentPrice);
        Swal.fire({
          icon: 'success',
          title: 'Closed',
          text: 'Position closed successfully',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error closing position:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to close position: ' + error.message,
          confirmButtonColor: '#3085d6'
        });
      } finally {
        setIsClosing(false);
      }
    }
  };
  const isNearLiquidation = position.liquidation_price && (
    (position.side === 'LONG' && currentPrice <= position.liquidation_price * 1.1) ||
    (position.side === 'SHORT' && currentPrice >= position.liquidation_price * 0.9)
  );
  return (
    <div className={`position-card ${isNearLiquidation ? 'near-liquidation' : ''}`}>
      <div className="card-header">
        <div className="symbol-section">
          <CryptoIcon symbol={position.symbol} size="small" imageUrl={positionImageUrl} />
          <div className="symbol-info">
            <div className="symbol-name">{position.symbol.replace('USDT', '')}/USDT</div>
            <div className={`position-side ${position.side.toLowerCase()}`}>
              {position.side} {position.leverage}x
            </div>
          </div>
        </div>
        {isNearLiquidation && <div className="liquidation-warning">⚠️ Near Liquidation</div>}
      </div>
      <div className="card-body">
        <div className="row">
          <span>Size</span>
          <span className="text-right">{Number(position.quantity).toFixed(4)}</span>
        </div>
        <div className="row">
          <span>Entry Price</span>
          <span className="text-right">${Number(position.entry_price).toFixed(4)}</span>
        </div>
        <div className="row">
          <span>Mark Price</span>
          <span className="text-right">${Number(currentPrice).toFixed(4)}</span>
        </div>
        <div className="row">
          <span>Liq. Price</span>
          <span className="text-right">${Number(liqPrice).toFixed(4)}</span>
        </div>
        <div className={`row pnl-row ${isProfit ? 'positive' : 'negative'}`}>
          <span>P&L</span>
          <span className="text-right">
            ${pnl.toFixed(2)} ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="card-footer">
        <button
          className="close-btn"
          onClick={handleClose}
          disabled={isClosing || currentPrice <= 0}
        >
          {isClosing ? 'Closing...' : 'Close'}
        </button>
      </div>
    </div>
  );
};
const SpotHoldingCard = ({ holding, cryptoImages, onSell }) => {
  const currentValue = holding.current_value || (holding.quantity * holding.average_price);
  const unrealizedPnl = holding.unrealized_pnl || 0;
  const pnlPercent = holding.average_price > 0
    ? ((holding.current_price - holding.average_price) / holding.average_price) * 100
    : 0;
  const isProfit = unrealizedPnl >= 0;
  const holdingSymbol = `${holding.symbol}USDT`;
  const holdingImageUrl = cryptoImages[holdingSymbol];
  const handleSell = async () => {
    const { value: quantity } = await Swal.fire({
      title: 'Sell Quantity',
      input: 'number',
      inputLabel: `Available: ${holding.quantity.toFixed(6)} ${holding.symbol}`,
      inputPlaceholder: 'Enter quantity',
      inputAttributes: {
        min: 0,
        max: holding.quantity,
        step: 0.000001
      },
      showCancelButton: true,
      confirmButtonText: 'Sell',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      inputValidator: (value) => {
        if (!value || value <= 0 || value > holding.quantity) {
          return 'Invalid quantity';
        }
      }
    });
    if (quantity) {
      const result = await Swal.fire({
        title: 'Confirm Sell',
        text: `Sell ${quantity} ${holding.symbol} at market price?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, sell!'
      });
      if (result.isConfirmed) {
        try {
          await onSell(holding.symbol, quantity);
          Swal.fire({
            icon: 'success',
            title: 'Sold',
            text: 'Market sell executed successfully',
            timer: 2000,
            showConfirmButton: false
          });
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonColor: '#3085d6'
          });
        }
      }
    }
  };
  return (
    <div className="holding-card">
      <div className="card-header">
        <div className="symbol-section">
          <CryptoIcon symbol={holdingSymbol} size="small" imageUrl={holdingImageUrl} />
          <div className="symbol-info">
            <div className="symbol-name">{holding.symbol}</div>
            <div className="holding-type">Spot</div>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="row">
          <span>Quantity</span>
          <span className="text-right">{Number(holding.quantity).toFixed(6)}</span>
        </div>
        <div className="row">
          <span>Avg Price</span>
          <span className="text-right">${Number(holding.average_price).toFixed(4)}</span>
        </div>
        <div className="row">
          <span>Current Price</span>
          <span className="text-right">${Number(holding.current_price || holding.average_price).toFixed(4)}</span>
        </div>
        <div className="row">
          <span>Value</span>
          <span className="text-right">${currentValue.toFixed(2)}</span>
        </div>
        <div className={`row pnl-row ${isProfit ? 'positive' : 'negative'}`}>
          <span>P&L</span>
          <span className="text-right">
            ${unrealizedPnl.toFixed(2)} ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="card-footer">
        <button className="close-btn" onClick={handleSell}>Sell Market</button>
      </div>
    </div>
  );
};
const OrderHistoryCard = ({ order, cryptoImages, onCancel }) => {
  const statusColor = {
    'FILLED': 'success',
    'PENDING': 'warning',
    'CANCELLED': 'error',
    'REJECTED': 'error'
  }[order.status] || 'neutral';
  const orderImageUrl = cryptoImages[order.symbol];
  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: 'Are you sure you want to cancel this pending order?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, cancel!'
    });
    if (result.isConfirmed) {
      try {
        await onCancel(order.id);
        Swal.fire({
          icon: 'success',
          title: 'Cancelled',
          text: 'Order cancelled successfully',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message,
          confirmButtonColor: '#3085d6'
        });
      }
    }
  };
  return (
    <div className="order-card">
      <div className="card-header">
        <div className="time">{new Date(order.created_at).toLocaleString()}</div>
        <span className={`status-badge ${statusColor}`}>
          {order.status}
        </span>
      </div>
      <div className="card-body">
        <div className="row">
          <span>Symbol</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
            <CryptoIcon symbol={order.symbol} size="small" imageUrl={orderImageUrl} />
            <span>{order.symbol.replace('USDT', '')}/USDT</span>
          </div>
        </div>
        <div className="row">
          <span>Side</span>
          <span className="text-right">
            <span className={`side-badge ${order.side.toLowerCase()}`}>
              {order.side}
            </span>
          </span>
        </div>
        <div className="row">
          <span>Type</span>
          <span className="text-right">{order.type}</span>
        </div>
        <div className="row">
          <span>Quantity</span>
          <span className="text-right">{Number(order.quantity).toFixed(6)}</span>
        </div>
        <div className="row">
          <span>Price</span>
          <span className="text-right">${Number(order.price || 0).toFixed(4)}</span>
        </div>
        <div className="row">
          <span>Market</span>
          <span className="text-right">{order.market_type}</span>
        </div>
        {order.status === 'PENDING' && (
          <div className="row">
            <span>Actions</span>
            <button className="close-btn" onClick={handleCancel}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};
export default function TradePage({ initialSymbol = DEFAULT_SYMBOL, initialInterval = DEFAULT_INTERVAL }) {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [interval, setInterval] = useState(initialInterval);
  const [cryptoList, setCryptoList] = useState([]);
  const [filteredCrypto, setFilteredCrypto] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPrice, setSelectedPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [isFutures, setIsFutures] = useState(true);
  const [orderType, setOrderType] = useState("limit");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("positions");
  const [isAgeVerified, setIsAgeVerified] = useState(null);
  const navigate = useNavigate();
  const {
    balance,
    positions,
    spotHoldings,
    orderHistory,
    totalPnL,
    totalPortfolioValue,
    submitOrder,
    closePosition,
    closeAllPositions,
    refreshPortfolio,
    usedMargin,
    freeMargin,
    loading: portfolioLoading,
    marginUtilization,
    cancelOrder
  } = usePortfolio();
  const { lastPrice, priceChange, rawLastPrice, isConnected } = usePriceData(symbol, isFutures ? 'futures' : 'spot');
  const autoFilledSymbolRef = useRef(null);
  const userEditedRef = useRef(false);
  const [cryptoPage, setCryptoPage] = useState(1);
  const [hasMoreCryptos, setHasMoreCryptos] = useState(true);
  const cryptoImages = useMemo(() => {
    return cryptoList.reduce((acc, c) => {
      acc[c.value] = c.image;
      return acc;
    }, {});
  }, [cryptoList]);
  useEffect(() => {
    if (orderError) {
      const timer = setTimeout(() => setOrderError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [orderError]);
  useEffect(() => {
    if (orderSuccess) {
      const timer = setTimeout(() => setOrderSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [orderSuccess]);
  useEffect(() => {
    let isMounted = true;
    const fetchTopCryptos = async () => {
      try {
        setLoading(true);
        const page = cryptoPage;
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false&price_change_percentage=24h`
        );
        if (!response.ok) throw new Error("Failed to fetch crypto markets");
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
          setHasMoreCryptos(false);
          setLoading(false);
          return;
        }
        const binanceSymbols = data
          .map((coin) => ({
            coin,
            candidate: `${coin.symbol.toUpperCase()}USDT`,
          }))
          .map((c) => ({
            value: c.candidate,
            label: `${c.coin.name} (${c.coin.symbol.toUpperCase()}/USDT)`,
            priceChange24h: c.coin.price_change_percentage_24h || 0,
            symbol: c.coin.symbol.toUpperCase(),
            marketCap: c.coin.market_cap || 0,
            image: c.coin.image || null,
          }));
        const uniqueSymbols = binanceSymbols.reduce((acc, current) => {
          const x = acc.find((item) => item.value === current.value);
          if (!x) return acc.concat([current]);
          return acc;
        }, []);
        if (!isMounted) return;
        if (page === 1) {
          setCryptoList(uniqueSymbols);
        } else {
          setCryptoList((prev) => {
            const combined = [...prev, ...uniqueSymbols];
            const deduped = combined.reduce((acc, cur) => {
              if (!acc.find((x) => x.value === cur.value)) acc.push(cur);
              return acc;
            }, []);
            return deduped;
          });
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch cryptocurrencies:", err);
        setLoading(false);
        if (cryptoPage === 1) {
          setCryptoList(getFallbackCryptos());
        }
      }
    };
    fetchTopCryptos();
    return () => {
      isMounted = false;
    };
  }, [cryptoPage, isFutures]);
  const getFallbackCryptos = () => {
    const popularCryptos = [
      "BTC", "ETH", "BNB", "ADA", "XRP", "SOL", "DOT", "DOGE", "SHIB", "MATIC",
      "AVAX", "LTC", "LINK", "ATOM", "XLM", "ALGO", "VET", "FIL", "TRX", "ETC"
    ];
    return popularCryptos.map((sym) => ({
      value: `${sym}USDT`,
      label: `${sym}/USDT`,
      priceChange24h: 0,
      symbol: sym,
      marketCap: 0,
      image: null,
    }));
  };
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCrypto(cryptoList);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = cryptoList.filter(
        (crypto) =>
          crypto.label.toLowerCase().includes(term) ||
          crypto.value.toLowerCase().includes(term) ||
          crypto.symbol.toLowerCase().includes(term)
      );
      setFilteredCrypto(filtered);
    }
  }, [searchTerm, cryptoList]);
  useEffect(() => {
    if (!cryptoList || cryptoList.length === 0) return;
    if (!cryptoList.find((c) => c.value === symbol)) {
      setSymbol(cryptoList[0].value);
    }
  }, [cryptoList, symbol]);
  useEffect(() => {
    userEditedRef.current = false;
    setSelectedPrice("");
    autoFilledSymbolRef.current = null;
    setOrderError("");
    setOrderSuccess("");
  }, [symbol]);
  useEffect(() => {
    if (lastPrice !== '--' &&
        autoFilledSymbolRef.current !== symbol &&
        !userEditedRef.current &&
        orderType === 'limit') {
      setSelectedPrice(lastPrice);
      autoFilledSymbolRef.current = symbol;
    }
  }, [lastPrice, symbol, orderType]);
  const loadMoreCryptos = () => {
    if (hasMoreCryptos && !loading) {
      setCryptoPage((prev) => prev + 1);
    }
  };
  const getMinQty = () => {
    return 0.0001; // Fallback always, no Binance fetch
  };
  const calculatePositionValue = () => {
    const price = orderType === "market" ? rawLastPrice : parseFloat(selectedPrice);
    const qty = parseFloat(quantity);
    if (!price || !qty || qty < getMinQty() || price <= 0) return 0;
    const val = price * qty;
    if (isFutures) return val * leverage;
    return val;
  };
  const calculateFees = () => {
    const positionValue = parseFloat(calculatePositionValue() || 0);
    const feeRate = isFutures ? 0.0004 : 0.001;
    const fees = positionValue * feeRate;
    return isNaN(fees) ? "0.00" : fees.toFixed(4);
  };
  const calculateRequiredMargin = () => {
    const price = orderType === "market" ? rawLastPrice : parseFloat(selectedPrice);
    const qty = parseFloat(quantity);
    if (!price || !qty || !isFutures || price <= 0) return 0;
    const positionValue = price * qty;
    if (isNaN(positionValue)) return 0;
    return (positionValue / leverage).toFixed(2);
  };
  const getMaxSellQuantity = () => {
    if (isFutures) return null;
    const baseAsset = symbol.replace('USDT', '');
    const holding = spotHoldings.find(h => h.symbol === baseAsset);
    return holding ? holding.quantity : 0;
  };
  const validateOrder = (side) => {
    const price = orderType === "market" ? rawLastPrice : parseFloat(selectedPrice);
    const qty = parseFloat(quantity);
    const minQty = getMinQty();
    if (!user) {
      throw new Error('Please login to trade');
    }
    if (!qty || qty <= 0 || qty < minQty) {
      throw new Error(`Please enter a valid quantity (min: ${minQty})`);
    }
    if (orderType === 'market' && (!price || price <= 0)) {
      throw new Error('Market price not available. Please wait for connection.');
    }
    if (orderType === 'limit' && (!price || price <= 0)) {
      throw new Error('Please enter a valid price');
    }
    if (orderType === 'limit') {
      if (isFutures) {
        if (leverage < 1 || leverage > 100) {
          throw new Error('Leverage must be between 1x and 100x');
        }
      } else if (side === 'SELL') {
        const baseAsset = symbol.replace('USDT', '');
        const holding = spotHoldings.find(h => h.symbol === baseAsset);
        if (!holding || holding.quantity < qty) {
          throw new Error(`Insufficient ${baseAsset} balance for sale`);
        }
      }
      return true;
    }
    // For market orders, full checks
    if (isFutures) {
      const requiredMargin = parseFloat(calculateRequiredMargin());
      const fees = parseFloat(calculateFees());
      const totalRequired = requiredMargin + fees;
      if (totalRequired > freeMargin) {
        throw new Error(`Insufficient margin. Required: ${totalRequired.toFixed(2)}, Available: ${freeMargin.toFixed(2)}`);
      }
      if (leverage < 1 || leverage > 100) {
        throw new Error('Leverage must be between 1x and 100x');
      }
    } else {
      if (side === 'BUY') {
        const totalCost = qty * price + parseFloat(calculateFees());
        if (totalCost > balance) {
          throw new Error(`Insufficient balance. Required: ${totalCost.toFixed(2)}, Available: ${balance.toFixed(2)}`);
        }
      } else {
        const baseAsset = symbol.replace('USDT', '');
        const holding = spotHoldings.find(h => h.symbol === baseAsset);
        if (!holding || holding.quantity < qty) {
          throw new Error(`Insufficient ${baseAsset} balance for sale`);
        }
      }
    }
    return true;
  };
  async function submitOrderHandler(side) {
    setOrderError("");
    setOrderSuccess("");
    try {
      validateOrder(side);
      if (side === 'SELL' && !isFutures) {
        const result = await Swal.fire({
          title: 'Confirm Sell',
          text: `Are you sure you want to sell ${quantity} ${symbol.replace('USDT', '')}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, sell!'
        });
        if (!result.isConfirmed) return;
      }
      const price = orderType === "market" ? rawLastPrice : parseFloat(selectedPrice);
      const qty = parseFloat(quantity);
      setIsSubmittingOrder(true);
      const orderData = {
        symbol,
        side,
        type: orderType.toUpperCase(),
        quantity: qty,
        price: price,
        marketType: isFutures ? 'FUTURES' : 'SPOT',
        leverage: isFutures ? leverage : 1
      };
      console.log('Submitting order:', orderData);
      const result = await submitOrder(orderData);
      let successMessage;
      if (result.status === 'PENDING') {
        successMessage = `Limit ${side} order placed successfully!\n` +
          `${qty} ${symbol.replace("USDT", "")} at ${price.toFixed(4)} (Pending)\n` +
          `${isFutures ? `Leverage: ${leverage}x` : "Spot Trading"}`;
      } else {
        successMessage = `${side} order executed successfully!\n` +
          `${qty} ${symbol.replace("USDT", "")} at ${price.toFixed(4)}\n` +
          `Fees: ${result.fees.toFixed(4)}\n` +
          `${isFutures ? `Leverage: ${leverage}x` : "Spot Trading"}`;
      }
      setOrderSuccess(successMessage);
      setQuantity("");
      if (orderType === 'limit') {
        userEditedRef.current = false;
        autoFilledSymbolRef.current = null;
      }
    } catch (error) {
      console.error('Order submission error:', error);
      setOrderError(error.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  }
  const handleSpotSellFromHolding = async (baseSymbol, qty) => {
    const symbol = `${baseSymbol}USDT`;
    const priceData = webSocketManager.getCurrentPrice(symbol, 'spot');
    if (!priceData || !priceData.lastPrice || priceData.lastPrice <= 0) {
      throw new Error(`Current market price not available for ${symbol}. Please try again in a moment.`);
    }
    const price = priceData.lastPrice;
    const orderData = {
      symbol,
      side: 'SELL',
      type: 'MARKET',
      quantity: qty,
      price,
      marketType: 'SPOT'
    };
    await submitOrder(orderData);
  };
  const handleCancelOrder = async (orderId) => {
    await cancelOrder(orderId);
    refreshPortfolio();
  };
  const getCurrentPrices = () => {
    const prices = {};
    positions.forEach(position => {
      prices[position.symbol] = position.current_price || position.entry_price;
    });
    return prices;
  };
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (!term || term.trim() === "") {
      setFilteredCrypto(cryptoList);
      return;
    }
    const low = term.toLowerCase().trim();
    const exact = cryptoList.find((c) =>
      c.symbol.toLowerCase() === low ||
      c.value.toLowerCase() === `${low}usdt`
    );
  
    if (exact) {
      if (exact.value !== symbol) setSymbol(exact.value);
      setFilteredCrypto([exact]);
      return;
    }
    const starts = cryptoList.find((c) => c.symbol.toLowerCase().startsWith(low));
    if (starts) {
      if (starts.value !== symbol) setSymbol(starts.value);
      setFilteredCrypto([starts, ...cryptoList.filter((c) => c.value !== starts.value)]);
      return;
    }
    const includes = cryptoList.filter(
      (crypto) =>
        crypto.label.toLowerCase().includes(low) ||
        crypto.value.toLowerCase().includes(low) ||
        crypto.symbol.toLowerCase().includes(low)
    );
  
    if (includes.length > 0) {
      const first = includes[0];
      if (first.value !== symbol) setSymbol(first.value);
      setFilteredCrypto(includes);
      return;
    }
    setFilteredCrypto([]);
  };
  const currentCryptoEntry = cryptoList.find((c) => c.value === symbol);
  const currentImageUrl = currentCryptoEntry ? currentCryptoEntry.image : null;
  const isSubmitDisabled = () => {
    const qty = parseFloat(quantity);
    const price = orderType === "market" ? rawLastPrice : parseFloat(selectedPrice);
    return !qty || qty <= 0 || isSubmittingOrder || !user || (orderType === 'market' && (!price || price <= 0));
  };
  const spotTotalPnl = spotHoldings.reduce((total, h) => total + (h.unrealized_pnl || 0), 0);
  const spotTotalValue = spotHoldings.reduce((total, h) =>
    total + (h.current_value || h.quantity * h.average_price), 0
  );
  const maxSellQty = getMaxSellQuantity();
  // Random Taglish reminders
  const reminders = [
    "Tandaan, ang trading ay may risks. Always trade responsibly!",
    "Ito ay virtual funds lamang. Practice muna bago mag-real trading.",
    "Huwag mag-trade ng higit sa kaya mong mawala. Stay safe sa market!",
    "Research well before making trades. Knowledge is key sa success!",
    "This is just virtual money. No real losses or gains dito.",
    "Mag-ingat sa emosyon sa trading. Think rationally always!",
    "Gamitin ang stop-loss para protektahan ang iyong capital.",
    "Trading is not gambling. Plan your trades wisely!",
    "Enjoy learning with virtual funds. Walang pressure dito.",
    "Always diversify your portfolio. Huwag ilagay lahat sa isang basket."
  ];
  useEffect(() => {
    const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
    Swal.fire({
      title: 'Trading Reminder',
      text: randomReminder,
      icon: 'info',
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6'
    }).then(() => {
      if (!user) {
        setIsAgeVerified(false);
        return;
      }

      const checkAge = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('birthday')
          .eq('id', user.id)
          .single();

        if (error || !data?.birthday) {
          setIsAgeVerified(false);
          return;
        }

        const birthDate = new Date(data.birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 18) {
          Swal.fire({
            icon: 'warning',
            title: 'Age Restriction',
            text: 'Only users 18 and above are able to trade. You are able to view the lessons in the learn tab.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#3085d6'
          }).then(() => {
            navigate('/');
          });
          setIsAgeVerified(false);
        } else {
          setIsAgeVerified(true);
        }
      };

      checkAge();
    });
  }, [user, navigate]);

  if (isAgeVerified === null) {
    return <div className="loading">Checking age...</div>;
  }

  if (!isAgeVerified && user) {
    return null; // Redirect already handled in Swal
  }

  return (
    <div className="trade-page">
      {/* Notification Messages */}
      {orderError && (
        <div className="notification error">
          <span>❌ {orderError}</span>
          <button onClick={() => setOrderError("")}>×</button>
        </div>
      )}
    
      {orderSuccess && (
        <div className="notification success">
          <span>✅ Order Successful</span>
          <button onClick={() => setOrderSuccess("")}>×</button>
        </div>
      )}
      <header className="trade-header">
        <div className="header-top">
          <div className="left-controls">
            <div className="symbol-display">
              <CryptoIcon symbol={symbol} size="medium" imageUrl={currentImageUrl} />
              <div className="symbol-info">
                <div className="symbol-name">{symbol.replace("USDT", "")}/USDT</div>
                <div className="symbol-details">
                  {isFutures ? "Perpetual Futures" : "Spot Trading"}
                  {!isConnected && (
                    <span className="connection-status disconnected"> • Reconnecting...</span>
                  )}
                  {isConnected && (
                    <span className="connection-status connected"> • Live</span>
                  )}
                </div>
              </div>
            </div>
          
            <div className="price-display">
              <div className="current-price">${lastPrice}</div>
              <div className={`price-change ${parseFloat(priceChange.percent) >= 0 ? "positive" : "negative"}`}>
                {parseFloat(priceChange.percent) >= 0 ? "+" : ""}
                {priceChange.value} ({priceChange.percent}%)
              </div>
            </div>
          </div>
          <div className="right-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search pairs..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
              <div className="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="symbol-selector">
              <select
                className="symbol-select"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setSearchTerm("");
                  setFilteredCrypto(cryptoList);
                }}
                onFocus={loadMoreCryptos}
              >
                {filteredCrypto.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
                {hasMoreCryptos && (
                  <option disabled value="loading">
                    {loading ? "Loading more..." : "Scroll to load more"}
                  </option>
                )}
              </select>
            </div>
          </div>
        </div>
        <div className="header-bottom">
          <div className="account-info">
            <div className="balance-card">
              <div className="balance-label">Balance</div>
              <div className="balance-value">
                ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          
            {isFutures && (
              <>
                <div className="margin-card">
                  <div className="margin-label">Free Margin</div>
                  <div className="margin-value">
                    ${freeMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="margin-card">
                  <div className="margin-label">Margin Used</div>
                  <div className="margin-percent">
                    {marginUtilization.toFixed(1)}%
                  </div>
                </div>
              </>
            )}
          
            <div className="pnl-card">
              <div className="pnl-label">Total P&L</div>
              <div className={`pnl-value ${totalPnL >= 0 ? "positive" : "negative"}`}>
                {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          
            <div className="portfolio-card">
              <div className="portfolio-label">Portfolio Value</div>
              <div className="portfolio-amount">
                ${totalPortfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="market-toggle">
            <button className={`toggle-btn ${isFutures ? "active" : ""}`} onClick={() => setIsFutures(true)}>
              <span>Futures</span>
            </button>
            <button className={`toggle-btn ${!isFutures ? "active" : ""}`} onClick={() => setIsFutures(false)}>
              <span>Spot</span>
            </button>
          </div>
        </div>
      </header>
      <div className="trade-grid">
        <div className="chart-panel">
          <div className="chart-container">
            <TradingViewChart symbol={symbol} interval={interval} isFutures={isFutures} />
          </div>
        </div>
        <aside className="order-panel">
          <div className="order-card">
            <div className="order-header">
              <div className="order-title">{isFutures ? "Futures Trading" : "Spot Trading"}</div>
              <div className="order-type-selector">
                <button
                  className={`type-btn ${orderType === "limit" ? "active" : ""}`}
                  onClick={() => setOrderType("limit")}
                >
                  Limit
                </button>
                <button
                  className={`type-btn ${orderType === "market" ? "active" : ""}`}
                  onClick={() => setOrderType("market")}
                >
                  Market
                </button>
              </div>
            </div>
            {orderType === "limit" && (
              <div className="input-group">
                <label>Price ($)</label>
                <input
                  type="number"
                  value={selectedPrice}
                  onChange={(e) => {
                    userEditedRef.current = true;
                    setSelectedPrice(e.target.value);
                    setOrderError("");
                  }}
                  className="input-field"
                  placeholder="0.00"
                  step="0.0001"
                />
              </div>
            )}
            <div className="input-group">
              <label>Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setOrderError("");
                }}
                className="input-field"
                placeholder="0.00"
                step="0.0001"
              />
            </div>
            {isFutures && (
              <div className="input-group">
                <label>Leverage: {leverage}x</label>
                <input
                  className="leverage-slider"
                  type="range"
                  min="1"
                  max="100"
                  value={leverage}
                  onChange={(e) => {
                    setLeverage(Number(e.target.value));
                    setOrderError("");
                  }}
                />
                <div className="leverage-presets">
                  {[1, 5, 10, 25, 50, 100].map((l) => (
                    <button
                      key={l}
                      className={`preset-btn ${leverage === l ? "active" : ""}`}
                      onClick={() => setLeverage(l)}
                    >
                      {l}x
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="order-summary">
              <div className="summary-row">
                <span>Position Value:</span>
                <span>${calculatePositionValue().toLocaleString()}</span>
              </div>
              {isFutures && (
                <div className="summary-row">
                  <span>Required Margin:</span>
                  <span>${calculateRequiredMargin()}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Est. Fees:</span>
                <span>${calculateFees()}</span>
              </div>
              {!isFutures && maxSellQty !== null && (
                <div className="summary-row">
                  <span>Max Sell:</span>
                  <span>{maxSellQty.toFixed(6)} {symbol.replace('USDT', '')}</span>
                </div>
              )}
              {isFutures && orderType === 'market' && (
                <div className="summary-row">
                  <span>Available Margin:</span>
                  <span className={freeMargin < parseFloat(calculateRequiredMargin() || 0) ? "insufficient" : "sufficient"}>
                    ${freeMargin.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <div className="order-actions">
              <button
                className="btn btn-sell"
                onClick={() => submitOrderHandler("SELL")}
                disabled={isSubmitDisabled()}
                title={isSubmitDisabled() && orderType === 'market' && rawLastPrice <= 0 ? "Price data not available" : (!user ? "Please login to trade" : "")}
              >
                {isSubmittingOrder ? "Submitting..." : (isFutures ? "Short" : "Sell")}
              </button>
              <button
                className="btn btn-buy"
                onClick={() => submitOrderHandler("BUY")}
                disabled={isSubmitDisabled()}
                title={isSubmitDisabled() && orderType === 'market' && rawLastPrice <= 0 ? "Price data not available" : (!user ? "Please login to trade" : "")}
              >
                {isSubmittingOrder ? "Submitting..." : (isFutures ? "Long" : "Buy")}
              </button>
            </div>
            {!user && (
              <div className="auth-notice">
                <p>Please login to start trading</p>
                <small>Virtual trading with $10,000 starting balance</small>
              </div>
            )}
            {user && (
              <div className="trading-info">
                <small>Virtual trading platform - No real money involved</small>
              </div>
            )}
          </div>
        </aside>
      </div>
      <div className="analysis-panel">
        <TechnicalAnalysis symbol={symbol} interval={interval} />
      </div>
      <div className="positions-panel">
        <div className="positions-header">
          <div className="positions-tabs">
            <div
              className={`tab ${activeTab === 'positions' ? 'active' : ''}`}
              onClick={() => setActiveTab('positions')}
            >
              {isFutures ? "Positions" : "Holdings"}
              <span className="tab-count">
                ({isFutures ? positions.length : spotHoldings.length})
              </span>
            </div>
            <div
              className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              Order History
              <span className="tab-count">({orderHistory.length})</span>
            </div>
          </div>
          <div className="positions-actions">
            <button
              className="action-btn"
              onClick={refreshPortfolio}
              disabled={portfolioLoading}
            >
              {portfolioLoading ? "Loading..." : "Refresh"}
            </button>
            {positions.length > 0 && activeTab === 'positions' && (
              <button
                className="action-btn danger"
                onClick={async () => {
                  const result = await Swal.fire({
                    title: 'Close All?',
                    text: `Close all ${positions.length} positions?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, close all!'
                  });
                  if (result.isConfirmed) {
                    try {
                      await closeAllPositions();
                      setOrderSuccess("All positions closed successfully");
                      Swal.fire({
                        icon: 'success',
                        title: 'Closed',
                        text: 'All positions closed successfully',
                        timer: 2000,
                        showConfirmButton: false
                      });
                    } catch (error) {
                      setOrderError("Failed to close all positions: " + error.message);
                      Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to close all positions: ' + error.message,
                        confirmButtonColor: '#3085d6'
                      });
                    }
                  }
                }}
              >
                Close All
              </button>
            )}
          </div>
        </div>
        <div className="positions-body">
          {activeTab === 'positions' && (
            <div className="positions-content">
              {isFutures ? (
                positions.length > 0 ? (
                  <>
                    <div className="desktop-table">
                      <div className="trading-table-container">
                        <table className="trading-table">
                          <thead>
                            <tr>
                              <th>Symbol</th>
                              <th className="text-right">Size</th>
                              <th className="text-right">Entry Price</th>
                              <th className="text-right">Mark Price</th>
                              <th className="text-right">Liq. Price</th>
                              <th className="text-right">P&L</th>
                              <th className="text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {positions.map(position => (
                              <PositionRow
                                key={position.id}
                                position={position}
                                onClose={closePosition}
                                currentPrices={getCurrentPrices()}
                                cryptoImages={cryptoImages}
                              />
                            ))}
                          </tbody>
                        </table>
                      
                        <div className="positions-summary">
                          <div className="summary-item">
                            <span>Total Positions:</span>
                            <span>{positions.length}</span>
                          </div>
                          <div className="summary-item">
                            <span>Used Margin:</span>
                            <span>${usedMargin.toFixed(2)}</span>
                          </div>
                          <div className="summary-item">
                            <span>Unrealized P&L:</span>
                            <span className={totalPnL >= 0 ? "positive" : "negative"}>
                              {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mobile-cards">
                      {positions.map(position => (
                        <PositionCard
                          key={position.id}
                          position={position}
                          onClose={closePosition}
                          currentPrices={getCurrentPrices()}
                          cryptoImages={cryptoImages}
                        />
                      ))}
                      <div className="positions-summary">
                        <div className="summary-item">
                          <span>Total Positions:</span>
                          <span>{positions.length}</span>
                        </div>
                        <div className="summary-item">
                          <span>Used Margin:</span>
                          <span>${usedMargin.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Unrealized P&L:</span>
                          <span className={totalPnL >= 0 ? "positive" : "negative"}>
                            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <div className="empty-title">No positions yet</div>
                    <div className="empty-subtitle">
                      Your futures positions will appear here. Start by placing a trade above.
                    </div>
                  </div>
                )
              ) : (
                spotHoldings.length > 0 ? (
                  <>
                    <div className="desktop-table">
                      <div className="trading-table-container">
                        <table className="trading-table">
                          <thead>
                            <tr>
                              <th>Asset</th>
                              <th className="text-right">Quantity</th>
                              <th className="text-right">Avg Price</th>
                              <th className="text-right">Current Price</th>
                              <th className="text-right">Value</th>
                              <th className="text-right">P&L</th>
                              <th className="text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {spotHoldings.map(holding => (
                              <SpotHoldingRow
                                key={holding.id}
                                holding={holding}
                                cryptoImages={cryptoImages}
                                onSell={handleSpotSellFromHolding}
                              />
                            ))}
                          </tbody>
                        </table>
                      
                        <div className="holdings-summary">
                          <div className="summary-item">
                            <span>Total Holdings:</span>
                            <span>{spotHoldings.length}</span>
                          </div>
                          <div className="summary-item">
                            <span>Total Value:</span>
                            <span>${spotTotalValue.toFixed(2)}</span>
                          </div>
                          <div className="summary-item">
                            <span>Unrealized P&L:</span>
                            <span className={spotTotalPnl >= 0 ? "positive" : "negative"}>
                              {spotTotalPnl >= 0 ? "+" : ""}${spotTotalPnl.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mobile-cards">
                      {spotHoldings.map(holding => (
                        <SpotHoldingCard
                          key={holding.id}
                          holding={holding}
                          cryptoImages={cryptoImages}
                          onSell={handleSpotSellFromHolding}
                        />
                      ))}
                      <div className="holdings-summary">
                        <div className="summary-item">
                          <span>Total Holdings:</span>
                          <span>{spotHoldings.length}</span>
                        </div>
                        <div className="summary-item">
                          <span>Total Value:</span>
                          <span>${spotTotalValue.toFixed(2)}</span>
                        </div>
                        <div className="summary-item">
                          <span>Unrealized P&L:</span>
                          <span className={spotTotalPnl >= 0 ? "positive" : "negative"}>
                            {spotTotalPnl >= 0 ? "+" : ""}${spotTotalPnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <div className="empty-title">No holdings yet</div>
                    <div className="empty-subtitle">
                      Your spot holdings will appear here. Start by buying some crypto above.
                    </div>
                  </div>
                )
              )}
            </div>
          )}
          {activeTab === 'orders' && (
            orderHistory.length > 0 ? (
              <div className="positions-content">
                <div className="desktop-table">
                  <div className="trading-table-container">
                    <table className="trading-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Symbol</th>
                          <th>Side</th>
                          <th>Type</th>
                          <th className="text-right">Quantity</th>
                          <th className="text-right">Price</th>
                          <th>Status</th>
                          <th>Market</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderHistory.slice(0, 50).map(order => (
                          <OrderHistoryRow
                            key={order.id}
                            order={order}
                            cryptoImages={cryptoImages}
                            onCancel={handleCancelOrder}
                          />
                        ))}
                      </tbody>
                    </table>
                  
                    <div className="orders-summary">
                      <div className="summary-item">
                        <span>Total Orders:</span>
                        <span>{orderHistory.length}</span>
                      </div>
                      <div className="summary-item">
                        <span>Filled Orders:</span>
                        <span>{orderHistory.filter(o => o.status === 'FILLED').length}</span>
                      </div>
                      <div className="summary-item">
                        <span>Success Rate:</span>
                        <span>
                          {orderHistory.length > 0
                            ? ((orderHistory.filter(o => o.status === 'FILLED').length / orderHistory.length) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mobile-cards">
                  {orderHistory.slice(0, 20).map(order => (
                    <OrderHistoryCard
                      key={order.id}
                      order={order}
                      cryptoImages={cryptoImages}
                      onCancel={handleCancelOrder}
                    />
                  ))}
                  <div className="orders-summary">
                    <div className="summary-item">
                      <span>Total Orders:</span>
                      <span>{orderHistory.length}</span>
                    </div>
                    <div className="summary-item">
                      <span>Filled Orders:</span>
                      <span>{orderHistory.filter(o => o.status === 'FILLED').length}</span>
                    </div>
                    <div className="summary-item">
                      <span>Success Rate:</span>
                      <span>
                        {orderHistory.length > 0
                          ? ((orderHistory.filter(o => o.status === 'FILLED').length / orderHistory.length) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No orders yet</div>
                <div className="empty-subtitle">
                  Your order history will appear here once you start trading.
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}