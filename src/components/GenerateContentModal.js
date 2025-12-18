// src/components/GenerateContentModal.js
import React from "react";

const GenerateContentModal = ({
  isOpen,
  onClose,
  modules,
  selectedModuleId,
  setSelectedModuleId,
  onGenerate,
  isGenerating,
  generateError,
  fetchModulesError,
  onRefresh,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Generate Module Content</h3>
          <button
            className="modal-close"
            onClick={onClose}
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
                onClick={onRefresh}
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
              <p className="info-message">No ungenerated modules available.</p>
            )}
            {generateError && <p className="error-message">{generateError}</p>}
            <div className="form-actions">
              <button
                className="btn btn-accent"
                onClick={onGenerate}
                disabled={isGenerating || !selectedModuleId}
              >
                {isGenerating ? "Generating..." : "Generate Module"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isGenerating}
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

export default GenerateContentModal;
