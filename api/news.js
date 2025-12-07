import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "api", "news_cache.json");

export default async function handler(req, res) {
  const apiKey = process.env.NEWS_API_KEY; // Securely from env vars
  const url = `https://newsapi.org/v2/everything?q=("bitcoin"%20OR%20"ethereum"%20OR%20"BTC"%20OR%20"ETH"%20OR%20"crypto%20price"%20OR%20"cryptocurrency%20market"%20OR%20"binance"%20OR%20"coinbase"%20OR%20"dogecoin"%20OR%20"solana"%20OR%20"cardano"%20OR%20"polygon"%20OR%20"chainlink"%20OR%20"avalanche"%20OR%20"crypto%20beginner"%20OR%20"how%20to%20buy%20crypto")&sortBy=publishedAt&pageSize=100&language=en&domains=coindesk.com,cointelegraph.com,decrypt.co,cryptonews.com,bitcoin.com,bitcoinmagazine.com&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();

    // Write a server-side cache of the successful response so we can serve it on failures.
    (async () => {
      try {
        const cacheObj = { timestamp: Date.now(), data };
        await fs.promises.writeFile(CACHE_FILE, JSON.stringify(cacheObj), "utf8");
      } catch (writeErr) {
        console.error("Failed to write news cache:", writeErr);
      }
    })();

    res.status(200).json(data);
  } catch (error) {
    console.error("News fetch failed:", error.message);

    // Try to serve cached data if available
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = await fs.promises.readFile(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);

        // Expose cache timestamp as a header for debugging/visibility
        if (parsed && parsed.timestamp) {
          res.setHeader("X-News-Cache-Timestamp", new Date(parsed.timestamp).toISOString());
        }

        // Return cached NewsAPI-shaped payload so frontend needs no change
        return res.status(200).json(parsed.data);
      }
    } catch (cacheErr) {
      console.error("Failed to read news cache:", cacheErr);
    }

    // No cache available — return error
    res.status(500).json({ error: error.message });
  }
}