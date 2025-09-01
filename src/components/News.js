import React, { useState, useEffect } from "react";
import "../css/News.css";

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

  // Configuration - HUGGING FACE INTEGRATION
  const ARTICLES_PER_PAGE = 12;
  const MAX_ARTICLES = 100;
  const CACHE_KEY = 'bitry_crypto_news';
  const INSIGHTS_CACHE_KEY = 'bitry_ai_insights';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const INSIGHTS_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for AI insights
  const API_KEY = 'eca0ba3938154abd9d66d996cfa36459';
  const HUGGINGFACE_API_KEY = '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';
  
  // AI API Configuration
  const AI_PROVIDERS = {
    huggingface: {
      apiKey: HUGGINGFACE_API_KEY,
      baseUrl: 'https://api-inference.huggingface.co/models/',
      models: {
        // Different models for different tasks
        text: 'microsoft/DialoGPT-large', // Conversational AI
        analysis: 'cardiffnlp/twitter-roberta-base-sentiment-latest', // Sentiment analysis
        summarization: 'facebook/bart-large-cnn' // Text summarization
      },
      dailyLimit: 1000,
      enabled: true
    }
  };

  // Image validation helper functions
  const isValidImageUrl = (url) => {
    if (!url) return false;
    
    // Check for common invalid patterns
    const invalidPatterns = [
      'data:image',
      'localhost',
      '127.0.0.1',
      'placeholder',
      'default',
      '.svg'  // Many news sites use SVG logos that don't work well
    ];
    
    return !invalidPatterns.some(pattern => url.includes(pattern)) &&
           (url.startsWith('http://') || url.startsWith('https://'));
  };

  // Enhanced article processing to better handle images
  const processArticleImage = (article) => {
    // NewsAPI sometimes returns null or placeholder images
    if (!article.urlToImage || 
        article.urlToImage.includes('placeholder') ||
        article.urlToImage.includes('logo') ||
        article.urlToImage.endsWith('.svg')) {
      return null;
    }
    
    // Try to ensure it's a real image URL
    const imageUrl = article.urlToImage.trim();
    if (imageUrl.length < 10 || !imageUrl.includes('.')) {
      return null;
    }
    
    return imageUrl;
  };

  // Generate dynamic placeholder based on article content
  const generatePlaceholderImage = (article) => {
    const title = article.title.toLowerCase();
    
    // Determine crypto type for appropriate icon
    let icon = '₿'; // Default Bitcoin
    let gradient = 'linear-gradient(135deg, #f7931e 0%, #ac8939 100%)'; // Bitcoin orange
    
    if (title.includes('ethereum') || title.includes('eth')) {
      icon = 'Ξ';
      gradient = 'linear-gradient(135deg, #627eea 0%, #3d4f7a 100%)'; // Ethereum blue
    } else if (title.includes('binance') || title.includes('bnb')) {
      icon = 'ⓑ';
      gradient = 'linear-gradient(135deg, #f0b90b 0%, #c49102 100%)'; // Binance yellow
    } else if (title.includes('cardano') || title.includes('ada')) {
      icon = '₳';
      gradient = 'linear-gradient(135deg, #0033ad 0%, #001a5c 100%)'; // Cardano blue
    } else if (title.includes('solana') || title.includes('sol')) {
      icon = '◎';
      gradient = 'linear-gradient(135deg, #9945ff 0%, #14f195 100%)'; // Solana gradient
    } else if (title.includes('dogecoin') || title.includes('doge')) {
      icon = 'Ð';
      gradient = 'linear-gradient(135deg, #c2a633 0%, #f4d03f 100%)'; // Dogecoin gold
    }
    
    return { icon, gradient };
  };

  // Cache functions for insights
  const getInsightsCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(INSIGHTS_CACHE_KEY) || '{}');
      return cached;
    } catch (error) {
      console.error('Error reading insights cache:', error);
      return {};
    }
  };

  const setInsightsCache = (articleId, insightsData) => {
    try {
      const cache = getInsightsCache();
      cache[articleId] = {
        data: insightsData,
        timestamp: Date.now()
      };
      localStorage.setItem(INSIGHTS_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving insights to cache:', error);
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
      const usage = localStorage.getItem('hf_api_usage');
      const parsed = usage ? JSON.parse(usage) : {};
      
      if (!parsed[today]) {
        parsed[today] = { count: 0 };
        localStorage.setItem('hf_api_usage', JSON.stringify(parsed));
      }
      
      return parsed[today].count;
    } catch (error) {
      return 0;
    }
  };

  const incrementApiUsage = () => {
    try {
      const today = new Date().toDateString();
      const usage = localStorage.getItem('hf_api_usage');
      const parsed = usage ? JSON.parse(usage) : {};
      
      if (!parsed[today]) {
        parsed[today] = { count: 0 };
      }
      
      parsed[today].count += 1;
      localStorage.setItem('hf_api_usage', JSON.stringify(parsed));
      
      return parsed[today].count;
    } catch (error) {
      return 0;
    }
  };

  // Hugging Face API call with retry logic
  const callHuggingFaceAPI = async (model, payload, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${AI_PROVIDERS.huggingface.baseUrl}${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          incrementApiUsage();
          return data;
        } else if (response.status === 503) {
          // Model is loading, wait and retry
          const waitTime = attempt * 2000; // Exponential backoff
          console.log(`Model loading, waiting ${waitTime}ms before retry ${attempt}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          const errorText = await response.text();
          throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        console.log(`Attempt ${attempt} failed, retrying...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  };

  // AI-powered insights using Hugging Face
  const generateInsights = async (article) => {
    try {
      // Check cache first
      const cache = getInsightsCache();
      const cachedInsight = cache[article.id];
      
      if (cachedInsight && isInsightsCacheFresh(cachedInsight)) {
        console.log('Using cached AI insights for article:', article.id);
        return cachedInsight.data;
      }

      // Check API usage limits
      const todayUsage = getApiUsage();
      if (todayUsage >= AI_PROVIDERS.huggingface.dailyLimit) {
        console.log('Daily API limit reached, using fallback analysis');
        return createEnhancedInsights(article);
      }

      console.log(`Generating AI insights using Hugging Face (Usage: ${todayUsage}/${AI_PROVIDERS.huggingface.dailyLimit})`);

      const articleText = `${article.title} ${article.description}`;
      
      // Step 1: Get sentiment analysis
      const sentimentResult = await callHuggingFaceAPI(
        AI_PROVIDERS.huggingface.models.analysis,
        {
          inputs: articleText
        }
      );

      // Step 2: Get text summarization for key insights
      const summaryResult = await callHuggingFaceAPI(
        AI_PROVIDERS.huggingface.models.summarization,
        {
          inputs: articleText,
          parameters: {
            max_length: 100,
            min_length: 30
          }
        }
      );

      // Process the AI results
      const insights = processAIResults(article, sentimentResult, summaryResult);

      // Cache the insights
      setInsightsCache(article.id, insights);
      
      return insights;

    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Fallback to enhanced rule-based analysis
      return createEnhancedInsights(article);
    }
  };

  // Process AI results into our insights format
  const processAIResults = (article, sentimentResult, summaryResult) => {
    const title = article.title.toLowerCase();
    const description = article.description.toLowerCase();
    const content = title + ' ' + description;
    
    // Process sentiment from Hugging Face
    let sentiment = 'Neutral';
    let confidence = '60%';
    
    if (sentimentResult && Array.isArray(sentimentResult) && sentimentResult.length > 0) {
      const topSentiment = sentimentResult[0];
      const score = Math.round(topSentiment.score * 100);
      confidence = `${score}%`;
      
      if (topSentiment.label === 'LABEL_2' || topSentiment.label === 'POSITIVE') {
        sentiment = 'Bullish';
      } else if (topSentiment.label === 'LABEL_0' || topSentiment.label === 'NEGATIVE') {
        sentiment = 'Bearish';
      }
    }

    // Determine market impact using crypto-specific keywords
    let marketImpact = 'Low';
    const highImpactKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'federal reserve', 'sec', 
      'regulation', 'institutional', 'etf', 'binance', 'coinbase',
      'market', 'trillion', 'billion', 'major', 'breaking'
    ];
    
    const impactScore = highImpactKeywords.reduce((score, word) => 
      content.includes(word) ? score + 1 : score, 0);
    
    if (impactScore >= 3) {
      marketImpact = 'High';
    } else if (impactScore >= 1) {
      marketImpact = 'Moderate';
    }

    // Risk assessment
    let riskLevel = 'Low';
    if (content.includes('hack') || content.includes('scam') || content.includes('fraud')) {
      riskLevel = 'High';
    } else if (content.includes('regulation') || content.includes('volatility') || content.includes('investigation')) {
      riskLevel = 'Moderate';
    }

    // Generate key takeaways
    const takeaways = [];
    
    // Add AI-powered summary if available
    if (summaryResult && Array.isArray(summaryResult) && summaryResult.length > 0) {
      const summary = summaryResult[0].summary_text;
      takeaways.push(`AI Analysis: ${summary.substring(0, 100)}...`);
    }
    
    if (sentiment === 'Bullish') {
      takeaways.push('Positive sentiment detected - could support crypto price growth');
      takeaways.push('Good opportunity to research the mentioned cryptocurrencies');
    } else if (sentiment === 'Bearish') {
      takeaways.push('Negative sentiment suggests exercising caution in crypto investments');
      takeaways.push('Consider waiting for market stabilization before making moves');
    } else {
      takeaways.push('Mixed sentiment indicates a balanced approach may be best');
    }
    
    if (content.includes('bitcoin') || content.includes('btc')) {
      takeaways.push('Bitcoin news often influences the entire cryptocurrency market');
    }
    
    if (content.includes('philippines') || content.includes('filipino')) {
      takeaways.push('This news has specific relevance for Filipino crypto investors');
    } else {
      takeaways.push('Monitor impact on Philippine exchanges like PDAX and Coins.ph');
    }
    
    // Generate recommendation
    let recommendation;
    if (sentiment === 'Bullish' && riskLevel === 'Low') {
      recommendation = 'AI analysis shows positive sentiment. Consider this favorable for learning about crypto investments with peso-cost averaging.';
    } else if (sentiment === 'Bearish' || riskLevel === 'High') {
      recommendation = 'AI detects concerning signals. Focus on education and wait for more stable conditions before investing.';
    } else {
      recommendation = 'AI shows mixed signals. Continue learning and monitoring market developments without rushing into investments.';
    }

    return {
      marketImpact: {
        level: marketImpact,
        description: `AI analysis indicates ${marketImpact.toLowerCase()} potential impact on crypto markets, particularly affecting major coins available on Philippine exchanges.`
      },
      sentiment: {
        overall: sentiment,
        confidence: confidence,
        reasoning: `AI sentiment analysis with ${confidence} confidence suggests ${sentiment.toLowerCase()} market sentiment based on article content and tone.`
      },
      keyTakeaways: takeaways.slice(0, 4),
      riskLevel: {
        level: riskLevel,
        description: `AI assessment shows ${riskLevel.toLowerCase()} risk level for Filipino crypto beginners. ${riskLevel === 'High' ? 'Exercise extra caution.' : riskLevel === 'Moderate' ? 'Standard crypto market risks apply.' : 'Relatively safer conditions for learning.'}`
      },
      recommendation: recommendation
    };
  };

  // Enhanced rule-based analysis (no API needed)
  const createEnhancedInsights = (article) => {
    const title = article.title.toLowerCase();
    const description = article.description.toLowerCase();
    const content = title + ' ' + description;
    
    // Advanced keyword analysis for crypto
    let sentiment = 'Neutral';
    let marketImpact = 'Low';
    let riskLevel = 'Moderate';
    let confidence = '70%';
    
    // Crypto-specific sentiment analysis
    const bullishIndicators = [
      'buy', 'bull', 'rise', 'surge', 'pump', 'adoption', 'institutional', 
      'etf', 'approved', 'breakout', 'rally', 'gain', 'up', 'growth',
      'investment', 'partnership', 'launch', 'upgrade', 'integration'
    ];
    
    const bearishIndicators = [
      'sell', 'bear', 'drop', 'crash', 'dump', 'regulation', 'ban', 
      'hack', 'decline', 'fall', 'down', 'loss', 'warning', 'risk',
      'lawsuit', 'probe', 'investigation', 'concerns', 'volatility'
    ];
    
    const highImpactKeywords = [
      'bitcoin', 'btc', 'ethereum', 'eth', 'federal reserve', 'sec', 
      'regulation', 'institutional', 'etf', 'binance', 'coinbase',
      'market', 'price', 'trillion', 'billion', 'major'
    ];
    
    // Philippine-specific context
    const philippineContext = [
      'philippines', 'filipino', 'peso', 'bsp', 'bangko sentral',
      'manila', 'sec philippines', 'pdax', 'coins.ph'
    ];
    
    // Calculate sentiment scores
    const bullishScore = bullishIndicators.reduce((score, word) => 
      content.includes(word) ? score + 1 : score, 0);
    const bearishScore = bearishIndicators.reduce((score, word) => 
      content.includes(word) ? score + 1 : score, 0);
    
    // Determine sentiment
    if (bullishScore > bearishScore + 1) {
      sentiment = 'Bullish';
      confidence = '75%';
    } else if (bearishScore > bullishScore + 1) {
      sentiment = 'Bearish';
      confidence = '75%';
    } else {
      sentiment = 'Neutral';
      confidence = bullishScore > 0 || bearishScore > 0 ? '65%' : '60%';
    }
    
    // Determine market impact
    const impactScore = highImpactKeywords.reduce((score, word) => 
      content.includes(word) ? score + 1 : score, 0);
    
    if (impactScore >= 3) {
      marketImpact = 'High';
    } else if (impactScore >= 1) {
      marketImpact = 'Moderate';
    }
    
    // Risk assessment
    if (content.includes('hack') || content.includes('scam') || content.includes('fraud')) {
      riskLevel = 'High';
    } else if (content.includes('regulation') || content.includes('volatility')) {
      riskLevel = 'Moderate';
    } else {
      riskLevel = 'Low';
    }
    
    // Generate contextual takeaways
    const takeaways = [];
    
    if (sentiment === 'Bullish') {
      takeaways.push('This positive news could support crypto price growth');
      takeaways.push('Good time to research and learn more about the mentioned cryptocurrencies');
    } else if (sentiment === 'Bearish') {
      takeaways.push('This news suggests caution in the crypto market');
      takeaways.push('Consider waiting for more stability before making investment decisions');
    } else {
      takeaways.push('Mixed signals suggest a wait-and-see approach may be prudent');
    }
    
    if (content.includes('bitcoin') || content.includes('btc')) {
      takeaways.push('Bitcoin movements often influence the entire crypto market');
    }
    
    if (content.includes('ethereum') || content.includes('eth')) {
      takeaways.push('Ethereum developments can impact DeFi and NFT sectors');
    }
    
    if (philippineContext.some(word => content.includes(word))) {
      takeaways.push('This news has specific relevance for Filipino crypto investors');
    } else {
      takeaways.push('Monitor how global crypto trends affect Philippine exchanges like PDAX and Coins.ph');
    }
    
    takeaways.push('Always practice peso-cost averaging and never invest more than you can afford to lose');
    
    // Generate recommendation
    let recommendation;
    if (sentiment === 'Bullish' && riskLevel === 'Low') {
      recommendation = 'Favorable conditions for learning about crypto investments. Consider starting small with peso-cost averaging.';
    } else if (sentiment === 'Bearish' || riskLevel === 'High') {
      recommendation = 'Exercise caution. Focus on education and wait for more stable market conditions before investing.';
    } else {
      recommendation = 'Stay informed and continue learning. This is a good time to research and understand market dynamics without rushing into investments.';
    }
    
    return {
      marketImpact: {
        level: marketImpact,
        description: `This news shows ${marketImpact.toLowerCase()} potential impact on Philippine crypto markets, particularly affecting major coins like Bitcoin and Ethereum available on local exchanges.`
      },
      sentiment: {
        overall: sentiment,
        confidence: confidence,
        reasoning: `Analysis of key terms suggests ${sentiment.toLowerCase()} sentiment based on ${bullishScore} positive and ${bearishScore} negative indicators in the article.`
      },
      keyTakeaways: takeaways.slice(0, 4), // Limit to 4 takeaways
      riskLevel: {
        level: riskLevel,
        description: `${riskLevel} risk level for Filipino crypto beginners. ${riskLevel === 'High' ? 'Exercise extra caution and consider professional advice.' : riskLevel === 'Moderate' ? 'Standard crypto market risks apply.' : 'Relatively safer conditions for learning and gradual investment.'}`
      },
      recommendation: recommendation
    };
  };

  // Modal handlers
  const openModal = async (article) => {
    setSelectedArticle(article);
    setIsModalOpen(true);
    setIsLoadingInsights(true);
    setInsights(null);
    setInsightsError(null);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open'); // Add this line


    // Generate or fetch cached insights
    try {
      const aiInsights = await generateInsights(article);
      setInsights(aiInsights);
    } catch (error) {
      console.error('Failed to get AI insights:', error);
      setInsightsError(error.message);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
    setIsLoadingInsights(false);
    setInsights(null);
    setInsightsError(null);
    
    // Restore body scroll
    
    document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open'); // Add this line

  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  // Cache functions
  const isCacheFresh = (cached) => {
    if (!cached || !cached.timestamp) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  };

  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  const setCachedData = (data) => {
    try {
      const cacheObject = {
        data: data,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Fetch news from multiple pages to get maximum articles
  const fetchAllNews = async () => {
    try {
      const cached = getCachedData();
      if (cached && isCacheFresh(cached)) {
        console.log('Loading from cache...');
        return cached.data;
      }

      console.log('Fetching fresh news from API...');
      
      let allArticles = [];
      const articlesPerRequest = 100; // Max allowed by NewsAPI
      
      // Fetch from NewsAPI - Very specific for Filipino crypto beginners
      const response = await fetch(
        `https://newsapi.org/v2/everything?` +
        `q=("bitcoin" OR "ethereum" OR "BTC" OR "ETH" OR "crypto price" OR "cryptocurrency market" OR "binance" OR "coinbase" OR "dogecoin" OR "solana" OR "cardano" OR "polygon" OR "chainlink" OR "avalanche" OR "crypto beginner" OR "how to buy crypto")&` +
        `sortBy=publishedAt&` +
        `pageSize=${articlesPerRequest}&` +
        `language=en&` +
        `domains=coindesk.com,cointelegraph.com,decrypt.co,cryptonews.com,bitcoin.com,bitcoinmagazine.com&` +
        `apiKey=${API_KEY}`
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('API rate limit exceeded. Using cached data if available.');
        }
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log(`Fetched ${data.articles?.length || 0} articles from API`);

      // Process articles
      if (data.articles && Array.isArray(data.articles)) {
        const validArticles = data.articles
          .filter((article) => {
            // Basic validation
            if (!article || 
                !article.title || 
                article.title === '[Removed]' ||
                !article.description ||
                article.description === '[Removed]' ||
                !article.url ||
                article.title.toLowerCase().includes('removed')) {
              return false;
            }

            // Very specific crypto validation for Filipino beginners
            const title = article.title.toLowerCase();
            const description = article.description.toLowerCase();
            const content = title + ' ' + description;
            
            // Top cryptocurrencies relevant for Filipino beginners
            const topCryptos = [
              // Major coins (Top 10)
              'bitcoin', 'btc', 'ethereum', 'eth', 'bnb', 'binance coin',
              'solana', 'sol', 'cardano', 'ada', 'dogecoin', 'doge',
              'polygon', 'matic', 'avalanche', 'avax', 'chainlink', 'link',
              
              // Popular in Philippines/SEA
              'binance', 'coinbase', 'crypto.com', 
              
              // Beginner-friendly terms
              'crypto beginner', 'how to buy', 'crypto guide', 'crypto tutorial',
              'crypto investment', 'cryptocurrency explained', 'crypto basics',
              'crypto trading', 'crypto wallet', 'crypto exchange',
              
              // Market terms beginners need
              'crypto price', 'crypto market', 'bitcoin price', 'ethereum price',
              'crypto news', 'cryptocurrency market', 'crypto analysis',
              'crypto prediction', 'bull market', 'bear market'
            ];

            const hasRelevantCrypto = topCryptos.some(term => content.includes(term));
            
            // Exclude complex/advanced topics not suitable for beginners
            const advancedTerms = [
              'defi', 'yield farming', 'liquidity mining', 'dao', 'governance token',
              'smart contract audit', 'flash loan', 'arbitrage', 'mev',
              'layer 2 scaling', 'zk-rollup', 'optimistic rollup', 'sharding',
              'consensus mechanism', 'proof of stake validator', 'slashing',
              'impermanent loss', 'options trading', 'futures', 'derivatives',
              'algorithmic trading', 'technical analysis', 'fibonacci retracement'
            ];

            // Exclude scam/risky topics
            const scamTerms = [
              'memecoin', 'shitcoin', 'pump and dump', 'rugpull', 'rug pull',
              'ponzi', 'pyramid scheme', 'get rich quick', 'guaranteed profit',
              'meme coin', 'shiba inu', 'pepe', 'floki', 'safemoon'
            ];

            // Exclude overly technical blockchain development
            const techTerms = [
              'blockchain development', 'smart contract development', 'web3 development',
              'solidity', 'rust programming', 'substrate', 'cosmos sdk',
              'ethereum virtual machine', 'evm', 'gas optimization'
            ];

            const hasAdvancedTerm = advancedTerms.some(term => content.includes(term));
            const hasScamTerm = scamTerms.some(term => content.includes(term));
            const hasTechTerm = techTerms.some(term => content.includes(term));
            
            // Additional quality checks
            const hasGoodTitle = title.length > 10 && title.length < 200;
            const hasGoodDescription = description.length > 50;

            return hasRelevantCrypto && 
                   !hasAdvancedTerm && 
                   !hasScamTerm && 
                   !hasTechTerm &&
                   hasGoodTitle && 
                   hasGoodDescription;
          })
          .map((article, index) => ({
            id: `${Date.now()}-${index}`,
            title: article.title.trim(),
            description: article.description.trim(),
            url: article.url,
            imageUrl: processArticleImage(article), // Use enhanced image processing
            publishedAt: article.publishedAt,
            source: article.source?.name || 'Unknown',
            author: article.author || 'Unknown Author'
          }))
          .slice(0, MAX_ARTICLES); // Limit to MAX_ARTICLES

        allArticles = validArticles;
      }

      console.log(`Processed ${allArticles.length} valid articles`);
      
      // Cache the results
      setCachedData(allArticles);
      return allArticles;

    } catch (error) {
      console.error('Fetch error:', error);
      
      // Try to use stale cache if API fails
      const cached = getCachedData();
      if (cached && cached.data) {
        console.log('API failed, using stale cache...');
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
      document.querySelector('.news-header')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
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
          setError('No articles found');
        }
      } catch (err) {
        setError(err.message);
        
        // Try cached data as fallback
        const cached = getCachedData();
        if (cached && cached.data) {
          setAllNews(cached.data);
          updateDisplayedNews(cached.data, 1);
          setError(`API Error: ${err.message}. Showing cached data from ${new Date(cached.timestamp).toLocaleString()}`);
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

  if (loading) {
    return (
      <section className="news-container">
        <div className="news-header">
          <h2 className="news-title">Cryptocurrency News</h2>
          <div className="loading-container">
            <div className="crypto-loader">
              <div className="crypto-symbol btc">₿</div>
              <div className="crypto-symbol eth">Ξ</div>
              <div className="crypto-symbol bnb">⬡</div>
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
            <button onClick={refreshNews} className="btn-refresh" disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
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
                  loading={index < 6 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    console.log('Image failed to load:', article.imageUrl);
                    // Replace with dynamic placeholder
                    const placeholder = generatePlaceholderImage(article);
                    const imageContainer = e.target.closest('.news-image');
                    imageContainer.innerHTML = `
                      <div class="news-image-placeholder" style="background: ${placeholder.gradient}">
                        <div class="placeholder-content">
                          <span class="crypto-icon">${placeholder.icon}</span>
                          <span class="source-name">${article.source}</span>
                        </div>
                      </div>
                    `;
                  }}
                  onLoad={(e) => {
                    // Ensure image loaded successfully
                    if (e.target.naturalWidth === 0) {
                      const placeholder = generatePlaceholderImage(article);
                      const imageContainer = e.target.closest('.news-image');
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
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="news-image">
                <div 
                  className="news-image-placeholder" 
                  style={{background: generatePlaceholderImage(article).gradient}}
                >
                  <div className="placeholder-content">
                    <span className="crypto-icon">{generatePlaceholderImage(article).icon}</span>
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
                
                <p className="news-description">
                  {article.description}
                </p>
                
                <div className="news-meta">
                  <div className="news-source">
                    <span className="source-name">{article.source}</span>
                    {article.author !== 'Unknown Author' && (
                      <span className="author">by {article.author}</span>
                    )}
                  </div>
                  <time className="news-date" dateTime={article.publishedAt}>
                    {new Date(article.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
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
              const isVisible = pageNum === 1 || 
                               pageNum === totalPages || 
                               Math.abs(pageNum - currentPage) <= 2;
              
              if (!isVisible && pageNum !== 2 && pageNum !== totalPages - 1) {
                return null;
              }
              
              if ((pageNum === 2 && currentPage > 4) || 
                  (pageNum === totalPages - 1 && currentPage < totalPages - 3)) {
                return <span key={pageNum} className="pagination-ellipsis">...</span>;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isLoadingMore}
                  className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
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
          Articles are cached for 30 minutes to optimize API usage • 
          Last updated: {getCachedData()?.timestamp ? 
            new Date(getCachedData().timestamp).toLocaleString() : 'Just now'}
        </p>
      </div>

      {/* AI Insights Modal */}
      {isModalOpen && (
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
                  <p>Our Hugging Face AI is processing the news and generating personalized insights.</p>
                  <div className="loading-steps">
                    <div className="step">Running sentiment analysis...</div>
                    <div className="step">Analyzing market impact...</div>
                    <div className="step">Generating recommendations...</div>
                  </div>
                  <div className="api-status">
                    <small>Using AI models: RoBERTa Sentiment + BART Summarization</small>
                  </div>
                </div>
              ) : insightsError ? (
                <div className="insights-error">
                  <div className="error-icon">⚠️</div>
                  <h4>AI Analysis Unavailable</h4>
                  <p>We couldn't generate AI insights right now. This might be due to:</p>
                  <ul>
                    <li>Daily API limit reached (1000 requests/day)</li>
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
                    <button 
                      className="btn-fallback"
                      onClick={() => {
                        setInsights(createEnhancedInsights(selectedArticle));
                        setInsightsError(null);
                      }}
                    >
                      Use Basic Analysis
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
                        {new Date(selectedArticle.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="ai-badge">AI Powered</span>
                    </div>
                  </div>

                  <div className="insights-grid">
                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">📊</span>
                        <h5>AI Market Impact</h5>
                      </div>
                      <div className={`impact-badge ${insights.marketImpact.level.toLowerCase()}`}>
                        {insights.marketImpact.level} Impact
                      </div>
                      <p>{insights.marketImpact.description}</p>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">💭</span>
                        <h5>AI Sentiment Analysis</h5>
                      </div>
                      <div className={`sentiment-badge ${insights.sentiment.overall.toLowerCase()}`}>
                        {insights.sentiment.overall}
                        <span className="confidence">({insights.sentiment.confidence} confidence)</span>
                      </div>
                      <p>{insights.sentiment.reasoning}</p>
                    </div>

                    <div className="insight-card full-width">
                      <div className="insight-header">
                        <span className="insight-icon">🎯</span>
                        <h5>AI-Generated Insights for Filipino Beginners</h5>
                      </div>
                      <ul className="takeaways-list">
                        {insights.keyTakeaways.map((takeaway, index) => (
                          <li key={index}>{takeaway}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">⚠️</span>
                        <h5>AI Risk Assessment</h5>
                      </div>
                      <div className={`risk-badge ${insights.riskLevel.level.toLowerCase()}`}>
                        {insights.riskLevel.level} Risk
                      </div>
                      <p>{insights.riskLevel.description}</p>
                    </div>

                    <div className="insight-card">
                      <div className="insight-header">
                        <span className="insight-icon">💡</span>
                        <h5>AI Recommendation</h5>
                      </div>
                      <p className="recommendation">{insights.recommendation}</p>
                    </div>
                  </div>

                  <div className="ai-info">
                    <div className="ai-models-used">
                      <h6>AI Models Used:</h6>
                      <div className="model-tags">
                        <span className="model-tag">RoBERTa Sentiment Analysis</span>
                        <span className="model-tag">BART Text Summarization</span>
                        <span className="model-tag">Custom Crypto Logic</span>
                      </div>
                    </div>
                  </div>

                  <div className="disclaimer">
                    <p><strong>AI Disclaimer:</strong> This analysis is generated by AI models and rule-based systems for educational purposes only. It should not be considered as financial advice. Always do your own research and consult with financial professionals before making investment decisions.</p>
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