// src/components/EditModuleModal.js
import React from "react";

const EditModuleModal = ({
  isOpen,
  onClose,
  editingModule,
  editFormData,
  setEditFormData,
  onSubmit,
  isUpdating,
  updateError,
}) => {
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSectionChange = (index, field, value, isTaglish = false) => {
    const key = isTaglish ? "taglish_sections" : "sections";
    const newSections = [...editFormData[key]];
    newSections[index] = { ...newSections[index], [field]: value };
    setEditFormData((prev) => ({ ...prev, [key]: newSections }));
  };

  const handleAddSection = (isTaglish = false) => {
    const key = isTaglish ? "taglish_sections" : "sections";
    setEditFormData((prev) => ({
      ...prev,
      [key]: [...prev[key], { title: "", body: "" }],
    }));
  };

  const handleRemoveSection = (index, isTaglish = false) => {
    const key = isTaglish ? "taglish_sections" : "sections";
    setEditFormData((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content module-content-modal">
        <div className="modal-header">
          <h3>Edit Module: {editingModule?.title}</h3>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={isUpdating}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <form className="module-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="edit-title" className="form-label">
                Module Title
              </label>
              <input
                type="text"
                id="edit-title"
                name="title"
                className="form-input"
                value={editFormData.title}
                onChange={handleEditFormChange}
                required
                disabled={isUpdating}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-intro" className="form-label">
                English Introduction
              </label>
              <textarea
                id="edit-intro"
                name="intro"
                className="form-textarea"
                rows="8"
                value={editFormData.intro}
                onChange={handleEditFormChange}
                disabled={isUpdating}
                style={{ minHeight: "200px" }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-taglish-intro" className="form-label">
                TagLish Introduction
              </label>
              <textarea
                id="edit-taglish-intro"
                name="taglish_intro"
                className="form-textarea"
                rows="8"
                value={editFormData.taglish_intro}
                onChange={handleEditFormChange}
                disabled={isUpdating}
                style={{ minHeight: "200px" }}
              />
            </div>
            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <label className="form-label">English Sections</label>
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => handleAddSection(false)}
                  disabled={isUpdating}
                >
                  Add English Section
                </button>
              </div>
              {editFormData.sections.map((section, index) => (
                <div
                  key={index}
                  className="section-edit-group"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    background: "var(--bg-tertiary)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "600",
                      }}
                    >
                      English Section {index + 1}
                    </h4>
                    <button
                      type="button"
                      className="btn btn-close"
                      onClick={() => handleRemoveSection(index, false)}
                      disabled={isUpdating}
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={section.title}
                      onChange={(e) =>
                        handleSectionChange(
                          index,
                          "title",
                          e.target.value,
                          false
                        )
                      }
                      disabled={isUpdating}
                      placeholder="Section title"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section Content</label>
                    <textarea
                      className="form-textarea"
                      rows="6"
                      value={section.body}
                      onChange={(e) =>
                        handleSectionChange(
                          index,
                          "body",
                          e.target.value,
                          false
                        )
                      }
                      disabled={isUpdating}
                      placeholder="Section content"
                      style={{ minHeight: "150px" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <label className="form-label">TagLish Sections</label>
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={() => handleAddSection(true)}
                  disabled={isUpdating}
                >
                  Add TagLish Section
                </button>
              </div>
              {editFormData.taglish_sections.map((section, index) => (
                <div
                  key={index}
                  className="section-edit-group"
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    background: "var(--bg-tertiary)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "600",
                      }}
                    >
                      TagLish Section {index + 1}
                    </h4>
                    <button
                      type="button"
                      className="btn btn-close"
                      onClick={() => handleRemoveSection(index, true)}
                      disabled={isUpdating}
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={section.title}
                      onChange={(e) =>
                        handleSectionChange(
                          index,
                          "title",
                          e.target.value,
                          true
                        )
                      }
                      disabled={isUpdating}
                      placeholder="TagLish Section title"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section Content</label>
                    <textarea
                      className="form-textarea"
                      rows="6"
                      value={section.body}
                      onChange={(e) =>
                        handleSectionChange(index, "body", e.target.value, true)
                      }
                      disabled={isUpdating}
                      placeholder="TagLish Section content"
                      style={{ minHeight: "150px" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="form-group">
              <label className="form-label">Media</label>
              <div className="form-group">
                <label htmlFor="media_image_url" className="form-label">
                  Image URL
                </label>
                <input
                  type="text"
                  id="media_image_url"
                  name="media_image_url"
                  className="form-input"
                  value={editFormData.media_image_url}
                  onChange={handleEditFormChange}
                  disabled={isUpdating}
                  placeholder="https://images.pexels.com/..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="media_photographer" className="form-label">
                  Photographer
                </label>
                <input
                  type="text"
                  id="media_photographer"
                  name="media_photographer"
                  className="form-input"
                  value={editFormData.media_photographer}
                  onChange={handleEditFormChange}
                  disabled={isUpdating}
                  placeholder="Photographer Name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="media_photographer_url" className="form-label">
                  Photographer URL
                </label>
                <input
                  type="text"
                  id="media_photographer_url"
                  name="media_photographer_url"
                  className="form-input"
                  value={editFormData.media_photographer_url}
                  onChange={handleEditFormChange}
                  disabled={isUpdating}
                  placeholder="https://www.pexels.com/@photographer"
                />
              </div>
              <div className="form-group">
                <label htmlFor="media_video" className="form-label">
                  Video Embed URL
                </label>
                <input
                  type="text"
                  id="media_video"
                  name="media_video"
                  className="form-input"
                  value={editFormData.media_video}
                  onChange={handleEditFormChange}
                  disabled={isUpdating}
                  placeholder="https://www.youtube.com/embed/VIDEO_ID"
                />
              </div>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-accent"
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Update Module"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
            {updateError && <p className="error-message">{updateError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditModuleModal;
