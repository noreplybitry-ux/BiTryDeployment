import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "api", "news_cache.json");
const PUBLIC_CACHE_FILE = path.join(process.cwd(), "public", "news_cache.json");

// Stronger, more specific search phrases (smaller, higher-signal list)
const SEARCH_TERMS = [
  "cryptocurrency market",
  "bitcoin price",
  "ethereum price",
  "crypto trading",
  "crypto investment",
  "blockchain news",
  "digital currency",
  "crypto exchange"
];

// Optionally restrict to well-known crypto domains to reduce noise
const CRYPTO_DOMAINS = [
  "coindesk.com",
  "cointelegraph.com",
  "decrypt.co",
  "theblock.co",
  "bitcoinmagazine.com",
  "newsbtc.com",
  "cryptonews.com",
  "coinjournal.net",
  "coinspeaker.com"
];

const PAGE_SIZE = 50;
const CACHE_VERSION = 3;

function buildQuery(terms) {
  return terms.map(t => `"${t.replace(/"/g, '\\"')}"`).join(" OR ");
}

// Same filtering function used by the fetch script
function filterCryptoArticles(raw) {
  const articles = Array.isArray(raw.articles) ? raw.articles : [];

  const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const wordMatch = (text, term) => {
    if (!text || !term) return false;
    try {
      const re = new RegExp("\\b" + escapeRegex(term) + "\\b", "i");
      return re.test(text);
    } catch (e) {
      return text.includes(term);
    }
  };
  const normalize = (s) => String(s || "").toLowerCase().replace(/[\n\r\t]+/g, " ").replace(/[^\w\s\-\.]/g, " ").trim();

  const REPUTABLE_DOMAINS = CRYPTO_DOMAINS.slice();
  const irrelevantTerms = [
    "casino","casinos","gambling",
    "nba","nfl","nhl","mlb","fifa","soccer","basketball","football",
    "sports","game schedule","playoffs","cup","miami heat","lakers","yankees",
    "movie","tv show","python","python package","pypi","pip","django","flask",
    "python library","node package","npm package","software release","github.com/","github release",
    "python 3","java library","javascript framework"
  ];

  const advancedTerms = ["defi","yield farming","liquidity mining","dao","governance token","smart contract audit","flash loan","arbitrage","mev","layer 2","zk-rollup","optimistic rollup","sharding","consensus mechanism","proof of stake validator","slashing","impermanent loss","options trading","futures","derivatives","technical analysis","fibonacci"];
  const scamTerms = ["memecoin","shitcoin","pump and dump","rugpull","rug pull","ponzi","pyramid scheme","get rich quick","guaranteed profit","meme coin","shiba inu","pepe","floki","safemoon"];
  const techTerms = ["blockchain development","smart contract development","web3 development","solidity","rust programming","substrate","cosmos sdk","ethereum virtual machine","evm","gas optimization"];

  const topCryptos = [
    "cryptocurrency","bitcoin","btc","ethereum","eth","bnb","binance","binance coin",
    "solana","sol","cardano","ada","dogecoin","doge","polygon","matic",
    "avalanche","avax","chainlink","link","coinbase","crypto.com","pdax","coins.ph",
    "crypto","cryptocurrency","crypto market","crypto price","crypto trading","crypto exchange"
  ];

  const filtered = [];
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    if (!a) continue;
    const titleRaw = a.title || "";
    const descRaw = a.description || "";
    const title = titleRaw.trim();
    const description = descRaw.trim();
    if (!title || !description) continue;
    if (title === "[removed]" || description === "[removed]") continue;
    if (title.toLowerCase().includes("removed")) continue;
    if (title.length <= 10 || title.length > 200) continue;
    if (description.length <= 50) continue;

    // Hostname check against reputable domains
    let host = "";
    try { host = new URL(a.url).hostname || ""; } catch (e) { continue; }
    if (!REPUTABLE_DOMAINS.some(d => host.includes(d))) continue;

    const titleLower = normalize(title);
    const descriptionLower = normalize(description);
    const contentLower = normalize((a.content || "") + " " + titleLower + " " + descriptionLower);

    if (irrelevantTerms.some(t => wordMatch(contentLower, t))) continue;

    const cryptoMatches = topCryptos.reduce((c, t) => c + (wordMatch(contentLower, t) ? 1 : 0), 0);
    const titleHasCrypto = topCryptos.some(t => wordMatch(titleLower, t));
    if (cryptoMatches < 2 || !titleHasCrypto) continue;

    if (advancedTerms.some(t => wordMatch(contentLower, t))) continue;
    if (scamTerms.some(t => wordMatch(contentLower, t))) continue;
    if (techTerms.some(t => wordMatch(contentLower, t))) continue;

    filtered.push(a);
    if (filtered.length >= PAGE_SIZE) break;
  }

  return {
    status: raw.status || "ok",
    totalResults: filtered.length,
    articles: filtered
  };
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

  // NewsAPI enforces a 500-character limit for q= — keep a compact fallback
  const MAX_QUERY_LENGTH = 500;
  if (q.length > MAX_QUERY_LENGTH) {
    console.warn(`Built query too long (${q.length}), using compact fallback.`);
    const compact = ["cryptocurrency market", "bitcoin price", "crypto exchange"];
    q = buildQuery(compact);
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", q);
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("language", "en");

  // Add domains filter to concentrate on crypto publishers for higher precision
  if (CRYPTO_DOMAINS.length > 0) {
    url.searchParams.set("domains", CRYPTO_DOMAINS.join(","));
  }

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

    // Filter the live NewsAPI payload for crypto relevance before caching/returning
    const rawData = bodyJson || (bodyText ? JSON.parse(bodyText) : null);
    const filteredData = filterCryptoArticles(rawData);

    const cacheObj = { version: CACHE_VERSION, timestamp: Date.now(), data: filteredData };

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