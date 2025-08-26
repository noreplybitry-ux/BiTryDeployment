// src/pages/TradePage.jsx
import React, { useEffect, useRef, useState } from "react";
import "../css/Trade.css";
import TechnicalAnalysis from "./TechnicalAnalysis";

const DEFAULT_SYMBOL = "BTCUSDT";
const DEFAULT_INTERVAL = "1m";
const INTERVAL_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"];

// Enhanced cryptocurrency icon mapping with real crypto logos (fallback emoji)
const getCryptoIcon = (symbol) => {
  const baseSymbol = symbol.replace("USDT", "").toLowerCase();

  // Return image URL for crypto logos (fallback source if CoinGecko image is not available)
  const getCryptoImageUrl = (s) => {
    return `https://cryptoicons.org/api/icon/${s}/50`;
  };

  const iconMap = {
    btc: "₿",
    eth: "Ξ",
    bnb: "💛",
    ada: "₳",
    xrp: "✕",
    dot: "●",
    uni: "🦄",
    link: "🔗",
    ltc: "Ł",
    bch: "₿",
    xlm: "🚀",
    vet: "⚡",
    theta: "θ",
    fil: "📁",
    trx: "🔺",
    etc: "💚",
    eos: "📱",
    atom: "⚛️",
    neo: "●",
    mkr: "🏛️",
    aave: "👻",
    comp: "🏛️",
    sushi: "🍣",
    yfi: "💙",
    snx: "⚡",
    "1inch": "1️⃣",
    cake: "🎂",
    sol: "☀️",
    matic: "🔷",
    avax: "🔺",
    doge: "🐕",
    shib: "🐕",
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
  const readyTimeoutRef = useRef(null);

  // Map our intervals to TradingView intervals
  const intervalMap = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "1h": "60",
    "4h": "240",
    "1d": "1D",
  };

  // Load TradingView script on component mount
  useEffect(() => {
    if (window.TradingView) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="tradingview"]');
    if (existingScript) {
      // Poll until TradingView is available
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

    // Load the script
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      // keep UI simple: stop loading overlay if script fails
      setIsLoading(false);
      console.error("Failed to load TradingView script");
    };

    document.head.appendChild(script);

    return () => {
      // don't remove if it wasn't the one we created (avoid breaking other parts)
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  // Create or update the chart when symbol, interval, or scriptLoaded changes
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;
    if (!symbol) {
      // no symbol — stop loader
      setIsLoading(false);
      return;
    }

    // Cleanup previous widget
    if (widgetRef.current && typeof widgetRef.current.remove === "function") {
      try {
        widgetRef.current.remove();
      } catch (e) {
        // ignore
      }
      widgetRef.current = null;
    }

    setIsLoading(true);

    // Start timeout to avoid infinite loading overlay (but do NOT show the textual error)
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
    }
    readyTimeoutRef.current = setTimeout(() => {
      // hide loader if it takes too long — but don't show the error panel
      setIsLoading(false);
    }, 1000); // 1s timeout

    try {
      const containerId = `tradingview-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      containerRef.current.id = containerId;

      // Build proper TradingView symbol depending on market type
      const tradingviewSymbol = isFutures ? `BINANCE:${symbol}.P` : `BINANCE:${symbol}`;

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
        height: 600,
        width: "100%",

        enabled_features: [
          "left_toolbar",
          "header_widget",
          "timeframes_toolbar",
          "header_chart_type",
          "header_resolutions",
          "header_screenshot",
          "header_settings",
          "header_indicators",
          "header_compare",
          "header_undo_redo",
          "header_fullscreen_button",
          "header_symbol_search",
        ],

        disabled_features: ["popup_hints"],

        overrides: {
          "paneProperties.background": "#1e222d",
          "paneProperties.vertGridProperties.color": "#2a2e39",
          "paneProperties.horzGridProperties.color": "#2a2e39",
          "scalesProperties.textColor": "#b7bdc6",
        },

        // Callback when chart is ready
        onChartReady: function () {
          // Clear timeout
          if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
          }
          setIsLoading(false);
        },

        // Fallback when widget can't load — stop loader but don't replace with error panel
        onLoadError: (err) => {
          if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
          }
          console.error("TradingView onLoadError:", err);
          setIsLoading(false);
        },
      };

      try {
        // Create the TradingView widget
        widgetRef.current = new window.TradingView.widget(widgetConfig);
      } catch (err) {
        // Try falling back: if was futures attempt spot symbol
        console.error("Error creating widget:", err);
        if (tradingviewSymbol.endsWith(".P")) {
          try {
            widgetConfig.symbol = `BINANCE:${symbol}`;
            widgetRef.current = new window.TradingView.widget(widgetConfig);
          } catch (err2) {
            console.error("Error creating widget with spot symbol:", err2);
            if (readyTimeoutRef.current) {
              clearTimeout(readyTimeoutRef.current);
              readyTimeoutRef.current = null;
            }
            setIsLoading(false);
          }
        } else {
          if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
          }
          setIsLoading(false);
        }
      }
    } catch (e) {
      console.error("Error creating TradingView widget outer:", e);
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      setIsLoading(false);
    }

    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      if (widgetRef.current && typeof widgetRef.current.remove === "function") {
        try {
          widgetRef.current.remove();
        } catch (e) {
          // ignore
        }
        widgetRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, isFutures, scriptLoaded]);

  return (
    <div className="chart-wrapper">
      <div
        ref={containerRef}
        style={{
          height: "100%",
          width: "100%",
          backgroundColor: "#1e222d",
        }}
      />

      {isLoading && (
        <div className="chart-loading-overlay">
          <div className="loading-spinner"></div>
          <span>Loading chart...</span>
        </div>
      )}
    </div>
  );
};

const CryptoIcon = ({ symbol, size = "small", imageUrl = null }) => {
  const [imageError, setImageError] = useState(false);
  const fallback = getCryptoIcon(symbol);

  // Prefer passed-in imageUrl (from CoinGecko) -> fallback cryptoicons.org -> emoji fallback
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

export default function TradePage({ initialSymbol = DEFAULT_SYMBOL, initialInterval = DEFAULT_INTERVAL }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [interval, setInterval] = useState(initialInterval);
  const [cryptoList, setCryptoList] = useState([]);
  const [filteredCrypto, setFilteredCrypto] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastPrice, setLastPrice] = useState("--");
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
  const [selectedPrice, setSelectedPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [isFutures, setIsFutures] = useState(true);
  const [orderType, setOrderType] = useState("limit");
  const [balance, setBalance] = useState(100000); // Virtual PHP balance
  const wsRef = useRef(null);

  // Refs to coordinate single auto-fill behavior
  const autoFilledSymbolRef = useRef(null); // tracks which symbol has been auto-filled most recently
  const userEditedRef = useRef(false); // whether user manually edited the price input

  // Binance supported symbol sets
  const supportedSpotSymbolsRef = useRef(new Set());
  const supportedFuturesSymbolsRef = useRef(new Set());

  const [cryptoPage, setCryptoPage] = useState(1);
  const [hasMoreCryptos, setHasMoreCryptos] = useState(true);

  // Load Binance exchange info once (spot + futures)
  useEffect(() => {
    const fetchBinanceInfo = async () => {
      try {
        // Spot
        const spotResp = await fetch("https://api.binance.com/api/v3/exchangeInfo");
        if (!spotResp.ok) throw new Error("Failed to fetch spot exchange info");
        const spotJson = await spotResp.json();
        const spotSymbols = spotJson.symbols || [];
        const spotSet = new Set(
          spotSymbols
            .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
            .map((s) => s.symbol.toUpperCase())
        );
        supportedSpotSymbolsRef.current = spotSet;

        // Futures (USDT-M futures)
        try {
          const futuresResp = await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo");
          if (futuresResp.ok) {
            const futuresJson = await futuresResp.json();
            const futSymbols = futuresJson.symbols || [];
            const futSet = new Set(
              futSymbols
                .filter((s) => s.status === "TRADING" && s.quoteAsset === "USDT")
                .map((s) => s.symbol.toUpperCase())
            );
            supportedFuturesSymbolsRef.current = futSet;
          } else {
            // If futures fetch fails, fallback to spot set
            supportedFuturesSymbolsRef.current = spotSet;
          }
        } catch (e) {
          supportedFuturesSymbolsRef.current = spotSet;
        }
      } catch (error) {
        console.error("Error fetching Binance exchangeInfo:", error);
        // Keep empty sets — fallback list will be applied later
      }
    };

    fetchBinanceInfo();
  }, []);

  // Fetch top cryptocurrencies using CoinGecko but only keep those supported by Binance (per market)
  useEffect(() => {
    let isMounted = true;

    const fetchTopCryptos = async () => {
      try {
        setLoading(true);
        const page = cryptoPage;
        // fetch 250 per page (CoinGecko limit)
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

        // Determine which Binance set to apply
        const supportedSet = isFutures ? supportedFuturesSymbolsRef.current : supportedSpotSymbolsRef.current;

        // If we have a non-empty supported set, filter CoinGecko results by symbols present in Binance
        const binanceSymbols = data
          .map((coin) => {
            return {
              coin,
              candidate: `${coin.symbol.toUpperCase()}USDT`,
            };
          })
          .filter((c) => {
            // If supportedSet is non-empty, only include those that exist on Binance
            if (supportedSet && supportedSet.size > 0) {
              return supportedSet.has(c.candidate);
            }
            // If supportedSet empty (fetch failed), be permissive and include coin, we'll later validate before creating widget/ws
            return true;
          })
          .map((c) => ({
            value: c.candidate,
            label: `${c.coin.name} (${c.coin.symbol.toUpperCase()}/USDT)`,
            priceChange24h: c.coin.price_change_percentage_24h || 0,
            symbol: c.coin.symbol.toUpperCase(),
            marketCap: c.coin.market_cap || 0,
            image: c.coin.image || null, // <-- include image url from CoinGecko
          }));

        // Ensure uniqueness
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
            // dedupe
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
    // only re-run when page or market type changes
  }, [cryptoPage, isFutures]);

  // Fallback cryptocurrency list
  const getFallbackCryptos = () => {
    const popularCryptos = [
      "BTC",
      "ETH",
      "BNB",
      "ADA",
      "XRP",
      "SOL",
      "DOT",
      "DOGE",
      "SHIB",
      "MATIC",
      "AVAX",
      "LTC",
      "LINK",
      "ATOM",
      "XLM",
      "ALGO",
      "VET",
      "FIL",
      "TRX",
      "ETC",
      "XMR",
      "EOS",
      "AAVE",
      "XTZ",
      "THETA",
      "FTM",
      "NEAR",
      "CAKE",
      "GRT",
      "CHZ",
      "ENJ",
      "HBAR",
      "SAND",
      "MANA",
      "CRV",
      "MKR",
      "COMP",
      "KSM",
      "BAT",
      "ZEC",
      "DASH",
      "WAVES",
      "SNX",
      "YFI",
      "UNI",
      "REN",
      "CELO",
      "ONE",
      "IOTA",
      "OMG",
      "ANKR",
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

  // When search term or cryptoList changes, filter
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

  // Ensure selected symbol is always valid for selected market. If current symbol not supported, pick first available
  useEffect(() => {
    if (!cryptoList || cryptoList.length === 0) return;
    const supportedSet = isFutures ? supportedFuturesSymbolsRef.current : supportedSpotSymbolsRef.current;

    // If supportedSet has entries, ensure symbol exists in that set
    if (supportedSet && supportedSet.size > 0) {
      if (!supportedSet.has(symbol)) {
        // try to find first cryptoList value that exists in supportedSet
        const firstValid = cryptoList.find((c) => supportedSet.has(c.value));
        if (firstValid) {
          setSymbol(firstValid.value);
        } else {
          // Keep current symbol — but TradingView might fallback
        }
      }
    } else {
      // If we don't have a supportedSet (fetch fail), ensure symbol exists in cryptoList, else set first
      if (!cryptoList.find((c) => c.value === symbol)) {
        setSymbol(cryptoList[0].value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryptoList, isFutures]);

  // When symbol changes, reset auto-fill marker and allow auto-filling once for this pick
  useEffect(() => {
    // Clear user edit flag so auto-fill can occur
    userEditedRef.current = false;
    // Reset the selectedPrice so it will be filled once by WS (or quickly by other logic)
    setSelectedPrice("");
    // Reset marker so that auto-fill for this symbol can happen again
    autoFilledSymbolRef.current = null;
  }, [symbol]);

  // Load more cryptocurrencies (pagination)
  const loadMoreCryptos = () => {
    if (hasMoreCryptos && !loading) {
      setCryptoPage((prev) => prev + 1);
    }
  };

  // WebSocket for price updates (useRef stored)
  useEffect(() => {
    if (!symbol) return;
    // Close previous
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    const symbolLower = symbol.toLowerCase();
    // Choose stream endpoint based on futures/spot
    const wsUrl = isFutures
      ? `wss://fstream.binance.com/ws/${symbolLower}@ticker`
      : `wss://stream.binance.com:9443/ws/${symbolLower}@ticker`;

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (err) {
      console.error("WebSocket create error:", err);
      wsRef.current = null;
      return;
    }

    ws.onopen = () => {
      console.log(`WebSocket connected for ${symbol} (${isFutures ? "futures" : "spot"})`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Binance ticker fields: c (last), P (%) change, p (price change)
        const currentPrice = parseFloat(data.c);
        const changePercent = parseFloat(data.P);
        const changeValue = parseFloat(data.p);

        const formatPrice = (price) => {
          if (Number.isNaN(price) || price === null) return "--";
          if (price >= 1) return price.toFixed(2);
          if (price >= 0.01) return price.toFixed(4);
          return price.toFixed(8);
        };

        const formatChange = (change) => {
          if (Number.isNaN(change) || change === null) return "0.00";
          if (Math.abs(change) >= 1) return change.toFixed(2);
          if (Math.abs(change) >= 0.01) return change.toFixed(4);
          return change.toFixed(8);
        };

        const formattedPrice = formatPrice(currentPrice);

        setLastPrice(formattedPrice);
        setPriceChange({
          value: formatChange(changeValue),
          percent: changePercent ? changePercent.toFixed(2) : "0.00",
        });

        // Auto-fill limit price only once per pick
        if (autoFilledSymbolRef.current !== symbol && !userEditedRef.current) {
          setSelectedPrice(formattedPrice);
          autoFilledSymbolRef.current = symbol;
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    ws.onerror = (err) => {
      console.error(`WebSocket error for ${symbol}:`, err);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for ${symbol}`);
    };

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {}
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, isFutures]);

  const calculatePositionValue = () => {
    if (!selectedPrice || !quantity) return 0;
    const val = parseFloat(selectedPrice) * parseFloat(quantity) * leverage;
    if (Number.isNaN(val)) return 0;
    return val.toFixed(2);
  };

  const calculateFees = () => {
    const positionValue = parseFloat(calculatePositionValue() || 0);
    const feeRate = isFutures ? 0.0004 : 0.001;
    const fees = positionValue * feeRate;
    if (Number.isNaN(fees)) return "0.00";
    return fees.toFixed(2);
  };

  function submitOrder(side) {
    const positionValue = calculatePositionValue();
    const fees = calculateFees();

    if (parseFloat(positionValue) > balance) {
      alert("Insufficient balance!");
      return;
    }

    const order = {
      symbol,
      side,
      type: orderType,
      price: orderType === "market" ? lastPrice : selectedPrice,
      quantity: parseFloat(quantity),
      leverage: isFutures ? leverage : 1,
      positionValue,
      fees,
      timestamp: Date.now(),
    };

    console.log("DEMO ORDER:", order);
    alert(
      `Demo order submitted!\n${side} ${quantity} ${symbol.replace("USDT", "")}\nPrice: $${order.price}\nValue: ₱${positionValue}\nFees: ₱${fees}\n${isFutures ? `Leverage: ${leverage}x` : "Spot Trading"}`
    );
  }

  // Determine image URL for the current selected symbol from cryptoList (CoinGecko provides reliable images)
  const currentCryptoEntry = cryptoList.find((c) => c.value === symbol);
  const currentImageUrl = currentCryptoEntry ? currentCryptoEntry.image : null;

  // --- NEW: smarter search handler that immediately selects a matching symbol as you type ---
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (!term || term.trim() === "") {
      // Don't change symbol on empty search
      setFilteredCrypto(cryptoList);
      return;
    }

    const low = term.toLowerCase().trim();

    // prefer exact symbol match: e.g., user typed "eth" -> match crypto.symbol === "ETH"
    const exact = cryptoList.find((c) => c.symbol.toLowerCase() === low || c.value.toLowerCase() === `${low}usdt`);
    if (exact) {
      if (exact.value !== symbol) setSymbol(exact.value);
      // also set filtered to that exact match so dropdown shows it
      setFilteredCrypto([exact]);
      return;
    }

    // next prefer startsWith on symbol (eth -> ethereum), then value or label includes
    const starts = cryptoList.find((c) => c.symbol.toLowerCase().startsWith(low));
    if (starts) {
      if (starts.value !== symbol) setSymbol(starts.value);
      setFilteredCrypto([starts, ...cryptoList.filter((c) => c.value !== starts.value)]);
      return;
    }

    // fallback: pick first filtered result by label include
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

    // no match: keep filtered empty so dropdown shows nothing
    setFilteredCrypto([]);
  };

  return (
    <div className="trade-page">
      <header className="trade-header">
        <div className="left-top">
          <div className="brand-inline">
            <CryptoIcon symbol={symbol} size="small" imageUrl={currentImageUrl} />
            <div className="symbol-title">
              <div className="symbol-name">{symbol.replace("USDT", "")}/USDT</div>
              <div className="symbol-sub">{isFutures ? "Perpetual" : "Spot"} • {interval}</div>
            </div>
          </div>

          <div className="controls-inline">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search pairs..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="search-input"
              />
              <div className="search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
              </div>
            </div>

            <div className="custom-select-container">
              <select
                className="symbol-select"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  // clear search term so select stays in sync
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

            <div className="intervals">
              {INTERVAL_OPTIONS.map((i) => (
                <button
                  key={i}
                  className={`interval-btn ${interval === i ? "active" : ""}`}
                  onClick={() => setInterval(i)}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="right-top">
          <div className="price-info">
            <div className="price-box">
              <div className="last-price">${lastPrice}</div>
              <div className={`price-change ${parseFloat(priceChange.percent) >= 0 ? "positive" : "negative"}`}>
                {parseFloat(priceChange.percent) >= 0 ? "+" : ""}
                {priceChange.value} ({priceChange.percent}%)
              </div>
            </div>
            <div className="balance-info">
              <div className="balance-label">Virtual Balance</div>
              <div className="balance-value">
                ₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <button className={`type-btn ${orderType === "limit" ? "active" : ""}`} onClick={() => setOrderType("limit")}>
                  Limit
                </button>
                <button className={`type-btn ${orderType === "market" ? "active" : ""}`} onClick={() => setOrderType("market")}>
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
                    userEditedRef.current = true; // user touched input, disable auto-fill for this pick
                    setSelectedPrice(e.target.value);
                  }}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="input-group">
              <label>Quantity</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input-field" placeholder="0.00" />
            </div>

            {isFutures && (
              <div className="input-group">
                <label>Leverage: {leverage}x</label>
                <input className="leverage-slider" type="range" min="1" max="100" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} />
                <div className="leverage-presets">
                  {[1, 5, 10, 25, 50, 100].map((l) => (
                    <button key={l} className={`preset-btn ${leverage === l ? "active" : ""}`} onClick={() => setLeverage(l)}>
                      {l}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="order-summary">
              <div className="summary-row">
                <span>Position Value:</span>
                <span>₱{calculatePositionValue()}</span>
              </div>
              <div className="summary-row">
                <span>Est. Fees:</span>
                <span>₱{calculateFees()}</span>
              </div>
            </div>

            <div className="order-actions">
              <button className="btn btn-sell" onClick={() => submitOrder("SELL")} disabled={!quantity || parseFloat(quantity) <= 0}>
                {isFutures ? "Short" : "Sell"}
              </button>
              <button className="btn btn-buy" onClick={() => submitOrder("BUY")} disabled={!quantity || parseFloat(quantity) <= 0}>
                {isFutures ? "Long" : "Buy"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className="analysis-panel"> 
        <TechnicalAnalysis symbol={symbol} interval={interval} />
      </div>

      <div className="positions-panel">
        <div className="positions-header">
          <div className="positions-tabs">
            <div className="tab active">
              Positions <span className="tab-count">(0)</span>
            </div>
            <div className="tab">
              Open Orders <span className="tab-count">(0)</span>
            </div>
            <div className="tab">Order History</div>
          </div>
          <div className="positions-actions">
            <button className="action-btn">Close All</button>
            <button className="action-btn">Cancel All</button>
          </div>
        </div>

        <div className="positions-body">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No {isFutures ? "positions" : "orders"} yet</div>
            <div className="empty-subtitle">Your {isFutures ? "futures positions" : "spot orders"} will appear here</div>
          </div>
        </div>
      </div>

      <style jsx>{`
    .chart-wrapper {
      position: relative;
      height: 100%;
      width: 100%;
      background: #1e222d;
    }

    .chart-loading-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: #b7bdc6;
      z-index: 999;
      background: rgba(30, 34, 45, 0.95);
      padding: 20px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #2a2e39;
      border-top: 3px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .coin-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #2a2e39;
    }

    .coin-icon.small {
      width: 24px;
      height: 24px;
      font-size: 14px;
    }

    .coin-icon.medium {
      width: 32px;
      height: 32px;
      font-size: 18px;
    }

    .coin-icon.large {
      width: 48px;
      height: 48px;
      font-size: 24px;
    }

    .custom-select-container {
      position: relative;
      min-width: 200px;
    }

    .symbol-select {
      width: 100%;
      height: 36px;
      padding: 0 12px;
      border: 1px solid #2a2e39;
      border-radius: 4px;
      background: #1e222d;
      color: #b7bdc6;
      font-size: 14px;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
    }

    .symbol-select:focus {
      outline: none;
      border-color: #2196f3;
    }
  `}</style>
</div>
);
}