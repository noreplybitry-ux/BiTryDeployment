import React, { useState, useEffect } from "react";
import {
  Search,
  Clock,
  Users,
  BookOpen,
  Award,
  ChevronRight,
  Filter,
  RefreshCw,
  Loader,
  AlertCircle,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import CourseViewer from "./CourseViewer";

// Multiple AI APIs for better content generation
const AI_APIS = [
  {
    name: "huggingface",
    baseUrl: "https://api-inference.huggingface.co/models/",
    models: {
      text: "microsoft/DialoGPT-large",
      summary: "facebook/bart-large-cnn",
      qa: "distilbert-base-cased-distilled-squad",
    },
    headers: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    }),
  },
];

const HUGGINGFACE_API_KEY = "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";

const CATEGORIES = [
  "all",
  "Blockchain Fundamentals",
  "DeFi & Protocols",
  "Trading & Analysis",
  "Security & Privacy",
  "Investment Strategies",
  "Regulation & Compliance",
];

const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];

const CACHE_KEY = "bitry_ai_learning_modules";
const QUIZ_CACHE_KEY = "bitry_ai_quiz_pool";
const CACHE_DURATION = 8 * 60 * 60 * 1000; // 8 hours

export default function Learn() {
  const [allModules, setAllModules] = useState([]);
  const [displayedModules, setDisplayedModules] = useState([]);
  const [quizPool, setQuizPool] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customModuleForm, setCustomModuleForm] = useState({
    title: "",
    description: "",
    category: "Blockchain Fundamentals",
    level: "Beginner",
    focusAreas: "",
    specificTopics: "",
  });
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
    status: "",
  });

  // Cache management (using React state instead of localStorage)
  const [moduleCache, setModuleCache] = useState(null);
  const [quizCache, setQuizCache] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(0);

  const getCache = (key) => {
    if (Date.now() - cacheTimestamp > CACHE_DURATION) return null;
    return key === CACHE_KEY ? moduleCache : quizCache;
  };

  const setCache = (key, data) => {
    if (key === CACHE_KEY) {
      setModuleCache(data);
    } else {
      setQuizCache(data);
    }
    setCacheTimestamp(Date.now());
  };

  // Enhanced AI API caller with retry logic
  const callAI = async (prompt, type = "text", retries = 3) => {
    const api = AI_APIS[0]; // Using Hugging Face
    const model = api.models[type] || api.models.text;
    const url = api.baseUrl + model;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const payload = {
          inputs: prompt,
          parameters: {
            max_new_tokens: type === "summary" ? 150 : 200,
            temperature: 0.8,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.1,
            pad_token_id: 50256,
          },
          options: {
            wait_for_model: true,
          },
        };

        const response = await fetch(url, {
          method: "POST",
          headers: api.headers(HUGGINGFACE_API_KEY),
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result) && result[0]?.generated_text) {
            let generated = result[0].generated_text.replace(prompt, "").trim();
            // Clean up the response
            generated = generated.replace(/^\W+/, "").replace(/\s+/g, " ");
            return generated || "Content generated successfully.";
          }
          // Some HF models return string directly
          if (result.generated_text) {
            return result.generated_text;
          }
          return "AI-generated content placeholder.";
        }

        if (response.status === 503 && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
          continue;
        }

        throw new Error(`API Error: ${response.status}`);
      } catch (error) {
        if (attempt === retries) {
          console.warn(
            `AI generation failed after ${retries} attempts:`,
            error
          );
          return `AI-generated content for: ${prompt.substring(0, 50)}...`;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  };

  // Generate a custom module based on user input
  const generateCustomModule = async (formData) => {
    setIsGeneratingCustom(true);
    setGenerationProgress({
      current: 0,
      total: 5,
      status: "Initializing custom module generation...",
    });

    try {
      // Enhanced prompt based on user input
      const customPrompt = `Create a comprehensive ${
        formData.level
      } level course about "${formData.title}" in the ${
        formData.category
      } category. 
      
      Course Description: ${formData.description}
      ${formData.focusAreas ? `Focus Areas: ${formData.focusAreas}` : ""}
      ${
        formData.specificTopics
          ? `Specific Topics to Cover: ${formData.specificTopics}`
          : ""
      }
      
      Generate detailed educational content that covers the fundamentals, practical applications, and real-world examples. Make it engaging and suitable for ${
        formData.level
      } level learners.`;

      setGenerationProgress((prev) => ({
        ...prev,
        current: 1,
        status: "Generating course structure...",
      }));

      // Generate enhanced course description
      const enhancedDescription = await callAI(customPrompt);

      setGenerationProgress((prev) => ({
        ...prev,
        current: 2,
        status: "Creating detailed lessons...",
      }));

      // Generate lessons with custom focus
      const customLessons = await generateCustomLessons(
        formData.title,
        formData.category,
        formData.level,
        formData.focusAreas,
        formData.specificTopics
      );

      setGenerationProgress((prev) => ({
        ...prev,
        current: 3,
        status: "Generating quiz questions...",
      }));

      // Generate custom quizzes
      const customQuizzes = await generateCustomQuizzes(
        formData.title,
        formData.category,
        formData.level,
        customLessons,
        formData.specificTopics
      );

      setGenerationProgress((prev) => ({
        ...prev,
        current: 4,
        status: "Finalizing custom module...",
      }));

      // Generate custom tags
      const customTags = await generateTags(formData.title, formData.category);

      // Calculate metrics
      const duration = `${3 + Math.floor(customLessons.length * 0.7)} hours`;
      const enrolled = 50 + Math.floor(Math.random() * 500); // Lower for custom modules
      const rating = (4.2 + Math.random() * 0.8).toFixed(1);

      const customModule = {
        id: `custom-module-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        title: formData.title,
        subtitle: `${formData.category} • ${formData.level} Level • Custom AI Generated`,
        description: enhancedDescription.slice(0, 200) + "...",
        level: formData.level,
        category: formData.category,
        duration,
        modules: customLessons.length,
        enrolled,
        rating: parseFloat(rating),
        tags: [...customTags, "Custom Generated", "User Requested"],
        lessons: customLessons,
        quizzes: customQuizzes,
        source: "Custom AI Generated",
        originalLink: "",
        publishDate: new Date(),
        aiGenerated: true,
        isCustom: true,
        customRequest: {
          originalTitle: formData.title,
          originalDescription: formData.description,
          focusAreas: formData.focusAreas,
          specificTopics: formData.specificTopics,
        },
      };

      setGenerationProgress((prev) => ({
        ...prev,
        current: 5,
        status: "Custom module generated successfully!",
      }));

      // Add to modules list
      const updatedModules = [customModule, ...allModules];
      setAllModules(updatedModules);
      setDisplayedModules(updatedModules);

      // Add quizzes to pool
      const updatedQuizPool = {
        ...quizPool,
        [customModule.id]: customModule.quizzes,
      };
      setQuizPool(updatedQuizPool);

      // Update cache
      setCache(CACHE_KEY, updatedModules);
      setCache(QUIZ_CACHE_KEY, updatedQuizPool);

      // Close form and show success
      setShowCustomForm(false);
      setCustomModuleForm({
        title: "",
        description: "",
        category: "Blockchain Fundamentals",
        level: "Beginner",
        focusAreas: "",
        specificTopics: "",
      });

      setTimeout(() => {
        setGenerationProgress({ current: 0, total: 0, status: "" });
      }, 3000);
    } catch (error) {
      console.error("Custom module generation error:", error);
      setGenerationProgress({
        current: 0,
        total: 0,
        status: "Error generating custom module. Please try again.",
      });
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  // Generate custom lessons based on user specifications
  const generateCustomLessons = async (
    title,
    category,
    level,
    focusAreas,
    specificTopics
  ) => {
    const customLessonPrompts = [
      `Create a foundational lesson for "${title}" covering basic concepts and definitions. Level: ${level}. ${
        focusAreas ? `Focus on: ${focusAreas}` : ""
      }`,
      `Design a practical application lesson for "${title}" with hands-on examples and use cases. Level: ${level}. ${
        specificTopics ? `Include: ${specificTopics}` : ""
      }`,
      `Develop an advanced analysis lesson for "${title}" covering market dynamics and real-world scenarios. Level: ${level}.`,
      `Create an interactive exercise lesson for "${title}" with practice problems and implementations. Level: ${level}.`,
    ];

    const lessons = [];

    for (let i = 0; i < customLessonPrompts.length; i++) {
      const content = await callAI(customLessonPrompts[i]);
      const lessonTitlePrompt = `Generate a concise, engaging lesson title for: ${customLessonPrompts[i]}`;
      const lessonTitle = await callAI(lessonTitlePrompt);

      const lesson = {
        id: `custom-lesson-${Date.now()}-${i}`,
        title:
          lessonTitle
            .split("\n")[0]
            .replace(/^[^\w]+/, "")
            .trim() || `Custom Lesson ${i + 1}`,
        objective: `Master key concepts of ${title} through ${
          [
            "foundational understanding",
            "practical application",
            "advanced analysis",
            "interactive practice",
          ][i]
        }`,
        content: content,
        duration: `${12 + i * 3} min`,
        type: ["theory", "practical", "analysis", "exercise"][i],
        completed: false,
        isCustom: true,
      };

      lessons.push(lesson);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return lessons;
  };

  // Generate custom quizzes with specific focus
  const generateCustomQuizzes = async (
    title,
    category,
    level,
    lessons,
    specificTopics
  ) => {
    const customQuizPrompt = `Generate 6 comprehensive multiple choice questions about "${title}" in ${category} for ${level} level learners. 
    ${specificTopics ? `Focus specifically on: ${specificTopics}` : ""}
    
    Format each question with:
    Question: [question]
    A) [option]
    B) [option] 
    C) [option]
    D) [option]
    Correct: [letter]
    
    Make questions practical and test real understanding, not just memorization.`;

    const quizContent = await callAI(customQuizPrompt);
    const questions = [];

    // Parse the AI-generated quiz content
    const lines = quizContent.split("\n").filter((line) => line.trim());
    let currentQuestion = null;

    for (const line of lines) {
      if (line.toLowerCase().includes("question:")) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          id: `custom-quiz-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          question: line.replace(/^.*question:\s*/i, "").trim(),
          options: [],
          correct: "",
          difficulty: level,
          category: category,
          isCustom: true,
        };
      } else if (currentQuestion && /^[A-D]\)/.test(line.trim())) {
        const option = line.replace(/^[A-D]\)\s*/, "").trim();
        currentQuestion.options.push(option);
      } else if (currentQuestion && line.toLowerCase().includes("correct:")) {
        currentQuestion.correct = line
          .replace(/^.*correct:\s*/i, "")
          .trim()
          .toUpperCase();
      }
    }

    if (currentQuestion) questions.push(currentQuestion);

    // If parsing failed, generate fallback questions
    if (questions.length < 3) {
      const fallbackQuestions = [
        {
          id: `custom-quiz-fallback-${Date.now()}-1`,
          question: `What is the primary focus of ${title}?`,
          options: [
            "Understanding core concepts and applications",
            "Memorizing technical definitions only",
            "Following traditional financial models",
            "Avoiding practical implementations",
          ],
          correct: "A",
          difficulty: level,
          category: category,
          isCustom: true,
        },
        {
          id: `custom-quiz-fallback-${Date.now()}-2`,
          question: `Which approach is most effective for learning ${title}?`,
          options: [
            "Theory only without practice",
            "Combining theory with hands-on practice",
            "Avoiding complex topics entirely",
            "Following outdated methodologies",
          ],
          correct: "B",
          difficulty: level,
          category: category,
          isCustom: true,
        },
      ];
      questions.push(...fallbackQuestions);
    }

    return questions;
  };

  // --- NEW: Binance Academy RSS fetch + summarization ---
  // Try direct fetch, then fallback to AllOrigins proxy for CORS
  const BINANCE_RSS_URL = "https://academy.binance.com/en/rss";

  const fetchBinanceRSS = async () => {
    try {
      // Try direct fetch first
      let res = await fetch(BINANCE_RSS_URL, { method: "GET" });
      if (!res.ok) {
        // fallback to proxy for CORS
        const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(
          BINANCE_RSS_URL
        )}`;
        res = await fetch(proxied, { method: "GET" });
      }
      if (!res.ok) throw new Error("Failed to fetch RSS");
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0, 12); // limit
      const articles = items.map((it) => {
        return {
          title: it.querySelector("title")?.textContent || "",
          link: it.querySelector("link")?.textContent || "",
          pubDate: it.querySelector("pubDate")?.textContent || "",
          description:
            it.querySelector("description")?.textContent ||
            it.querySelector("content\\:encoded")?.textContent ||
            "",
        };
      });
      return articles;
    } catch (err) {
      console.warn("Binance RSS fetch failed:", err.message);
      return [];
    }
  };

  // Summarize a Binance article using callAI (summary model)
  const summarizeArticle = async (article) => {
    const prompt = `Summarize the following article into a short teaching module foundation. Output a one-line title (if different), a 2-3 sentence summary, and 3 bullet learning points. Article title: "${article.title}" Article description/excerpt: "${article.description}" Link: ${article.link}`;
    try {
      const summary = await callAI(prompt, "summary", 2);
      return {
        source: "Binance Academy",
        title: article.title,
        link: article.link,
        pubDate: article.pubDate,
        rawDescription: article.description,
        summary,
      };
    } catch (e) {
      return {
        source: "Binance Academy",
        title: article.title,
        link: article.link,
        pubDate: article.pubDate,
        rawDescription: article.description,
        summary: article.description.slice(0, 300),
      };
    }
  };

  // Generate comprehensive learning topics using AI (keeps your original prompts)
  const generateLearningTopics = async () => {
    const topicPrompts = [
      "Generate a comprehensive cryptocurrency trading course title and description for beginners",
      "Create an advanced DeFi protocol analysis course with practical applications",
      "Design a blockchain security fundamentals course covering wallet safety and best practices",
      "Develop an intermediate investment strategy course for crypto portfolios",
      "Build a regulation compliance course for cryptocurrency businesses",
      "Create a technical analysis course for cryptocurrency markets",
      "Design an NFT and digital assets course for creators",
      "Develop a cryptocurrency mining and staking educational module",
      "Build a smart contracts development course for beginners",
      "Create a crypto tax and accounting educational program",
    ];

    const topics = [];
    for (let i = 0; i < topicPrompts.length; i++) {
      setGenerationProgress({
        current: i + 1,
        total: topicPrompts.length,
        status: "Generating course topics...",
      });

      const content = await callAI(topicPrompts[i]);
      const lines = content.split("\n").filter((line) => line.trim());

      if (lines.length >= 2) {
        topics.push({
          title: lines[0].replace(/^[^\w]+/, "").trim(),
          description: lines.slice(1).join(" ").trim(),
        });
      } else {
        topics.push({
          title: `Cryptocurrency Course ${i + 1}`,
          description: content,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return topics;
  };

  // Generate detailed lessons for a module
  const generateLessons = async (title, category, level) => {
    const lessonTypes = [
      { type: "theory", focus: "fundamental concepts and definitions" },
      { type: "practical", focus: "hands-on applications and examples" },
      { type: "analysis", focus: "market analysis and real-world scenarios" },
      { type: "exercise", focus: "practice problems and implementations" },
    ];

    const lessons = [];

    for (let i = 0; i < lessonTypes.length; i++) {
      const lessonType = lessonTypes[i];
      const prompt = `Create a detailed ${level} level lesson about ${title} in ${category}. Focus on ${lessonType.focus}. Include learning objectives, key concepts, and practical examples. Make it educational and engaging.`;

      const content = await callAI(prompt);
      const lessonTitle = await callAI(
        `Generate a concise lesson title for: ${title} - ${lessonType.focus}`
      );

      const lesson = {
        id: `lesson-${Date.now()}-${i}`,
        title:
          lessonTitle
            .split("\n")[0]
            .replace(/^[^\w]+/, "")
            .trim() || `Lesson ${i + 1}: ${lessonType.type}`,
        objective: `Master ${lessonType.focus} related to ${title}`,
        content: content,
        duration: `${10 + i * 5} min`,
        type: lessonType.type,
        completed: false,
      };

      lessons.push(lesson);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    return lessons;
  };

  // Generate quiz questions for a module
  const generateQuizzes = async (title, category, level, lessons) => {
    const quizPrompt = `Generate 5 multiple choice questions about ${title} in ${category} for ${level} level learners. Format each question with: Question: [question] A) [option] B) [option] C) [option] D) [option] Correct: [letter]`;

    const quizContent = await callAI(quizPrompt);
    const questions = [];

    // Parse the AI-generated quiz content
    const lines = quizContent.split("\n").filter((line) => line.trim());
    let currentQuestion = null;

    for (const line of lines) {
      if (line.toLowerCase().includes("question:")) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          id: `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          question: line.replace(/^.*question:\s*/i, "").trim(),
          options: [],
          correct: "",
          difficulty: level,
          category: category,
        };
      } else if (currentQuestion && /^[A-D]\)/.test(line.trim())) {
        const option = line.replace(/^[A-D]\)\s*/, "").trim();
        currentQuestion.options.push(option);
      } else if (currentQuestion && line.toLowerCase().includes("correct:")) {
        currentQuestion.correct = line
          .replace(/^.*correct:\s*/i, "")
          .trim()
          .toUpperCase();
      }
    }

    if (currentQuestion) questions.push(currentQuestion);

    // If parsing failed, generate fallback questions
    if (questions.length === 0) {
      for (let i = 0; i < 3; i++) {
        questions.push({
          id: `quiz-${Date.now()}-${i}`,
          question: `What is the main concept covered in ${title}?`,
          options: [
            "Blockchain technology fundamentals",
            "Traditional financial systems",
            "Social media marketing",
            "Real estate investment",
          ],
          correct: "A",
          difficulty: level,
          category: category,
        });
      }
    }

    return questions;
  };

  // Generate a complete learning module
  const generateModule = async (topic, index) => {
    const categories = CATEGORIES.slice(1);
    const levels = DIFFICULTY_LEVELS;

    const category = categories[index % categories.length];
    const level = levels[index % levels.length];

    setGenerationProgress((prev) => ({
      ...prev,
      status: `Generating ${topic.title}...`,
    }));

    // Generate lessons
    const lessons = await generateLessons(topic.title, category, level);

    // Generate quizzes
    const quizzes = await generateQuizzes(
      topic.title,
      category,
      level,
      lessons
    );

    // Calculate metrics
    const duration = `${2 + Math.floor(lessons.length * 0.5)} hours`;
    const enrolled = 150 + Math.floor(Math.random() * 3000);
    const rating = (4.0 + Math.random() * 1.0).toFixed(1);

    const module = {
      id: `ai-module-${Date.now()}-${index}`,
      title: topic.title,
      subtitle: `${category} • ${level} Level • AI Generated`,
      description: topic.description,
      level,
      category,
      duration,
      modules: lessons.length,
      enrolled,
      rating: parseFloat(rating),
      tags: await generateTags(topic.title, category),
      lessons,
      quizzes,
      source: topic.source || "AI Generated",
      originalLink: topic.link || "",
      publishDate: topic.pubDate ? new Date(topic.pubDate) : new Date(),
      aiGenerated: true,
    };

    return module;
  };

  // Generate relevant tags
  const generateTags = async (title, category) => {
    const tagPrompt = `Generate 5 relevant tags for a course titled "${title}" in category "${category}". List them separated by commas.`;
    const tagsText = await callAI(tagPrompt);

    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim().replace(/^[^\w]+/, ""))
      .filter((tag) => tag.length > 0 && tag.length < 20)
      .slice(0, 5);

    if (tags.length === 0) {
      return [category, "Cryptocurrency", "Education", "AI Generated"];
    }

    return tags;
  };

  // Main function to build AI modules (now integrates Binance Academy)
  const buildAIModules = async (forceReload = false) => {
    setLoading(true);
    try {
      if (!forceReload) {
        const cachedModules = getCache(CACHE_KEY);
        const cachedQuizzes = getCache(QUIZ_CACHE_KEY);

        if (cachedModules && cachedQuizzes) {
          setAllModules(cachedModules);
          setDisplayedModules(cachedModules);
          setQuizPool(cachedQuizzes);
          setLoading(false);
          return;
        }
      }

      // --- NEW: Fetch Binance articles and summarize them ---
      setGenerationProgress({
        current: 0,
        total: 0,
        status: "Fetching Binance Academy articles...",
      });

      const rawArticles = await fetchBinanceRSS();
      const summarized = [];
      for (let i = 0; i < rawArticles.length; i++) {
        setGenerationProgress((prev) => ({
          ...prev,
          status: `Summarizing Binance article ${i + 1} of ${
            rawArticles.length
          }...`,
        }));
        const s = await summarizeArticle(rawArticles[i]);
        // Convert summary into a topic object that generateModule expects
        summarized.push({
          title: s.title,
          description: s.summary,
          link: s.link,
          pubDate: s.pubDate,
          source: s.source,
        });
        // small delay so we don't hammer HF requests
        await new Promise((r) => setTimeout(r, 600));
      }

      // Generate learning topics (AI prompts) as fallback/augmentation
      const aiTopics = await generateLearningTopics();

      // Merge Binance-based topics first, then AI topics to form final topic list
      const topics = [...summarized, ...aiTopics].slice(0, 12);

      // Generate modules from topics
      const modules = [];
      const allQuizzes = {};

      setGenerationProgress({
        current: 0,
        total: topics.length,
        status: "Generating learning modules...",
      });

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const module = await generateModule(topic, i);
        modules.push(module);

        // Add quizzes to pool
        allQuizzes[module.id] = module.quizzes;

        setGenerationProgress({
          current: i + 1,
          total: topics.length,
          status: `Generated ${i + 1} of ${topics.length} modules`,
        });

        // Delay between module generations
        if (i < topics.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      // Cache the results
      setCache(CACHE_KEY, modules);
      setCache(QUIZ_CACHE_KEY, allQuizzes);

      setAllModules(modules);
      setDisplayedModules(modules);
      setQuizPool(allQuizzes);
    } catch (error) {
      console.error("AI module generation error:", error);
      setGenerationProgress({
        current: 0,
        total: 0,
        status: "Error generating modules. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Search and filter functions
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

    if (level !== "all") {
      filtered = filtered.filter((course) => course.level === level);
    }

    if (category !== "all") {
      filtered = filtered.filter((course) => course.category === category);
    }

    setDisplayedModules(filtered);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setModuleCache(null);
    setQuizCache(null);
    setCacheTimestamp(0);
    await buildAIModules(true);
    setIsRefreshing(false);
  };

  const startCourse = (course) => {
    setViewingCourse(course);
  };

  const closeCourse = () => {
    setViewingCourse(null);
  };

  const handleCustomFormSubmit = (e) => {
    e.preventDefault();
    if (
      !customModuleForm.title.trim() ||
      !customModuleForm.description.trim()
    ) {
      alert("Please fill in at least the title and description fields.");
      return;
    }
    generateCustomModule(customModuleForm);
  };

  const handleCustomFormChange = (field, value) => {
    setCustomModuleForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    buildAIModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div
        className="loading-container"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
          padding: "2rem",
        }}
      >
        <div
          className="loading-spinner"
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid #f3f4f6",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "1rem",
          }}
        ></div>
        <h3 style={{ color: "#1f2937", marginBottom: "0.5rem" }}>
          AI is generating your learning modules...
        </h3>
        <p
          style={{
            color: "#6b7280",
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          {generationProgress.status}
        </p>
        {generationProgress.total > 0 && (
          <div
            style={{
              width: "300px",
              height: "8px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${
                  (generationProgress.current / generationProgress.total) * 100
                }%`,
                height: "100%",
                backgroundColor: "#3b82f6",
                transition: "width 0.3s ease",
              }}
            ></div>
          </div>
        )}
        <p
          style={{
            color: "#9ca3af",
            fontSize: "0.875rem",
            marginTop: "0.5rem",
          }}
        >
          This may take a few minutes...
        </p>
      </div>
    );
  }

  if (viewingCourse) {
    return (
      <CourseViewer
        course={viewingCourse}
        onClose={closeCourse}
        quizzes={quizPool[viewingCourse.id] || []}
      />
    );
  }

  return (
    <div
      className="learn-container"
      style={{
        padding: "2rem",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <div className="learn-content">
        {/* Header Section */}
        <div className="header-section" style={{ marginBottom: "2rem" }}>
          <div
            className="header-content"
            style={{ textAlign: "center", marginBottom: "2rem" }}
          >
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "0.5rem",
              }}
            >
              BiTry AI Learn
            </h1>
            <p
              style={{
                fontSize: "1.125rem",
                color: "#6b7280",
                marginBottom: "2rem",
              }}
            >
              100% AI-generated cryptocurrency learning modules tailored to your
              level
            </p>

            {/* Search and Filters */}
            <div
              className="search-filters"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              <div
                className="search-container"
                style={{ position: "relative" }}
              >
                <Search
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    width: "20px",
                    height: "20px",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search AI-generated courses..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 44px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "1rem",
                  }}
                />
              </div>

              <div
                className="filters-container"
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Filter
                    style={{ width: "16px", height: "16px", color: "#6b7280" }}
                  />
                  <span style={{ color: "#374151", fontWeight: "500" }}>
                    Filters:
                  </span>
                </div>

                <select
                  value={selectedLevel}
                  onChange={(e) => handleLevelFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: "white",
                  }}
                >
                  <option value="all">All Levels</option>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: "white",
                  }}
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
                  disabled={isRefreshing}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "8px 16px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: isRefreshing ? "not-allowed" : "pointer",
                    opacity: isRefreshing ? 0.6 : 1,
                  }}
                >
                  <RefreshCw
                    style={{
                      width: "16px",
                      height: "16px",
                      animation: isRefreshing
                        ? "spin 1s linear infinite"
                        : "none",
                    }}
                  />
                  {isRefreshing ? "Generating..." : "Refresh AI Modules"}
                </button>

                <button
                  onClick={() => setShowCustomForm(true)}
                  disabled={isGeneratingCustom}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "8px 16px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: isGeneratingCustom ? "not-allowed" : "pointer",
                    opacity: isGeneratingCustom ? 0.6 : 1,
                  }}
                >
                  <Plus style={{ width: "16px", height: "16px" }} />
                  Generate Custom Module
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Module Generation Form Modal */}
        {showCustomForm && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "2rem",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
            >
              {/* Form Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Sparkles
                    style={{
                      width: "24px",
                      height: "24px",
                      color: "#10b981",
                    }}
                  />
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#1f2937",
                      margin: 0,
                    }}
                  >
                    Generate Custom AI Module
                  </h2>
                </div>
                <button
                  onClick={() => setShowCustomForm(false)}
                  disabled={isGeneratingCustom}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <X style={{ width: "24px", height: "24px" }} />
                </button>
              </div>

              {/* Generation Progress */}
              {isGeneratingCustom && (
                <div
                  style={{
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    backgroundColor: "#f0f9ff",
                    borderRadius: "8px",
                    border: "1px solid #bae6fd",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid #3b82f6",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    <span style={{ color: "#1e40af", fontWeight: "500" }}>
                      {generationProgress.status}
                    </span>
                  </div>
                  {generationProgress.total > 0 && (
                    <div
                      style={{
                        width: "100%",
                        height: "6px",
                        backgroundColor: "#dbeafe",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${
                            (generationProgress.current /
                              generationProgress.total) *
                            100
                          }%`,
                          height: "100%",
                          backgroundColor: "#3b82f6",
                          transition: "width 0.3s ease",
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleCustomFormSubmit}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  {/* Title Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Module Title *
                    </label>
                    <input
                      type="text"
                      value={customModuleForm.title}
                      onChange={(e) =>
                        handleCustomFormChange("title", e.target.value)
                      }
                      placeholder="e.g., Advanced DeFi Yield Farming Strategies"
                      disabled={isGeneratingCustom}
                      required
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        backgroundColor: isGeneratingCustom
                          ? "#f9fafb"
                          : "white",
                      }}
                    />
                  </div>

                  {/* Description Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Module Description *
                    </label>
                    <textarea
                      value={customModuleForm.description}
                      onChange={(e) =>
                        handleCustomFormChange("description", e.target.value)
                      }
                      placeholder="Describe what this module should teach and its main objectives..."
                      disabled={isGeneratingCustom}
                      required
                      rows={4}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        backgroundColor: isGeneratingCustom
                          ? "#f9fafb"
                          : "white",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Category and Level Row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Category
                      </label>
                      <select
                        value={customModuleForm.category}
                        onChange={(e) =>
                          handleCustomFormChange("category", e.target.value)
                        }
                        disabled={isGeneratingCustom}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          fontSize: "1rem",
                          backgroundColor: isGeneratingCustom
                            ? "#f9fafb"
                            : "white",
                        }}
                      >
                        {CATEGORIES.slice(1).map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#374151",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Difficulty Level
                      </label>
                      <select
                        value={customModuleForm.level}
                        onChange={(e) =>
                          handleCustomFormChange("level", e.target.value)
                        }
                        disabled={isGeneratingCustom}
                        style={{
                          width: "100%",
                          padding: "12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          fontSize: "1rem",
                          backgroundColor: isGeneratingCustom
                            ? "#f9fafb"
                            : "white",
                        }}
                      >
                        {DIFFICULTY_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Focus Areas Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Focus Areas{" "}
                      <span style={{ color: "#6b7280", fontWeight: "normal" }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={customModuleForm.focusAreas}
                      onChange={(e) =>
                        handleCustomFormChange("focusAreas", e.target.value)
                      }
                      placeholder="e.g., Risk management, Portfolio optimization, Market analysis"
                      disabled={isGeneratingCustom}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        backgroundColor: isGeneratingCustom
                          ? "#f9fafb"
                          : "white",
                      }}
                    />
                  </div>

                  {/* Specific Topics Field */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Specific Topics to Cover{" "}
                      <span style={{ color: "#6b7280", fontWeight: "normal" }}>
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={customModuleForm.specificTopics}
                      onChange={(e) =>
                        handleCustomFormChange("specificTopics", e.target.value)
                      }
                      placeholder="List specific topics, technologies, or concepts you want covered..."
                      disabled={isGeneratingCustom}
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        backgroundColor: isGeneratingCustom
                          ? "#f9fafb"
                          : "white",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  {/* Form Actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      justifyContent: "flex-end",
                      paddingTop: "1rem",
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(false)}
                      disabled={isGeneratingCustom}
                      style={{
                        padding: "12px 24px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        backgroundColor: "white",
                        color: "#374151",
                        cursor: isGeneratingCustom ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        opacity: isGeneratingCustom ? 0.6 : 1,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isGeneratingCustom ||
                        !customModuleForm.title.trim() ||
                        !customModuleForm.description.trim()
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "12px 24px",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor:
                          isGeneratingCustom ||
                          !customModuleForm.title.trim() ||
                          !customModuleForm.description.trim()
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        opacity:
                          isGeneratingCustom ||
                          !customModuleForm.title.trim() ||
                          !customModuleForm.description.trim()
                            ? 0.6
                            : 1,
                      }}
                    >
                      <Sparkles style={{ width: "16px", height: "16px" }} />
                      {isGeneratingCustom
                        ? "Generating..."
                        : "Generate AI Module"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Help Text */}
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h4
                  style={{
                    color: "#374151",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  💡 Tips for Better AI Generation:
                </h4>
                <ul
                  style={{
                    color: "#6b7280",
                    fontSize: "0.8rem",
                    margin: 0,
                    paddingLeft: "1.25rem",
                  }}
                >
                  <li>Be specific about what you want to learn</li>
                  <li>Include relevant keywords and technologies</li>
                  <li>Mention any particular use cases or examples you want</li>
                  <li>
                    The AI will create 4 lessons and multiple quiz questions
                    automatically
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Course Grid */}
        <div
          className="course-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {displayedModules.map((course) => (
            <div
              key={course.id}
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
            >
              {/* Course Header */}
              <div className="course-header" style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.75rem",
                  }}
                >
                  <span
                    style={{
                      padding: "4px 12px",
                      backgroundColor:
                        course.level === "Beginner"
                          ? "#dbeafe"
                          : course.level === "Intermediate"
                          ? "#fef3c7"
                          : "#fecaca",
                      color:
                        course.level === "Beginner"
                          ? "#1e40af"
                          : course.level === "Intermediate"
                          ? "#92400e"
                          : "#b91c1c",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    {course.level}
                  </span>
                  <div
                    style={{
                      padding: "4px 8px",
                      backgroundColor: course.isCustom ? "#dcfce7" : "#f3f4f6",
                      color: course.isCustom ? "#15803d" : "#374151",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {course.isCustom && (
                      <Sparkles style={{ width: "12px", height: "12px" }} />
                    )}
                    {course.source || "AI Generated"}
                  </div>
                </div>

                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "#1f2937",
                    marginBottom: "0.5rem",
                    lineHeight: "1.4",
                  }}
                >
                  {course.title}
                </h3>

                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "0.75rem",
                  }}
                >
                  {course.subtitle}
                </p>

                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#374151",
                    lineHeight: "1.5",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {course.description}
                </p>
              </div>

              {/* Course Details */}
              <div className="course-details">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Clock
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "#6b7280",
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                      {course.duration}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <BookOpen
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "#6b7280",
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                      {course.modules} lessons
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Users
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "#6b7280",
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                      {course.enrolled} enrolled
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Award
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "#f59e0b",
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                      {course.rating}/5.0
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  {course.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "#f3f4f6",
                        color: "#4b5563",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => startCourse(course)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "12px",
                    backgroundColor: course.isCustom ? "#10b981" : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                >
                  {course.isCustom && (
                    <Sparkles style={{ width: "16px", height: "16px" }} />
                  )}
                  <span>
                    {course.isCustom
                      ? "Start Custom Module"
                      : "Start AI Learning"}
                  </span>
                  <ChevronRight style={{ width: "16px", height: "16px" }} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {displayedModules.length === 0 && !loading && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              color: "#6b7280",
            }}
          >
            <BookOpen
              style={{
                width: "48px",
                height: "48px",
                margin: "0 auto 1rem",
                color: "#9ca3af",
              }}
            />
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "0.5rem",
              }}
            >
              No AI modules found
            </h3>
            <p>
              Try adjusting your search criteria or refresh to generate new
              modules.
            </p>
          </div>
        )}

        {/* Footer Stats */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "2rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "2rem",
              textAlign: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#3b82f6",
                  marginBottom: "0.5rem",
                }}
              >
                {displayedModules.length}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                AI-Generated Modules
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#10b981",
                  marginBottom: "0.5rem",
                }}
              >
                {displayedModules.reduce((sum, m) => sum + m.lessons.length, 0)}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Total AI Lessons
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#f59e0b",
                  marginBottom: "0.5rem",
                }}
              >
                {Object.values(quizPool).reduce(
                  (sum, quizzes) => sum + quizzes.length,
                  0
                )}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                AI Quiz Questions
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#8b5cf6",
                  marginBottom: "0.5rem",
                }}
              >
                {displayedModules.filter((m) => m.isCustom).length}
              </div>
              <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Custom Modules
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
