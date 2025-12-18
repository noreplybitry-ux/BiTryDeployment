// src/components/ModuleCard.js
import React from "react";

const ModuleCard = ({
  module,
  onClick,
  isAdmin,
  onEdit,
  onDelete,
  moduleQuestionCounts,
  moduleTaglishQuestionCounts,
  formatDate,
}) => {
  return (
    <div className="module-card" onClick={() => onClick(module)}>
      {module.content?.media?.image?.url && (
        <img
          src={module.content.media.image.url}
          alt="Module thumbnail"
          className="module-thumbnail"
        />
      )}
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
        <div className="module-keywords">
          {module.keywords.map((kw, idx) => (
            <span key={idx} className="keyword-tag">
              {kw}
            </span>
          ))}
        </div>
        <div className="module-sections-count">
          {module.content?.sections?.length || 0} sections
        </div>
        <div className="quiz-availability">
          {(moduleQuestionCounts[module.id] ?? 0) > 0 && (
            <span className="quiz-badge english">
              <span className="quiz-available-dot" />
              English Quiz
            </span>
          )}
          {(moduleTaglishQuestionCounts[module.id] ?? 0) > 0 && (
            <span className="quiz-badge taglish">
              <span className="quiz-available-dot" />
              Taglish Quiz
            </span>
          )}
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
              onClick(module);
            }}
          >
            View Module →
          </button>
          {isAdmin && (
            <>
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(module);
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
              <button
                className="btn btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(module);
                }}
                style={{
                  fontSize: "14px",
                  padding: "4px 8px",
                  backgroundColor: "red",
                  color: "white",
                  border: "none",
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleCard;
