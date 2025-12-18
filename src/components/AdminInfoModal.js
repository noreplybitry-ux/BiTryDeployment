// src/components/AdminInfoModal.js
import React from "react";

const AdminInfoModal = ({ isOpen, onClose }) => {
  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Module Generator & Creator</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="module-form">
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                background: "rgba(108, 92, 231, 0.1)",
                borderRadius: "12px",
                border: "1px solid rgba(108, 92, 231, 0.3)",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px 0",
                  color: "var(--text-primary)",
                  fontSize: "24px",
                  fontWeight: "800",
                }}
              >
                Administrative Tools
              </h2>
              <p
                style={{
                  margin: "0 0 16px 0",
                  color: "var(--text-secondary)",
                  fontSize: "16px",
                  fontWeight: "500",
                  lineHeight: "1.6",
                }}
              >
                Use these tools to create and generate educational learning
                modules for your crypto knowledge platform.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "16px",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    background: "var(--bg-tertiary)",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--accent-blue)",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    Create New Module
                  </h4>
                  <p
                    style={{
                      margin: "0",
                      color: "var(--text-muted)",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    Define module structure with title, keywords, difficulty
                    level, and specific learning objectives.
                  </p>
                </div>
                <div
                  style={{
                    background: "var(--bg-tertiary)",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--accent-purple)",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    Generate Content
                  </h4>
                  <p
                    style={{
                      margin: "0",
                      color: "var(--text-muted)",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    Use AI to generate comprehensive educational content based
                    on your module specifications.
                  </p>
                </div>
                <div
                  style={{
                    background: "var(--bg-tertiary)",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--accent-green)",
                      fontSize: "16px",
                      fontWeight: "700",
                    }}
                  >
                    Edit Modules
                  </h4>
                  <p
                    style={{
                      margin: "0",
                      color: "var(--text-muted)",
                      fontSize: "14px",
                      lineHeight: "1.4",
                    }}
                  >
                    Modify existing module content, add or remove sections, and
                    update titles and descriptions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminInfoModal;
