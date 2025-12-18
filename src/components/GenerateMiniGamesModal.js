// src/components/GenerateMiniGamesModal.js
import React from "react";

const GenerateMiniGamesModal = ({
  isOpen,
  onClose,
  generatedModules,
  selectedMiniGamesModuleId,
  setSelectedMiniGamesModuleId,
  isMiniGamesTaglish,
  setIsMiniGamesTaglish,
  selectedGameTypes,
  onGameTypeChange,
  onGenerate,
  isGeneratingMiniGames,
  generateMiniGamesError,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Generate Mini-Games</h3>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={isGeneratingMiniGames}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="module-form">
            <div className="form-group">
              <label className="form-label">Select Module</label>
              <select
                value={selectedMiniGamesModuleId}
                onChange={(e) => setSelectedMiniGamesModuleId(e.target.value)}
                className="form-select"
                disabled={isGeneratingMiniGames}
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
              <label className="form-label">Language</label>
              <select
                value={isMiniGamesTaglish ? "taglish" : "english"}
                onChange={(e) =>
                  setIsMiniGamesTaglish(e.target.value === "taglish")
                }
                className="form-select"
                disabled={isGeneratingMiniGames}
              >
                <option value="english">English</option>
                <option value="taglish">TagLish</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Game Types</label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {[
                  "wordsearch",
                  "hangman",
                  "matching",
                  "anagram",
                  "fillblanks",
                ].map((type) => (
                  <label
                    key={type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      value={type}
                      checked={selectedGameTypes.includes(type)}
                      onChange={onGameTypeChange}
                      disabled={isGeneratingMiniGames}
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            {generateMiniGamesError && (
              <p className="error-message">{generateMiniGamesError}</p>
            )}
            <div className="form-actions">
              <button
                className="btn btn-accent"
                onClick={onGenerate}
                disabled={
                  isGeneratingMiniGames ||
                  !selectedMiniGamesModuleId ||
                  selectedGameTypes.length === 0
                }
              >
                {isGeneratingMiniGames
                  ? "Generating..."
                  : "Generate Mini-Games"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isGeneratingMiniGames}
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

export default GenerateMiniGamesModal;
