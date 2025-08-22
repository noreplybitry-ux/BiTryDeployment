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

  // Configuration
  const ARTICLES_PER_PAGE = 12;
  const MAX_ARTICLES = 100; // NewsAPI free tier allows up to 100
  const CACHE_KEY = 'bitry_crypto_news';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  const API_KEY = 'eca0ba3938154abd9d66d996cfa36459';

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
            imageUrl: article.urlToImage,
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

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    console.log('Cache cleared');
    window.location.reload();
  };

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
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading latest crypto news...</p>
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
              <button onClick={clearCache} className="btn-secondary">
                Clear Cache
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
          Latest news on Bitcoin, Ethereum, and top cryptocurrencies for Filipino beginners
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
            <button onClick={clearCache} className="btn-clear">
              Clear Cache
            </button>
          </div>
        </div>
      </div>

      {isLoadingMore && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        </div>
      )}

      <div className="news-grid">
        {displayedNews.map((article, index) => (
          <article key={article.id} className="news-card">
            {article.imageUrl && (
              <div className="news-image">
                <img 
                  src={article.imageUrl} 
                  alt={article.title}
                  loading={index < 6 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    e.target.closest('.news-image').style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <div className="news-content">
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
    </section>
  );
}