import express from "express";
import handler from "./api/news.js";

const app = express();
app.use(express.json());

app.all("/api/news", async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => console.log(`Local API server listening on http://localhost:${PORT}`));

// Periodic refresh (optional) — add after app.listen(...)
const AUTO_REFRESH_MS = Number(process.env.NEWS_AUTO_REFRESH_MS) || 60 * 60 * 1000; // default 60 minutes
const ENABLE_AUTO_REFRESH = process.env.NEWS_AUTO_REFRESH !== "false"; // set to "false" to disable

if (ENABLE_AUTO_REFRESH) {
  setTimeout(() => {
    // Stagger first run slightly after server start
    (async function periodicRefresh() {
      try {
        const url = `http://localhost:${PORT}/api/news`;
        console.log(`Periodic refresh: calling ${url}`);
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) {
          console.warn("Periodic refresh failed status:", resp.status);
        } else {
          const body = await resp.json();
          console.log("Periodic refresh succeeded - articles:", body.articles?.length || 0);
        }
      } catch (err) {
        console.error("Periodic refresh error:", err);
      } finally {
        setTimeout(periodicRefresh, AUTO_REFRESH_MS);
      }
    })();
  }, 2000);
}
