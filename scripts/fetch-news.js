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

async function fetchNews() {
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", "crypto OR bitcoin OR ethereum OR cryptocurrency");
  url.searchParams.set("language", "en");
  url.searchParams.set("pageSize", "50");
  url.searchParams.set("sortBy", "publishedAt");

  const resp = await fetch(url.toString(), {
    headers: { "X-Api-Key": NEWS_API_KEY }
  });

  if (!resp.ok) {
    throw new Error(`NewsAPI fetch failed: ${resp.status} ${resp.statusText}`);
  }
  return await resp.json();
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
  const topCryptos = [
    "bitcoin","btc","ethereum","eth","bnb","binance coin","solana","sol",
    "cardano","ada","dogecoin","doge","polygon","matic","avalanche","avax",
    "chainlink","link","coinbase","crypto","crypto.com","pdax","coins.ph","crypto beginner",
    "how to buy","crypto guide","crypto tutorial","crypto investment",
    "cryptocurrency explained","crypto basics","crypto trading","crypto wallet",
    "crypto exchange","crypto price","crypto market","bitcoin price",
    "ethereum price","crypto news","cryptocurrency market","crypto analysis"
  ];

  const advancedTerms = [
    "defi","yield farming","liquidity mining","dao","governance token",
    "smart contract audit","flash loan","arbitrage","mev","layer 2","zk-rollup",
    "optimistic rollup","sharding","consensus mechanism","proof of stake validator",
    "slashing","impermanent loss","options trading","futures","derivatives",
    "technical analysis","fibonacci"
  ];

  const scamTerms = [
    "memecoin","shitcoin","pump and dump","rugpull","rug pull","ponzi",
    "pyramid scheme","get rich quick","guaranteed profit","meme coin"
  ];

  const techTerms = [
    "blockchain development","smart contract development","web3 development",
    "solidity","rust programming","substrate","cosmos sdk","ethereum virtual machine",
    "evm","gas optimization"
  ];

  function hasAny(list, text) {
    return list.some(term => text.includes(term));
  }

  const filtered = articles.filter(a => {
    if (!a) return false;
    const title = (a.title || "").toLowerCase();
    const description = (a.description || "").toLowerCase();
    const content = (title + " " + description).toLowerCase();

    if (!title || !description) return false;
    if (title === "[removed]" || description === "[removed]") return false;
    if (title.includes("removed")) return false;
    if (title.length <= 10 || title.length > 200) return false;
    if (description.length <= 50) return false;

    const isRelevant = hasAny(topCryptos, content);
    const hasAdvanced = hasAny(advancedTerms, content);
    const hasScam = hasAny(scamTerms, content);
    const hasTech = hasAny(techTerms, content);

    return isRelevant && !hasAdvanced && !hasScam && !hasTech;
  });

  // Keep original article objects for maximum data; you may map to a smaller schema if preferred.
  return {
    status: raw.status || "ok",
    totalResults: filtered.length,
    articles: filtered
  };
}

(async () => {
  try {
    const data = await fetchNews();

    // Full wrapped payload for public
    const publicPayload = {
      timestamp: new Date().toISOString(),
      data
    };
    const publicSerialized = JSON.stringify(publicPayload, null, 2) + "\n";

    // Crypto-filtered payload for api/news_cache.json (NewsAPI-shaped)
    const filtered = filterCryptoArticles(data);
    const apiPayload = {
      timestamp: new Date().toISOString(),
      data: filtered
    };
    const apiSerialized = JSON.stringify(apiPayload, null, 2) + "\n";

    // Determine what changed; write only changed files
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
      // Ensure api directory exists (should already)
      try {
        await fs.mkdir(path.dirname(OUT_API), { recursive: true });
      } catch (e) {}
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