// scripts/fetch-news.js (CommonJS)
// Fetch full NewsAPI response, write public/news_cache.json,
// and write a filtered crypto-only payload to api/news_cache.json
const fs = require("fs").promises;
const path = require("path");

const NEWS_API_KEY = process.env.NEWS_API_KEY;
if (!NEWS_API_KEY) {
  console.error("ERROR: NEWS_API_KEY environment variable is required.");
  process.exit(2);
}

const OUT_PUBLIC = path.join(process.cwd(), "public", "news_cache.json");
const TMP_PUBLIC = OUT_PUBLIC + ".tmp";
const OUT_API = path.join(process.cwd(), "api", "news_cache.json");
const TMP_API = OUT_API + ".tmp";

// Unified query terms (keeps same terms used by server)
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

const PAGE_SIZE = 50;
const CACHE_VERSION = 3;

function buildQuery(terms) {
  return terms
    .map(t => (t.includes(" ") ? `"${t}"` : t))
    .join(" OR ");
}

async function fetchNews() {
  const SEARCH_QUERY = buildQuery(SEARCH_TERMS);
  // NewsAPI enforces 500 chars for q= — enforce that limit here
  const MAX_QUERY_LENGTH = 500;

  let queryToUse = SEARCH_QUERY;
  if (SEARCH_QUERY.length > MAX_QUERY_LENGTH) {
    console.warn(
      `Built query too long (${SEARCH_QUERY.length} chars). Falling back to compact query.`
    );
    // Compact fallback: keep a few high-signal tokens
    const compact = ["crypto", "bitcoin", "ethereum", "bnb", "solana", "dogecoin", "cardano"];
    queryToUse = buildQuery(compact);
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", queryToUse);
  url.searchParams.set("language", "en");
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("sortBy", "publishedAt");

  // Limit to curated crypto news publishers for higher precision
  if (CRYPTO_DOMAINS.length > 0) {
    url.searchParams.set("domains", CRYPTO_DOMAINS.join(","));
  }

  console.log("Fetching NewsAPI URL (q length):", queryToUse.length);

  const resp = await fetch(url.toString(), {
    headers: { "X-Api-Key": NEWS_API_KEY }
  });

  const bodyText = await resp.text().catch(() => null);
  let bodyJson = null;
  try { bodyJson = bodyText ? JSON.parse(bodyText) : null; } catch (e) { bodyJson = null; }

  if (!resp.ok) {
    console.error("NewsAPI returned non-OK:", resp.status, resp.statusText, bodyJson || bodyText);
    throw new Error(`NewsAPI fetch failed: ${resp.status} ${resp.statusText} - ${bodyJson?.message || bodyText || "no body"}`);
  }

  try {
    return bodyJson || JSON.parse(bodyText);
  } catch (e) {
    throw new Error("Failed to parse NewsAPI response JSON: " + (e.message || e));
  }
}

async function atomicWrite(filePath, tmpPath, obj) {
  const str = JSON.stringify(obj, null, 2) + "\n";
  await fs.writeFile(tmpPath, str, { encoding: "utf8" });
  await fs.rename(tmpPath, filePath);
}

async function fileEquals(filePath, contentStr) {
  try {
    const existing = await fs.readFile(filePath, "utf8");
    return existing === contentStr;
  } catch (err) {
    return false;
  }
}

// Filtering logic (same idea as client)
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

    // Hostname check
    let host = "";
    try { host = new URL(a.url).hostname || ""; } catch (e) { continue; }
    if (!CRYPTO_DOMAINS.some(d => host.includes(d))) continue;

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

// Restrict NewsAPI fetches to a curated list of reputable crypto news domains
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

(async () => {
  try {
    const data = await fetchNews();

    // Crypto-filtered payload (NewsAPI-shaped) for both public and api caches
    const filtered = filterCryptoArticles(data);

    const publicPayload = {
      version: CACHE_VERSION,
      timestamp: new Date().toISOString(),
      data: filtered
    };
    const publicSerialized = JSON.stringify(publicPayload, null, 2) + "\n";

    const apiPayload = {
      version: CACHE_VERSION,
      timestamp: new Date().toISOString(),
      data: filtered
    };
    const apiSerialized = JSON.stringify(apiPayload, null, 2) + "\n";

    const publicChanged = !(await fileEquals(OUT_PUBLIC, publicSerialized));
    const apiChanged = !(await fileEquals(OUT_API, apiSerialized));

    if (!publicChanged && !apiChanged) {
      console.log("No changes to news caches; exiting.");
      process.exit(0);
    }

    if (publicChanged) {
      await atomicWrite(OUT_PUBLIC, TMP_PUBLIC, publicPayload);
      console.log("Wrote updated news cache to", OUT_PUBLIC);
    } else {
      console.log("Public cache unchanged.");
    }

    if (apiChanged) {
      try { await fs.mkdir(path.dirname(OUT_API), { recursive: true }); } catch (e) {}
      await atomicWrite(OUT_API, TMP_API, apiPayload);
      console.log("Wrote filtered crypto cache to", OUT_API);
    } else {
      console.log("API cache unchanged.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Failed to fetch or write news cache:", err);
    process.exit(3);
  }
})();