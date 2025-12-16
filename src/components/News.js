import React, { useState, useEffect } from "react";
import "../css/News.css";
import {
  filterCryptoArticles,
  CRYPTO_DOMAINS,
  SEARCH_TERMS,
} from "../lib/newsFilter";

export default function News() {
  const [allNews, setAllNews] = useState([]);
  const [displayedNews, setDisplayedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Modal states
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const [insightsError, setInsightsError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null); // 'english' or 'taglish'
  const [isLanguageSelectionOpen, setIsLanguageSelectionOpen] = useState(false);

  // Configuration
  const ARTICLES_PER_PAGE = 12;
  const MAX_ARTICLES = 100;
  const CACHE_VERSION = 3;
  const CACHE_KEY = `bitry_crypto_news_v${CACHE_VERSION}`;
  const INSIGHTS_CACHE_KEY = "bitry_ai_insights";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for testing (was 30)
  const INSIGHTS_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for AI insights

  // Gemini AI Configuration
  const GEMINI_CONFIG = {
    model: "gemini-2.5-flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models/",
    retries: 3,
    dailyLimit: 1000, // Adjust based on your plan; this is an example
  };

  // ------- Helpers added for robustness -------

  // Safely parse AI JSON output, fallback to a structured object
  const parseAIJsonOrFallback = (responseText, article) => {
    if (!responseText || typeof responseText !== "string") {
      return {
        marketImpact: { level: "Unknown", description: "No data" },
        sentiment: { overall: "Unknown", confidence: "", reasoning: "" },
        keyTakeaways: [],
        riskLevel: { level: "Unknown", description: "" },
        recommendation: "No recommendation available",
      };
    }

    // Normalize and remove code fences and bad control chars
    let cleaned = responseText
      .replace(/```json\s*/gi, "")
      .replace(/\s*```/g, "")
      .trim();

    // Remove low-ascii/control characters that break JSON.parse
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F]/g, " ");

    // If there's a JSON object inside a bunch of text, extract it
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // Try parsing, with a final safe fallback
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (err) {
      console.warn(
        "parseAIJsonOrFallback: JSON.parse failed after sanitizing:",
        err
      );
    }

    // If parse failed, return a lightweight structured fallback using the raw text
    const short = cleaned.slice(0, 800).trim();
    return {
      marketImpact: { level: "Unknown", description: short },
      sentiment: { overall: "Unknown", confidence: "", reasoning: short },
      keyTakeaways: short ? [short] : [],
      riskLevel: { level: "Unknown", description: "" },
      recommendation: short || "No recommendation available",
    };
  };

  // Prevent .toLowerCase() calls on non-strings
  const safeLower = (v) =>
    typeof v === "string" ? v.toLowerCase() : "unknown";

  // ------- End helpers -------

  // Image validation helper functions
  const isValidImageUrl = (url) => {
    if (!url) return false;

    // Check for common invalid patterns
    const invalidPatterns = [
      "data:image",
      "localhost",
      "127.0.0.1",
      "placeholder",
      "default",
      ".svg", // Many news sites use SVG logos that don't work well
    ];

    return (
      !invalidPatterns.some((pattern) => url.includes(pattern)) &&
      (url.startsWith("http://") || url.startsWith("https://"))
    );
  };

  // Enhanced article processing to better handle images
  const processArticleImage = (article) => {
    // NewsAPI sometimes returns null or placeholder images
    if (
      !article.urlToImage ||
      article.urlToImage.includes("placeholder") ||
      article.urlToImage.includes("logo") ||
      article.urlToImage.endsWith(".svg")
    ) {
      return null;
    }

    // Try to ensure it's a real image URL
    const imageUrl = article.urlToImage.trim();
    if (imageUrl.length < 10 || !imageUrl.includes(".")) {
      return null;
    }

    return imageUrl;
  };

  // Generate dynamic placeholder based on article content
  const generatePlaceholderImage = (article) => {
    const title = (article.title || "").toLowerCase();

    // Determine crypto type for appropriate icon
    let icon = "₿"; // Default Bitcoin
    let gradient = "linear-gradient(135deg, #f7931e 0%, #ac8939 100%)"; // Bitcoin orange

    if (title.includes("ethereum") || title.includes("eth")) {
      icon = "Ξ";
      gradient = "linear-gradient(135deg, #627eea 0%, #3d4f7a 100%)"; // Ethereum blue
    } else if (title.includes("binance") || title.includes("bnb")) {
      icon = "ⓑ";
      gradient = "linear-gradient(135deg, #f0b90b 0%, #c49102 100%)"; // Binance yellow
    } else if (title.includes("cardano") || title.includes("ada")) {
      icon = "₳";
      gradient = "linear-gradient(135deg, #0033ad 0%, #001a5c 100%)"; // Cardano blue
    } else if (title.includes("solana") || title.includes("sol")) {
      icon = "●";
      gradient = "linear-gradient(135deg, #9945ff 0%, #14f195 100%)"; // Solana gradient
    } else if (title.includes("dogecoin") || title.includes("doge")) {
      icon = "Ð";
      gradient = "linear-gradient(135deg, #c2a633 0%, #f4d03f 100%)"; // Dogecoin gold
    }

    return { icon, gradient };
  };

  // Cache functions for insights
  const getInsightsCache = () => {
    try {
      const cached = JSON.parse(
        localStorage.getItem(INSIGHTS_CACHE_KEY) || "{}"
      );
      return cached;
    } catch (error) {
      console.error("Error reading insights cache:", error);
      return {};
    }
  };

  const setInsightsCache = (articleId, insightsData) => {
    try {
      const cache = getInsightsCache();
      cache[articleId] = {
        data: insightsData,
        timestamp: Date.now(),
      };
      localStorage.setItem(INSIGHTS_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error("Error saving insights to cache:", error);
    }
  };

  const isInsightsCacheFresh = (cached) => {
    if (!cached || !cached.timestamp) return false;
    return Date.now() - cached.timestamp < INSIGHTS_CACHE_DURATION;
  };

  // Track API usage to avoid hitting limits
  const getApiUsage = () => {
    try {
      const today = new Date().toDateString();
      const usage = localStorage.getItem("gemini_api_usage");
      const parsed = usage ? JSON.parse(usage) : {};

      if (!parsed[today]) {
        parsed[today] = { count: 0 };
        localStorage.setItem("gemini_api_usage", JSON.stringify(parsed));
      }

      return parsed[today].count;
    } catch (error) {
      return 0;
    }
  };

  const incrementApiUsage = () => {
    try {
      const today = new Date().toDateString();
      const usage = localStorage.getItem("gemini_api_usage");
      const parsed = usage ? JSON.parse(usage) : {};

      if (!parsed[today]) {
        parsed[today] = { count: 0 };
      }

      parsed[today].count += 1;
      localStorage.setItem("gemini_api_usage", JSON.stringify(parsed));

      return parsed[today].count;
    } catch (error) {
      return 0;
    }
  };

  // Client -> server proxy call to /api/ai
  const callGeminiAPI = async (prompt, retries = GEMINI_CONFIG.retries) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const resp = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        const contentType = resp.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
          ? await resp.json()
          : { rawText: await resp.text() };

        if (!resp.ok) {
          const message =
            body?.error ||
            body?.message ||
            (body?.rawText ? body.rawText : `Status ${resp.status}`);
          const err = new Error(`AI proxy error: ${message}`);
          err.status = resp.status;
          throw err;
        }

        // If server returned parsed insights
        if (body && body.insights) return body.insights;
        // Otherwise return rawText for client fallback parsing
        if (body && body.rawText) return body.rawText;
        return null;
      } catch (err) {
        console.error(`AI proxy attempt ${attempt} failed:`, err.message);
        if (attempt === retries) throw err;
        const wait = attempt * 3000;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  };

  // AI-powered insights using Gemini (robust parsing & caching)
  const generateInsights = async (article, language = 'english') => {
    try {
      // Check cache first
      const cache = getInsightsCache();
      const cacheKey = `${article.id}_${language}`;
      const cachedInsight = cache[cacheKey];

      if (cachedInsight && isInsightsCacheFresh(cachedInsight)) {
        console.log(`Using cached AI insights for article (${language}):`, article.id);
        return cachedInsight.data;
      }

      // Check API usage limits
      const todayUsage = getApiUsage();
      if (todayUsage >= GEMINI_CONFIG.dailyLimit) {
        throw new Error("Daily API limit reached");
      }

      console.log(
        `Generating AI insights using Gemini (${language}) (Usage: ${todayUsage}/${GEMINI_CONFIG.dailyLimit})`
      );

      const articleText = `${article.title} ${article.description}`;

      // Craft prompt for Gemini to assess sentiment and impact
      const basePrompt = `
You are an expert in cryptocurrency market analysis. Assess the following news article for its sentiment and impact on the cryptocurrency market, tailored for Filipino beginners. Keep ALL responses concise, use simple language, and format descriptions/reasoning as short bullet points (e.g., - Point one\n- Point two). Avoid any Markdown formatting like * or **; use plain text only.

Article Title: ${article.title}
Article Description: ${article.description}

Output ONLY a valid JSON object with the following structure:
{
  "marketImpact": {
    "level": "High" | "Moderate" | "Low",
    "description": "Concise bullet points (2-4 max) on potential impact, focused on major coins on Philippine exchanges like PDAX or Coins.ph."
  },
  "sentiment": {
    "overall": "Bullish" | "Bearish" | "Neutral",
    "confidence": "e.g., 80%",
    "reasoning": "Short bullet points (2-3 max) explaining the sentiment."
  },
  "keyTakeaways": ["3-5 short bullet points with key insights for beginners."],
  "riskLevel": {
    "level": "High" | "Moderate" | "Low",
    "description": "Concise bullet points (2-3 max) assessing risk for beginners."
  },
  "recommendation": "A short recommendation (1-2 sentences) for beginners in the Philippines."
}

Focus on cryptocurrency market impact only. Use beginner-friendly terms.`;

      const taglishPrompt = `
You are an expert in cryptocurrency market analysis. Assess the following news article for its sentiment and impact on the cryptocurrency market, tailored for Filipino beginners. Keep key cryptocurrency terms like "blockchain", "smart contracts", "DeFi", "Bitcoin", "Ethereum", etc., untranslated. Use casual TagLish (Tagalog-English mix) with simple, conversational language suitable for beginners. Keep ALL responses concise, use simple language, and format descriptions/reasoning as short bullet points (e.g., - Point one\n- Point two). Avoid any Markdown formatting like * or **; use plain text only.

Article Title: ${article.title}
Article Description: ${article.description}

Output ONLY a valid JSON object with the following structure:
{
  "marketImpact": {
    "level": "High" | "Moderate" | "Low",
    "description": "Concise bullet points (2-4 max) in TagLish on potential impact, focused on major coins on Philippine exchanges like PDAX or Coins.ph."
  },
  "sentiment": {
    "overall": "Bullish" | "Bearish" | "Neutral",
    "confidence": "e.g., 80%",
    "reasoning": "Short bullet points (2-3 max) in TagLish explaining the sentiment."
  },
  "keyTakeaways": ["3-5 short bullet points in TagLish with key insights for beginners."],
  "riskLevel": {
    "level": "High" | "Moderate" | "Low",
    "description": "Concise bullet points (2-3 max) in TagLish assessing risk for beginners."
  },
  "recommendation": "A short recommendation (1-2 sentences) in TagLish for beginners in the Philippines."
}

Focus on cryptocurrency market impact only. Use beginner-friendly TagLish terms.`;

      const prompt = language === 'taglish' ? taglishPrompt : basePrompt;

      // Try to get AI result from server proxy
      let parsedInsights = null;
      try {
        const aiResult = await callGeminiAPI(prompt);

        if (aiResult && typeof aiResult === "object") {
          // Proxy returned parsed JSON
          parsedInsights = aiResult;
        } else if (typeof aiResult === "string") {
          // Proxy returned raw text — try strict parse then fallback
          try {
            const cleanedResponse = aiResult
              .replace(/```json\s*/gi, "")
              .replace(/\s*```/g, "")
              .trim()
              .replace(/[\u0000-\u001F\u007F]/g, " ");
            parsedInsights = JSON.parse(cleanedResponse);
            if (!parsedInsights || typeof parsedInsights !== "object") {
              parsedInsights = parseAIJsonOrFallback(aiResult, article);
            }
          } catch (parseErr) {
            console.warn(
              "Strict JSON.parse failed for AI proxy response:",
              parseErr
            );
            parsedInsights = parseAIJsonOrFallback(aiResult, article);
          }
        } else {
          // No usable result; fallback to tolerant parser
          parsedInsights = parseAIJsonOrFallback(null, article);
        }
      } catch (err) {
        console.warn("AI proxy call failed:", err.message || err);
        // fallback to local parsing/fallback helper
        parsedInsights = parseAIJsonOrFallback(null, article);
      }

      // Increment usage and cache results (even if fallback)
      incrementApiUsage();
      setInsightsCache(cacheKey, parsedInsights);

      return parsedInsights;
    } catch (error) {
      console.error("Error generating AI insights:", error);
      // Return a structured fallback instead of throwing so UI can show something useful
      return {
        marketImpact: {
          level: "Unknown",
          description: "AI analysis unavailable",
        },
        sentiment: {
          overall: "Unknown",
          confidence: "",
          reasoning: "AI analysis unavailable",
        },
        keyTakeaways: ["AI analysis unavailable"],
        riskLevel: { level: "Unknown", description: "" },
        recommendation: "AI analysis unavailable right now",
      };
    }
  };

  // Modal handlers
  const openModal = async (article) => {
    setSelectedArticle(article);
    setSelectedLanguage(null);
    setIsLanguageSelectionOpen(true);
    setIsModalOpen(true);
    setIsLoadingInsights(false);
    setInsights(null);
    setInsightsError(null);

    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open");
  };

  const selectLanguage = async (language) => {
    setSelectedLanguage(language);
    setIsLanguageSelectionOpen(false);
    setIsModalOpen(true);
    setIsLoadingInsights(true);
    setInsights(null);
    setInsightsError(null);

    // Generate or fetch cached insights
    try {
      const aiInsights = await generateInsights(selectedArticle, language);
      setInsights(aiInsights);
    } catch (error) {
      console.error("Failed to get AI insights:", error);
      setInsightsError(error.message);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsLanguageSelectionOpen(false);
    setSelectedArticle(null);
    setSelectedLanguage(null);
    setIsLoadingInsights(false);
    setInsights(null);
    setInsightsError(null);

    // Restore body scroll
    document.body.style.overflow = "unset";
    document.body.classList.remove("modal-open");
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && (isModalOpen || isLanguageSelectionOpen)) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isModalOpen, isLanguageSelectionOpen]);

  // Cache functions
  const isCacheFresh = (cached) => {
    if (!cached || !cached.timestamp) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  };

  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const parsed = cached ? JSON.parse(cached) : null;
      if (!parsed) return null;
      // Auto-invalidate old versions
      if (parsed.version && parsed.version !== CACHE_VERSION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed;
    } catch (error) {
      console.error("Error reading cache:", error);
      return null;
    }
  };

  const setCachedData = (data) => {
    try {
      const cacheObject = {
        version: CACHE_VERSION,
        data: data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  // --- Filtering helpers and centralized article filter ---
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const wordMatch = (text, term) => {
    if (!text || !term) return false;
    try {
      const re = new RegExp("\\b" + escapeRegex(term) + "\\b", "i");
      return re.test(text);
    } catch (e) {
      return text.includes(term);
    }
  };
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[\n\r\t]+/g, " ")
      .replace(/[^\w\s\-\.]/g, " ")
      .trim();

  // Fetch news from API, fall back to public cache file, then to localStorage
  const fetchAllNews = async () => {
    try {
      const resp = await fetch("/api/news");

      let payload = null;

      if (!resp.ok) {
        console.warn(`Primary API failed with status ${resp.status}. Falling back to static cache.`);

        // Try public/news_cache.json (served from public/)
        const fallbackResp = await fetch("/news_cache.json");
        if (!fallbackResp.ok) {
          throw new Error(`Fallback request failed with status ${fallbackResp.status}`);
        }
        const raw = await fallbackResp.json();
        payload = raw?.data && Array.isArray(raw.data.articles) ? raw.data : raw;
      } else {
        // Live API returned OK
        payload = await resp.json();
      }

      if (!payload || !payload.articles || !Array.isArray(payload.articles)) {
        throw new Error("Payload does not contain articles array");
      }

      console.log(`Loaded ${payload.articles.length} articles from ${resp.ok ? "live API" : "static cache"}`);

      const processedArticles = payload.articles
        .slice(0, MAX_ARTICLES)
        .map((article, i) => {
          let host = "";
          try {
            host = new URL(article.url).hostname || "";
          } catch (e) {}
          return {
            id: `${Date.now()}-${i}`,
            title: (article.title || "").trim(),
            description: (article.description || "").trim(),
            url: article.url,
            imageUrl: processArticleImage(article),
            publishedAt: article.publishedAt,
            source: article.source?.name || host,
            author: article.author || "Unknown Author",
          };
        });

      // Cache results client-side for UI consistency
      setCachedData(processedArticles);
      return processedArticles;
    } catch (error) {
      console.error("Fetch error (final):", error);
      // Try to use client localStorage stale cache if available
      const cached = getCachedData();
      if (cached && cached.data) {
        console.log("API failed, using stale client cache...");
        return cached.data;
      }
      throw error;
    }
  };

  // Update displayed news based on current page
  const updateDisplayedNews = (newsArray, page) => {
    const startIndex = (page - 1) * ARTICLES_PER_PAGE;
    const endIndex = startIndex + ARTICLES_PER_PAGE;
    const paginatedNews = newsArray.slice(startIndex, endIndex);

    setDisplayedNews(paginatedNews);
    setTotalPages(Math.ceil(newsArray.length / ARTICLES_PER_PAGE));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setIsLoadingMore(true);
      setCurrentPage(newPage);
      updateDisplayedNews(allNews, newPage);

      // Scroll to top of news section
      document.querySelector(".news-header")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      setTimeout(() => setIsLoadingMore(false), 300);
    }
  };

  // Initial load
  useEffect(() => {
    const loadNews = async () => {
      try {
        setLoading(true);
        const newsData = await fetchAllNews();
        setAllNews(newsData);
        updateDisplayedNews(newsData, 1);

        if (newsData.length === 0) {
          setError("No articles found");
        }
      } catch (err) {
        setError(err.message);

        // Try cached data as fallback
        const cached = getCachedData();
        if (cached && cached.data) {
          setAllNews(cached.data);
          updateDisplayedNews(cached.data, 1);
          setError(
            `API Error: ${err.message}. Showing cached data from ${new Date(
              cached.timestamp
            ).toLocaleString()}`
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  const refreshNews = async () => {
    localStorage.removeItem(CACHE_KEY);
    setLoading(true);
    setError(null);
    try {
      const newsData = await fetchAllNews();
      setAllNews(newsData);
      setCurrentPage(1);
      updateDisplayedNews(newsData, 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strongCryptoTerms = [
    "cryptocurrency",
    "cryptocurrency market",
    "bitcoin",
    "bitcoin price",
    "ethereum",
    "ethereum price",
    "blockchain",
    "crypto exchange",
    "crypto trading",
    "crypto investment",
    "digital currency",
  ];

  if (loading) {
    return (
      <section className="news-container">
        <div className="news-header">
          <h2 className="news-title">Cryptocurrency News</h2>
          <div className="loading-container">
            <div className="crypto-loader">
              <div className="crypto-symbol btc">₿</div>
              <div className="crypto-symbol eth">Ξ</div>
              <div className="crypto-symbol bnb">ⓑ</div>
            </div>
            <p className="loading-text">Loading latest crypto news...</p>
            <div className="loading-progress">
              <div className="progress-bar"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error && !allNews.length) {
    return (
      <section className="news-container">
        <div className="news-header">
          <h2 className="news-title">Cryptocurrency News</h2>
          <div className="error-state">
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <button onClick={refreshNews} className="btn-primary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="news-container">
      <div className="news-header">
        <h2 className="news-title">Cryptocurrency News</h2>
        <p className="news-subtitle">
          Latest news on Bitcoin, Ethereum, and top cryptocurrencies
          {error && <span className="cache-warning"> • {error}</span>}
        </p>

        <div className="news-controls">
          <div className="news-stats">
            <span className="total-articles">{allNews.length} articles</span>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="control-buttons">
            <button
              onClick={refreshNews}
              className="btn-refresh"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {isLoadingMore && (
        <div className="loading-overlay">
          <div className="page-loader">
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
            <div className="pulse-dot"></div>
          </div>
        </div>
      )}

      <div className="news-grid">
        {displayedNews.map((article, index) => (
          <article key={article.id} className="news-card">
            {article.imageUrl && isValidImageUrl(article.imageUrl) ? (
              <div className="news-image">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  loading={index < 6 ? "eager" : "lazy"}
                  onError={(e) => {
                    console.log("Image failed to load:", article.imageUrl);
                    const placeholder = generatePlaceholderImage(article);
                    const imageContainer = e.target.closest(".news-image");
                    if (imageContainer) {
                      imageContainer.innerHTML = `
                        <div class="news-image-placeholder" style="background: ${placeholder.gradient}">
                          <div class="placeholder-content">
                            <span class="crypto-icon">${placeholder.icon}</span>
                            <span class="source-name">${article.source}</span>
                          </div>
                        </div>
                      `;
                    }
                  }}
                  onLoad={(e) => {
                    if (e.target.naturalWidth === 0) {
                      const placeholder = generatePlaceholderImage(article);
                      const imageContainer = e.target.closest(".news-image");
                      if (imageContainer) {
                        imageContainer.innerHTML = `
                          <div class="news-image-placeholder" style="background: ${placeholder.gradient}">
                            <div class="placeholder-content">
                              <span class="crypto-icon">${placeholder.icon}</span>
                              <span class="source-name">${article.source}</span>
                            </div>
                          </div>
                        `;
                      }
                    }
                  }}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="news-image">
                <div
                  className="news-image-placeholder"
                  style={{
                    background: generatePlaceholderImage(article).gradient,
                  }}
                >
                  <div className="placeholder-content">
                    <span className="crypto-icon">
                      {generatePlaceholderImage(article).icon}
                    </span>
                    <span className="source-name">{article.source}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="news-content">
              <div className="news-text-content">
                <h3 className="news-card-title">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.title}
                  </a>
                </h3>

                <p className="news-description">{article.description}</p>

                <div className="news-meta">
                  <div className="news-source">
                    <span className="source-name">{article.source}</span>
                    {article.author !== "Unknown Author" && (
                      <span className="author">by {article.author}</span>
                    )}
                  </div>
                  <time className="news-date" dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </div>

              <div className="news-actions">
                <button
                  className="btn-ai-insights"
                  onClick={() => openModal(article)}
                >
                  See AI Insights
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoadingMore}
            className="pagination-btn pagination-prev"
          >
            ← Previous
          </button>

          <div className="pagination-numbers">
            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1;
              const isVisible =
                pageNum === 1 ||
                pageNum === totalPages ||
                Math.abs(pageNum - currentPage) <= 2;

              if (!isVisible && pageNum !== 2 && pageNum !== totalPages - 1) {
                return null;
              }

              if (
                (pageNum === 2 && currentPage > 4) ||
                (pageNum === totalPages - 1 && currentPage < totalPages - 3)
              ) {
                return (
                  <span key={pageNum} className="pagination-ellipsis">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isLoadingMore}
                  className={`pagination-btn ${
                    currentPage === pageNum ? "active" : ""
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoadingMore}
            className="pagination-btn pagination-next"
          >
            Next →
          </button>
        </div>
      )}

      <div className="news-footer">
        <p className="cache-info">
          Articles are cached for 30 minutes to optimize API usage • Last
          updated:{" "}
          {getCachedData()?.timestamp
            ? new Date(getCachedData().timestamp).toLocaleString()
            : "Just now"}
        </p>
      </div>

      {/* Language Selection Modal */}
      {isLanguageSelectionOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content language-selection-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose Language</h3>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="language-selection">
                <p className="language-selection-intro">
                  Choose your preferred language for AI insights:
                </p>

                <div className="language-options">
                  <button
                    className="language-option english-option"
                    onClick={() => selectLanguage('english')}
                  >
                    <div className="language-icon">🇺🇸</div>
                    <div className="language-info">
                      <h4>English</h4>
                      <p>Read insights in English</p>
                    </div>
                  </button>

                  <button
                    className="language-option taglish-option"
                    onClick={() => selectLanguage('taglish')}
                  >
                    <div className="language-icon">🇵🇭</div>
                    <div className="language-info">
                      <h4>TagLish</h4>
                      <p>Basahin ang insights sa TagLish (Tagalog-English mix)</p>
                    </div>
                  </button>
                </div>

                <div className="language-note">
                  <small>
                    <strong>Note:</strong> TagLish keeps important crypto terms in English
                    while using conversational Filipino for easier understanding.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Modal */}
      {isModalOpen && !isLanguageSelectionOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>AI Market Insights</h3>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {isLoadingInsights ? (
                <div className="insights-loading">
                  <div className="ai-brain">
                    <div className="brain-pulse"></div>
                  </div>
                  <h4>AI Analyzing Article...</h4>
                  <p>
                    Our Gemini AI is processing the news and generating
                    personalized insights.
                  </p>
                  <div className="loading-steps">
                    <div className="step">Running sentiment analysis...</div>
                    <div className="step">Analyzing market impact...</div>
                    <div className="step">Generating recommendations...</div>
                  </div>
                  <div className="api-status">
                    <small>Using AI model: Gemini 2.5 Flash</small>
                  </div>
                </div>
              ) : insightsError ? (
                <div className="insights-error">
                  <div className="error-icon">⚠️</div>
                  <h4>AI Analysis Unavailable</h4>
                  <p>
                    We couldn't generate AI insights right now. This might be
                    due to:
                  </p>
                  <ul>
                    <li>Daily API limit reached</li>
                    <li>AI models are loading or temporarily unavailable</li>
                    <li>Network connectivity issues</li>
                  </ul>
                  <p className="error-message">{insightsError}</p>
                  <div className="error-actions">
                    <button
                      className="btn-retry"
                      onClick={() => openModal(selectedArticle)}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : insights ? (
                <div className="insights-content">
                  <div className="article-header">
                    <h4>{selectedArticle.title}</h4>
                    <div className="article-meta">
                      <span className="source">{selectedArticle.source}</span>
                      <span className="date">
                        {new Date(
                          selectedArticle.publishedAt
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="ai-badge">AI Powered</span>
                    </div>
                  </div>

                  <div className="insights-grid">
                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">📈</span>
                        <h5>AI Market Impact</h5>
                      </div>
                      <div
                        className={`impact-badge ${safeLower(
                          insights?.marketImpact?.level
                        )}`}
                      >
                        {insights?.marketImpact?.level || "Unknown"} Impact
                      </div>
                      <p>{insights?.marketImpact?.description || ""}</p>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">💬</span>
                        <h5>AI Sentiment Analysis</h5>
                      </div>
                      <div
                        className={`sentiment-badge ${safeLower(
                          insights?.sentiment?.overall
                        )}`}
                      >
                        {insights?.sentiment?.overall || "Unknown"}
                        <span className="confidence">
                          ({insights?.sentiment?.confidence || "N/A"}{" "}
                          confidence)
                        </span>
                      </div>
                      <p>{insights?.sentiment?.reasoning || ""}</p>
                    </div>

                    <div className="insight-card full-width">
                      <div className="insight-header">
                        <span className="insight-icon">🎯</span>
                        <h5>AI-Generated Insights for Filipino Beginners</h5>
                      </div>
                      <ul className="takeaways-list">
                        {(insights?.keyTakeaways || []).map(
                          (takeaway, index) => (
                            <li key={index}>{takeaway}</li>
                          )
                        )}
                      </ul>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">⚠️</span>
                        <h5>AI Risk Assessment</h5>
                      </div>
                      <div
                        className={`risk-badge ${safeLower(
                          insights?.riskLevel?.level
                        )}`}
                      >
                        {insights?.riskLevel?.level || "Unknown"} Risk
                      </div>
                      <p>{insights?.riskLevel?.description || ""}</p>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">💡</span>
                        <h5>AI Recommendation</h5>
                      </div>
                      <p className="recommendation">
                        {insights?.recommendation || ""}
                      </p>
                    </div>
                  </div>

                  <div className="ai-info">
                    <div className="ai-models-used">
                      <h6>AI Models Used:</h6>
                      <div className="model-tags">
                        <span className="model-tag">Gemini 2.5 Flash</span>
                      </div>
                    </div>
                  </div>

                  <div className="disclaimer">
                    <p>
                      <strong>AI Disclaimer:</strong> This analysis is generated
                      by Gemini AI for educational purposes only. It should not
                      be considered as financial advice. Always do your own
                      research and consult with financial professionals before
                      making investment decisions.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              {selectedArticle && (
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-read-full"
                >
                  Read Full Article
                </a>
              )}
              <button className="btn-close" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
