import React, { useState, useEffect, useRef } from 'react';
import '../css/Trade.css';

// Technical Analysis Functions (patched)
const calculateSMA = (data, period) => {
  if (data.length < period) return null;
  const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
  return sum / period;
};

// Returns the last EMA value (single number). Seeds with SMA of first `period` values.
const calculateEMA = (data, period) => {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
};

// Returns an EMA series aligned to the input data array (indices < period-1 are null)
const calculateEMASeries = (data, period) => {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  const ema = new Array(data.length).fill(null);
  const initialSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema[period - 1] = initialSMA;
  let prev = initialSMA;
  for (let i = period; i < data.length; i++) {
    const val = data[i] * k + prev * (1 - k);
    ema[i] = val;
    prev = val;
  }
  return ema;
};

const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Wilder smoothing for subsequent values
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  // Handle flat market (no gains, no losses) -> RSI = 50
  if (avgLoss === 0) {
    if (avgGain === 0) return 50;
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return rsi;
};

const calculateMACD = (prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  if (prices.length < slowPeriod) return null;

  const emaFastSeries = calculateEMASeries(prices, fastPeriod);
  const emaSlowSeries = calculateEMASeries(prices, slowPeriod);
  if (!emaFastSeries || !emaSlowSeries) return null;

  // Build MACD series aligned to the input prices (nulls where not computable)
  const macdFull = new Array(prices.length).fill(null);
  for (let i = 0; i < prices.length; i++) {
    if (emaFastSeries[i] != null && emaSlowSeries[i] != null) {
      macdFull[i] = emaFastSeries[i] - emaSlowSeries[i];
    }
  }

  // Extract series of valid MACD values for signal calculation
  const macdSeries = macdFull.filter(v => v != null);
  if (macdSeries.length === 0) return null;

  // Signal line is EMA of macdSeries
  const signalSeries = calculateEMASeries(macdSeries, signalPeriod);
  const lastMacd = macdSeries[macdSeries.length - 1];
  const lastSignal = signalSeries ? signalSeries[signalSeries.length - 1] : null;
  const histogram = lastSignal != null ? lastMacd - lastSignal : null;

  return {
    macdLine: lastMacd,
    signal: lastSignal,
    histogram
  };
};

// Helper function to explain what each indicator means
const getIndicatorExplanation = (indicator, value) => {
  switch (indicator) {
    case 'RSI':
      if (value < 30) return "RSI below 30 suggests the asset might be oversold (price may have fallen too much, possible buying opportunity)";
      if (value > 70) return "RSI above 70 suggests the asset might be overbought (price may have risen too much, possible selling opportunity)";
      return "RSI between 30-70 indicates normal trading conditions";

    case 'MACD':
      if (value > 0) return "MACD above zero suggests upward momentum (buyers are stronger than sellers)";
      if (value < 0) return "MACD below zero suggests downward momentum (sellers are stronger than buyers)";
      return "MACD near zero indicates weak momentum";

    case 'MA20':
      return "MA20 is the average price over the last 20 periods. When price is above it, it suggests short-term upward trend";

    case 'MA50':
      return "MA50 is the average price over the last 50 periods. When price is above it, it suggests medium-term upward trend";

    default:
      return "";
  }
};

const TechnicalAnalysis = ({ symbol, interval }) => {
  const [indicators, setIndicators] = useState({
    rsi: null,
    macd: null,
    sma20: null,
    sma50: null,
    currentPrice: null,
    loading: true,
    error: null
  });

  const [showExplanations, setShowExplanations] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const fetchTimeoutRef = useRef(null);

  const fetchTechnicalData = async () => {
    try {
      setIndicators(prev => ({ ...prev, loading: true, error: null }));

      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      const binanceInterval = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d'
      }[interval] || '1h';

      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=200`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const closePrices = data.map(candle => parseFloat(candle[4]));
      const currentPrice = closePrices[closePrices.length - 1];

      // Calculate indicators
      const rsi = calculateRSI(closePrices);
      const macd = calculateMACD(closePrices);
      const sma20 = calculateSMA(closePrices, 20);
      const sma50 = calculateSMA(closePrices, 50);

      setIndicators({
        rsi: rsi != null ? rsi.toFixed(2) : null,
        macd: macd != null && macd.macdLine != null ? macd.macdLine.toFixed(6) : null,
        sma20: sma20 != null ? sma20.toFixed(4) : null,
        sma50: sma50 != null ? sma50.toFixed(4) : null,
        currentPrice: currentPrice != null ? currentPrice.toFixed(4) : null,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Technical analysis fetch error:', error);
      setIndicators(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load technical data. Please check your internet connection.'
      }));
    }
  };

  useEffect(() => {
    if (!symbol) return;

    fetchTimeoutRef.current = setTimeout(fetchTechnicalData, 500);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [symbol, interval]);

  const signalData = getBeginnerFriendlySignal(
    indicators.rsi,
    indicators.macd,
    indicators.sma20,
    indicators.sma50,
    indicators.currentPrice
  );

  return (
    <div className="technical-analysis-panel">
      <div className="technical-header">
        <h3>📊 Technical Analysis</h3>
        <div className="header-controls">
          <button 
            className="expand-toggle" 
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          <button
            className="help-toggle"
            onClick={() => setShowExplanations(!showExplanations)}
            title="Toggle explanations"
          >
            {showExplanations ? '❓' : '💡'}
          </button>
        </div>
      </div>

      {indicators.loading ? (
        <div className="technical-loading">
          <div className="loading-spinner"></div>
          <span>Loading analysis...</span>
        </div>
      ) : indicators.error ? (
        <div className="technical-error">
          <span>{indicators.error}</span>
          <button onClick={fetchTechnicalData}>Retry</button>
        </div>
      ) : !isExpanded ? (
        <div className="collapsed-view">
          <button 
            className="expand-button" 
            onClick={() => setIsExpanded(true)}
          >
            See Technical Analysis
          </button>
        </div>
      ) : (
        <>
          {/* Main Signal Display */}
          <div className={`main-signal ${signalData.signal.toLowerCase().replace(' ', '-')}`}>
            <div className="signal-header">
              <span className="signal-text">{signalData.signal}</span>
              <span className="confidence-badge">{signalData.confidence} CONFIDENCE</span>
            </div>
            <p className="signal-explanation">{signalData.explanation}</p>
            {signalData.score && (
              <div className="score-display">
                <span className="bullish-score">Bullish: {signalData.score.bullish}</span>
                <span className="bearish-score">Bearish: {signalData.score.bearish}</span>
              </div>
            )}
          </div>

          {/* Indicators Grid */}
          <div className="indicators-grid">
            <div className="indicator-card">
              <div className="indicator-header">
                <span className="indicator-label">RSI (14)</span>
                <span className="indicator-value">{indicators.rsi ?? '--'}</span>
              </div>
              {indicators.rsi && (
                <div className={`indicator-status ${
                  parseFloat(indicators.rsi) < 30 ? 'oversold' : 
                  parseFloat(indicators.rsi) > 70 ? 'overbought' : 'neutral'
                }`}>
                  {parseFloat(indicators.rsi) < 30 ? '🔥 Oversold' : 
                   parseFloat(indicators.rsi) > 70 ? '🚨 Overbought' : '⚖️ Neutral'}
                </div>
              )}
              {showExplanations && indicators.rsi && (
                <div className="explanation">
                  {getIndicatorExplanation('RSI', parseFloat(indicators.rsi))}
                </div>
              )}
            </div>

            <div className="indicator-card">
              <div className="indicator-header">
                <span className="indicator-label">MACD</span>
                <span className="indicator-value">{indicators.macd ?? '--'}</span>
              </div>
              {indicators.macd && (
                <div className={`indicator-status ${
                  parseFloat(indicators.macd) > 0 ? 'bullish' : 'bearish'
                }`}>
                  {parseFloat(indicators.macd) > 0 ? '📈 Bullish' : '📉 Bearish'}
                </div>
              )}
              {showExplanations && indicators.macd && (
                <div className="explanation">
                  {getIndicatorExplanation('MACD', parseFloat(indicators.macd))}
                </div>
              )}
            </div>

            <div className="indicator-card">
              <div className="indicator-header">
                <span className="indicator-label">MA20</span>
                <span className="indicator-value">${indicators.sma20 ?? '--'}</span>
              </div>
              {indicators.sma20 && indicators.currentPrice && (
                <div className={`indicator-status ${
                  parseFloat(indicators.currentPrice) > parseFloat(indicators.sma20) ? 'above' : 'below'
                }`}>
                  {parseFloat(indicators.currentPrice) > parseFloat(indicators.sma20) ? '⬆️ Above' : '⬇️ Below'}
                </div>
              )}
              {showExplanations && (
                <div className="explanation">
                  {getIndicatorExplanation('MA20')}
                </div>
              )}
            </div>

            <div className="indicator-card">
              <div className="indicator-header">
                <span className="indicator-label">MA50</span>
                <span className="indicator-value">${indicators.sma50 ?? '--'}</span>
              </div>
              {indicators.sma50 && indicators.currentPrice && (
                <div className={`indicator-status ${
                  parseFloat(indicators.currentPrice) > parseFloat(indicators.sma50) ? 'above' : 'below'
                }`}>
                  {parseFloat(indicators.currentPrice) > parseFloat(indicators.sma50) ? '⬆️ Above' : '⬇️ Below'}
                </div>
              )}
              {showExplanations && (
                <div className="explanation">
                  {getIndicatorExplanation('MA50')}
                </div>
              )}
            </div>
          </div>

          {/* Analysis Factors */}
          {signalData.factors.length > 0 && (
            <div className="analysis-factors">
              <h4>Key Factors:</h4>
              <ul>
                {signalData.factors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Beginner Tips */}
          <div className="beginner-tips">
            <h4>💡 Beginner Tips:</h4>
            <ul>
              <li><strong>Never invest more than you can afford to lose</strong></li>
              <li>Use stop-losses to limit potential losses</li>
              <li>Consider multiple time frames before making decisions</li>
              <li>Technical analysis is not 100% accurate - always do your own research</li>
            </ul>
          </div>

          <div className="technical-disclaimer">
            <small>
              ⚠️ <strong>Educational Content Only:</strong> This analysis is for learning purposes. 
              Not financial advice. Cryptocurrency trading carries high risk. 
              Always consult with financial professionals and do extensive research.
            </small>
          </div>
        </>
      )}
    </div>
  );
};

export default TechnicalAnalysis;