import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "api", "news_cache.json");
const PUBLIC_CACHE_FILE = path.join(process.cwd(), "public", "news_cache.json");

// Unified terms must match the fetch script
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
  const MAX_QUERY_LENGTH = 1000;
  if (q.length > MAX_QUERY_LENGTH) {
    console.warn(`Built query too long (${q.length}), using compact fallback.`);
    q = compactQueryFallback();
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", q);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("language", "en");

  console.log("Fetching NewsAPI URL:", url.toString().slice(0, 1000));

  try {
    const resp = await fetch(url.toString() + `&apiKey=${apiKey}`);
    const bodyText = await resp.text().catch(() => null);
    let bodyJson = null;
    try { bodyJson = bodyText ? JSON.parse(bodyText) : null; } catch(e){ bodyJson = null; }

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

    return res.status(200).json(data);
  } catch (error) {
    console.error("News fetch failed:", error.message);

    // Try to serve cached data if available (prefer newest between api and public cache)
    try {
      const candidates = [];
      if (fs.existsSync(CACHE_FILE)) {
        const raw1 = await fs.promises.readFile(CACHE_FILE, "utf8");
        const parsed1 = JSON.parse(raw1);
        if (parsed1 && parsed1.timestamp) candidates.push(parsed1);
      }
      if (fs.existsSync(PUBLIC_CACHE_FILE)) {
        const raw2 = await fs.promises.readFile(PUBLIC_CACHE_FILE, "utf8");
        const parsed2 = JSON.parse(raw2);
        if (parsed2 && parsed2.timestamp) candidates.push(parsed2);
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const chosen = candidates[0];
        if (chosen && chosen.timestamp) {
          res.setHeader("X-News-Cache-Timestamp", new Date(chosen.timestamp).toISOString());
        }
        return res.status(200).json(chosen.data);
      }
    } catch (cacheErr) {
      console.error("Failed to read news cache:", cacheErr);
    }

    // No cache available — return error
    return res.status(500).json({ error: error.message });
  }
}