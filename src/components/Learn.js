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

const TOPIC_TEMPLATES = {
  Fundamentals: [
    "Understanding Blockchain Technology",
    "Cryptocurrency Basics and History",
    "Digital Wallet Management",
    "Consensus Mechanisms Explained",
    "Tokenomics and Token Standards",
    "Bitcoin Technology Deep Dive",
    "Ethereum and Smart Contracts",
    "Altcoins vs Bitcoin Comparison",
    "Hash Functions and Cryptography",
    "Distributed Ledger Technology",
    "Proof of Work vs Proof of Stake",
    "Mining and Network Security",
    "Public and Private Key Cryptography",
    "Cryptocurrency Market Structure",
    "Understanding Market Cap and Supply",
    "Fork Types and Blockchain Upgrades",
    "Node Operations and Network Participation",
    "Cryptocurrency Address Systems",
    "Transaction Fees and Gas Mechanics",
    "Cross-chain Technology Basics"
  ],
  Trading: [
    "Technical Analysis Fundamentals",
    "Chart Reading and Patterns",
    "Risk Management Strategies",
    "Market Psychology in Crypto",
    "Trading Indicators and Oscillators",
    "Candlestick Patterns Recognition",
    "Support and Resistance Levels",
    "Volume Analysis in Crypto Markets",
    "Moving Averages and Trend Analysis",
    "Fibonacci Retracements in Crypto",
    "RSI and MACD Strategies",
    "Day Trading Cryptocurrency",
    "Swing Trading Techniques",
    "Scalping Strategies for Crypto",
    "Order Types and Execution",
    "Arbitrage Trading Opportunities",
    "Futures and Derivatives Trading",
    "Options Trading in Crypto",
    "Automated Trading Bots",
    "Market Maker vs Market Taker",
    "Stop Loss and Take Profit Strategies",
    "Leverage Trading and Margin",
    "Position Sizing and Capital Management",
    "Backtesting Trading Strategies",
    "Psychology of Trading Losses"
  ],
  Investment: [
    "Portfolio Diversification Strategies",
    "Dollar Cost Averaging in Crypto",
    "Long-term Investment Approaches",
    "Asset Allocation for Crypto",
    "Market Research and Analysis",
    "HODLing vs Active Trading",
    "Value Investing in Cryptocurrency",
    "Growth vs Value Crypto Projects",
    "Index Fund Strategies for Crypto",
    "Retirement Planning with Crypto",
    "Risk Assessment for Crypto Investments",
    "Fundamental Analysis of Projects",
    "Tokenomics Evaluation Framework",
    "Team and Development Assessment",
    "Roadmap Analysis and Milestones",
    "Community and Ecosystem Evaluation",
    "Competitive Analysis in Crypto",
    "Market Timing Strategies",
    "Rebalancing Crypto Portfolios",
    "Tax-Efficient Investment Strategies",
    "Institutional vs Retail Investment",
    "ESG Considerations in Crypto",
    "Geographic Diversification",
    "Sector Allocation in Crypto",
    "Exit Strategies and Profit Taking"
  ],
  Security: [
    "Wallet Security Best Practices",
    "Private Key Management",
    "Avoiding Scams and Phishing",
    "Hardware Wallet Setup and Use",
    "Multi-factor Authentication",
    "Cold Storage Solutions",
    "Hot Wallet vs Cold Wallet",
    "Seed Phrase Security and Recovery",
    "Multi-signature Wallets",
    "Air-gapped Security Measures",
    "Exchange Security Evaluation",
    "Smart Contract Security Audits",
    "Social Engineering Prevention",
    "Rug Pull Detection and Avoidance",
    "Fake Token and Project Identification",
    "Secure Trading Practices",
    "VPN Usage for Crypto Activities",
    "Browser Security for DeFi",
    "Mobile Wallet Security",
    "Backup and Recovery Strategies",
    "Inheritance and Estate Planning",
    "Privacy Coins and Anonymity",
    "Transaction Privacy Techniques",
    "KYC and AML Compliance",
    "Regulatory Reporting Security"
  ],
  DeFi: [
    "Decentralized Finance Protocols",
    "Yield Farming Strategies",
    "Liquidity Provision and Mining",
    "Staking and Delegation Rewards",
    "Smart Contract Interactions",
    "Automated Market Makers (AMMs)",
    "Decentralized Exchanges (DEXs)",
    "Lending and Borrowing Protocols",
    "Flash Loans and Arbitrage",
    "Governance Tokens and DAOs",
    "Impermanent Loss Understanding",
    "Cross-chain DeFi Protocols",
    "Layer 2 Solutions for DeFi",
    "DeFi Insurance and Risk Management",
    "Synthetic Assets and Derivatives",
    "Wrapped Tokens and Bridges",
    "DeFi Portfolio Management",
    "MEV and Front-running Protection",
    "Gas Optimization Strategies",
    "DeFi Protocol Risk Assessment",
    "Composability in DeFi",
    "DeFi Analytics and Tracking",
    "Regulatory Compliance in DeFi",
    "DeFi Tax Implications",
    "Future of Decentralized Finance"
  ],
  Regulation: [
    "Cryptocurrency Regulations Overview",
    "Tax Implications and Reporting",
    "Compliance Requirements by Country",
    "Legal Frameworks for Crypto",
    "Anti-Money Laundering (AML) Rules",
    "Know Your Customer (KYC) Processes",
    "Securities Law and Crypto Tokens",
    "Banking Regulations and Crypto",
    "Cross-border Regulatory Challenges",
    "Central Bank Digital Currencies",
    "Regulatory Sandboxes and Innovation",
    "Licensing Requirements for Exchanges",
    "Privacy Rights vs Regulation",
    "Enforcement Actions and Penalties",
    "Regulatory Arbitrage Strategies",
    "Professional Services Regulation",
    "Institutional Compliance Frameworks",
    "Record Keeping Requirements",
    "International Regulatory Cooperation",
    "Future Regulatory Developments",
    "Stablecoin Regulation",
    "DeFi Regulatory Challenges",
    "NFT Legal Considerations",
    "Mining Regulation and Environmental Law",
    "Consumer Protection in Crypto"
  ]
};
// ── Hugging Face AI Model Config ────────────────────────────────────────────
const HUGGINGFACE_API_KEY = "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";
const HF_BASE = "https://api-inference.huggingface.co/models/";
const HF_SUMMARIZE = "facebook/bart-large-cnn"; // summarization

// ── UI Categories ──────────────────────────────────────────────────────────
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

  // ── Text helpers ──────────────────────────────────────────────────────────
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

  // ── AI helpers: generate topics, descriptions and lessons ─────────────────
  const aiGenerateDescription = async (title, category, level) => {
    try {
      const prompt = `Create a comprehensive educational description for a cryptocurrency course titled "${title}" in the ${category} category for ${level} level students. Focus on learning outcomes and practical skills. Make it 2-3 sentences.`;
      const out = await callHF(HF_SUMMARIZE, {
        inputs: prompt,
        parameters: { max_length: 150, min_length: 50 },
      });
      if (Array.isArray(out) && out[0]?.summary_text)
        return sanitize(out[0].summary_text);
    } catch (e) {
      console.warn("Description generation failed:", e.message);
    }
    return `Learn essential ${title.toLowerCase()} concepts and practical applications in ${category.toLowerCase()}. Master ${level.toLowerCase()}-level techniques and strategies.`;
  };

  // Generate structured lessons based on topic title, category and level
  const generateLessonsForTopic = async (title, category, level) => {
    try {
      const prompt = `Create 3-5 educational lessons for "${title}" course in ${category} category for ${level} level. Format: Lesson Title|Learning Objective|Quiz Question|Option A|Option B|Option C|Option D|Correct Answer (A/B/C/D). Each lesson on new line.`;
      
      const out = await callHF(HF_SUMMARIZE, {
        inputs: prompt,
        parameters: { max_length: 300, min_length: 100 },
      });
      
      if (Array.isArray(out) && out[0]?.summary_text) {
        const text = out[0].summary_text;
        const lessons = parseLessonsFromAI(text, title, category);
        if (lessons.length > 0) return lessons;
      }
    } catch (e) {
      console.warn("AI lesson generation failed:", e.message);
    }

    // Fallback: Generate lessons based on level and category templates
    const levelTemplates = {
      Beginner: [
        { title: `Introduction to ${title}`, objective: `Understand the basics of ${title.toLowerCase()}` },
        { title: `Key Concepts and Terminology`, objective: `Learn essential ${category.toLowerCase()} terminology` },
        { title: `Getting Started Guide`, objective: `Take your first practical steps` },
      ],
      Intermediate: [
        { title: `Advanced ${title} Strategies`, objective: `Master intermediate-level techniques` },
        { title: `Practical Implementation`, objective: `Apply concepts in real-world scenarios` },
        { title: `Risk Management`, objective: `Understand and mitigate common risks` },
        { title: `Tools and Platforms`, objective: `Use professional tools effectively` },
      ],
      Advanced: [
        { title: `Expert-Level ${title}`, objective: `Master advanced concepts and analysis` },
        { title: `Complex Strategies`, objective: `Implement sophisticated approaches` },
        { title: `Market Analysis`, objective: `Perform deep market and trend analysis` },
        { title: `Professional Techniques`, objective: `Apply institutional-grade methods` },
        { title: `Innovation and Trends`, objective: `Stay ahead of market developments` },
      ],
    };

    const templates = levelTemplates[level] || levelTemplates.Beginner;
    return templates.map((lesson, idx) => ({
      ...lesson,
      quiz: {
        question: `What is the primary focus of ${lesson.title}?`,
        choices: ["Theoretical knowledge", "Practical application", "Risk assessment", "Market analysis"],
        answer_index: idx % 4,
      },
    }));
  };

  // Parse AI-generated lesson text into structured format
  const parseLessonsFromAI = (text, title, category) => {
    const lines = text.split('\n').filter(line => line.trim());
    const lessons = [];
    
    lines.forEach((line, idx) => {
      const parts = line.split('|');
      if (parts.length >= 4) {
        lessons.push({
          title: parts[0]?.trim() || `Lesson ${idx + 1}: ${title}`,
          objective: parts[1]?.trim() || `Learn key concepts of ${title.toLowerCase()}`,
          quiz: {
            question: parts[2]?.trim() || `What is important about ${title}?`,
            choices: [
              parts[3]?.trim() || "Option A",
              parts[4]?.trim() || "Option B", 
              parts[5]?.trim() || "Option C",
              parts[6]?.trim() || "Option D"
            ],
            answer_index: ['A', 'B', 'C', 'D'].indexOf(parts[7]?.trim()) || 0,
          },
        });
      }
    });
    
    return lessons;
  };

  // ── Helpers to generate topics and course fields ───────────────────────────
  const generateRandomTopic = (category) => {
    const templates = TOPIC_TEMPLATES[category] || TOPIC_TEMPLATES.Fundamentals;
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const getRandomLevel = () => {
    const levels = ['Beginner', 'Intermediate', 'Advanced'];
    const weights = [0.4, 0.4, 0.2]; // More beginner/intermediate courses
    const random = Math.random();
    let sum = 0;
    for (let i = 0; i < levels.length; i++) {
      sum += weights[i];
      if (random <= sum) return levels[i];
    }
    return levels[0];
  };

  const estimateEffort = (level, lessons) => {
    const baseHours = {
      Beginner: 2,
      Intermediate: 4,
      Advanced: 6,
    };
    const hours = baseHours[level] || 3;
    return { 
      duration: `${hours} hours`, 
      modulesCount: lessons.length 
    };
  };

  const pseudoNumber = (s, min = 200, max = 4000) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return Math.floor(min + (h % (max - min)));
  };

  const buildTags = (title, category) => {
    const tags = new Set([category]);
    const titleWords = title.toLowerCase().split(' ');
    
    // Add relevant tags based on title words
    titleWords.forEach(word => {
      if (word.length > 3 && !['with', 'and', 'the', 'for', 'from'].includes(word)) {
        tags.add(word.charAt(0).toUpperCase() + word.slice(1));
      }
    });

    // Add category-specific tags
    const categoryTags = {
      Fundamentals: ['Blockchain', 'Crypto Basics'],
      Trading: ['Technical Analysis', 'Markets'],
      Investment: ['Portfolio', 'Long-term'],
      Security: ['Wallet Safety', 'Privacy'],
      DeFi: ['Protocols', 'Yield'],
      Regulation: ['Compliance', 'Legal']
    };
    
    const categorySpecific = categoryTags[category] || [];
    categorySpecific.forEach(tag => tags.add(tag));

    return Array.from(tags).slice(0, 4);
  };

  // ── Core: build AI modules from generated topics ─────────────────────────
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

      const modules = [];
      const categories = CATEGORIES.slice(1); // Remove 'all'
      
      // Generate 3-4 courses per category
      for (const category of categories) {
        const coursesPerCategory = 3 + Math.floor(Math.random() * 2); // 3-4 courses
        
        for (let i = 0; i < coursesPerCategory; i++) {
          const title = generateRandomTopic(category);
          const level = getRandomLevel();
          
          // Generate AI description
          const description = await aiGenerateDescription(title, category, level);
          
          // Generate lessons
          const lessons = await generateLessonsForTopic(title, category, level);
          
          const { duration, modulesCount } = estimateEffort(level, lessons);

          modules.push({
            id: `generated-${category}-${i}`,
            title,
            subtitle: `${category} • ${level} Level`,
            description,
            level,
            category,
            duration,
            modules: modulesCount,
            enrolled: pseudoNumber(title),
            rating: (4.0 + (pseudoNumber(title) % 10) / 10).toFixed(1),
            tags: buildTags(title, category),
            certificate: true,
            lessons,
          });
        }
      }

      // Shuffle modules for variety
      for (let i = modules.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [modules[i], modules[j]] = [modules[j], modules[i]];
      }

      setCache(modules);
      setAllModules(modules);
      setDisplayedModules(modules);
    } catch (e) {
      console.error("buildModules error:", e);
      // Create minimal fallback modules without AI
      const fallbackModules = CATEGORIES.slice(1).flatMap((category, catIdx) => 
        Array.from({length: 3}, (_, i) => ({
          id: `fallback-${catIdx}-${i}`,
          title: generateRandomTopic(category),
          subtitle: `${category} • Beginner Level`,
          description: `Learn essential ${category.toLowerCase()} concepts and practical applications.`,
          level: 'Beginner',
          category,
          duration: '2 hours',
          modules: 3,
          enrolled: 500 + catIdx * 100 + i * 50,
          rating: '4.2',
          tags: buildTags(generateRandomTopic(category), category),
          certificate: true,
          lessons: [
            { title: 'Introduction', objective: 'Get started', quiz: { question: 'What is this about?', choices: ['A', 'B', 'C', 'D'], answer_index: 0 }},
            { title: 'Core Concepts', objective: 'Learn basics', quiz: { question: 'What are the basics?', choices: ['A', 'B', 'C', 'D'], answer_index: 1 }},
            { title: 'Practical Application', objective: 'Apply knowledge', quiz: { question: 'How to apply?', choices: ['A', 'B', 'C', 'D'], answer_index: 2 }}
          ],
        }))
      );
      
      setAllModules(fallbackModules);
      setDisplayedModules(fallbackModules);
    } finally {
      setLoading(false);
    }
  };

  // ── Search / Filter logic ────────────────────────────────────────────────
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
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Generating AI-enhanced learning modules...</p>
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
              Comprehensive learning modules covering all aspects of cryptocurrency, 
              blockchain technology, and digital asset management.
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
                  {isRefreshing ? "Refreshing..." : "Refresh Content"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Course Grid */}
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
                    <span>{course.modules} lessons</span>
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
                      `${course.title}\n\nCourse Lessons:\n\n` +
                        course.lessons
                          .map(
                            (l, i) => `${i + 1}. ${l.title}\n   ${l.objective}`
                          )
                          .join("\n\n") +
                        `\n\nThis is a comprehensive ${course.level.toLowerCase()}-level course designed to help you master ${course.category.toLowerCase()} concepts.`
                    )
                  }
                >
                  <span>Start Learning</span>
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
                <div className="stat-label">Learning Modules</div>
              </div>
              <div className="stat-item">
                <div className="stat-number stat-green">AI</div>
                <div className="stat-label">Enhanced Content</div>
              </div>
              <div className="stat-item">
                <div className="stat-number stat-purple">
                  {displayedModules.reduce((sum, m) => sum + m.lessons.length, 0)}
                </div>
                <div className="stat-label">Total Lessons</div>
              </div>
              <div className="stat-item">
                <div className="stat-number stat-orange">100%</div>
                <div className="stat-label">Educational Focus</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}