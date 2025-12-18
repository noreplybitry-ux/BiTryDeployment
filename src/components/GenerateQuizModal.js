// src/components/GenerateQuizModal.js
import React from "react";

const GenerateQuizModal = ({
  isOpen,
  onClose,
  generatedModules,
  selectedQuizModuleId,
  setSelectedQuizModuleId,
  numQuestions,
  setNumQuestions,
  onGenerate,
  isGeneratingQuiz,
  generateQuizError,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Generate Quiz Questions</h3>
          <button
            className="modal-close"
            onClick={onClose}
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
                onClick={onGenerate}
                disabled={isGeneratingQuiz || !selectedQuizModuleId}
              >
                {isGeneratingQuiz ? "Generating..." : "Generate Questions"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isGeneratingQuiz}
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

export default GenerateQuizModal;
