import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "api", "news_cache.json");
const PUBLIC_CACHE_FILE = path.join(process.cwd(), "public", "news_cache.json");

async function atomicWrite(filePath, obj) {
  const tmp = filePath + ".tmp";
  const data = JSON.stringify(obj, null, 2);
  await fs.promises.writeFile(tmp, data, "utf8");
  await fs.promises.rename(tmp, filePath);
}

export default async function handler(req, res) {
  const apiKey = process.env.NEWS_API_KEY;
  const url = `https://newsapi.org/v2/everything?q=("bitcoin"%20OR%20"ethereum"%20OR%20"BTC"%20OR%20"ETH"%20OR%20"crypto%20price"%20OR%20"cryptocurrency%20market"%20OR%20"binance"%20OR%20"coinbase"%20OR%20"dogecoin"%20OR%20"solana"%20OR%20"cardano"%20OR%20"polygon"%20OR%20"chainlink"%20OR%20"avalanche"%20OR%20"crypto%20beginner"%20OR%20"how%20to%20buy%20crypto")&sortBy=publishedAt&pageSize=100&language=en&domains=coindesk.com,cointelegraph.com,decrypt.co,cryptonews.com,bitcoin.com,bitcoinmagazine.com&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }

    const data = await response.json();

    // Prepare cache object (timestamp + raw NewsAPI payload)
    const cacheObj = { timestamp: Date.now(), data };

    // Atomically write both server-side and public fallback (best-effort)
    (async () => {
      try {
        await Promise.all([
          atomicWrite(CACHE_FILE, cacheObj),
          atomicWrite(PUBLIC_CACHE_FILE, cacheObj),
        ]);
      } catch (writeErr) {
        console.error("Failed to write news caches:", writeErr);
      }
    })();

    return res.status(200).json(data);
  } catch (error) {
    console.error("News fetch failed:", error.message);

    // Try to serve cached data if available
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = await fs.promises.readFile(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);

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
    return res.status(500).json({ error: error.message });
  }
}