import fs from "fs";
import path from "path";

// Default cache version (used when lib/newsFilter.cjs is unavailable)
const CACHE_VERSION = 3;
const CACHE_FILE = path.join(process.cwd(), "api", "news_cache.json");
const PUBLIC_CACHE_FILE = path.join(process.cwd(), "public", "news_cache.json");

function buildQuery(terms) {
  return terms.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(" OR ");
}

// Filtering logic is provided by the shared module `lib/newsFilter.cjs`.
// We import `filterCryptoArticles` above to ensure parity with the fetch script.

async function atomicWrite(filePath, obj) {
  const tmp = filePath + ".tmp";
  const data = JSON.stringify(obj, null, 2);
  await fs.promises.writeFile(tmp, data, "utf8");
  await fs.promises.rename(tmp, filePath);
}

export default async function handler(req, res) {
  const apiKey = process.env.REACT_APP_NEWS_API_KEY;

  // Lazy-load the news filter module to avoid top-level import/runtime crashes in serverless
  let PAGE_SIZE = 50;
  let SEARCH_TERMS = ["cryptocurrency market", "bitcoin price", "ethereum price"];
  let CRYPTO_DOMAINS = [];
  let filterCryptoArticles = (raw) => raw;

  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const nf = require(path.join(process.cwd(), "lib", "newsFilter.cjs"));
    PAGE_SIZE = nf.PAGE_SIZE || PAGE_SIZE;
    SEARCH_TERMS = nf.SEARCH_TERMS || SEARCH_TERMS;
    CRYPTO_DOMAINS = nf.CRYPTO_DOMAINS || CRYPTO_DOMAINS;
    filterCryptoArticles = nf.filterCryptoArticles || filterCryptoArticles;
  } catch (err) {
    console.error("Warning: failed to load lib/newsFilter.cjs — using permissive defaults:", err && err.message ? err.message : err);
  }

  let q = buildQuery(SEARCH_TERMS);

  // If API key is not configured, prefer serving from cache immediately
  if (!apiKey) {
    console.warn("NEWS_API_KEY not set — serving cache fallback if available.");
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = await fs.promises.readFile(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.timestamp) {
          res.setHeader("X-News-Source", "api-cache");
          res.setHeader(
            "X-News-Cache-Timestamp",
            new Date(parsed.timestamp).toISOString()
          );
          return res.status(200).json(parsed.data);
        }
      }

      if (fs.existsSync(PUBLIC_CACHE_FILE)) {
        const rawPub = await fs.promises.readFile(PUBLIC_CACHE_FILE, "utf8");
        const parsedPub = JSON.parse(rawPub);
        if (parsedPub && parsedPub.timestamp) {
          res.setHeader("X-News-Source", "public-cache");
          res.setHeader(
            "X-News-Cache-Timestamp",
            new Date(parsedPub.timestamp).toISOString()
          );
          return res.status(200).json(parsedPub.data);
        }
      }
    } catch (cacheErr) {
      console.error("Failed to read news cache while NEWS_API_KEY missing:", cacheErr);
    }

    return res.status(500).json({ error: "NEWS_API_KEY not configured and no cache available" });
  }

  // NewsAPI enforces a 500-character limit for q= — keep a compact fallback
  const MAX_QUERY_LENGTH = 500;
  if (q.length > MAX_QUERY_LENGTH) {
    console.warn(`Built query too long (${q.length}), using compact fallback.`);
    const compact = [
      "cryptocurrency market",
      "bitcoin price",
      "crypto exchange",
    ];
    q = buildQuery(compact);
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", q);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("language", "en");

  // COMMENT OUT: Remove domain restriction to allow broader sources
  // if (CRYPTO_DOMAINS.length > 0) {
  //   url.searchParams.set("domains", CRYPTO_DOMAINS.join(","));
  // }

  console.log("Fetching NewsAPI URL (q length):", q.length);

  try {
    const resp = await fetch(url.toString() + `&apiKey=${apiKey}`);
    const bodyText = await resp.text().catch(() => null);
    let bodyJson = null;
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch (e) {
      bodyJson = null;
    }

    if (!resp.ok) {
      console.error(
        "NewsAPI returned non-OK:",
        resp.status,
        resp.statusText,
        bodyJson || bodyText
      );

      // Try to serve cached data if NewsAPI fails
      try {
        if (fs.existsSync(CACHE_FILE)) {
          const raw = await fs.promises.readFile(CACHE_FILE, "utf8");
          const parsed = JSON.parse(raw);
          if (parsed && parsed.timestamp && parsed.data) {
            res.setHeader("X-News-Source", "api-cache");
            res.setHeader(
              "X-News-Cache-Timestamp",
              new Date(parsed.timestamp).toISOString()
            );
            return res.status(200).json(parsed.data);
          }
        }

        if (fs.existsSync(PUBLIC_CACHE_FILE)) {
          const rawPub = await fs.promises.readFile(PUBLIC_CACHE_FILE, "utf8");
          const parsedPub = JSON.parse(rawPub);
          if (parsedPub && parsedPub.timestamp && parsedPub.data) {
            res.setHeader("X-News-Source", "public-cache");
            res.setHeader(
              "X-News-Cache-Timestamp",
              new Date(parsedPub.timestamp).toISOString()
            );
            return res.status(200).json(parsedPub.data);
          }
        }
      } catch (cacheErr) {
        console.error("Error reading cache after NewsAPI failure:", cacheErr);
      }

      // Nothing to fall back to — propagate error so outer catch can try other caches
      throw new Error(
        `NewsAPI error: ${resp.status} - ${
          bodyJson?.message || bodyText || "no body"
        }`
      );
    }

    // Filter the live NewsAPI payload for crypto relevance before caching/returning
    const rawData = bodyJson || (bodyText ? JSON.parse(bodyText) : null);
    const filteredData = filterCryptoArticles(rawData);

    const cacheObj = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      data: filteredData,
    };

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

    // Mark response as live (but filtered)
    res.setHeader("X-News-Source", "live-filtered");
    res.setHeader("X-News-Cache-Timestamp", new Date().toISOString());
    return res.status(200).json(filteredData);
  } catch (error) {
    console.error("News fetch failed:", error.message);

    // Prefer the server-side cache (api/news_cache.json) for fallback.
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = await fs.promises.readFile(CACHE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.timestamp) {
          res.setHeader("X-News-Source", "api-cache");
          res.setHeader(
            "X-News-Cache-Timestamp",
            new Date(parsed.timestamp).toISOString()
          );
          return res.status(200).json(parsed.data);
        }
      }

      // If api cache missing, fall back to public/news_cache.json
      if (fs.existsSync(PUBLIC_CACHE_FILE)) {
        const rawPub = await fs.promises.readFile(PUBLIC_CACHE_FILE, "utf8");
        const parsedPub = JSON.parse(rawPub);
        if (parsedPub && parsedPub.timestamp) {
          res.setHeader("X-News-Source", "public-cache");
          res.setHeader(
            "X-News-Cache-Timestamp",
            new Date(parsedPub.timestamp).toISOString()
          );
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
