// src/components/CreateModuleModal.js
import React from "react";

const CreateModuleModal = ({
  isOpen,
  onClose,
  keywords,
  setKeywords,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  submitError,
}) => {
  const handleAddKeyword = () => {
    setKeywords([...keywords, ""]);
  };

  const handleKeywordChange = (index, value) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={`modal-overlay ${isOpen ? "" : "hidden"}`}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Learning Module</h3>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <form className="module-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="module-title" className="form-label">
                Module Title
              </label>
              <input
                type="text"
                id="module-title"
                name="title"
                className="form-input"
                placeholder="e.g., Introduction to Blockchain"
                value={formData.title}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Keywords</label>
              <div className="keywords-group">
                {keywords.map((keyword, index) => (
                  <input
                    key={index}
                    type="text"
                    className="form-input keyword-input"
                    placeholder={`e.g., ${
                      ["blockchain", "smart contracts", "decentralization"][
                        index % 3
                      ]
                    }`}
                    value={keyword}
                    onChange={(e) => handleKeywordChange(index, e.target.value)}
                    disabled={isSubmitting}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-accent add-keyword"
                  onClick={handleAddKeyword}
                  disabled={isSubmitting}
                >
                  +
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="specific-points" className="form-label">
                Specific Points to Include
              </label>
              <textarea
                id="specific-points"
                name="specificPoints"
                className="form-textarea"
                rows="4"
                placeholder="e.g., Explain how blockchain ensures security, include examples of smart contracts"
                value={formData.specificPoints}
                onChange={handleInputChange}
                disabled={isSubmitting}
              ></textarea>
            </div>
            <div className="form-group">
              <label htmlFor="level" className="form-label">
                Level
              </label>
              <select
                id="level"
                name="level"
                className="form-select"
                value={formData.level}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="length" className="form-label">
                Length
              </label>
              <select
                id="length"
                name="length"
                className="form-select"
                value={formData.length}
                onChange={handleInputChange}
                disabled={isSubmitting}
              >
                <option value="Short">Short (~500 words)</option>
                <option value="Medium">Medium (~1000 words)</option>
                <option value="Long">Long (~2000 words)</option>
              </select>
            </div>
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-accent"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Module"}
              </button>
              <button
                type="button"
                className="btn btn-close"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
            {submitError && <p className="error-message">{submitError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateModuleModal;
