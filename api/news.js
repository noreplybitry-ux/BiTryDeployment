import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "api", "news_cache.json");
const PUBLIC_CACHE_FILE = path.join(process.cwd(), "public", "news_cache.json");

// Unified terms (match scripts/fetch-news.js)
const SEARCH_TERMS = [
  "bitcoin", "btc", "ethereum", "eth", "bnb", "binance coin",
  "solana", "sol", "cardano", "ada", "dogecoin", "doge",
  "polygon", "matic", "avalanche", "avax", "chainlink", "link",
  "coinbase", "crypto", "crypto.com", "pdax", "coins.ph",
  "crypto beginner", "how to buy", "crypto guide", "crypto tutorial",
  "crypto investment", "cryptocurrency explained", "crypto basics",
  "crypto trading", "crypto wallet", "crypto exchange", "crypto price",
  "crypto market", "bitcoin price", "ethereum price", "crypto news",
  "cryptocurrency market", "crypto analysis"
];

const PAGE_SIZE = 50;

function buildQuery(terms) {
  return terms.map(t => (t.includes(" ") ? `"${t}"` : t)).join(" OR ");
}

function compactQueryFallback() {
  const compact = ["crypto", "bitcoin", "ethereum", "bnb", "solana", "dogecoin", "cardano"];
  return buildQuery(compact);
}

async function atomicWrite(filePath, obj) {
  const tmp = filePath + ".tmp";
  const data = JSON.stringify(obj, null, 2);
  await fs.promises.writeFile(tmp, data, "utf8");
  await fs.promises.rename(tmp, filePath);
}

export default async function handler(req, res) {
  const apiKey = process.env.NEWS_API_KEY;
  let q = buildQuery(SEARCH_TERMS);

  // NewsAPI enforces a 500-character limit for the q= parameter
  const MAX_QUERY_LENGTH = 500;
  if (q.length > MAX_QUERY_LENGTH) {
    console.warn(`Built query too long (${q.length}), using compact fallback.`);
    q = compactQueryFallback();
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", q);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("language", "en");

  console.log("Fetching NewsAPI URL (q length):", q.length);

  try {
    const resp = await fetch(url.toString() + `&apiKey=${apiKey}`);
    const bodyText = await resp.text().catch(() => null);
    let bodyJson = null;
    try { bodyJson = bodyText ? JSON.parse(bodyText) : null; } catch (e) { bodyJson = null; }

    if (!resp.ok) {
      console.error("NewsAPI returned non-OK:", resp.status, resp.statusText, bodyJson || bodyText);
      throw new Error(`NewsAPI error: ${resp.status} - ${bodyJson?.message || bodyText || "no body"}`);
    }

    const data = bodyJson || JSON.parse(bodyText);

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

    // Mark response as live
    res.setHeader("X-News-Source", "live");
    res.setHeader("X-News-Cache-Timestamp", new Date().toISOString());

    return res.status(200).json(data);
  } catch (error) {
    console.error("News fetch failed:", error.message);

    // Prefer the server-side cache (api/news_cache.json) for fallback.
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = await fs.promises.readFile(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.timestamp) {
          res.setHeader("X-News-Source", "api-cache");
          res.setHeader("X-News-Cache-Timestamp", new Date(parsed.timestamp).toISOString());
          return res.status(200).json(parsed.data);
        }
      }

      // If api cache missing, fall back to public/news_cache.json
      if (fs.existsSync(PUBLIC_CACHE_FILE)) {
        const rawPub = await fs.promises.readFile(PUBLIC_CACHE_FILE, "utf8");
        const parsedPub = JSON.parse(rawPub);
        if (parsedPub && parsedPub.timestamp) {
          res.setHeader("X-News-Source", "public-cache");
          res.setHeader("X-News-Cache-Timestamp", new Date(parsedPub.timestamp).toISOString());
          return res.status(200).json(parsedPub.data);
        }
      }
    } catch (cacheErr) {
      console.error("Failed to read news cache:", cacheErr);
    }

    // No cache available — return error
    res.setHeader("X-News-Source", "none");
    return res.status(500).json({ error: error.message });
  }
}