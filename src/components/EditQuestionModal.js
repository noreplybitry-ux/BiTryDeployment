// src/components/EditQuestionModal.js
import React from "react";

const EditQuestionModal = ({
  isOpen,
  onClose,
  editingQuestion,
  setEditingQuestion,
  onSave,
}) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Question</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {editingQuestion && (
            <div className="module-form">
              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea
                  className="form-textarea"
                  value={editingQuestion.question_text}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question_text: e.target.value,
                    })
                  }
                />
              </div>
              {editingQuestion.options.map((opt, idx) => (
                <div key={idx} className="form-group">
                  <label className="form-label">
                    Option {String.fromCharCode(65 + idx)}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...editingQuestion.options];
                      newOptions[idx] = e.target.value;
                      setEditingQuestion({
                        ...editingQuestion,
                        options: newOptions,
                      });
                    }}
                  />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Correct Answer</label>
                <select
                  className="form-select"
                  value={editingQuestion.correct_answer}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      correct_answer: parseInt(e.target.value),
                    })
                  }
                >
                  <option value={0}>A</option>
                  <option value={1}>B</option>
                  <option value={2}>C</option>
                  <option value={3}>D</option>
                </select>
              </div>
              <div className="form-actions">
                <button className="btn btn-accent" onClick={onSave}>
                  Save
                </button>
                <button className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuestionModal;
