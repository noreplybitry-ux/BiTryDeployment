// Shared CommonJS news filtering utilities and constants
const PAGE_SIZE = 50;
const CACHE_VERSION = 3;
const SEARCH_TERMS = [
  "cryptocurrency market",
  "bitcoin price",
  "ethereum price",
  "crypto trading",
  "crypto investment",
  "blockchain news",
  "digital currency",
  "crypto exchange",
];
const CRYPTO_DOMAINS = [
  "coindesk.com",
  "cointelegraph.com",
  "decrypt.co",
  "theblock.co",
  "bitcoinmagazine.com",
  "newsbtc.com",
  "cryptonews.com",
  "coinjournal.net",
  "coinspeaker.com",
];

function escapeRegex(s) {
  return String(s || "").replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function wordMatch(text, term) {
  if (!text || !term) return false;
  try {
    const re = new RegExp("\\b" + escapeRegex(term) + "\\b", "i");
    return re.test(text);
  } catch (e) {
    return String(text).toLowerCase().includes(String(term).toLowerCase());
  }
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\n\r\t]+/g, " ")
    .replace(/[^\w\s\-\.]/g, " ")
    .trim();
}

function filterCryptoArticles(raw) {
  const articles = Array.isArray(raw.articles) ? raw.articles : [];
  const irrelevantTerms = [
    "casino",
    "casinos",
    "gambling",
    "nba",
    "nfl",
    "nhl",
    "mlb",
    "fifa",
    "soccer",
    "basketball",
    "football",
    "sports",
    "game schedule",
    "playoffs",
    "cup",
    "miami heat",
    "lakers",
    "yankees",
    "movie",
    "tv show",
    "python",
    "python package",
    "pypi",
    "pip",
    "django",
    "flask",
    "python library",
    "node package",
    "npm package",
    "software release",
    "github.com/",
    "github release",
    "python 3",
    "java library",
    "javascript framework",
    "rocket",
    "ethernet",
    "nba",
    "marjorie",
    "greene",
    "trump",
    "politics",
    "fed rate",
    "federal reserve",
    "college football",
    "nfl",
    "sports schedule",
    "conspiracy",
    "dots",
  ];
  const advancedTerms = [
    "defi",
    "yield farming",
    "liquidity mining",
    "dao",
    "governance token",
    "smart contract audit",
    "flash loan",
    "arbitrage",
    "mev",
    "layer 2",
    "zk-rollup",
    "optimistic rollup",
    "sharding",
    "consensus mechanism",
    "proof of stake validator",
    "slashing",
    "impermanent loss",
    "options trading",
    "futures",
    "derivatives",
    "technical analysis",
    "fibonacci",
  ];
  const scamTerms = [
    "memecoin",
    "shitcoin",
    "pump and dump",
    "rugpull",
    "rug pull",
    "ponzi",
    "pyramid scheme",
    "get rich quick",
    "guaranteed profit",
    "meme coin",
    "shiba inu",
    "pepe",
    "floki",
    "safemoon",
  ];
  const techTerms = [
    "blockchain development",
    "smart contract development",
    "web3 development",
    "solidity",
    "rust programming",
    "substrate",
    "cosmos sdk",
    "ethereum virtual machine",
    "evm",
    "gas optimization",
  ];
  const topCryptos = [
    "cryptocurrency",
    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "bnb",
    "binance",
    "binance coin",
    "solana",
    "sol",
    "cardano",
    "ada",
    "dogecoin",
    "doge",
    "polygon",
    "matic",
    "avalanche",
    "avax",
    "chainlink",
    "link",
    "coinbase",
    "crypto.com",
    "pdax",
    "coins.ph",
    "crypto",
    "cryptocurrency",
    "crypto market",
    "crypto price",
    "crypto trading",
    "crypto exchange",
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
    try {
      host = new URL(a.url).hostname || "";
    } catch (e) {
      continue;
    }

    // CHANGE: Give priority to trusted domains but don't require them
    const isTrustedDomain = CRYPTO_DOMAINS.some((d) => host.includes(d));

    const titleLower = normalize(title);
    const descriptionLower = normalize(description);
    const contentLower = normalize(
      (a.content || "") + " " + titleLower + " " + descriptionLower
    );

    if (irrelevantTerms.some((t) => wordMatch(contentLower, t))) continue;
    if (advancedTerms.some((t) => wordMatch(contentLower, t))) continue;
    if (scamTerms.some((t) => wordMatch(contentLower, t))) continue;
    if (techTerms.some((t) => wordMatch(contentLower, t))) continue;

    const cryptoMatches = topCryptos.reduce(
      (c, t) => c + (wordMatch(contentLower, t) ? 1 : 0),
      0
    );
    const titleHasCrypto = topCryptos.some((t) => wordMatch(titleLower, t));

    // CHANGE: Lower threshold for trusted domains (1 match), higher for others (3 matches)
    const minMatches = isTrustedDomain ? 1 : 6; // Stricter for non-trusted
    if (cryptoMatches < minMatches || !titleHasCrypto) {
      rejectionReasons.cryptoMatches++;
      continue;
    }

    filtered.push(a);
    if (filtered.length >= PAGE_SIZE) break;
  }

  return {
    status: raw.status || "ok",
    totalResults: filtered.length,
    articles: filtered,
  };
}

module.exports = {
  PAGE_SIZE,
  CACHE_VERSION,
  SEARCH_TERMS,
  CRYPTO_DOMAINS,
  filterCryptoArticles,
  escapeRegex,
  wordMatch,
  normalize,
};
