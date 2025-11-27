// ModuleDetail.js
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

const ModuleDetail = ({
  module,
  onBack,
  onTakeQuiz,
  moduleQuestionCounts,
  moduleTaglishQuestionCounts,
  user,
}) => {
  const [language, setLanguage] = useState("english");

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
      <style>{`
        .module-detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: var(--bg-primary);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
        html {
          scroll-behavior: smooth;
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
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {language === "english"
                ? module.content.intro
                : module.taglish_content?.intro ||
                  "No TagLish content available"}
            </ReactMarkdown>
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
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {section.body}
                </ReactMarkdown>
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
    </div>
  );
};

export default ModuleDetail;
