// src/components/ValidateQuizModal.js
import React from "react";

const ValidateQuizModal = ({
  isOpen,
  onClose,
  pendingQuestions,
  selectedPendingQuestionIds,
  onToggleSelect,
  onToggleSelectAll,
  onApproveSelected,
  onRejectSelected,
  onApprove,
  onReject,
  onEdit,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div
        className="modal-content"
        style={{ width: "80%", maxWidth: "1200px" }}
      >
        <div className="modal-header">
          <h3>Pending Quiz Questions</h3>
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
                  pendingQuestions.length > 0 &&
                  selectedPendingQuestionIds.length === pendingQuestions.length
                }
                onChange={onToggleSelectAll}
                aria-label="Select all pending questions"
              />
              Select All
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-accent"
                onClick={onApproveSelected}
                disabled={selectedPendingQuestionIds.length === 0}
              >
                Approve Selected
              </button>
              <button
                className="btn btn-secondary"
                onClick={onRejectSelected}
                disabled={selectedPendingQuestionIds.length === 0}
              >
                Reject Selected
              </button>
            </div>
          </div>
          {pendingQuestions.length === 0 ? (
            <p className="info-message">No pending questions available.</p>
          ) : (
            <div className="modules-grid">
              {pendingQuestions.map((q) => (
                <div key={q.id} className="module-card">
                  <div
                    className="module-card-header"
                    style={{ alignItems: "center", display: "flex", gap: 12 }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPendingQuestionIds.includes(q.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelect(q.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select question ${q.id}`}
                    />
                    <h3 className="module-card-title">
                      {q.learning_modules.title}{" "}
                      {q.is_taglish ? "(TagLish)" : "(English)"}
                    </h3>
                  </div>
                  <div className="module-card-content">
                    <p>
                      <strong>Question:</strong> {q.question_text}
                    </p>
                    <ul>
                      {q.options.map((opt, idx) => (
                        <li
                          key={idx}
                          style={{
                            fontWeight:
                              idx === q.correct_answer ? "bold" : "normal",
                          }}
                        >
                          {String.fromCharCode(65 + idx)}: {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="module-card-footer">
                    <button className="btn btn-link" onClick={() => onEdit(q)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-link"
                      onClick={() => onApprove(q.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-link"
                      onClick={() => onReject(q.id)}
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

export default ValidateQuizModal;
