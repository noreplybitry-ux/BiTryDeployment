import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  HangmanGame,
  MatchingGame,
  FillBlanksGame,
  AnagramGame,
  WordSearchGame,
  GameRenderer,
} from "./MiniGames";
import "../css/ModuleDetail.css";

const ProcessedMarkdown = ({ content }) => {
  const parts = content.split(/(\[QUIZ:[^\]]*\][\s\S]*?\[\/QUIZ\])/i);
  return (
    <>
      {parts.map((part, index) => {
        const quizMatch = part.match(/\[QUIZ:([^\]]*)\]([\s\S]*?)\[\/QUIZ\]/i);
        if (quizMatch) {
          return <QuizComponent key={index} content={part} />;
        } else if (part.trim()) {
          return (
            <ReactMarkdown
              key={index}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {part}
            </ReactMarkdown>
          );
        }
        return null;
      })}
    </>
  );
};
const QuizComponent = ({ content }) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  // Parse the quiz content with more flexible regex
  const quizMatch = content.match(/\[QUIZ:([^\]]*)\]([\s\S]*?)\[\/QUIZ\]/i);
  if (!quizMatch) {
    console.warn("No quiz block found in content");
    return null;
  }
  const type = quizMatch[1].trim().toLowerCase();
  const quizContent = quizMatch[2];
  // More flexible parsing that handles extra whitespace and newlines
  const questionMatch = quizContent.match(
    /Question:\s*([^\n]*?)(?=\s*(?:Options:|Answer:|Explanation:|\[\/QUIZ\]|$))/is
  );
  const optionsMatch = quizContent.match(
    /Options:\s*([^\n]*?)(?=\s*(?:Answer:|Explanation:|\[\/QUIZ\]|$))/is
  );
  const answerMatch = quizContent.match(
    /Answer:\s*([^\n]*?)(?=\s*(?:Explanation:|\[\/QUIZ\]|$))/is
  );
  const explanationMatch = quizContent.match(
    /Explanation:\s*(.*?)(?=\s*\[\/QUIZ\]|$)/is
  );
  const question = questionMatch ? questionMatch[1].trim() : "";
  const options = optionsMatch
    ? optionsMatch[1]
        .split(",")
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0)
    : [];
  const correctAnswer = answerMatch ? answerMatch[1].trim() : "";
  const explanation = explanationMatch ? explanationMatch[1].trim() : "";
  // Debug logging
  console.log("Quiz parsed:", {
    type,
    question,
    options,
    correctAnswer,
    explanation,
  });
  const handleSubmit = () => {
    const userAnswerLower = userAnswer.toLowerCase().trim();
    const correctAnswerLower = correctAnswer.toLowerCase().trim();
    setIsCorrect(userAnswerLower === correctAnswerLower);
    setShowResult(true);
  };
  const resetQuiz = () => {
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);
  };
  // Validation
  if (!question || !correctAnswer) {
    console.warn("Quiz parsing failed - missing required fields:", {
      question,
      correctAnswer,
    });
    return null;
  }
  return (
    <div className="mini-quiz">
      <h5>🧠 Quick Check!</h5>
      <p className="quiz-question">{question}</p>
      {!showResult ? (
        <div className="quiz-input">
          {type === "truefalse" && (
            <div className="true-false-options">
              <button
                className={`quiz-option ${
                  userAnswer === "True" ? "selected" : ""
                }`}
                onClick={() => setUserAnswer("True")}
              >
                ✓ True
              </button>
              <button
                className={`quiz-option ${
                  userAnswer === "False" ? "selected" : ""
                }`}
                onClick={() => setUserAnswer("False")}
              >
                ✗ False
              </button>
            </div>
          )}
          {type === "multiplechoice" && options.length > 0 && (
            <div className="multiple-choice-options">
              {options.map((option, index) => (
                <button
                  key={index}
                  className={`quiz-option ${
                    userAnswer === option ? "selected" : ""
                  }`}
                  onClick={() => setUserAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {type === "fillblank" && (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && userAnswer && handleSubmit()
              }
              placeholder="Type your answer here..."
              className="fill-blank-input"
            />
          )}
          <button
            className="quiz-submit-btn"
            onClick={handleSubmit}
            disabled={!userAnswer}
          >
            Check Answer ✨
          </button>
        </div>
      ) : (
        <div className="quiz-result">
          <div
            className={`result-message ${isCorrect ? "correct" : "incorrect"}`}
          >
            {isCorrect ? "🎉 Correct! Great job!" : "❌ Not quite right!"}
          </div>
          <p className="explanation">
            <strong>💡 Explanation:</strong> {explanation}
          </p>
          <button className="quiz-reset-btn" onClick={resetQuiz}>
            🔄 Try Again
          </button>
        </div>
      )}
    </div>
  );
};
const ModuleDetail = ({
  module,
  onBack,
  onTakeQuiz,
  moduleQuestionCounts,
  moduleTaglishQuestionCounts,
  user,
}) => {
  const { user: authUser } = useAuth();
  const [language, setLanguage] = useState("english");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'helpful' or 'not-helpful'
  const [miniGames, setMiniGames] = useState([]);
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    const fetchMiniGames = async () => {
      try {
        const { data, error } = await supabase
          .from("mini_games")
          .select("*")
          .eq("module_id", module.id)
          .eq("status", "approved")
          .eq("is_taglish", language === "taglish");
        if (error) throw error;
        setMiniGames(data || []);
      } catch (err) {
        console.error("Error fetching mini-games:", err.message);
      }
    };
    fetchMiniGames();
  }, [language, module.id]);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  return (
    <div className="module-detail-container">
      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${scrollProgress}%` }}
        ></div>
      </div>
      <div className="breadcrumbs">
        <a href="#" onClick={onBack}>
          Learning Modules
        </a>
        <span>/</span>
        <span>{module.title}</span>
      </div>
      <div className="module-detail-header">
        <h3>{module.title}</h3>
        <span className="module-level">{module.level}</span>
      </div>
      <div className="module-meta">
        <span className="module-date">
          Created: {formatDate(module.created_at)}
        </span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="form-select"
        >
          <option value="english">English</option>
          <option value="taglish">TagLish</option>
        </select>
      </div>
      <div className="module-content-wrapper">
        <div className="toc-sidebar">
          <h4>Table of Contents</h4>
          <ul>
            <li>
              <a href="#intro">Introduction</a>
            </li>
            {(language === "english"
              ? module.content.sections
              : module.taglish_content?.sections || []
            ).map((section, index) => (
              <li key={index}>
                <a href={`#section-${index}`}>{section.title}</a>
              </li>
            ))}
            {(language === "english"
              ? module.content.media
              : module.taglish_content?.media
            )?.video && (
              <li>
                <a href="#video">Explanatory Video</a>
              </li>
            )}
            <li>
              <a href="#mini-games">Mini-Games</a>
            </li>
          </ul>
        </div>
        <div className="main-content">
          <div id="intro" className="module-intro-section">
            <h4>Introduction</h4>
            <ProcessedMarkdown
              content={
                language === "english"
                  ? module.content.intro
                  : module.taglish_content?.intro ||
                    "No TagLish content available"
              }
            />
          </div>
          {(language === "english"
            ? module.content.media
            : module.taglish_content?.media
          )?.image && (
            <div className="media-section">
              <h4>Illustrative Image</h4>
              <p className="context">
                This image provides visual context for the module "
                {module.title}
                ", illustrating key concepts such as{" "}
                {module.keywords.join(", ")}.
              </p>
              <img
                src={
                  (language === "english"
                    ? module.content.media
                    : module.taglish_content?.media
                  ).image.url
                }
                alt="Module illustration"
              />
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "8px",
                  textAlign: "center",
                }}
              >
                Photo by{" "}
                <a
                  href={
                    (language === "english"
                      ? module.content.media
                      : module.taglish_content?.media
                    ).image.photographer_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {
                    (language === "english"
                      ? module.content.media
                      : module.taglish_content?.media
                    ).image.photographer
                  }
                </a>{" "}
                on Pexels
              </p>
            </div>
          )}
          <div className="module-sections">
            {(language === "english"
              ? module.content.sections
              : module.taglish_content?.sections || []
            ).map((section, index) => (
              <div
                key={index}
                id={`section-${index}`}
                className="module-section"
              >
                <h4>{section.title}</h4>
                <ProcessedMarkdown content={section.body} />
              </div>
            ))}
          </div>
          {(language === "english"
            ? module.content.media
            : module.taglish_content?.media
          )?.video && (
            <div id="video" className="media-section">
              <h4>Explanatory Video</h4>
              <p className="context">
                This video tutorial complements the module "{module.title}" by
                providing a practical demonstration of concepts like{" "}
                {module.keywords.join(", ")}.
              </p>
              <div className="video-wrapper">
                <iframe
                  src={
                    (language === "english"
                      ? module.content.media
                      : module.taglish_content?.media
                    ).video
                  }
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
          <div id="mini-games" className="mini-games-section">
            <h4>🎮 Mini-Games</h4>
            {miniGames.length === 0 ? (
              <p>No mini-games available yet for this module and language.</p>
            ) : (
              miniGames.map((game) => (
                <div key={game.id} className="mini-game">
                  <GameRenderer
                    game={game}
                    user={authUser}
                    moduleId={module.id}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="module-detail-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Modules
        </button>
        {(moduleQuestionCounts[module.id] >= 5 ||
          moduleTaglishQuestionCounts[module.id] >= 5) &&
          user && (
            <button className="btn quiz-button" onClick={onTakeQuiz}>
              Proceed to Quiz
            </button>
          )}
      </div>
      {/* Feedback Section */}
      <div className="feedback-section">
        <h5>Was this module helpful? 🎉</h5>
        <div className="feedback-buttons">
          <button
            className={`feedback-btn ${feedback === "helpful" ? "active" : ""}`}
            onClick={() => setFeedback("helpful")}
          >
            👍 Yes!
          </button>
          <button
            className={`feedback-btn ${
              feedback === "not-helpful" ? "active" : ""
            }`}
            onClick={() => setFeedback("not-helpful")}
          >
            👎 Not really
          </button>
        </div>
        {feedback && (
          <p className="feedback-thanks">
            Thanks for your feedback! It helps us improve. 🚀
          </p>
        )}
      </div>
    </div>
  );
};
export default ModuleDetail;
