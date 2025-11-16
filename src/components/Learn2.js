import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../css/Learn2.css";
const MODULE_API_KEY = "AIzaSyAfPzV46k4O46frVq9TihKGEdI_ZAsV4n4";
const TRANSLATION_API_KEY = "AIzaSyDmpndqeG70SC6CjtfwGi40jluwcIHlF-Q";
const QUIZ_API_KEY = "AIzaSyD__yT5oimCLqnFGnLIX-GyiYwiqnlEtmI";
const TAGLISH_QUIZ_API_KEY = "AIzaSyDQ0hiG0G24Euursr639qmRQnmTmzg9Tjg";
const Learn2 = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keywords, setKeywords] = useState([""]);
  const [formData, setFormData] = useState({
    title: "",
    specificPoints: "",
    level: "Beginner",
    length: "Short",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [fetchModulesError, setFetchModulesError] = useState(null);
  const [generatedModules, setGeneratedModules] = useState([]);
  const [fetchGeneratedError, setFetchGeneratedError] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [showGenerateTab, setShowGenerateTab] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isAdminInfoModalOpen, setIsAdminInfoModalOpen] = useState(false);
  // New states for edit functionality
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    intro: "",
    sections: [],
    taglish_intro: "",
    taglish_sections: [],
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const formRef = useRef(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [moduleQuestionCounts, setModuleQuestionCounts] = useState({});
  const [moduleTaglishQuestionCounts, setModuleTaglishQuestionCounts] =
    useState({});
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] = useState(false);
  const [selectedQuizModuleId, setSelectedQuizModuleId] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [generateQuizError, setGenerateQuizError] = useState(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [currentQuizModuleId, setCurrentQuizModuleId] = useState(null);
  const [currentQuizModuleLevel, setCurrentQuizModuleLevel] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [quizScore, setQuizScore] = useState(null);
  const [language, setLanguage] = useState("english");
  const [quizLanguage, setQuizLanguage] = useState("english");
  const [isGenerateTaglishModalOpen, setIsGenerateTaglishModalOpen] =
    useState(false);
  const [selectedTaglishModuleId, setSelectedTaglishModuleId] = useState("");
  const [isGeneratingTaglish, setIsGeneratingTaglish] = useState(false);
  const [generateTaglishError, setGenerateTaglishError] = useState(null);
  const [isGenerateTaglishQuizModalOpen, setIsGenerateTaglishQuizModalOpen] =
    useState(false);
  const [selectedTaglishQuizModuleId, setSelectedTaglishQuizModuleId] =
    useState("");
  const [numTaglishQuestions, setNumTaglishQuestions] = useState(10);
  const [isGeneratingTaglishQuiz, setIsGeneratingTaglishQuiz] = useState(false);
  const [generateTaglishQuizError, setGenerateTaglishQuizError] =
    useState(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();
        setIsAdmin(data?.is_admin || false);
      };
      fetchProfile();
    }
  }, [user]);
  // Fetch modules with null content
  const fetchModules = async () => {
    try {
      setFetchModulesError(null);
      const { data, error } = await supabase
        .from("learning_modules")
        .select("id, title")
        .is("content", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      console.log("Fetched modules:", data);
      setModules(data || []);
    } catch (err) {
      console.error("Error fetching modules:", err.message);
      setFetchModulesError(
        "Failed to fetch ungenerated modules: " + err.message
      );
    }
  };
  // Fetch modules with content for display
  const fetchGeneratedModules = async () => {
    try {
      setFetchGeneratedError(null);
      const { data, error } = await supabase
        .from("learning_modules")
        .select("id, title, content, taglish_content, created_at, level")
        .not("content", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      console.log("Fetched generated modules:", data);
      setGeneratedModules(data || []);
    } catch (err) {
      console.error("Error fetching generated modules:", err.message);
      setFetchGeneratedError(
        "Failed to fetch generated modules: " + err.message
      );
    }
  };
  const fetchQuestionCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("module_id, is_taglish")
        .eq("status", "approved");
      if (error) throw error;
      const englishCounts = {};
      const taglishCounts = {};
      data.forEach((row) => {
        const mid = row.module_id;
        if (row.is_taglish) {
          taglishCounts[mid] = (taglishCounts[mid] || 0) + 1;
        } else {
          englishCounts[mid] = (englishCounts[mid] || 0) + 1;
        }
      });
      setModuleQuestionCounts(englishCounts);
      setModuleTaglishQuestionCounts(taglishCounts);
    } catch (err) {
      console.error("Error fetching question counts:", err);
    }
  };
  useEffect(() => {
    fetchModules();
    fetchGeneratedModules();
    fetchQuestionCounts();
  }, []);
  const handleAddKeyword = () => {
    setKeywords([...keywords, ""]);
  };
  const handleKeywordChange = (index, value) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSectionChange = (index, field, value, isTaglish = false) => {
    const key = isTaglish ? "taglish_sections" : "sections";
    const newSections = [...editFormData[key]];
    newSections[index] = { ...newSections[index], [field]: value };
    setEditFormData((prev) => ({ ...prev, [key]: newSections }));
  };
  const handleAddSection = (isTaglish = false) => {
    const key = isTaglish ? "taglish_sections" : "sections";
    setEditFormData((prev) => ({
      ...prev,
      [key]: [...prev[key], { title: "", body: "" }],
    }));
  };
  const handleRemoveSection = (index, isTaglish = false) => {
    const key = isTaglish ? "taglish_sections" : "sections";
    setEditFormData((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };
  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    if (!isModalOpen) {
      setKeywords([""]);
      setFormData({
        title: "",
        specificPoints: "",
        level: "Beginner",
        length: "Short",
      });
      setSubmitError(null);
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  };
  const toggleGenerateTab = () => {
    setShowGenerateTab(!showGenerateTab);
  };
  const toggleGenerateModal = () => {
    setIsGenerateModalOpen(!isGenerateModalOpen);
    if (!isGenerateModalOpen) {
      setSelectedModuleId("");
      setGenerateError(null);
      setFetchModulesError(null);
      fetchModules();
    }
  };
  const toggleAdminInfoModal = () => {
    setIsAdminInfoModalOpen(!isAdminInfoModalOpen);
  };
  const toggleGenerateTaglishModal = () => {
    setIsGenerateTaglishModalOpen(!isGenerateTaglishModalOpen);
    if (!isGenerateTaglishModalOpen) {
      setSelectedTaglishModuleId("");
      setGenerateTaglishError(null);
    }
  };
  const toggleGenerateTaglishQuizModal = () => {
    setIsGenerateTaglishQuizModalOpen(!isGenerateTaglishQuizModalOpen);
    if (!isGenerateTaglishQuizModalOpen) {
      setSelectedTaglishQuizModuleId("");
      setNumTaglishQuestions(10);
      setGenerateTaglishQuizError(null);
    }
  };
  const openEditModal = (module) => {
    setEditingModule(module);
    setEditFormData({
      title: module.title,
      intro: module.content?.intro || "",
      sections: module.content?.sections || [],
      taglish_intro: module.taglish_content?.intro || "",
      taglish_sections: module.taglish_content?.sections || [],
    });
    setUpdateError(null);
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setEditingModule(null);
    setEditFormData({
      title: "",
      intro: "",
      sections: [],
      taglish_intro: "",
      taglish_sections: [],
    });
    setUpdateError(null);
    setIsEditModalOpen(false);
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const updatedContent = {
        intro: editFormData.intro,
        sections: editFormData.sections,
      };
      const updatedTaglishContent = {
        intro: editFormData.taglish_intro,
        sections: editFormData.taglish_sections,
      };
      const { error } = await supabase
        .from("learning_modules")
        .update({
          title: editFormData.title,
          content: updatedContent,
          taglish_content: updatedTaglishContent,
        })
        .eq("id", editingModule.id);
      if (error) throw error;
      console.log("Module updated successfully");
      await fetchGeneratedModules();
      closeEditModal();
      alert("Module updated successfully!");
    } catch (err) {
      console.error("Error updating module:", err.message);
      setUpdateError(`Failed to update module: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };
  const callGeminiAPI = async (prompt, apiKey, retries = 3) => {
    const model = "gemini-2.5-flash";
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `Attempting to call Gemini API (attempt ${attempt}/${retries})`,
          { model, prompt: prompt.substring(0, 100) + "..." }
        );
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.8,
                topP: 0.9,
              },
            }),
          }
        );
        const responseData = await response.json();
        console.log("Gemini Response:", {
          status: response.status,
          body: responseData,
        });
        if (response.ok) {
          if (
            responseData.candidates &&
            responseData.candidates[0]?.content?.parts?.[0]?.text
          ) {
            return responseData.candidates[0].content.parts[0].text;
          } else {
            throw new Error("Invalid response format from Gemini API");
          }
        } else if (response.status === 429) {
          const waitTime = Math.min(attempt * 20000, 90000);
          console.log(
            `Rate limited (429), waiting ${waitTime}ms before retry ${attempt}/${retries}`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(
            `Gemini API error: ${response.status} - ${JSON.stringify(
              responseData
            )}`
          );
        }
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message, {
          responseData: error.message.includes("Gemini API error")
            ? JSON.parse(error.message.split(" - ")[1])
            : null,
        });
        if (attempt === retries) {
          throw new Error(`Failed after ${retries} attempts: ${error.message}`);
        }
        const waitTime = attempt * 3000;
        console.log(`Waiting ${waitTime}ms before next retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  };
  const translateToTaglish = async (englishContent) => {
    const prompt = `
Translate the following English content into casual TagLish (Tagalog-English mix) for Filipino beginners. Keep key cryptocurrency terms like "blockchain", "smart contracts", "DeFi", etc., untranslated. Use simple, conversational language with a mix of Tagalog and English, suitable for beginners. Ensure the structure remains the same. Output ONLY the translated content in JSON format:
{
  "intro": "Translated intro text",
  "sections": [
    { "title": "Translated section title", "body": "Translated section body" },
    ...
  ]
}
English Content:
{
  "intro": ${JSON.stringify(englishContent.intro)},
  "sections": ${JSON.stringify(englishContent.sections)}
}
`;
    try {
      const response = await callGeminiAPI(prompt, TRANSLATION_API_KEY, 3);
      const cleaned = response
        .replace(/```json\s*/g, "")
        .replace(/\s*```/g, "")
        .trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Error translating to TagLish:", error.message);
      throw new Error(`Failed to translate to TagLish: ${error.message}`);
    }
  };
  const translateToTaglishQuiz = async (englishQuiz) => {
    const prompt = `
Translate the following English quiz question into casual TagLish (Tagalog-English mix) for Filipino beginners. Keep key cryptocurrency terms untranslated. Use simple, conversational language. Translate the question and all options. Keep the same structure. Output ONLY the translated content in JSON format:
{
  "question": "Translated question text",
  "options": ["Translated A", "Translated B", "Translated C", "Translated D"]
}
English Quiz:
Question: ${englishQuiz.question_text}
Options: ${JSON.stringify(englishQuiz.options)}
`;
    try {
      const response = await callGeminiAPI(prompt, TAGLISH_QUIZ_API_KEY, 3);
      const cleaned = response
        .replace(/```json\s*/g, "")
        .replace(/\s*```/g, "")
        .trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Error translating quiz to TagLish:", error.message);
      throw new Error(`Failed to translate quiz: ${error.message}`);
    }
  };
  const generateModuleContent = async (module) => {
    const lengthGuidance = {
      Short: "approximately 500 words total",
      Medium: "approximately 1000 words total",
      Long: "approximately 2000 words total",
    };
    const basePrompt = `You are an expert cryptocurrency educator. Create a comprehensive educational module for a beginner-level cryptocurrency course. Use the following specifications:
Title: ${module.title}
Keywords: ${module.keywords.join(", ")}
Level: ${module.level}
Length: ${lengthGuidance[module.length]}
${
  module.specific_points
    ? `Specific Points to Include: ${module.specific_points}`
    : ""
}
Generate detailed, structured content for a beginner cryptocurrency course, focusing on blockchain, DeFi, or related topics. The content must be engaging, use simple language, and be suitable for educational purposes in a classroom setting. Include clear explanations, real-world examples, analogies to simplify complex ideas, and practical exercises for beginners. Avoid technical jargon unless clearly explained. The introduction and each section should be unique, focusing on the specific keywords provided, and contribute to a cohesive module that helps learners build foundational knowledge.
Introduction: Write a comprehensive introduction (400-600 words) covering:
- Overview of the topic and its importance in cryptocurrency.
- Brief history or context (e.g., origins of wallets, blockchain, or key platforms).
- How the keywords (${module.keywords.join(
      ", "
    )}) relate to the topic and each other.
- What beginners will learn and why it matters for their crypto journey.
- A motivating hook to engage learners (e.g., how this knowledge applies to managing crypto assets or exploring DeFi).
Output only the introduction text, without any labels or headings: `;
    try {
      // Generate introduction
      console.log("Generating introduction...");
      const introduction = await callGeminiAPI(basePrompt, MODULE_API_KEY);
      if (!introduction || introduction.trim().length < 100) {
        throw new Error("Generated introduction is empty or too short");
      }
      console.log("✅ Successfully generated introduction");
      // Generate sections based on keywords
      const sections = [];
      const maxSections =
        module.length === "Short" ? 2 : module.length === "Medium" ? 3 : 4;
      for (let i = 0; i < Math.min(maxSections, module.keywords.length); i++) {
        const keyword = module.keywords[i];
        if (!keyword.trim()) continue;
        const sectionPrompt = `You are an expert cryptocurrency educator. Write a detailed section for a beginner-level cryptocurrency course module, focusing on "${keyword}" in the context of cryptocurrency and blockchain technology. The section should be comprehensive, engaging, and educational, contributing to a module of ${
          lengthGuidance[module.length]
        }. Interpret "${keyword}" as a key concept in cryptocurrency relevant to the module title "${
          module.title
        }". Include:
1. Definition: Explain "${keyword}" in simple, beginner-friendly terms.
2. How It Works: Describe the mechanics or processes behind "${keyword}", using an analogy (e.g., compare to a real-world object like a bank account or safe).
3. Importance: Explain why "${keyword}" is critical in cryptocurrency or blockchain, and its impact on users or the ecosystem.
4. Real-World Examples: Provide 2-3 specific examples (e.g., MetaMask for hot wallets, Ledger for crypto storage, Ethereum for smart contracts).
5. Practical Exercises: Suggest 1-2 practical activities for beginners (e.g., setting up a wallet, checking a transaction on Etherscan).
6. Key Takeaways: Summarize 2-3 key points for learners to remember.
Use clear, engaging language, avoid complex jargon unless explained, and ensure the content is unique and distinct from other sections. Structure the content like a lesson in a course, suitable for educational purposes. Include ${
          module.specific_points
            ? `specific points: ${module.specific_points}`
            : "relevant details"
        }.
Output only the section content, without headings: `;
        console.log(`Generating section ${i + 1} for keyword: ${keyword}`);
        const sectionContent = await callGeminiAPI(
          sectionPrompt,
          MODULE_API_KEY
        );
        if (!sectionContent || sectionContent.trim().length < 100) {
          throw new Error(
            `Generated section for "${keyword}" is empty or too short`
          );
        }
        sections.push({
          title: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          body: sectionContent,
        });
      }
      if (sections.length === 0) {
        throw new Error(
          "No valid sections generated; at least one section is required"
        );
      }
      const englishContent = {
        intro: introduction,
        sections: sections,
      };
      const taglishContent = await translateToTaglish(englishContent);
      console.log("✅ Successfully generated complete module");
      return { englishContent, taglishContent };
    } catch (error) {
      console.error("Error generating module content:", error.message);
      throw new Error(`Failed to generate module content: ${error.message}`);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const filteredKeywords = keywords.filter((kw) => kw.trim() !== "");
      if (!formData.title || filteredKeywords.length === 0) {
        throw new Error("Title and at least one keyword are required.");
      }
      const { data, error } = await supabase.from("learning_modules").insert([
        {
          title: formData.title,
          keywords: filteredKeywords,
          specific_points: formData.specificPoints || null,
          level: formData.level,
          length: formData.length,
          content: null,
          taglish_content: null,
        },
      ]);
      if (error) {
        console.error("Error inserting module:", error.message);
        throw new Error(error.message);
      }
      console.log("Module inserted successfully:", data);
      await fetchModules();
      await fetchGeneratedModules();
      toggleModal();
    } catch (err) {
      console.error("Unexpected error:", err.message);
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleGenerate = async () => {
    if (!selectedModuleId) {
      setGenerateError("Please select a module to generate.");
      return;
    }
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const { data: module, error: fetchError } = await supabase
        .from("learning_modules")
        .select("*")
        .eq("id", selectedModuleId)
        .single();
      if (fetchError) throw fetchError;
      console.log("Generating content for module:", module);
      const { englishContent, taglishContent } = await generateModuleContent(
        module
      );
      console.log("Generated content:", englishContent, taglishContent);
      const { error: updateError } = await supabase
        .from("learning_modules")
        .update({ content: englishContent, taglish_content: taglishContent })
        .eq("id", selectedModuleId);
      if (updateError) throw updateError;
      console.log("Module content generated and updated successfully");
      await fetchModules();
      await fetchGeneratedModules();
      setSelectedModuleId("");
      alert("Module content generated successfully!");
    } catch (err) {
      console.error("Error generating module:", err.message);
      setGenerateError(`Failed to generate module: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  const handleGenerateTaglish = async () => {
    if (!selectedTaglishModuleId) {
      setGenerateTaglishError(
        "Please select a module to generate TagLish content."
      );
      return;
    }
    setIsGeneratingTaglish(true);
    setGenerateTaglishError(null);
    try {
      const { data: module, error: fetchError } = await supabase
        .from("learning_modules")
        .select("id, content")
        .eq("id", selectedTaglishModuleId)
        .single();
      if (fetchError) throw fetchError;
      if (!module.content)
        throw new Error("Module has no English content to translate.");
      console.log("Generating TagLish for module:", module);
      const taglishContent = await translateToTaglish(module.content);
      console.log("Generated TagLish content:", taglishContent);
      const { error: updateError } = await supabase
        .from("learning_modules")
        .update({ taglish_content: taglishContent })
        .eq("id", selectedTaglishModuleId);
      if (updateError) throw updateError;
      console.log("TagLish content updated successfully");
      await fetchGeneratedModules();
      setSelectedTaglishModuleId("");
      alert("TagLish content generated successfully!");
    } catch (err) {
      console.error("Error generating TagLish content:", err.message);
      setGenerateTaglishError(
        `Failed to generate TagLish content: ${err.message}`
      );
    } finally {
      setIsGeneratingTaglish(false);
    }
  };
  const handleGenerateTaglishQuiz = async () => {
    if (!selectedTaglishQuizModuleId) {
      setGenerateTaglishQuizError("Please select a module");
      return;
    }
    setIsGeneratingTaglishQuiz(true);
    setGenerateTaglishQuizError(null);
    try {
      const { data: englishQuestions, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", selectedTaglishQuizModuleId)
        .eq("status", "approved")
        .is("is_taglish", false);
      if (error) throw error;
      if (englishQuestions.length === 0) {
        throw new Error("No approved English questions for this module");
      }
      const numToConvert = Math.min(
        numTaglishQuestions,
        englishQuestions.length
      );
      const shuffled = englishQuestions.sort(() => Math.random() - 0.5);
      const toConvert = shuffled.slice(0, numToConvert);
      const taglishQuizzes = [];
      for (const q of toConvert) {
        const translated = await translateToTaglishQuiz(q);
        taglishQuizzes.push({
          module_id: selectedTaglishQuizModuleId,
          question_text: translated.question,
          options: translated.options,
          correct_answer: q.correct_answer,
          status: "pending",
          is_taglish: true,
        });
      }
      const { error: insertError } = await supabase
        .from("quiz_questions")
        .insert(taglishQuizzes);
      if (insertError) throw insertError;
      alert(
        `${numToConvert} Taglish questions generated and awaiting validation.`
      );
      await fetchQuestionCounts();
      toggleGenerateTaglishQuizModal();
    } catch (err) {
      setGenerateTaglishQuizError(err.message);
    } finally {
      setIsGeneratingTaglishQuiz(false);
    }
  };
  const handleModuleClick = (module) => {
    setSelectedModule(module);
    setLanguage("english");
    setIsContentModalOpen(true);
  };
  const closeContentModal = () => {
    setSelectedModule(null);
    setIsContentModalOpen(false);
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const toggleGenerateQuizModal = () => {
    setIsGenerateQuizModalOpen(!isGenerateQuizModalOpen);
    if (!isGenerateQuizModalOpen) {
      setSelectedQuizModuleId("");
      setNumQuestions(10);
      setGenerateQuizError(null);
    }
  };
  const handleGenerateQuiz = async () => {
    if (!selectedQuizModuleId) {
      setGenerateQuizError("Please select a module");
      return;
    }
    setIsGeneratingQuiz(true);
    setGenerateQuizError(null);
    try {
      const { data: module, error } = await supabase
        .from("learning_modules")
        .select("*")
        .eq("id", selectedQuizModuleId)
        .single();
      if (error) throw error;
      let contentText = module.content.intro;
      module.content.sections.forEach((s) => {
        contentText += `\n\n${s.title}\n${s.body}`;
      });
      const prompt = `You are an expert quiz creator for cryptocurrency education. Based on the following module content, generate exactly ${numQuestions} unique multiple-choice questions. Each question should:
- Be relevant to the module content.
- Have 4 options (A, B, C, D).
- Have exactly one correct answer.
- Be suitable for ${module.level} level.
Output ONLY a valid JSON array of objects, no other text:
[
  {
    "question": "The question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0 // index of correct option, 0-3
  },
  ...
]
Module Title: ${module.title}
Keywords: ${module.keywords.join(", ")}
Content:
${contentText.substring(0, 20000)}`;
      const response = await callGeminiAPI(prompt, QUIZ_API_KEY);
      let questions;
      try {
        // Clean the response to remove Markdown code blocks
        const cleanedResponse = response
          .replace(/```json\s*/g, "") // Remove opening ```json
          .replace(/\s*```/g, "") // Remove closing ```
          .trim(); // Trim whitespace
        questions = JSON.parse(cleanedResponse);
        if (!Array.isArray(questions) || questions.length !== numQuestions) {
          throw new Error("Invalid response format");
        }
      } catch (parseErr) {
        throw new Error("Failed to parse AI response: " + parseErr.message);
      }
      const inserts = questions.map((q) => ({
        module_id: selectedQuizModuleId,
        question_text: q.question,
        options: q.options,
        correct_answer: q.correct,
        status: "pending",
      }));
      const { error: insertError } = await supabase
        .from("quiz_questions")
        .insert(inserts);
      if (insertError) throw insertError;
      alert(`${numQuestions} questions generated and awaiting validation.`);
      await fetchQuestionCounts();
      toggleGenerateQuizModal();
    } catch (err) {
      setGenerateQuizError(err.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };
  const toggleValidationModal = () => {
    setIsValidationModalOpen(!isValidationModalOpen);
    if (!isValidationModalOpen) {
      fetchPendingQuestions();
    }
  };
  const fetchPendingQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*, learning_modules!inner(title)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPendingQuestions(data || []);
    } catch (err) {
      console.error("Error fetching pending questions:", err);
    }
  };
  const handleApproveQuestion = async (id) => {
    try {
      const { error } = await supabase
        .from("quiz_questions")
        .update({ status: "approved", validated_by: user.id })
        .eq("id", id);
      if (error) throw error;
      fetchPendingQuestions();
      fetchQuestionCounts();
    } catch (err) {
      console.error("Error approving:", err);
    }
  };
  const handleRejectQuestion = async (id) => {
    try {
      const { error } = await supabase
        .from("quiz_questions")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      fetchPendingQuestions();
    } catch (err) {
      console.error("Error rejecting:", err);
    }
  };
  const openEditQuestion = (question) => {
    setEditingQuestion({ ...question });
    setIsEditQuestionModalOpen(true);
  };
  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from("quiz_questions")
        .update({
          question_text: editingQuestion.question_text,
          options: editingQuestion.options,
          correct_answer: editingQuestion.correct_answer,
        })
        .eq("id", editingQuestion.id);
      if (error) throw error;
      setIsEditQuestionModalOpen(false);
      fetchPendingQuestions();
    } catch (err) {
      console.error("Error saving edit:", err);
    }
  };
  const openQuizModal = (moduleId) => {
    const module = generatedModules.find((m) => m.id === moduleId);
    setCurrentQuizModuleId(moduleId);
    setCurrentQuizModuleLevel(module?.level || "Beginner");
    setQuizLanguage("english");
    setQuizQuestions([]);
    setUserAnswers({});
    setQuizScore(null);
    setIsQuizModalOpen(true);
  };
  const loadQuizQuestions = async () => {
    try {
      const isTaglish = quizLanguage === "taglish";
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("module_id", currentQuizModuleId)
        .eq("status", "approved")
        .eq("is_taglish", isTaglish);
      if (error) throw error;
      if (data.length < 5) {
        alert(
          `Not enough approved ${quizLanguage} questions for this module yet.`
        );
        return;
      }
      const numQ = 5;
      const shuffled = data.sort(() => Math.random() - 0.5);
      const selectedQ = shuffled.slice(0, numQ);
      setQuizQuestions(selectedQ);
    } catch (err) {
      console.error("Error loading quiz:", err);
      alert("Failed to load quiz.");
    }
  };
  const handleQuizAnswer = (questionId, answerIndex) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };
  const handleSubmitQuiz = async () => {
    let correct = 0;
    quizQuestions.forEach((q) => {
      if (userAnswers[q.id] === q.correct_answer) correct++;
    });
    const total = quizQuestions.length;
    const percentage = (correct / total) * 100;
    let points = 0;
    try {
      const { data: previousAttempts, error: attCheckErr } = await supabase
        .from("quiz_attempts")
        .select("barya_points_earned")
        .eq("user_id", user.id)
        .eq("module_id", currentQuizModuleId);
      if (attCheckErr) throw attCheckErr;
      const alreadyRewarded = previousAttempts.some(
        (a) => a.barya_points_earned > 0
      );
      if (!alreadyRewarded) {
        let basePoints;
        switch (currentQuizModuleLevel) {
          case "Beginner":
            basePoints = 300;
            break;
          case "Intermediate":
            basePoints = 500;
            break;
          case "Advanced":
            basePoints = 700;
            break;
          default:
            basePoints = 300;
        }
        if (percentage >= 80) {
          points = basePoints;
          if (percentage === 100) {
            points = Math.floor(basePoints * 1.02);
          }
        }
      }
      // Always record the attempt
      const { error: attErr } = await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        module_id: currentQuizModuleId,
        score: correct,
        total_questions: total,
        barya_points_earned: points,
      });
      if (attErr) throw attErr;
      if (points > 0) {
        // Award points if applicable
        const { data: ub, error: ubErr } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", user.id)
          .single();
        if (ubErr) throw ubErr;
        const newBal = ub.balance + points;
        const { error: updateErr } = await supabase
          .from("user_balances")
          .update({ balance: newBal })
          .eq("user_id", user.id);
        if (updateErr) throw updateErr;
        const { error: histErr } = await supabase
          .from("balance_history")
          .insert({
            user_id: user.id,
            change_amount: points,
            balance_after: newBal,
            change_type: "DEPOSIT",
            description: `Quiz reward for module ${currentQuizModuleId}`,
          });
        if (histErr) throw histErr;
      }
      setQuizScore({ correct, total, points });
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("Failed to submit quiz and award points.");
    }
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let particles = [];
    const particleCount = 50; // Adjust for density
    const particleSpeed = 0.5;
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * particleSpeed - particleSpeed / 2;
        this.speedY = Math.random() * particleSpeed - particleSpeed / 2;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }
      draw() {
        ctx.fillStyle = "rgba(0, 212, 255, 0.3)"; // Use accent color from palette
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }
    animate();
    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <div>
      <style>{`
        .simple-btn {
          transition: background-color 0.3s ease !important;
        }
        .simple-btn:hover {
          background-color: var(--accent-blue);
          transform: none !important;
        }
      `}</style>
      <canvas ref={canvasRef} className="particle-canvas" />
      <div className="news-header">
        <h1 className="news-title">Learning Modules</h1>
        <p className="news-subtitle">
          Create and generate educational modules to enhance your crypto
          knowledge.
        </p>
      </div>
      {showGenerateTab && isAdmin && (
        <div className="tabs" style={{ position: "relative", zIndex: 1000 }}>
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))",
              padding: "3px",
              borderRadius: "16px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "14px",
                padding: "20px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <button
                  className="btn btn-secondary simple-btn"
                  onClick={toggleAdminInfoModal}
                  style={{ minWidth: "150px" }}
                >
                  Admin Info
                </button>
                <button
                  className="btn btn-primary simple-btn"
                  onClick={toggleModal}
                  disabled={isSubmitting}
                  style={{ minWidth: "200px" }}
                >
                  Create New Module
                </button>
                <button
                  className="btn btn-accent simple-btn"
                  onClick={toggleGenerateModal}
                  disabled={isGenerating}
                  style={{ minWidth: "200px" }}
                >
                  Generate Module Content
                </button>
                <button
                  className="btn btn-primary simple-btn"
                  onClick={toggleGenerateQuizModal}
                  disabled={isGeneratingQuiz}
                  style={{ minWidth: "200px" }}
                >
                  Generate Quiz
                </button>
                <button
                  className="btn btn-primary simple-btn"
                  onClick={toggleGenerateTaglishQuizModal}
                  disabled={isGeneratingTaglishQuiz}
                  style={{ minWidth: "200px" }}
                >
                  Generate Taglish Quizzes
                </button>
                <button
                  className="btn btn-accent simple-btn"
                  onClick={toggleValidationModal}
                  style={{ minWidth: "200px" }}
                >
                  Validate Quizzes
                </button>
                <button
                  className="btn btn-primary simple-btn"
                  onClick={toggleGenerateTaglishModal}
                  disabled={isGeneratingTaglish}
                  style={{ minWidth: "200px" }}
                >
                  Generate TagLish Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="modules-display">
        <div className="modules-header">
          <h2>Available Learning Modules</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                fetchGeneratedModules();
                fetchQuestionCounts();
              }}
              disabled={isGenerating}
            >
              Refresh Modules
            </button>
            {isAdmin && (
              <button
                className="btn btn-accent simple-btn"
                onClick={toggleGenerateTab}
                disabled={isGenerating}
              >
                {showGenerateTab ? "Hide Generator" : "Show Generator"}
              </button>
            )}
          </div>
        </div>
        {fetchGeneratedError && (
          <p className="error-message">{fetchGeneratedError}</p>
        )}
        {generatedModules.length === 0 && !fetchGeneratedError ? (
          <div className="no-modules">
            <p className="info-message">No learning modules available yet.</p>
            <p className="info-subtitle">
              Create and generate your first module to get started!
            </p>
          </div>
        ) : (
          <div className="modules-grid">
            {(user ? generatedModules : generatedModules.slice(0, 5)).map((module) => (
              <div
                key={module.id}
                className="module-card"
                onClick={() => handleModuleClick(module)}
              >
                <div className="module-card-header">
                  <h3 className="module-card-title">{module.title}</h3>
                  <span className="module-level-tag">{module.level}</span>
                  <span className="module-card-date">
                    {formatDate(module.created_at)}
                  </span>
                </div>
                <div className="module-card-content">
                  <p className="module-intro">
                    {module.content?.intro || "Click to view module content..."}
                  </p>
                  <div className="module-sections-count">
                    {module.content?.sections?.length || 0} sections
                  </div>
                </div>
                <div className="module-card-footer">
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      justifyContent: "flex-start",
                    }}
                  >
                    <button
                      className="btn btn-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModuleClick(module);
                      }}
                    >
                      View Module →
                    </button>
                    {(moduleQuestionCounts[module.id] >= 5 ||
                      moduleTaglishQuestionCounts[module.id] >= 5) && user && (
                      <button
                        className="btn btn-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          openQuizModal(module.id);
                        }}
                      >
                        Take Quiz →
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(module);
                        }}
                        style={{
                          fontSize: "14px",
                          padding: "4px 8px",
                          backgroundColor: "var(--accent-purple)",
                          color: "white",
                          border: "none",
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!user && generatedModules.length > 5 && (
          <div className="login-prompt" style={{
            textAlign: 'center',
            padding: '60px 32px',
            marginTop: '40px',
            background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), rgba(0, 212, 255, 0.15))',
            borderRadius: '24px',
            border: '2px solid var(--border)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 212, 255, 0.2)',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            <p style={{
              fontSize: '22px',
              fontWeight: '700',
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              letterSpacing: '-0.5px'
            }}>
              🚀 Ready to unlock your crypto learning journey?
            </p>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Create an account to access <strong style={{color: 'var(--accent-primary)'}}>exclusive modules</strong>, earn rewards, and learn more about crypto!
            </p>
          </div>
        )}
      </div>
      <div className={`modal-overlay ${isModalOpen ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Create New Learning Module</h3>
            <button
              className="modal-close"
              onClick={toggleModal}
              disabled={isSubmitting}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <form className="module-form" onSubmit={handleSubmit} ref={formRef}>
              <div className="form-group">
                <label htmlFor="module-title" className="form-label">
                  Module Title
                </label>
                <input
                  type="text"
                  id="module-title"
                  name="title"
                  className="form-input"
                  placeholder="e.g., Introduction to Blockchain"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Keywords</label>
                <div className="keywords-group">
                  {keywords.map((keyword, index) => (
                    <input
                      key={index}
                      type="text"
                      className="form-input keyword-input"
                      placeholder={`e.g., ${
                        ["blockchain", "smart contracts", "decentralization"][
                          index % 3
                        ]
                      }`}
                      value={keyword}
                      onChange={(e) =>
                        handleKeywordChange(index, e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  ))}
                  <button
                    type="button"
                    className="btn btn-accent add-keyword"
                    onClick={handleAddKeyword}
                    disabled={isSubmitting}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="specific-points" className="form-label">
                  Specific Points to Include
                </label>
                <textarea
                  id="specific-points"
                  name="specificPoints"
                  className="form-textarea"
                  rows="4"
                  placeholder="e.g., Explain how blockchain ensures security, include examples of smart contracts"
                  value={formData.specificPoints}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                ></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="level" className="form-label">
                  Level
                </label>
                <select
                  id="level"
                  name="level"
                  className="form-select"
                  value={formData.level}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="length" className="form-label">
                  Length
                </label>
                <select
                  id="length"
                  name="length"
                  className="form-select"
                  value={formData.length}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                >
                  <option value="Short">Short (~500 words)</option>
                  <option value="Medium">Medium (~1000 words)</option>
                  <option value="Long">Long (~2000 words)</option>
                </select>
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Module"}
                </button>
                <button
                  type="button"
                  className="btn btn-close"
                  onClick={toggleModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
              {submitError && <p className="error-message">{submitError}</p>}
            </form>
          </div>
        </div>
      </div>
      <div className={`modal-overlay ${isEditModalOpen ? "" : "hidden"}`}>
        <div className="modal-content module-content-modal">
          <div className="modal-header">
            <h3>Edit Module: {editingModule?.title}</h3>
            <button
              className="modal-close"
              onClick={closeEditModal}
              disabled={isUpdating}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <form className="module-form" onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label htmlFor="edit-title" className="form-label">
                  Module Title
                </label>
                <input
                  type="text"
                  id="edit-title"
                  name="title"
                  className="form-input"
                  value={editFormData.title}
                  onChange={handleEditFormChange}
                  required
                  disabled={isUpdating}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-intro" className="form-label">
                  English Introduction
                </label>
                <textarea
                  id="edit-intro"
                  name="intro"
                  className="form-textarea"
                  rows="8"
                  value={editFormData.intro}
                  onChange={handleEditFormChange}
                  disabled={isUpdating}
                  style={{ minHeight: "200px" }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-taglish-intro" className="form-label">
                  TagLish Introduction
                </label>
                <textarea
                  id="edit-taglish-intro"
                  name="taglish_intro"
                  className="form-textarea"
                  rows="8"
                  value={editFormData.taglish_intro}
                  onChange={handleEditFormChange}
                  disabled={isUpdating}
                  style={{ minHeight: "200px" }}
                />
              </div>
              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <label className="form-label">English Sections</label>
                  <button
                    type="button"
                    className="btn btn-accent"
                    onClick={() => handleAddSection(false)}
                    disabled={isUpdating}
                  >
                    Add English Section
                  </button>
                </div>
                {editFormData.sections.map((section, index) => (
                  <div
                    key={index}
                    className="section-edit-group"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "16px",
                      marginBottom: "16px",
                      background: "var(--bg-tertiary)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        English Section {index + 1}
                      </h4>
                      <button
                        type="button"
                        className="btn btn-close"
                        onClick={() => handleRemoveSection(index, false)}
                        disabled={isUpdating}
                        style={{ padding: "4px 8px", fontSize: "12px" }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section Title</label>
                      <input
                        type="text"
                        className="form-input"
                        value={section.title}
                        onChange={(e) =>
                          handleSectionChange(
                            index,
                            "title",
                            e.target.value,
                            false
                          )
                        }
                        disabled={isUpdating}
                        placeholder="Section title"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section Content</label>
                      <textarea
                        className="form-textarea"
                        rows="6"
                        value={section.body}
                        onChange={(e) =>
                          handleSectionChange(
                            index,
                            "body",
                            e.target.value,
                            false
                          )
                        }
                        disabled={isUpdating}
                        placeholder="Section content"
                        style={{ minHeight: "150px" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <label className="form-label">TagLish Sections</label>
                  <button
                    type="button"
                    className="btn btn-accent"
                    onClick={() => handleAddSection(true)}
                    disabled={isUpdating}
                  >
                    Add TagLish Section
                  </button>
                </div>
                {editFormData.taglish_sections.map((section, index) => (
                  <div
                    key={index}
                    className="section-edit-group"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "16px",
                      marginBottom: "16px",
                      background: "var(--bg-tertiary)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: "600",
                        }}
                      >
                        TagLish Section {index + 1}
                      </h4>
                      <button
                        type="button"
                        className="btn btn-close"
                        onClick={() => handleRemoveSection(index, true)}
                        disabled={isUpdating}
                        style={{ padding: "4px 8px", fontSize: "12px" }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section Title</label>
                      <input
                        type="text"
                        className="form-input"
                        value={section.title}
                        onChange={(e) =>
                          handleSectionChange(
                            index,
                            "title",
                            e.target.value,
                            true
                          )
                        }
                        disabled={isUpdating}
                        placeholder="TagLish Section title"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section Content</label>
                      <textarea
                        className="form-textarea"
                        rows="6"
                        value={section.body}
                        onChange={(e) =>
                          handleSectionChange(
                            index,
                            "body",
                            e.target.value,
                            true
                          )
                        }
                        disabled={isUpdating}
                        placeholder="TagLish Section content"
                        style={{ minHeight: "150px" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Update Module"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeEditModal}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
              </div>
              {updateError && <p className="error-message">{updateError}</p>}
            </form>
          </div>
        </div>
      </div>
      <div className={`modal-overlay ${isContentModalOpen ? "" : "hidden"}`}>
        <div className="modal-content module-content-modal">
          <div className="modal-header">
            <h3>{selectedModule?.title}</h3>
            <button className="modal-close" onClick={closeContentModal}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            {selectedModule?.content && (
              <div className="module-full-content">
                <div className="module-meta">
                  <span className="module-date">
                    Created: {formatDate(selectedModule.created_at)}
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="form-select"
                    style={{ marginLeft: "16px" }}
                  >
                    <option value="english">English</option>
                    <option value="taglish">TagLish</option>
                  </select>
                </div>
                <div className="module-intro-section">
                  <h4>Introduction</h4>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {language === "english"
                      ? selectedModule.content.intro
                      : selectedModule.taglish_content?.intro ||
                        "No TagLish content available"}
                  </ReactMarkdown>
                </div>
                <div className="module-sections">
                  {(language === "english"
                    ? selectedModule.content.sections
                    : selectedModule.taglish_content?.sections || []
                  ).map((section, index) => (
                    <div key={index} className="module-section">
                      <h4>{section.title}</h4>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {section.body}
                      </ReactMarkdown>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={closeContentModal}>
              Close
            </button>
          </div>
        </div>
      </div>
      <div className={`modal-overlay ${isAdminInfoModalOpen ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Module Generator & Creator</h3>
            <button className="modal-close" onClick={toggleAdminInfoModal}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="module-form">
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  background: "rgba(108, 92, 231, 0.1)",
                  borderRadius: "12px",
                  border: "1px solid rgba(108, 92, 231, 0.3)",
                  marginBottom: "20px",
                }}
              >
                <h2
                  style={{
                    margin: "0 0 16px 0",
                    color: "var(--text-primary)",
                    fontSize: "24px",
                    fontWeight: "800",
                  }}
                >
                  Administrative Tools
                </h2>
                <p
                  style={{
                    margin: "0 0 16px 0",
                    color: "var(--text-secondary)",
                    fontSize: "16px",
                    fontWeight: "500",
                    lineHeight: "1.6",
                  }}
                >
                  Use these tools to create and generate educational learning
                  modules for your crypto knowledge platform.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "16px",
                    marginTop: "20px",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        color: "var(--accent-blue)",
                        fontSize: "16px",
                        fontWeight: "700",
                      }}
                    >
                      Create New Module
                    </h4>
                    <p
                      style={{
                        margin: "0",
                        color: "var(--text-muted)",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      Define module structure with title, keywords, difficulty
                      level, and specific learning objectives.
                    </p>
                  </div>
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        color: "var(--accent-purple)",
                        fontSize: "16px",
                        fontWeight: "700",
                      }}
                    >
                      Generate Content
                    </h4>
                    <p
                      style={{
                        margin: "0",
                        color: "var(--text-muted)",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      Use AI to generate comprehensive educational content based
                      on your module specifications.
                    </p>
                  </div>
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        color: "var(--accent-green)",
                        fontSize: "16px",
                        fontWeight: "700",
                      }}
                    >
                      Edit Modules
                    </h4>
                    <p
                      style={{
                        margin: "0",
                        color: "var(--text-muted)",
                        fontSize: "14px",
                        lineHeight: "1.4",
                      }}
                    >
                      Modify existing module content, add or remove sections,
                      and update titles and descriptions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={toggleAdminInfoModal}
            >
              Close
            </button>
          </div>
        </div>
      </div>
      <div className={`modal-overlay ${isGenerateModalOpen ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Generate Module Content</h3>
            <button
              className="modal-close"
              onClick={toggleGenerateModal}
              disabled={isGenerating}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="module-form">
              <div className="form-group">
                <label className="form-label">Select Module to Generate</label>
                <button
                  className="btn btn-secondary"
                  onClick={fetchModules}
                  disabled={isGenerating}
                  style={{ marginBottom: "12px" }}
                >
                  Refresh Modules
                </button>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="form-select"
                  disabled={isGenerating}
                >
                  <option value="">Select a module</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </div>
              {fetchModulesError && (
                <p className="error-message">{fetchModulesError}</p>
              )}
              {modules.length === 0 && !fetchModulesError && (
                <p className="info-message">
                  No ungenerated modules available.
                </p>
              )}
              {generateError && (
                <p className="error-message">{generateError}</p>
              )}
              <div className="form-actions">
                <button
                  className="btn btn-accent"
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedModuleId}
                >
                  {isGenerating ? "Generating..." : "Generate Module"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={toggleGenerateModal}
                  disabled={isGenerating}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`modal-overlay ${
          isGenerateTaglishModalOpen ? "" : "hidden"
        }`}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>Generate TagLish Content</h3>
            <button
              className="modal-close"
              onClick={toggleGenerateTaglishModal}
              disabled={isGeneratingTaglish}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="module-form">
              <div className="form-group">
                <label className="form-label">Select Module for TagLish</label>
                <button
                  className="btn btn-secondary"
                  onClick={fetchGeneratedModules}
                  disabled={isGeneratingTaglish}
                  style={{ marginBottom: "12px" }}
                >
                  Refresh Modules
                </button>
                <select
                  value={selectedTaglishModuleId}
                  onChange={(e) => setSelectedTaglishModuleId(e.target.value)}
                  className="form-select"
                  disabled={isGeneratingTaglish}
                >
                  <option value="">Select a module</option>
                  {generatedModules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </div>
              {generateTaglishError && (
                <p className="error-message">{generateTaglishError}</p>
              )}
              {generatedModules.length === 0 && (
                <p className="info-message">
                  No modules with content available.
                </p>
              )}
              <div className="form-actions">
                <button
                  className="btn btn-accent"
                  onClick={handleGenerateTaglish}
                  disabled={isGeneratingTaglish || !selectedTaglishModuleId}
                >
                  {isGeneratingTaglish ? "Generating..." : "Generate TagLish"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={toggleGenerateTaglishModal}
                  disabled={isGeneratingTaglish}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`modal-overlay ${isGenerateQuizModalOpen ? "" : "hidden"}`}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>Generate Quiz Questions</h3>
            <button
              className="modal-close"
              onClick={toggleGenerateQuizModal}
              disabled={isGeneratingQuiz}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="module-form">
              <div className="form-group">
                <label className="form-label">Select Module</label>
                <select
                  value={selectedQuizModuleId}
                  onChange={(e) => setSelectedQuizModuleId(e.target.value)}
                  className="form-select"
                  disabled={isGeneratingQuiz}
                >
                  <option value="">Select a module</option>
                  {generatedModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Number of Questions</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="form-select"
                  disabled={isGeneratingQuiz}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                </select>
              </div>
              {generateQuizError && (
                <p className="error-message">{generateQuizError}</p>
              )}
              <div className="form-actions">
                <button
                  className="btn btn-accent"
                  onClick={handleGenerateQuiz}
                  disabled={isGeneratingQuiz || !selectedQuizModuleId}
                >
                  {isGeneratingQuiz ? "Generating..." : "Generate Questions"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={toggleGenerateQuizModal}
                  disabled={isGeneratingQuiz}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`modal-overlay ${
          isGenerateTaglishQuizModalOpen ? "" : "hidden"
        }`}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>Generate Taglish Quiz Questions</h3>
            <button
              className="modal-close"
              onClick={toggleGenerateTaglishQuizModal}
              disabled={isGeneratingTaglishQuiz}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <div className="module-form">
              <div className="form-group">
                <label className="form-label">Select Module</label>
                <select
                  value={selectedTaglishQuizModuleId}
                  onChange={(e) =>
                    setSelectedTaglishQuizModuleId(e.target.value)
                  }
                  className="form-select"
                  disabled={isGeneratingTaglishQuiz}
                >
                  <option value="">Select a module</option>
                  {generatedModules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({moduleQuestionCounts[m.id] || 0} questions)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Number of Questions to Convert
                </label>
                <select
                  value={numTaglishQuestions}
                  onChange={(e) =>
                    setNumTaglishQuestions(parseInt(e.target.value))
                  }
                  className="form-select"
                  disabled={isGeneratingTaglishQuiz}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                </select>
              </div>
              {generateTaglishQuizError && (
                <p className="error-message">{generateTaglishQuizError}</p>
              )}
              <div className="form-actions">
                <button
                  className="btn btn-accent"
                  onClick={handleGenerateTaglishQuiz}
                  disabled={
                    isGeneratingTaglishQuiz || !selectedTaglishQuizModuleId
                  }
                >
                  {isGeneratingTaglishQuiz
                    ? "Generating..."
                    : "Generate Taglish Questions"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={toggleGenerateTaglishQuizModal}
                  disabled={isGeneratingTaglishQuiz}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`modal-overlay ${isValidationModalOpen ? "" : "hidden"}`}>
        <div
          className="modal-content"
          style={{ width: "80%", maxWidth: "1200px" }}
        >
          <div className="modal-header">
            <h3>Pending Quiz Questions</h3>
            <button className="modal-close" onClick={toggleValidationModal}>
              ✕
            </button>
          </div>
          <div className="modal-body">
            {pendingQuestions.length === 0 ? (
              <p className="info-message">No pending questions available.</p>
            ) : (
              <div className="modules-grid">
                {pendingQuestions.map((q) => (
                  <div key={q.id} className="module-card">
                    <div className="module-card-header">
                      <h3 className="module-card-title">
                        {q.learning_modules.title}{" "}
                        {q.is_taglish ? "(TagLish)" : "(English)"}
                      </h3>
                    </div>
                    <div className="module-card-content">
                      <p>
                        <strong>Question:</strong> {q.question_text}
                      </p>
                      <ul>
                        {q.options.map((opt, idx) => (
                          <li
                            key={idx}
                            style={{
                              fontWeight:
                                idx === q.correct_answer ? "bold" : "normal",
                            }}
                          >
                            {String.fromCharCode(65 + idx)}: {opt}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="module-card-footer">
                      <button
                        className="btn btn-link"
                        onClick={() => openEditQuestion(q)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-link"
                        onClick={() => handleApproveQuestion(q.id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-link"
                        onClick={() => handleRejectQuestion(q.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className={`modal-overlay ${isEditQuestionModalOpen ? "" : "hidden"}`}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>Edit Question</h3>
            <button
              className="modal-close"
              onClick={() => setIsEditQuestionModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            {editingQuestion && (
              <div className="module-form">
                <div className="form-group">
                  <label className="form-label">Question Text</label>
                  <textarea
                    className="form-textarea"
                    value={editingQuestion.question_text}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        question_text: e.target.value,
                      })
                    }
                  />
                </div>
                {editingQuestion.options.map((opt, idx) => (
                  <div key={idx} className="form-group">
                    <label className="form-label">
                      Option {String.fromCharCode(65 + idx)}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...editingQuestion.options];
                        newOptions[idx] = e.target.value;
                        setEditingQuestion({
                          ...editingQuestion,
                          options: newOptions,
                        });
                      }}
                    />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <select
                    className="form-select"
                    value={editingQuestion.correct_answer}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        correct_answer: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={0}>A</option>
                    <option value={1}>B</option>
                    <option value={2}>C</option>
                    <option value={3}>D</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button className="btn btn-accent" onClick={handleSaveEdit}>
                    Save
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsEditQuestionModalOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={`modal-overlay ${isQuizModalOpen ? "" : "hidden"}`}>
        <div className="modal-content module-content-modal">
          <div className="modal-header">
            <h3>
              Quiz:{" "}
              {
                generatedModules.find((m) => m.id === currentQuizModuleId)
                  ?.title
              }
            </h3>
            <button
              className="modal-close"
              onClick={() => setIsQuizModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            {quizScore ? (
              <div>
                <h4>
                  Score: {quizScore.correct} / {quizScore.total}
                </h4>
                <p>Earned {quizScore.points} barya points!</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuizQuestions([]);
                    setUserAnswers({});
                    setQuizScore(null);
                  }}
                >
                  Retake Quiz
                </button>
              </div>
            ) : quizQuestions.length === 0 ? (
              <div>
                <div className="form-group">
                  <label className="form-label">Select Language</label>
                  <select
                    value={quizLanguage}
                    onChange={(e) => setQuizLanguage(e.target.value)}
                    className="form-select"
                  >
                    <option
                      value="english"
                      disabled={
                        (moduleQuestionCounts[currentQuizModuleId] || 0) < 5
                      }
                    >
                      English
                    </option>
                    <option
                      value="taglish"
                      disabled={
                        (moduleTaglishQuestionCounts[currentQuizModuleId] ||
                          0) < 5
                      }
                    >
                      Taglish
                    </option>
                  </select>
                </div>
                <button className="btn btn-accent" onClick={loadQuizQuestions}>
                  Start Quiz
                </button>
              </div>
            ) : (
              <div>
                {quizQuestions.map((q, qIndex) => (
                  <div key={q.id} className="module-section">
                    <h4>
                      Question {qIndex + 1}: {q.question_text}
                    </h4>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex}>
                        <input
                          type="radio"
                          id={`q${q.id}_o${oIndex}`}
                          name={`q${q.id}`}
                          checked={userAnswers[q.id] === oIndex}
                          onChange={() => handleQuizAnswer(q.id, oIndex)}
                        />
                        <label htmlFor={`q${q.id}_o${oIndex}`}>
                          {String.fromCharCode(65 + oIndex)}. {opt}
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
                <button
                  className="btn btn-accent"
                  onClick={handleSubmitQuiz}
                  disabled={
                    Object.keys(userAnswers).length < quizQuestions.length
                  }
                >
                  Submit Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Learn2;