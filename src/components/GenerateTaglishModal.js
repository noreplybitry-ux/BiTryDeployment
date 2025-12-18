// src/components/GenerateTaglishModal.js
import React from "react";

const GenerateTaglishModal = ({
  isOpen,
  onClose,
  generatedModules,
  selectedTaglishModuleId,
  setSelectedTaglishModuleId,
  onGenerate,
  isGeneratingTaglish,
  generateTaglishError,
  onRefresh,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Generate TagLish Content</h3>
          <button
            className="modal-close"
            onClick={onClose}
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
                onClick={onRefresh}
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
              <p className="info-message">No modules with content available.</p>
            )}
            <div className="form-actions">
              <button
                className="btn btn-accent"
                onClick={onGenerate}
                disabled={isGeneratingTaglish || !selectedTaglishModuleId}
              >
                {isGeneratingTaglish ? "Generating..." : "Generate TagLish"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isGeneratingTaglish}
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

export default GenerateTaglishModal;
