import React, { useState, useEffect } from "react";
import {
  Search,
  Clock,
  Users,
  BookOpen,
  Award,
  ChevronRight,
  Filter,
} from "lucide-react";
import "../css/Learn.css";

// ── Hugging Face AI Model Config ────────────────────────────────────────────
const HUGGINGFACE_API_KEY = "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";
const HF_BASE = "https://api-inference.huggingface.co/models/";
const HF_SUMMARIZE = "facebook/bart-large-cnn"; // summarization
const HF_CLASSIFY = "facebook/bart-large-mnli"; // zero-shot classification
// We'll reuse the summarization model to create lesson outlines via a JSON prompt.

// ── RSS Feeds ───────────────────────────────────────────────────────────────
const FEEDS = [
  "https://cointelegraph.com/rss",
  "https://www.coindesk.com/arc/outboundfeeds/rss",
  "https://cryptoslate.com/feed/",
];

// ── UI Categories (unchanged) ───────────────────────────────────────────────
const CATEGORIES = [
  "all",
  "Fundamentals",
  "Investment",
  "Security",
  "Trading",
  "DeFi",
  "Regulation",
];

// ── Cache ───────────────────────────────────────────────────────────────────
const CACHE_KEY = "bitry_ai_learning_modules";
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

export default function Learn() {
  const [allModules, setAllModules] = useState([]);
  const [displayedModules, setDisplayedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Cache helpers ────────────────────────────────────────────────────────
  const getCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.timestamp || Date.now() - parsed.timestamp > CACHE_DURATION)
        return null;
      return parsed.data;
    } catch {
      return null;
    }
  };
  const setCache = (data) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (e) {
      console.warn("Failed to set cache:", e.message);
    }
  };
  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
  };

  // ── RSS fetch with CORS proxy ──────────────────────────────────────────────
  const fetchRSS = async (url) => {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(
      url
    )}`;
    const resp = await fetch(proxy);
    if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
    const { contents } = await resp.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(contents, "text/xml");
    const items = Array.from(xml.querySelectorAll("item")).map((it) => {
      const title = it.querySelector("title")?.textContent || "";
      const description =
        it.querySelector("description")?.textContent ||
        it.querySelector("content\\:encoded")?.textContent ||
        "";
      return {
        title: sanitize(title),
        description: sanitize(stripHtml(description)),
      };
    });
    return items;
  };

  // ── Text helpers ──────────────────────────────────────────────────────────
  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };
  const sanitize = (s) =>
    (s || "").replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();

  // ── Hugging Face caller with retry/backoff ────────────────────────────────
  const callHF = async (model, payload, retries = 3) => {
    const url = HF_BASE + model;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
        // model loading -> 503
        if (res.status === 503 && attempt < retries) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
          continue;
        }
        // other errors
        const text = await res.text();
        throw new Error(`HF ${res.status}: ${text}`);
      } catch (err) {
        if (attempt === retries) throw err;
        // wait and retry
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  };

  // ── AI helpers: summarize, classify (zero-shot), generate lessons JSON ─────
  const aiSummarize = async (text) => {
    try {
      const out = await callHF(HF_SUMMARIZE, {
        inputs: text,
        parameters: { max_length: 160, min_length: 40 },
      });
      if (Array.isArray(out) && out[0]?.summary_text)
        return sanitize(out[0].summary_text);
    } catch (e) {
      console.warn("Summarize failed:", e.message);
    }
    return text.slice(0, 300) + (text.length > 300 ? "..." : "");
  };

  // zero-shot: returns top label or fallback heuristic
  const aiZeroShot = async (text, labels) => {
    try {
      const out = await callHF(HF_CLASSIFY, {
        inputs: text,
        parameters: { candidate_labels: labels, multi_label: false },
      });
      if (out && out.labels && out.labels.length) return out.labels[0];
    } catch (e) {
      console.warn("Zero-shot failed:", e.message);
    }
    // fallback simple heuristic
    const t = text.toLowerCase();
    if (t.includes("beginner") || /what is|basics|intro/.test(t))
      return labels.includes("Beginner") ? "Beginner" : labels[0];
    if (
      t.includes("strategy") ||
      t.includes("portfolio") ||
      t.includes("trade")
    )
      return labels.includes("Intermediate") ? "Intermediate" : labels[0];
    return labels[labels.length - 1];
  };

  // Generate structured lessons JSON using a careful prompt requesting JSON output
  const aiGenerateLessons = async (title, summary) => {
    // Prompt instructing model to return JSON with lessons array [{title, objective, quiz}]
    const prompt = `
You are an assistant that converts an article title and short summary into 3 concise course lessons and one short multiple-choice quiz question per lesson.
Return output as strict JSON only (no extra text) with this structure:
{"lessons":[{"title":"...", "objective":"one-line objective", "quiz":{"question":"...","choices":["A","B","C","D"],"answer_index":0}}, ...]}

Article title: "${title}"
Article summary: "${summary}"

Create 3 lessons appropriate for a short learning module (beginner/intermediate/advanced as fits the content). Use lesson titles like "What is ...", "How to ...", "Setting up ...", etc. Choices should be plausible. Keep each field short.
`;
    try {
      const out = await callHF(HF_SUMMARIZE, {
        inputs: prompt,
        parameters: { max_length: 400 },
      });
      // HF summarization often returns text; try to extract JSON
      const raw = Array.isArray(out)
        ? out[0]?.summary_text || out[0]
        : out?.generated_text || JSON.stringify(out);
      // Try to locate a JSON object inside the raw text
      const jsonText = extractJson(raw);
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        if (parsed && Array.isArray(parsed.lessons)) return parsed.lessons;
      }
    } catch (e) {
      console.warn("Lesson generation error:", e.message);
    }
    // fallback: build 3 simple lessons heuristically from title/summary
    return [
      {
        title: `What is ${title.split(":")[0] || title}`,
        objective: `Understand the core idea behind "${title}".`,
        quiz: {
          question: `What is the main idea of "${title}"?`,
          choices: ["Definition", "Price", "History", "Competition"],
          answer_index: 0,
        },
      },
      {
        title: `How to apply concepts from "${title}"`,
        objective: `Learn practical steps described in the article.`,
        quiz: {
          question: `Which is a practical step from the article?`,
          choices: ["A", "B", "C", "D"],
          answer_index: 0,
        },
      },
      {
        title: `Setting up basics related to "${title}"`,
        objective: `Prepare the basic setup required.`,
        quiz: {
          question: `What's needed to get started?`,
          choices: ["X", "Y", "Z", "W"],
          answer_index: 0,
        },
      },
    ];
  };

  // Utility: try to pick JSON substring
  const extractJson = (text) => {
    if (!text) return null;
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const candidate = text.slice(start, end + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch {
        return null;
      }
    }
    return null;
  };

  // ── Helpers to convert article -> course card fields ───────────────────────
  const normalizeCategory = (label) => {
    const map = {
      Fundamentals: "Fundamentals",
      Basics: "Fundamentals",
      Introduction: "Fundamentals",
      Investment: "Investment",
      Investing: "Investment",
      Portfolio: "Investment",
      Security: "Security",
      Cybersecurity: "Security",
      Trading: "Trading",
      "Technical Analysis": "Trading",
      DeFi: "DeFi",
      "Decentralized Finance": "DeFi",
      Regulation: "Regulation",
      Compliance: "Regulation",
    };
    return map[label] || (CATEGORIES.includes(label) ? label : "Fundamentals");
  };

  const estimateEffort = (level) => {
    if (level === "Beginner") return { duration: "2 hours", modulesCount: 5 };
    if (level === "Intermediate")
      return { duration: "4 hours", modulesCount: 8 };
    return { duration: "6 hours", modulesCount: 10 };
  };

  const pseudoNumber = (s, min = 200, max = 4000) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return Math.floor(min + (h % (max - min)));
  };

  const buildTags = (category, title, desc) => {
    const t = `${title} ${desc}`.toLowerCase();
    const tags = new Set([category]);
    if (/\bbitcoin|btc\b/.test(t)) tags.add("Bitcoin");
    if (/\bethereum|eth\b/.test(t)) tags.add("Ethereum");
    if (/\bwallet|seed|private key|mnemonic|hardware\b/.test(t))
      tags.add("Wallets");
    if (/\bdefi|dex|liquidity|yield|lending\b/.test(t)) tags.add("DeFi");
    if (/\bregulation|sec|compliance\b/.test(t)) tags.add("Regulation");
    if (/\bchart|candlestick|rsi|macd\b/.test(t))
      tags.add("Technical Analysis");
    return Array.from(tags).slice(0, 4);
  };

  // ── Core: build AI modules from RSS ───────────────────────────────────────
  const buildModules = async (forceReload = false) => {
    setLoading(true);
    try {
      if (!forceReload) {
        const cached = getCache();
        if (cached) {
          setAllModules(cached);
          setDisplayedModules(cached);
          setLoading(false);
          return;
        }
      }

      // fetch feeds
      const feedsData = await Promise.all(
        FEEDS.map((f) => fetchRSS(f).catch(() => []))
      );
      let articles = feedsData.flat();

      // dedupe by title
      const seen = new Set();
      articles = articles.filter((a) => {
        const k = (a.title || "").toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // limit sample size
      const sample = articles.slice(0, 24);

      const modules = [];
      for (let i = 0; i < sample.length; i++) {
        const art = sample[i];
        const baseText = `${art.title}. ${art.description}`.slice(0, 3000);
        // summary
        const summary = await aiSummarize(baseText);

        // level classification
        const level = await aiZeroShot(`${art.title}. ${summary}`, [
          "Beginner",
          "Intermediate",
          "Advanced",
        ]);

        // category classification
        const catLabel = await aiZeroShot(`${art.title}. ${summary}`, [
          "Fundamentals",
          "Investment",
          "Security",
          "Trading",
          "DeFi",
          "Regulation",
          "Infrastructure",
          "Web3",
          "NFTs",
          "Markets",
        ]);
        const category = normalizeCategory(catLabel);

        // generate lessons (titles + objectives + 1 quiz)
        const lessons = await aiGenerateLessons(art.title, summary);

        // convert lessons to short list for card description (display first 3 lesson titles)
        const lessonTitles = lessons.map((l) => l.title).slice(0, 3);

        const { duration, modulesCount } = estimateEffort(level);

        modules.push({
          id: `${Date.now()}-${i}`,
          title: `${art.title} — ${category} Module`,
          subtitle:
            category === "Fundamentals"
              ? "Core Concepts & Mental Models"
              : `${category} Module`,
          description: `${summary}\n\nLessons: ${lessonTitles.join(" • ")}`,
          level,
          category,
          duration,
          modules: modulesCount,
          enrolled: pseudoNumber(art.title),
          rating: (3.9 + (pseudoNumber(art.title) % 11) / 10).toFixed(1),
          tags: buildTags(category, art.title, art.description),
          certificate: true,
          prerequisite:
            level === "Beginner"
              ? "None"
              : level === "Intermediate"
              ? "Bitcoin Fundamentals"
              : "Cryptocurrency Portfolio Management",
          instructor: "BitRy AI Tutor",
          lessons, // full lessons data (for future use / quizzes)
        });
      }

      setCache(modules);
      setAllModules(modules);
      setDisplayedModules(modules);
    } catch (e) {
      console.error("buildModules error:", e);
      // fallback to empty list
      setAllModules([]);
      setDisplayedModules([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Search / Filter logic (unchanged) ────────────────────────────────────
  const handleSearch = (value) => {
    setSearchTerm(value);
    filterCourses(value, selectedLevel, selectedCategory);
  };

  const handleLevelFilter = (level) => {
    setSelectedLevel(level);
    filterCourses(searchTerm, level, selectedCategory);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    filterCourses(searchTerm, selectedLevel, category);
  };

  const filterCourses = (search, level, category) => {
    let filtered = allModules;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(q) ||
          course.description.toLowerCase().includes(q) ||
          course.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    if (level !== "all") filtered = filtered.filter((c) => c.level === level);
    if (category !== "all")
      filtered = filtered.filter((c) => c.category === category);
    setDisplayedModules(filtered);
  };

  // ── Refresh handler ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setIsRefreshing(true);
    clearCache();
    await buildModules(true);
    setIsRefreshing(false);
  };

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    buildModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Generating AI courses from RSS feeds...</p>
      </div>
    );
  }

  return (
    <div className="learn-container">
      <div className="learn-content">
        {/* Header Section */}
        <div className="header-section">
          <div className="header-content">
            <h1 className="main-title">Cryptocurrency Learning Academy</h1>
            <p className="main-description">
              AI-generated learning modules created from top crypto publications
              (Cointelegraph, CoinDesk, CryptoSlate).
            </p>
            {/* Search and Filters */}
            <div className="search-filters">
              <div className="search-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search courses, topics, or skills"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filters-container">
                <div className="filter-label">
                  <Filter className="filter-icon" />
                  <span>Filters:</span>
                </div>
                <select
                  value={selectedLevel}
                  onChange={(e) => handleLevelFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.slice(1).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleRefresh}
                  className="refresh-button"
                  disabled={isRefreshing}
                  style={{ marginLeft: 12 }}
                >
                  {isRefreshing ? "Refreshing..." : "Refresh Modules"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Course Grid (same card design) */}
        <div className="course-grid">
          {displayedModules.map((course) => (
            <div key={course.id} className="course-card">
              {/* Course Header */}
              <div className="course-header">
                <div className="course-header-top">
                  <span
                    className={`level-badge level-${course.level.toLowerCase()}`}
                  >
                    {course.level}
                  </span>
                  {course.certificate && (
                    <div className="certificate-badge">
                      <Award className="certificate-icon" />
                      <span>Certificate</span>
                    </div>
                  )}
                </div>
                <h3 className="course-title">{course.title}</h3>
                <p className="course-subtitle">{course.subtitle}</p>
                <p className="course-description">{course.description}</p>
              </div>

              {/* Course Details */}
              <div className="course-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <Clock className="detail-icon" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="detail-item">
                    <BookOpen className="detail-icon" />
                    <span>{course.modules} modules</span>
                  </div>
                  <div className="detail-item">
                    <Users className="detail-icon" />
                    <span>{course.enrolled} enrolled</span>
                  </div>
                  <div className="detail-item">
                    <span className="star-icon">★</span>
                    <span>{course.rating}/5.0</span>
                  </div>
                </div>
                <div className="prerequisite-section">
                  <p className="prerequisite-text">
                    <span className="prerequisite-label">Instructor:</span>{" "}
                    {course.instructor}
                  </p>
                  <p className="prerequisite-text">
                    <span className="prerequisite-label">Prerequisite:</span>{" "}
                    {course.prerequisite}
                  </p>
                </div>

                {/* Tags */}
                <div className="tags-container">
                  {course.tags.map((tag, idx) => (
                    <span key={idx} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  className="enroll-button"
                  onClick={() =>
                    alert(
                      "This is an AI-generated learning module.\n\nTop lessons:\n" +
                        course.lessons
                          .map(
                            (l, i) => `${i + 1}. ${l.title} — ${l.objective}`
                          )
                          .join("\n\n")
                    )
                  }
                >
                  <span>View Lessons</span>
                  <ChevronRight className="button-icon" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {displayedModules.length === 0 && (
          <div className="no-results">
            <BookOpen className="no-results-icon" />
            <h3 className="no-results-title">No courses found</h3>
            <p className="no-results-text">
              Try adjusting your search criteria or explore different categories
            </p>
          </div>
        )}

        {/* Footer Stats */}
        <div className="footer-stats">
          <div className="stats-container">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number stat-blue">
                  {displayedModules.length}
                </div>
                <div className="stat-label">Available Courses</div>
              </div>
              <div className="stat-item">
                <div className="stat-number stat-green">AI</div>
                <div className="stat-label">Generated Content</div>
              </div>
              <div className="stat-item">
                <div className="stat-number stat-purple">3+</div>
                <div className="stat-label">Lessons per Module</div>
              </div>
              <div className="stat-item">
                <div className="stat-number stat-orange">12h</div>
                <div className="stat-label">Cache Duration</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
