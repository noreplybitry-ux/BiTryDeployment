// File: scripts/collect-news.js
// Run with: node scripts/collect-news.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function fetchCryptoNews() {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  
  if (!NEWS_API_KEY) {
    console.log('🔑 Get a free API key from: https://newsapi.org/register');
    throw new Error('NEWS_API_KEY not found in environment variables');
  }

  console.log('📡 Fetching crypto news...');
  
  const compact = ['cryptocurrency market','bitcoin price','ethereum price','crypto trading','blockchain news'];
  const q = compact.map(t => `"${t.replace(/"/g,'\\"')}"`).join(' OR ');
  const domains = 'coindesk.com,cointelegraph.com,decrypt.co,theblock.co,bitcoinmagazine.com,cryptonews.com';
  const response = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&domains=${encodeURIComponent(domains)}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${NEWS_API_KEY}`
  );
  
  if (!response.ok) {
    throw new Error(`NewsAPI error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Filter and format articles
  return data.articles
    .filter(article => 
      article.title && 
      article.url && 
      !article.title.includes('[Removed]') &&
      !article.url.includes('removed.com')
    )
    .map(article => ({
      title: article.title,
      description: article.description || 'No description available',
      url: article.url,
      image: article.urlToImage,
      date: article.publishedAt,
      source: article.source?.name || 'Unknown',
      author: article.author || 'Unknown Author'
    }));
}

async function fetchCoinTelegraphRSS() {
  try {
    console.log('📰 Fetching from Cointelegraph RSS...');
    
    const response = await fetch('https://cointelegraph.com/rss');
    const rssText = await response.text();
    
    // Simple RSS parsing - extract basic info
    const items = rssText.match(/<item>([\s\S]*?)<\/item>/g) || [];
    
    return items.slice(0, 15).map((item, index) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                   item.match(/<title>(.*?)<\/title>/)?.[1] || `Cointelegraph News ${index + 1}`;
      
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || 
                         item.match(/<description>(.*?)<\/description>/)?.[1] || 'No description';
      
      const url = item.match(/<link>(.*?)<\/link>/)?.[1] || '#';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
      
      return {
        title: title.trim(),
        description: description.trim().replace(/<[^>]*>/g, '').substring(0, 500),
        url: url.trim(),
        image: null,
        date: new Date(pubDate).toISOString(),
        source: 'Cointelegraph',
        author: 'Cointelegraph Team'
      };
    });
    
  } catch (error) {
    console.error('Cointelegraph RSS error:', error);
    return [];
  }
}

async function storeArticles(articles) {
  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;
  
  console.log(`💾 Storing ${articles.length} articles in Supabase...`);
  
  for (const article of articles) {
    try {
      // Check if article already exists
      const { data: existing, error: checkError } = await supabase
        .from('news_articles')
        .select('id')
        .eq('url', article.url)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing article:', checkError);
        errorCount++;
        continue;
      }
      
      if (existing) {
        duplicateCount++;
        continue;
      }
      
      // Insert new article
      const { error } = await supabase
        .from('news_articles')
        .insert(article);
      
      if (error) {
        console.error('Insert error:', error.message);
        errorCount++;
      } else {
        successCount++;
        console.log(`✅ Stored: ${article.title.substring(0, 60)}...`);
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      errorCount++;
    }
  }
  
  return { successCount, errorCount, duplicateCount };
}

async function main() {
  try {
    console.log('🚀 Starting crypto news collection...');
    console.log('📅 Time:', new Date().toISOString());
    
    const allArticles = [];
    
    // Fetch from NewsAPI
    try {
      const newsApiArticles = await fetchCryptoNews();
      allArticles.push(...newsApiArticles);
      console.log(`📊 NewsAPI: ${newsApiArticles.length} articles`);
    } catch (error) {
      console.error('❌ NewsAPI failed:', error.message);
    }
    
    // Fetch from RSS feeds
    try {
      const rssArticles = await fetchCoinTelegraphRSS();
      allArticles.push(...rssArticles);
      console.log(`📰 RSS: ${rssArticles.length} articles`);
    } catch (error) {
      console.error('❌ RSS failed:', error.message);
    }
    
    if (allArticles.length === 0) {
      console.log('❌ No articles fetched from any source');
      process.exit(1);
    }
    
    // Remove duplicates
    const uniqueArticles = allArticles.filter((article, index, self) =>
      index === self.findIndex(a => a.url === article.url)
    );
    
    console.log(`🔄 Processing ${uniqueArticles.length} unique articles...`);
    
    // Store articles
    const result = await storeArticles(uniqueArticles);
    
    console.log('\n📈 Results:');
    console.log(`✅ Successfully stored: ${result.successCount}`);
    console.log(`🔄 Duplicates skipped: ${result.duplicateCount}`);
    console.log(`❌ Errors: ${result.errorCount}`);
    console.log('🎉 News collection completed!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}