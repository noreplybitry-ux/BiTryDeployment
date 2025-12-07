// scripts/fetch-news.js (CommonJS)
// Node 18+ assumed (global fetch). Writes atomic public/news_cache.json
const fs = require("fs").promises;
const path = require("path");

const NEWS_API_KEY = process.env.NEWS_API_KEY;
if (!NEWS_API_KEY) {
  console.error("ERROR: NEWS_API_KEY environment variable is required.");
  process.exit(2);
}

const OUT_FILE = path.join(process.cwd(), "public", "news_cache.json");
const TMP_FILE = OUT_FILE + ".tmp";

async function fetchNews() {
  const url = new URL("https://newsapi.org/v2/everything");
  // Query tuned for crypto news — adapt as needed
  url.searchParams.set("q", "crypto OR bitcoin OR ethereum OR cryptocurrency");
  url.searchParams.set("language", "en");
  url.searchParams.set("pageSize", "50");
  url.searchParams.set("sortBy", "publishedAt");

  const resp = await fetch(url.toString(), {
    headers: { "X-Api-Key": NEWS_API_KEY },
    // Note: fetch ignores `timeout` option — keep if you want, but Node's fetch doesn't support timeout this way.
  });

  if (!resp.ok) {
    throw new Error(`NewsAPI fetch failed: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return data;
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

(async () => {
  try {
    const data = await fetchNews();
    const payload = {
      timestamp: new Date().toISOString(),
      data,
    };
    const serialized = JSON.stringify(payload, null, 2) + "\n";

    // If file already equals new content, exit with code 0 (nothing to commit)
    if (await fileEquals(OUT_FILE, serialized)) {
      console.log("No changes to news cache; exiting.");
      process.exit(0);
    }

    // atomic write
    await atomicWrite(OUT_FILE, TMP_FILE, payload);
    console.log("Wrote updated news cache to", OUT_FILE);
    process.exit(0);
  } catch (err) {
    console.error("Failed to fetch or write news cache:", err);
    process.exit(3);
  }
})();