import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../css/Learn2.css";

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
  const formRef = useRef(null);

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
      setFetchModulesError("Failed to fetch ungenerated modules: " + err.message);
    }
  };

  // Fetch modules with content for display
  const fetchGeneratedModules = async () => {
    try {
      setFetchGeneratedError(null);
      const { data, error } = await supabase
        .from("learning_modules")
        .select("id, title, content, created_at")
        .not("content", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      console.log("Fetched generated modules:", data);
      setGeneratedModules(data || []);
    } catch (err) {
      console.error("Error fetching generated modules:", err.message);
      setFetchGeneratedError("Failed to fetch generated modules: " + err.message);
    }
  };

  useEffect(() => {
    fetchModules();
    fetchGeneratedModules();
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

  const callGeminiAPI = async (prompt, retries = 3) => {
    const model = "gemini-2.5-flash";
    const apiKey = "AIzaSyCiOkP4wLlNnNuu6tCDacvikPSctHSFyp0";

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempting to call Gemini API (attempt ${attempt}/${retries})`, { model, prompt: prompt.substring(0, 100) + "..." });
        
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
        console.log("Gemini Response:", { status: response.status, body: responseData });

        if (response.ok) {
          if (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) {
            return responseData.candidates[0].content.parts[0].text;
          } else {
            throw new Error("Invalid response format from Gemini API");
          }
        } else if (response.status === 429) {
          const waitTime = Math.min(attempt * 20000, 90000);
          console.log(`Rate limited (429), waiting ${waitTime}ms before retry ${attempt}/${retries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(responseData)}`);
        }
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message, { responseData: error.message.includes("Gemini API error") ? JSON.parse(error.message.split(" - ")[1]) : null });
        if (attempt === retries) {
          throw new Error(`Failed after ${retries} attempts: ${error.message}`);
        }
        const waitTime = attempt * 3000;
        console.log(`Waiting ${waitTime}ms before next retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  };

  const generateModuleContent = async (module) => {
    const lengthGuidance = {
      Short: "approximately 500 words total",
      Medium: "approximately 1000 words total",
      Long: "approximately 2000 words total"
    };

    const basePrompt = `You are an expert cryptocurrency educator. Create a comprehensive educational module for a beginner-level cryptocurrency course. Use the following specifications:

Title: ${module.title}
Keywords: ${module.keywords.join(", ")}
Level: ${module.level}
Length: ${lengthGuidance[module.length]}
${module.specific_points ? `Specific Points to Include: ${module.specific_points}` : ''}

Generate detailed, structured content for a beginner cryptocurrency course, focusing on blockchain, DeFi, or related topics. The content must be engaging, use simple language, and be suitable for educational purposes in a classroom setting. Include clear explanations, real-world examples, analogies to simplify complex ideas, and practical exercises for beginners. Avoid technical jargon unless clearly explained. The introduction and each section should be unique, focusing on the specific keywords provided, and contribute to a cohesive module that helps learners build foundational knowledge.

Introduction: Write a comprehensive introduction (400-600 words) covering:
- Overview of the topic and its importance in cryptocurrency.
- Brief history or context (e.g., origins of wallets, blockchain, or key platforms).
- How the keywords (${module.keywords.join(", ")}) relate to the topic and each other.
- What beginners will learn and why it matters for their crypto journey.
- A motivating hook to engage learners (e.g., how this knowledge applies to managing crypto assets or exploring DeFi).

Output only the introduction text, without any labels or headings: `;

    try {
      // Generate introduction
      console.log("Generating introduction...");
      const introduction = await callGeminiAPI(basePrompt);
      if (!introduction || introduction.trim().length < 100) {
        throw new Error("Generated introduction is empty or too short");
      }
      console.log("✅ Successfully generated introduction");

      // Generate sections based on keywords
      const sections = [];
      const maxSections = module.length === "Short" ? 2 : module.length === "Medium" ? 3 : 4;
      
      for (let i = 0; i < Math.min(maxSections, module.keywords.length); i++) {
        const keyword = module.keywords[i];
        if (!keyword.trim()) continue;

        const sectionPrompt = `You are an expert cryptocurrency educator. Write a detailed section for a beginner-level cryptocurrency course module, focusing on "${keyword}" in the context of cryptocurrency and blockchain technology. The section should be comprehensive, engaging, and educational, contributing to a module of ${lengthGuidance[module.length]}. Interpret "${keyword}" as a key concept in cryptocurrency relevant to the module title "${module.title}". Include:

1. Definition: Explain "${keyword}" in simple, beginner-friendly terms.
2. How It Works: Describe the mechanics or processes behind "${keyword}", using an analogy (e.g., compare to a real-world object like a bank account or safe).
3. Importance: Explain why "${keyword}" is critical in cryptocurrency or blockchain, and its impact on users or the ecosystem.
4. Real-World Examples: Provide 2-3 specific examples (e.g., MetaMask for hot wallets, Ledger for crypto storage, Ethereum for smart contracts).
5. Practical Exercises: Suggest 1-2 practical activities for beginners (e.g., setting up a wallet, checking a transaction on Etherscan).
6. Key Takeaways: Summarize 2-3 key points for learners to remember.

Use clear, engaging language, avoid complex jargon unless explained, and ensure the content is unique and distinct from other sections. Structure the content like a lesson in a course, suitable for educational purposes. Include ${module.specific_points ? `specific points: ${module.specific_points}` : 'relevant details'}.

Output only the section content, without headings: `;

        console.log(`Generating section ${i + 1} for keyword: ${keyword}`);
        const sectionContent = await callGeminiAPI(sectionPrompt);
        if (!sectionContent || sectionContent.trim().length < 100) {
          throw new Error(`Generated section for "${keyword}" is empty or too short`);
        }

        sections.push({
          title: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          body: sectionContent
        });
      }

      if (sections.length === 0) {
        throw new Error("No valid sections generated; at least one section is required");
      }

      const result = {
        intro: introduction,
        sections: sections
      };

      console.log("✅ Successfully generated complete module");
      return result;

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
      // Fetch module details
      const { data: module, error: fetchError } = await supabase
        .from("learning_modules")
        .select("*")
        .eq("id", selectedModuleId)
        .single();
      if (fetchError) throw fetchError;

      console.log("Generating content for module:", module);

      // Generate content
      const aiContent = await generateModuleContent(module);
      console.log("Generated content:", aiContent);

      // Update Supabase with generated content
      const { error: updateError } = await supabase
        .from("learning_modules")
        .update({ content: aiContent })
        .eq("id", selectedModuleId);
      if (updateError) throw updateError;

      console.log("Module content generated and updated successfully");
      await fetchModules();
      await fetchGeneratedModules();
      setSelectedModuleId("");
      
      // Show success message
      alert("Module content generated successfully!");
      
    } catch (err) {
      console.error("Error generating module:", err.message);
      setGenerateError(`Failed to generate module: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModuleClick = (module) => {
    setSelectedModule(module);
    setIsContentModalOpen(true);
  };

  const closeContentModal = () => {
    setSelectedModule(null);
    setIsContentModalOpen(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="news-container">
      <div className="news-header">
        <h1 className="news-title">Learning Modules</h1>
        <p className="news-subtitle">
          Create and generate educational modules to enhance your crypto knowledge.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className="btn btn-primary"
          onClick={toggleModal}
          disabled={isSubmitting}
        >
          Create New Module
        </button>
        <div className="generate-tab">
          <h2>Generate Module Content</h2>
          <button
            className="btn btn-accent"
            onClick={fetchModules}
            disabled={isGenerating}
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
          <button
            className="btn btn-accent"
            onClick={handleGenerate}
            disabled={isGenerating || !selectedModuleId}
          >
            {isGenerating ? "Generating..." : "Generate Module"}
          </button>
          {fetchModulesError && <p className="error-message">{fetchModulesError}</p>}
          {modules.length === 0 && !fetchModulesError && (
            <p className="info-message">No ungenerated modules available.</p>
          )}
          {generateError && <p className="error-message">{generateError}</p>}
        </div>
      </div>

      {/* Generated Modules Display */}
      <div className="modules-display">
        <div className="modules-header">
          <h2>Available Learning Modules</h2>
          <button
            className="btn btn-secondary"
            onClick={fetchGeneratedModules}
            disabled={isGenerating}
          >
            Refresh Modules
          </button>
        </div>
        
        {fetchGeneratedError && <p className="error-message">{fetchGeneratedError}</p>}
        
        {generatedModules.length === 0 && !fetchGeneratedError ? (
          <div className="no-modules">
            <p className="info-message">No learning modules available yet.</p>
            <p className="info-subtitle">Create and generate your first module to get started!</p>
          </div>
        ) : (
          <div className="modules-grid">
            {generatedModules.map((module) => (
              <div 
                key={module.id} 
                className="module-card"
                onClick={() => handleModuleClick(module)}
              >
                <div className="module-card-header">
                  <h3 className="module-card-title">{module.title}</h3>
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
                  <button className="btn btn-link">View Module →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Module Modal */}
      <div className={`modal-overlay ${isModalOpen ? "" : "hidden"}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>Create New Learning Module</h3>
            <button className="modal-close" onClick={toggleModal} disabled={isSubmitting}>
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
                      onChange={(e) => handleKeywordChange(index, e.target.value)}
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
                <button type="submit" className="btn btn-accent" disabled={isSubmitting}>
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

      {/* Module Content Modal */}
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
                </div>
                
                <div className="module-intro-section">
                  <h4>Introduction</h4>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedModule.content.intro}
                  </ReactMarkdown>
                </div>

                <div className="module-sections">
                  {selectedModule.content.sections?.map((section, index) => (
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
    </div>
  );
};

export default Learn2;