// src/components/ValidateMiniGamesModal.js
import React from "react";

const ValidateMiniGamesModal = ({
  isOpen,
  onClose,
  pendingMiniGames,
  selectedPendingMiniGameIds,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  onApprove,
  onReject,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div
        className="modal-content"
        style={{ width: "80%", maxWidth: "1200px" }}
      >
        <div className="modal-header">
          <h3>Pending Mini-Games</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={
                  pendingMiniGames.length > 0 &&
                  selectedPendingMiniGameIds.length === pendingMiniGames.length
                }
                onChange={onToggleSelectAll}
                aria-label="Select all pending mini-games"
              />
              Select All
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-accent"
                onClick={onApproveSelected}
                disabled={selectedPendingMiniGameIds.length === 0}
              >
                Approve Selected
              </button>
              <button
                className="btn btn-secondary"
                onClick={onRejectSelected}
                disabled={selectedPendingMiniGameIds.length === 0}
              >
                Reject Selected
              </button>
            </div>
          </div>
          {pendingMiniGames.length === 0 ? (
            <p className="info-message">No pending mini-games available.</p>
          ) : (
            <div className="modules-grid">
              {pendingMiniGames.map((g) => (
                <div key={g.id} className="module-card">
                  <div
                    className="module-card-header"
                    style={{
                      alignItems: "center",
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPendingMiniGameIds.includes(g.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelect(g.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select mini-game ${g.id}`}
                    />
                    <h3 className="module-card-title">
                      {g.learning_modules.title} - {g.game_type.toUpperCase()}{" "}
                      {g.is_taglish ? "(TagLish)" : "(English)"}
                    </h3>
                  </div>
                  <div className="module-card-content">
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(g.data, null, 2)}
                    </pre>
                  </div>
                  <div className="module-card-footer">
                    <button
                      className="btn btn-link"
                      onClick={() => onApprove(g.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-link"
                      onClick={() => onReject(g.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidateMiniGamesModal;
