import React, { useState, useEffect } from "react";
import {
  Search,
  Clock,
  Users,
  BookOpen,
  Award,
  ChevronRight,
  Filter,
  Play,
  ChevronLeft,
  Check,
  X,
  Star,
  Trophy,
  ArrowLeft,
  Target,
  Brain,
  Lightbulb,
  CheckCircle
} from "lucide-react";
import "../css/Learn.css";

const FEEDS = [
  "https://academy.binance.com/en/rss",
  "https://www.coinbase.com/blog/rss",
  "https://www.simplilearn.com/tutorials/blockchain-tutorial/feed",
  "https://cryptopotato.com/feed/",
  "https://blockgeeks.com/feed/",
];

const HUGGINGFACE_API_KEY = "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";
const HF_BASE = "https://api-inference.huggingface.co/models/";
const HF_DIALOGPT = "microsoft/DialoGPT-medium";

const CATEGORIES = [
  "all",
  "Fundamentals",
  "Investment", 
  "Security",
  "Trading",
  "DeFi",
  "Regulation",
];

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
  const [viewingCourse, setViewingCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

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

  const sanitize = (s) =>
    (s || "").replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();

  const fetchRSSFeed = async (feedUrl) => {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${feedUrl}`);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const items = xmlDoc.querySelectorAll("item");
      const articles = [];

      items.forEach((item, index) => {
        if (index < 10) { 
          const title = item.querySelector("title")?.textContent || "";
          const description = item.querySelector("description")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "";
          const pubDate = item.querySelector("pubDate")?.textContent || "";
          
          if (title && description) {
            articles.push({
              title: sanitize(title),
              description: sanitize(description.replace(/<[^>]*>/g, '')),
              link,
              pubDate: new Date(pubDate),
              source: feedUrl.includes('binance') ? 'Binance Academy' : 
                     feedUrl.includes('coinbase') ? 'Coinbase Learn' :
                     feedUrl.includes('simplilearn') ? 'Simplilearn' :
                     feedUrl.includes('consensys') ? 'ConsenSys Academy' :
                     feedUrl.includes('cryptopotato') ? 'Crypto Potato' :
                     feedUrl.includes('blockgeeks') ? 'Blockgeeks' : 'Unknown Source'
            });
          }
        }
      });

      return articles;
    } catch (error) {
      console.warn(`Failed to fetch RSS feed ${feedUrl}:`, error);
      return [];
    }
  };

  const fetchAllRSSFeeds = async () => {
    const allArticles = [];
    
    for (const feedUrl of FEEDS) {
      const articles = await fetchRSSFeed(feedUrl);
      allArticles.push(...articles);
    }

    allArticles.sort((a, b) => b.pubDate - a.pubDate);
    return allArticles.slice(0, 30);
  };

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
        if (res.status === 503 && attempt < retries) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
          continue;
        }
        const text = await res.text();
        throw new Error(`HF ${res.status}: ${text}`);
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  };

  const categorizeArticle = (title, description) => {
    const content = (title + " " + description).toLowerCase();
    
    if (content.includes('defi') || content.includes('protocol') || content.includes('yield') || content.includes('liquidity')) {
      return 'DeFi';
    }
    if (content.includes('regulation') || content.includes('legal') || content.includes('sec') || content.includes('compliance')) {
      return 'Regulation';
    }
    if (content.includes('trading') || content.includes('market') || content.includes('price') || content.includes('technical analysis')) {
      return 'Trading';
    }
    if (content.includes('security') || content.includes('hack') || content.includes('wallet') || content.includes('private key')) {
      return 'Security';
    }
    if (content.includes('investment') || content.includes('portfolio') || content.includes('institutional')) {
      return 'Investment';
    }
    
    return 'Fundamentals';
  };

  const determineLevelFromContent = (title, description) => {
    const content = (title + " " + description).toLowerCase();
    
    if (content.includes('beginner') || content.includes('introduction') || content.includes('basics') || content.includes('getting started')) {
      return 'Beginner';
    }
    if (content.includes('advanced') || content.includes('expert') || content.includes('institutional') || content.includes('complex')) {
      return 'Advanced';
    }
    
    return 'Intermediate';
  };

  const generateLearningModuleFromArticle = async (article) => {
    const category = categorizeArticle(article.title, article.description);
    const level = determineLevelFromContent(article.title, article.description);
    
    let moduleTitle = article.title;
    if (moduleTitle.length > 60) {
      moduleTitle = moduleTitle.substring(0, 60) + "...";
    }
    
    let educationalDescription;
    try {
      const prompt = `Create an educational course description for: "${article.title}". Focus on learning outcomes and practical knowledge for ${category} in cryptocurrency. Make it engaging for ${level} learners.`;
      
      const result = await callHF(HF_DIALOGPT, {
        inputs: prompt,
        parameters: { 
          max_new_tokens: 100,
          temperature: 0.7,
          do_sample: true,
          pad_token_id: 50256
        },
      });
      
      if (Array.isArray(result) && result[0]?.generated_text) {
        const generated = result[0].generated_text.replace(prompt, '').trim();
        educationalDescription = sanitize(generated);
      }
    } catch (e) {
      console.warn("DialoGPT description generation failed:", e);
    }

    const lessons = await generateLessonsFromArticle(article, category, level);
    const { duration, modulesCount } = estimateEffort(level, lessons);

    return {
      id: `rss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: moduleTitle,
      subtitle: `${category} • ${level} Level • ${article.source}`,
      description: educationalDescription,
      level,
      category,
      duration,
      modules: modulesCount,
      enrolled: pseudoNumber(article.title),
      rating: (4.0 + (pseudoNumber(article.title) % 10) / 10).toFixed(1),
      tags: buildTagsFromArticle(article, category),
      lessons,
      source: article.source,
      originalLink: article.link,
      publishDate: article.pubDate,
    };
  };

  const generateLessonsFromArticle = async (article, category, level) => {
    const lessonPrompts = [
      `Explain the fundamentals of ${article.title} for ${level} crypto learners`,
      `Describe practical applications of ${article.title} in ${category}`,
      `Analyze the market impact of ${article.title}`,
      `Create hands-on exercises for ${article.title} concepts`
    ];

    const lessons = [];
    
    for (let i = 0; i < lessonPrompts.length; i++) {
      try {
        const result = await callHF(HF_DIALOGPT, {
          inputs: lessonPrompts[i],
          parameters: { 
            max_new_tokens: 200,
            temperature: 0.8,
            do_sample: true,
            pad_token_id: 50256
          },
        });

        let lessonContent = '';
        if (Array.isArray(result) && result[0]?.generated_text) {
          lessonContent = result[0].generated_text.replace(lessonPrompts[i], '').trim();
        }

        const lesson = {
          title: `Lesson ${i + 1}: ${generateLessonTitle(article.title, i)}`,
          objective: `Learn about ${article.title} - ${category} concepts`,
          content: lessonContent,
          duration: `${8 + i * 2} min`,
          type: ['theory', 'practical', 'analysis', 'exercise'][i] || 'theory'
        };

        lessons.push(lesson);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(`Failed to generate lesson ${i + 1}:`, e);
      }
    }
    
    return lessons.filter(lesson => lesson.content);
  };

  const generateLessonTitle = (articleTitle, index) => {
    const titleTypes = [
      `Understanding ${articleTitle.split(' ').slice(0, 3).join(' ')}`,
      `Practical Applications`,
      `Market Analysis & Impact`, 
      `Advanced Implementation`
    ];
    return titleTypes[index] || `${articleTitle} Fundamentals`;
  };

  const buildTagsFromArticle = (article, category) => {
    const tags = new Set([category, article.source]);
    
    const content = (article.title + " " + article.description).toLowerCase();
    const keywords = content.match(/\b(bitcoin|ethereum|defi|nft|blockchain|crypto|trading|regulation|security|wallet|token|yield|staking|mining|protocol|exchange|market|investment)\b/g);
    
    if (keywords) {
      keywords.slice(0, 3).forEach(keyword => {
        tags.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      });
    }

    const now = new Date();
    const daysDiff = Math.floor((now - article.pubDate) / (1000 * 60 * 60 * 24));
    if (daysDiff === 0) tags.add('Today');
    else if (daysDiff <= 3) tags.add('Recent');
    else if (daysDiff <= 7) tags.add('This Week');

    return Array.from(tags).slice(0, 5);
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

      const articles = await fetchAllRSSFeeds();
      
      if (articles.length === 0) {
        throw new Error('No articles fetched from RSS feeds');
      }

      const modules = [];
      const maxModules = Math.min(articles.length, 15);

      for (let i = 0; i < maxModules; i++) {
        const article = articles[i];
        try {
          const module = await generateLearningModuleFromArticle(article);
          if (module.lessons && module.lessons.length > 0) {
            modules.push(module);
          }
          
          if (i < maxModules - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (e) {
          console.warn(`Failed to generate module for article: ${article.title}`, e);
        }
      }

      setCache(modules);
      setAllModules(modules);
      setDisplayedModules(modules);
    } catch (e) {
      console.error("buildModules error:", e);
    } finally {
      setLoading(false);
    }
  };

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    clearCache();
    await buildModules(true);
    setIsRefreshing(false);
  };

  const startCourse = (course) => {
    setViewingCourse(course);
    setCurrentLesson(0);
    setCompletedLessons(new Set());
  };

  const nextLesson = () => {
    if (currentLesson < viewingCourse.lessons.length - 1) {
      const newCompleted = new Set(completedLessons);
      newCompleted.add(currentLesson);
      setCompletedLessons(newCompleted);
      setCurrentLesson(currentLesson + 1);
    }
  };

  const prevLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    }
  };

  const completeLesson = () => {
    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson);
    setCompletedLessons(newCompleted);
  };

  const closeCourse = () => {
    setViewingCourse(null);
    setCurrentLesson(0);
    setCompletedLessons(new Set());
  };

  useEffect(() => {
    buildModules();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Generating AI-powered learning modules...</p>
      </div>
    );
  }

  if (viewingCourse) {
    const currentLessonData = viewingCourse.lessons[currentLesson];
    const isCompleted = completedLessons.has(currentLesson);
    const progress = (completedLessons.size / viewingCourse.lessons.length) * 100;

    return (
      <div className="course-viewer">
        <div className="course-header-nav">
          <button onClick={closeCourse} className="back-button">
            <ArrowLeft className="back-icon" />
            Back to Courses
          </button>
          <div className="course-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="progress-text">{completedLessons.size} of {viewingCourse.lessons.length} lessons completed</span>
          </div>
        </div>

        <div className="course-content">
          <div className="lesson-sidebar">
            <div className="course-info">
              <h2 className="course-title-view">{viewingCourse.title}</h2>
              <p className="course-subtitle-view">{viewingCourse.subtitle}</p>
              <div className="course-stats">
                <div className="stat">
                  <Clock className="stat-icon" />
                  <span>{viewingCourse.duration}</span>
                </div>
                <div className="stat">
                  <BookOpen className="stat-icon" />
                  <span>{viewingCourse.lessons.length} lessons</span>
                </div>
                <div className="stat">
                  <Star className="stat-icon" />
                  <span>{viewingCourse.rating}</span>
                </div>
              </div>
            </div>

            <div className="lessons-list">
              <h3 className="lessons-title">Course Content</h3>
              {viewingCourse.lessons.map((lesson, index) => (
                <div
                  key={index}
                  className={`lesson-item ${index === currentLesson ? 'active' : ''} ${completedLessons.has(index) ? 'completed' : ''}`}
                  onClick={() => setCurrentLesson(index)}
                >
                  <div className="lesson-number">
                    {completedLessons.has(index) ? (
                      <CheckCircle className="lesson-icon completed-icon" />
                    ) : (
                      <span className="lesson-num">{index + 1}</span>
                    )}
                  </div>
                  <div className="lesson-info">
                    <h4 className="lesson-title">{lesson.title}</h4>
                    <p className="lesson-duration">{lesson.duration}</p>
                  </div>
                  {index === currentLesson && (
                    <Play className="lesson-playing" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lesson-content">
            <div className="lesson-header">
              <div className="lesson-meta">
                <span className="lesson-type">{currentLessonData.type}</span>
                <span className="lesson-duration">{currentLessonData.duration}</span>
              </div>
              <h1 className="lesson-title-main">{currentLessonData.title}</h1>
              <p className="lesson-objective">
                <Target className="objective-icon" />
                {currentLessonData.objective}
              </p>
            </div>

            <div className="lesson-body">
              <div className="content-section">
                <h3 className="content-title">
                  <Brain className="section-icon" />
                  Learning Content
                </h3>
                <div className="content-text">
                  {currentLessonData.content ? (
                    <p>{currentLessonData.content}</p>
                  ) : (
                    <div className="content-placeholder">
                      <Lightbulb className="placeholder-icon" />
                      <p>Content is being generated by AI. This lesson will cover {currentLessonData.objective}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lesson-actions">
                <div className="navigation-buttons">
                  <button
                    onClick={prevLesson}
                    disabled={currentLesson === 0}
                    className="nav-button prev"
                  >
                    <ChevronLeft className="nav-icon" />
                    Previous
                  </button>

                  {!isCompleted && (
                    <button
                      onClick={completeLesson}
                      className="complete-button"
                    >
                      <Check className="complete-icon" />
                      Mark Complete
                    </button>
                  )}

                  <button
                    onClick={nextLesson}
                    disabled={currentLesson === viewingCourse.lessons.length - 1}
                    className="nav-button next"
                  >
                    Next
                    <ChevronRight className="nav-icon" />
                  </button>
                </div>

                {currentLesson === viewingCourse.lessons.length - 1 && completedLessons.has(currentLesson) && (
                  <div className="course-complete">
                    <Trophy className="trophy-icon" />
                    <h3>Congratulations!</h3>
                    <p>You've completed this course. Check out the original article for more details.</p>
                    <a
                      href={viewingCourse.originalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="original-link"
                    >
                      View Original Article
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="learn-container">
      <div className="learn-content">
        {/* Header Section */}
        <div className="header-section">
          <div className="header-content">
            <h1 className="main-title">BiTry Learn</h1>
            <p className="main-description">
              AI-powered learning modules from real-world crypto insights.
            </p>
            {/* Search and Filters */}
            <div className="search-filters">
              <div className="search-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search courses, topics, or modules"
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
                </div>
                <h3 className="course-title">{course.title}</h3>
                <p className="course-subtitle">{course.subtitle}</p>
                <p className="course-description">{course.description}</p>
                {course.publishDate && (
                  <p className="course-date" style={{fontSize: '0.85rem', color: '#666', marginTop: '4px'}}>
                  </p>
                )}
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
                  onClick={() => startCourse(course)}
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
              Try adjusting your search criteria.
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
                <div className="stat-label">AI-Generated Modules</div>
              </div>
              <div className="stat-item">
                <div className="stat-number stat-purple">
                  {displayedModules.reduce((sum, m) => sum + m.lessons.length, 0)}
                </div>
                <div className="stat-label">Total Lessons</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}