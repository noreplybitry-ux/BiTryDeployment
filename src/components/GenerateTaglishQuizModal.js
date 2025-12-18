// src/components/GenerateTaglishQuizModal.js
import React from "react";

const GenerateTaglishQuizModal = ({
  isOpen,
  onClose,
  generatedModules,
  selectedTaglishQuizModuleId,
  setSelectedTaglishQuizModuleId,
  numTaglishQuestions,
  setNumTaglishQuestions,
  onGenerate,
  isGeneratingTaglishQuiz,
  generateTaglishQuizError,
  moduleQuestionCounts,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Generate Taglish Quiz Questions</h3>
          <button
            className="modal-close"
            onClick={onClose}
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
                onChange={(e) => setSelectedTaglishQuizModuleId(e.target.value)}
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
                onClick={onGenerate}
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
                onClick={onClose}
                disabled={isGeneratingTaglishQuiz}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateTaglishQuizModal;
