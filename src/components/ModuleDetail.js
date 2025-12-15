// ModuleDetail.js
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

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
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Parse the quiz content with more flexible regex
  const quizMatch = content.match(/\[QUIZ:([^\]]*)\]([\s\S]*?)\[\/QUIZ\]/i);
  if (!quizMatch) {
    console.warn('No quiz block found in content');
    return null;
  }

  const type = quizMatch[1].trim().toLowerCase();
  const quizContent = quizMatch[2];

  // More flexible parsing that handles extra whitespace and newlines
  const questionMatch = quizContent.match(/Question:\s*([^\n]*?)(?=\s*(?:Options:|Answer:|Explanation:|\[\/QUIZ\]|$))/is);
  const optionsMatch = quizContent.match(/Options:\s*([^\n]*?)(?=\s*(?:Answer:|Explanation:|\[\/QUIZ\]|$))/is);
  const answerMatch = quizContent.match(/Answer:\s*([^\n]*?)(?=\s*(?:Explanation:|\[\/QUIZ\]|$))/is);
  const explanationMatch = quizContent.match(/Explanation:\s*(.*?)(?=\s*\[\/QUIZ\]|$)/is);

  const question = questionMatch ? questionMatch[1].trim() : '';
  const options = optionsMatch 
    ? optionsMatch[1].split(',').map(opt => opt.trim()).filter(opt => opt.length > 0)
    : [];
  const correctAnswer = answerMatch ? answerMatch[1].trim() : '';
  const explanation = explanationMatch ? explanationMatch[1].trim() : '';

  // Debug logging
  console.log('Quiz parsed:', { type, question, options, correctAnswer, explanation });

  const handleSubmit = () => {
    const userAnswerLower = userAnswer.toLowerCase().trim();
    const correctAnswerLower = correctAnswer.toLowerCase().trim();
    setIsCorrect(userAnswerLower === correctAnswerLower);
    setShowResult(true);
  };

  const resetQuiz = () => {
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);
  };

  // Validation
  if (!question || !correctAnswer) {
    console.warn('Quiz parsing failed - missing required fields:', { question, correctAnswer });
    return null;
  }

  return (
    <div className="mini-quiz">
      <h5>🧠 Quick Check!</h5>
      <p className="quiz-question">{question}</p>
      
      {!showResult ? (
        <div className="quiz-input">
          {type === 'truefalse' && (
            <div className="true-false-options">
              <button 
                className={`quiz-option ${userAnswer === 'True' ? 'selected' : ''}`}
                onClick={() => setUserAnswer('True')}
              >
                ✓ True
              </button>
              <button 
                className={`quiz-option ${userAnswer === 'False' ? 'selected' : ''}`}
                onClick={() => setUserAnswer('False')}
              >
                ✗ False
              </button>
            </div>
          )}
          
          {type === 'multiplechoice' && options.length > 0 && (
            <div className="multiple-choice-options">
              {options.map((option, index) => (
                <button 
                  key={index}
                  className={`quiz-option ${userAnswer === option ? 'selected' : ''}`}
                  onClick={() => setUserAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          
          {type === 'fillblank' && (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && userAnswer && handleSubmit()}
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
          <div className={`result-message ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? '🎉 Correct! Great job!' : '❌ Not quite right!'}
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
  const [language, setLanguage] = useState("english");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'helpful' or 'not-helpful'

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        <div className="progress-bar" style={{ width: `${scrollProgress}%` }}></div>
      </div>
      <style>{`
        .module-detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: var(--bg-primary);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .progress-bar-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          z-index: 1000;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
          transition: width 0.3s ease;
        }
        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .breadcrumbs a {
          color: var(--accent-blue);
          text-decoration: none;
          transition: color 0.3s;
        }
        .breadcrumbs a:hover {
          color: var(--accent-purple);
        }
        .breadcrumbs span {
          color: var(--text-muted);
        }
        .module-detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .module-detail-header h3 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .module-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .module-level {
          padding: 4px 12px;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 20px;
          font-size: 14px;
          color: var(--accent-blue);
          border: 1px solid rgba(0, 212, 255, 0.2);
        }
        .module-content-wrapper {
          display: flex;
          gap: 32px;
        }
        .toc-sidebar {
          flex: 0 0 250px;
          position: sticky;
          top: 100px;
          height: fit-content;
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        .toc-sidebar h4 {
          margin-bottom: 16px;
          font-size: 18px;
        }
        .toc-sidebar ul {
          list-style: none;
          padding: 0;
        }
        .toc-sidebar li {
          margin-bottom: 12px;
        }
        .toc-sidebar a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.3s, padding-left 0.3s;
          display: block;
          padding: 4px 0;
        }
        .toc-sidebar a:hover {
          color: var(--accent-blue);
          padding-left: 4px;
        }
        .main-content {
          flex: 1;
        }
        .module-intro-section, .module-section, .media-section {
          margin-bottom: 48px;
          padding: 24px;
          background: var(--bg-secondary);
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .module-intro-section:hover, .module-section:hover, .media-section:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .media-section img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          display: block;
          margin: 0 auto;
        }
        .video-wrapper {
          position: relative;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
          height: 0;
          overflow: hidden;
          max-width: 100%;
          background: #000;
          border-radius: 8px;
        }
        .video-wrapper iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .context {
          margin-bottom: 16px;
          color: var(--text-secondary);
        }
        .module-detail-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }
        .quiz-button {
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          transition: transform 0.3s;
        }
        .quiz-button:hover {
          transform: scale(1.05);
        }

        /* Feedback Section */
        .feedback-section {
          margin-top: 32px;
          padding: 24px;
          background: var(--bg-secondary);
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        .feedback-section h5 {
          margin-bottom: 16px;
          color: var(--text-primary);
        }
        .feedback-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .feedback-btn {
          padding: 12px 24px;
          border: 2px solid var(--accent-blue);
          background: transparent;
          color: var(--accent-blue);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .feedback-btn:hover {
          background: var(--accent-blue);
          color: white;
          transform: scale(1.05);
        }
        .feedback-btn.active {
          background: var(--accent-blue);
          color: white;
        }
        .feedback-thanks {
          color: var(--accent-purple);
          font-weight: 500;
        }

        html {
          scroll-behavior: smooth;
        }

        /* Engaging styles for markdown content */
        .module-intro-section p, .module-section p {
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .module-intro-section ul, .module-section ul {
          list-style: none;
          padding-left: 0;
        }
        .module-intro-section li, .module-section li {
          position: relative;
          padding-left: 24px;
          margin-bottom: 12px;
          color: var(--text-primary);
        }
        .module-intro-section li::before, .module-section li::before {
          content: "🚀";
          position: absolute;
          left: 0;
          top: 0;
          font-size: 16px;
        }
        .module-intro-section strong, .module-section strong {
          color: var(--accent-blue);
          font-weight: 700;
        }
        .module-intro-section em, .module-section em {
          color: var(--accent-purple);
          font-style: italic;
        }
        .module-intro-section h5, .module-section h5 {
          color: var(--accent-blue);
          margin-top: 20px;
          margin-bottom: 10px;
          font-size: 18px;
        }
        .module-intro-section blockquote, .module-section blockquote {
          border-left: 4px solid var(--accent-purple);
          padding-left: 16px;
          margin: 20px 0;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* Mini Quiz Styles */
        .mini-quiz {
          background: var(--bg-tertiary);
          border: 2px solid var(--accent-blue);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .mini-quiz h5 {
          color: var(--accent-blue);
          margin-bottom: 12px;
          font-size: 18px;
        }
        .quiz-question {
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--text-primary);
        }
        .quiz-input {
          margin-bottom: 16px;
        }
        .true-false-options, .multiple-choice-options {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .quiz-option {
          padding: 10px 16px;
          border: 2px solid var(--accent-purple);
          background: transparent;
          color: var(--accent-purple);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        .quiz-option:hover {
          background: var(--accent-purple);
          color: white;
        }
        .quiz-option.selected {
          background: var(--accent-purple);
          color: white;
        }
        .fill-blank-input {
          width: 100%;
          padding: 10px;
          border: 2px solid var(--accent-purple);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 16px;
        }
        .quiz-submit-btn {
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: transform 0.3s;
        }
        .quiz-submit-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }
        .quiz-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .quiz-result {
          text-align: center;
        }
        .result-message {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          padding: 12px;
          border-radius: 8px;
        }
        .result-message.correct {
          background: rgba(0, 255, 0, 0.1);
          color: #28a745;
          border: 2px solid #28a745;
        }
        .result-message.incorrect {
          background: rgba(255, 0, 0, 0.1);
          color: #dc3545;
          border: 2px solid #dc3545;
        }
        .explanation {
          margin-bottom: 16px;
          color: var(--text-secondary);
        }
        .quiz-reset-btn {
          background: var(--accent-blue);
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .quiz-reset-btn:hover {
          background: var(--accent-purple);
        }

        /* Media queries for mobile responsiveness */
        @media (max-width: 768px) {
          .module-detail-container {
            padding: 16px;
            border-radius: 0;
          }
          .module-detail-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 24px;
          }
          .module-detail-header h3 {
            font-size: 24px;
          }
          .module-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .module-content-wrapper {
            flex-direction: column;
            gap: 24px;
          }
          .toc-sidebar {
            flex: none;
            position: static;
            top: auto;
            padding: 16px;
          }
          .toc-sidebar h4 {
            font-size: 16px;
          }
          .module-intro-section, .module-section, .media-section {
            padding: 16px;
            margin-bottom: 32px;
          }
          .module-detail-footer {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          .quiz-button, .btn {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .breadcrumbs {
            font-size: 12px;
            gap: 4px;
          }
          .module-detail-header h3 {
            font-size: 20px;
          }
          .toc-sidebar {
            padding: 12px;
          }
          .toc-sidebar ul li {
            margin-bottom: 8px;
          }
        }
      `}</style>
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
          </ul>
        </div>
        <div className="main-content">
          <div id="intro" className="module-intro-section">
            <h4>Introduction</h4>
            <ProcessedMarkdown
              content={language === "english"
                ? module.content.intro
                : module.taglish_content?.intro ||
                  "No TagLish content available"}
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
            className={`feedback-btn ${feedback === 'helpful' ? 'active' : ''}`}
            onClick={() => setFeedback('helpful')}
          >
            👍 Yes!
          </button>
          <button
            className={`feedback-btn ${feedback === 'not-helpful' ? 'active' : ''}`}
            onClick={() => setFeedback('not-helpful')}
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
