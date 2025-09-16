import React, { useState, useEffect } from "react";
import {
  Clock,
  BookOpen,
  Play,
  ChevronLeft,
  Check,
  ChevronRight,
  Star,
  Trophy,
  ArrowLeft,
  Target,
  Brain,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  Award,
  RotateCcw,
  X,
  AlertCircle,
  FileText,
  Scroll,
} from "lucide-react";

export default function CourseViewer({ course, onClose, quizzes = [] }) {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentLessonData = course.lessons[currentLesson];
  const isCompleted = completedLessons.has(currentLesson);
  const progress = (completedLessons.size / course.lessons.length) * 100;
  const canTakeQuiz = completedLessons.size === course.lessons.length;

  // Function to format and display content properly
  const formatLessonContent = (content) => {
    if (!content || typeof content !== "string") {
      return null;
    }

    // Split content into sections and paragraphs
    const sections = content
      .split(/\n\s*\n/)
      .filter((section) => section.trim());

    return sections.map((section, sectionIndex) => {
      const lines = section.split("\n").filter((line) => line.trim());

      return (
        <div key={sectionIndex} style={{ marginBottom: "2rem" }}>
          {lines.map((line, lineIndex) => {
            const trimmedLine = line.trim();

            // Handle headers (lines that start with ** or are in ALL CAPS)
            if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
              const headerText = trimmedLine.slice(2, -2);
              return (
                <h3
                  key={lineIndex}
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#1f2937",
                    marginBottom: "0.75rem",
                    marginTop: lineIndex === 0 ? "0" : "1.5rem",
                  }}
                >
                  {headerText}
                </h3>
              );
            }

            // Handle bold text within paragraphs
            const handleBoldText = (text) => {
              const parts = text.split(/(\*\*[^*]+\*\*)/g);
              return parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong
                      key={i}
                      style={{ color: "#1f2937", fontWeight: "600" }}
                    >
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              });
            };

            // Handle bullet points (lines starting with - or •)
            if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
              return (
                <div
                  key={lineIndex}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    marginBottom: "0.5rem",
                    paddingLeft: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                      marginTop: "0.5rem",
                      flexShrink: 0,
                    }}
                  ></div>
                  <p
                    style={{
                      margin: 0,
                      color: "#374151",
                      lineHeight: "1.6",
                    }}
                  >
                    {handleBoldText(trimmedLine.substring(2))}
                  </p>
                </div>
              );
            }

            // Handle numbered lists (lines starting with numbers)
            if (/^\d+[.)]\s/.test(trimmedLine)) {
              const numberMatch = trimmedLine.match(/^(\d+)[.)]\s(.+)/);
              if (numberMatch) {
                return (
                  <div
                    key={lineIndex}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      marginBottom: "0.75rem",
                      paddingLeft: "1rem",
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: "#dbeafe",
                        color: "#1e40af",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        flexShrink: 0,
                      }}
                    >
                      {numberMatch[1]}
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "#374151",
                        lineHeight: "1.6",
                      }}
                    >
                      {handleBoldText(numberMatch[2])}
                    </p>
                  </div>
                );
              }
            }

            // Handle section headers (lines that are mostly uppercase or end with :)
            if (
              trimmedLine.endsWith(":") ||
              (trimmedLine === trimmedLine.toUpperCase() &&
                trimmedLine.length > 3 &&
                trimmedLine.split(" ").length <= 4)
            ) {
              return (
                <h4
                  key={lineIndex}
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "#4b5563",
                    marginBottom: "0.5rem",
                    marginTop: lineIndex === 0 ? "0" : "1.25rem",
                    textTransform:
                      trimmedLine === trimmedLine.toUpperCase()
                        ? "capitalize"
                        : "none",
                  }}
                >
                  {trimmedLine}
                </h4>
              );
            }

            // Regular paragraphs
            if (trimmedLine.length > 0) {
              return (
                <p
                  key={lineIndex}
                  style={{
                    margin: "0 0 1rem 0",
                    color: "#374151",
                    lineHeight: "1.7",
                    fontSize: "1rem",
                  }}
                >
                  {handleBoldText(trimmedLine)}
                </p>
              );
            }

            return null;
          })}
        </div>
      );
    });
  };

  // Load random quiz questions when quiz starts
  const startQuiz = () => {
    if (quizzes.length === 0) return;

    // Select random questions from the quiz pool
    const shuffledQuizzes = [...quizzes].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffledQuizzes.slice(
      0,
      Math.min(5, shuffledQuizzes.length)
    );

    setQuizQuestions(selectedQuestions);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizCompleted(false);
    setQuizScore(0);
    setShowResults(false);
    setShowQuiz(true);
  };

  const selectAnswer = (questionIndex, answerIndex) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: answerIndex,
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeQuiz();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const completeQuiz = () => {
    let correctAnswers = 0;

    quizQuestions.forEach((question, index) => {
      const selectedAnswer = selectedAnswers[index];
      const correctAnswer = question.correct;

      if (selectedAnswer !== undefined) {
        const selectedLetter = String.fromCharCode(65 + selectedAnswer); // Convert 0,1,2,3 to A,B,C,D
        if (selectedLetter === correctAnswer) {
          correctAnswers++;
        }
      }
    });

    const score = Math.round((correctAnswers / quizQuestions.length) * 100);
    setQuizScore(score);
    setQuizCompleted(true);
    setShowResults(true);
  };

  const retakeQuiz = () => {
    startQuiz();
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuizCompleted(false);
    setShowResults(false);
  };

  const nextLesson = () => {
    if (currentLesson < course.lessons.length - 1) {
      const newCompleted = new Set(completedLessons);
      newCompleted.add(currentLesson);
      setCompletedLessons(newCompleted);
      setCurrentLesson(currentLesson + 1);
    }
  };

  const prevLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    }
  };

  const completeLesson = () => {
    const newCompleted = new Set(completedLessons);
    newCompleted.add(currentLesson);
    setCompletedLessons(newCompleted);
  };

  if (showQuiz && quizQuestions.length > 0) {
    return (
      <div
        className="quiz-container"
        style={{
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
          padding: "2rem",
        }}
      >
        {/* Quiz Header */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "2rem",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "0.5rem",
              }}
            >
              AI Quiz: {course.title}
            </h2>
            <p style={{ color: "#6b7280" }}>
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </p>
          </div>
          <button
            onClick={closeQuiz}
            style={{
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
          </button>
        </div>

        {!showResults ? (
          /* Quiz Questions */
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                marginBottom: "2rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${
                    ((currentQuestionIndex + 1) / quizQuestions.length) * 100
                  }%`,
                  height: "100%",
                  backgroundColor: "#3b82f6",
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>

            {/* Current Question */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <HelpCircle
                  style={{ width: "20px", height: "20px", color: "#3b82f6" }}
                />
                <span
                  style={{
                    padding: "4px 12px",
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  {quizQuestions[currentQuestionIndex].difficulty}
                </span>
              </div>

              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "2rem",
                  lineHeight: "1.5",
                }}
              >
                {quizQuestions[currentQuestionIndex].question}
              </h3>

              {/* Answer Options */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginBottom: "2rem",
                }}
              >
                {quizQuestions[currentQuestionIndex].options.map(
                  (option, index) => {
                    const isSelected =
                      selectedAnswers[currentQuestionIndex] === index;
                    const letter = String.fromCharCode(65 + index);

                    return (
                      <button
                        key={index}
                        onClick={() =>
                          selectAnswer(currentQuestionIndex, index)
                        }
                        style={{
                          padding: "1rem",
                          border: `2px solid ${
                            isSelected ? "#3b82f6" : "#e5e7eb"
                          }`,
                          borderRadius: "8px",
                          backgroundColor: isSelected ? "#eff6ff" : "white",
                          textAlign: "left",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: isSelected ? "#3b82f6" : "#f3f4f6",
                            color: isSelected ? "white" : "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "600",
                            fontSize: "0.875rem",
                          }}
                        >
                          {letter}
                        </div>
                        <span
                          style={{
                            color: "#374151",
                            fontSize: "1rem",
                          }}
                        >
                          {option}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Navigation Buttons */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "10px 20px",
                    backgroundColor:
                      currentQuestionIndex === 0 ? "#f3f4f6" : "#e5e7eb",
                    color: currentQuestionIndex === 0 ? "#9ca3af" : "#374151",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                    fontWeight: "500",
                  }}
                >
                  <ChevronLeft style={{ width: "16px", height: "16px" }} />
                  Previous
                </button>

                <button
                  onClick={nextQuestion}
                  disabled={selectedAnswers[currentQuestionIndex] === undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "10px 20px",
                    backgroundColor:
                      selectedAnswers[currentQuestionIndex] !== undefined
                        ? "#3b82f6"
                        : "#f3f4f6",
                    color:
                      selectedAnswers[currentQuestionIndex] !== undefined
                        ? "white"
                        : "#9ca3af",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      selectedAnswers[currentQuestionIndex] !== undefined
                        ? "pointer"
                        : "not-allowed",
                    fontWeight: "500",
                  }}
                >
                  {currentQuestionIndex === quizQuestions.length - 1
                    ? "Finish Quiz"
                    : "Next"}
                  <ChevronRight style={{ width: "16px", height: "16px" }} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Quiz Results */
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              maxWidth: "600px",
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor:
                  quizScore >= 70
                    ? "#10b981"
                    : quizScore >= 50
                    ? "#f59e0b"
                    : "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              {quizScore >= 70 ? (
                <Trophy
                  style={{ width: "40px", height: "40px", color: "white" }}
                />
              ) : quizScore >= 50 ? (
                <Award
                  style={{ width: "40px", height: "40px", color: "white" }}
                />
              ) : (
                <AlertCircle
                  style={{ width: "40px", height: "40px", color: "white" }}
                />
              )}
            </div>

            <h3
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "0.5rem",
              }}
            >
              Quiz Completed!
            </h3>

            <div
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                color:
                  quizScore >= 70
                    ? "#10b981"
                    : quizScore >= 50
                    ? "#f59e0b"
                    : "#ef4444",
                marginBottom: "1rem",
              }}
            >
              {quizScore}%
            </div>

            <p
              style={{
                color: "#6b7280",
                marginBottom: "2rem",
              }}
            >
              You answered{" "}
              {quizQuestions.reduce((correct, question, index) => {
                const selectedAnswer = selectedAnswers[index];
                const correctAnswer = question.correct;
                if (selectedAnswer !== undefined) {
                  const selectedLetter = String.fromCharCode(
                    65 + selectedAnswer
                  );
                  if (selectedLetter === correctAnswer) {
                    return correct + 1;
                  }
                }
                return correct;
              }, 0)}{" "}
              out of {quizQuestions.length} questions correctly
            </p>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={retakeQuiz}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "12px 20px",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                <RotateCcw style={{ width: "16px", height: "16px" }} />
                Retake Quiz
              </button>

              <button
                onClick={closeQuiz}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "12px 20px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Continue Learning
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="course-viewer"
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
      }}
    >
      {/* Course Header */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1rem 2rem",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "8px 16px",
              backgroundColor: "#f3f4f6",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            <ArrowLeft style={{ width: "16px", height: "16px" }} />
            Back to Courses
          </button>

          <div style={{ flex: 1, maxWidth: "400px", margin: "0 2rem" }}>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#e5e7eb",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#10b981",
                  transition: "width 0.3s ease",
                }}
              ></div>
            </div>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                marginTop: "0.5rem",
                textAlign: "center",
              }}
            >
              {completedLessons.size} of {course.lessons.length} lessons
              completed ({Math.round(progress)}%)
            </p>
          </div>

          {canTakeQuiz && quizzes.length > 0 && (
            <button
              onClick={startQuiz}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "8px 16px",
                backgroundColor: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              <HelpCircle style={{ width: "16px", height: "16px" }} />
              Take AI Quiz
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          maxWidth: "1200px",
          margin: "0 auto",
          gap: "2rem",
          padding: "2rem",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: "300px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              position: "sticky",
              top: "100px",
            }}
          >
            <div style={{ marginBottom: "1.5rem" }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  color: "#1f2937",
                  marginBottom: "0.5rem",
                }}
              >
                {course.title}
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "1rem",
                }}
              >
                {course.subtitle}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Clock style={{ width: "14px", height: "14px" }} />
                  <span>{course.duration}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <BookOpen style={{ width: "14px", height: "14px" }} />
                  <span>{course.lessons.length} lessons</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <Star style={{ width: "14px", height: "14px" }} />
                  <span>{course.rating}</span>
                </div>
              </div>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  marginBottom: "1rem",
                }}
              >
                Course Content
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {course.lessons.map((lesson, index) => {
                  const isActive = index === currentLesson;
                  const isCompleted = completedLessons.has(index);

                  return (
                    <div
                      key={index}
                      onClick={() => setCurrentLesson(index)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: `1px solid ${
                          isActive ? "#3b82f6" : "transparent"
                        }`,
                        backgroundColor: isActive
                          ? "#eff6ff"
                          : isCompleted
                          ? "#f0fdf4"
                          : "#f9fafb",
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            backgroundColor: isCompleted
                              ? "#10b981"
                              : isActive
                              ? "#3b82f6"
                              : "#e5e7eb",
                            color:
                              isCompleted || isActive ? "white" : "#6b7280",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            flexShrink: 0,
                          }}
                        >
                          {isCompleted ? (
                            <Check style={{ width: "12px", height: "12px" }} />
                          ) : isActive ? (
                            <Play style={{ width: "12px", height: "12px" }} />
                          ) : (
                            index + 1
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: "500",
                              color: "#1f2937",
                              marginBottom: "0.25rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {lesson.title}
                          </h4>
                          <p
                            style={{
                              fontSize: "0.75rem",
                              color: "#6b7280",
                            }}
                          >
                            {lesson.duration}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Lesson Header */}
            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                <span
                  style={{
                    padding: "4px 12px",
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  {currentLessonData.type}
                </span>
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                >
                  {currentLessonData.duration}
                </span>
                {currentLessonData.isCustom && (
                  <span
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#dcfce7",
                      color: "#15803d",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Brain style={{ width: "12px", height: "12px" }} />
                    Custom AI
                  </span>
                )}
              </div>

              <h1
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#1f2937",
                  marginBottom: "1rem",
                  lineHeight: "1.2",
                }}
              >
                {currentLessonData.title}
              </h1>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  backgroundColor: "#eff6ff",
                  borderRadius: "8px",
                  border: "1px solid #dbeafe",
                }}
              >
                <Target
                  style={{ width: "20px", height: "20px", color: "#3b82f6" }}
                />
                <p
                  style={{
                    color: "#1e40af",
                    fontWeight: "500",
                    margin: 0,
                  }}
                >
                  {currentLessonData.objective}
                </p>
              </div>
            </div>

            {/* Lesson Content */}
            <div style={{ marginBottom: "2rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <Brain
                  style={{ width: "24px", height: "24px", color: "#10b981" }}
                />
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  AI-Generated Learning Content
                </h3>
                {currentLessonData.fullContent && (
                  <span
                    style={{
                      padding: "2px 8px",
                      backgroundColor: "#f0fdf4",
                      color: "#15803d",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <CheckCircle style={{ width: "12px", height: "12px" }} />
                    Comprehensive
                  </span>
                )}
              </div>

              <div
                style={{
                  padding: "2rem",
                  backgroundColor: "#f9fafb",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  maxHeight: "70vh",
                  overflowY: "auto",
                }}
              >
                {currentLessonData.content ? (
                  <div
                    style={{
                      color: "#374151",
                      lineHeight: "1.7",
                      fontSize: "1rem",
                    }}
                  >
                    {formatLessonContent(currentLessonData.content)}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "3rem",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          border: "3px solid #f59e0b",
                          borderTop: "3px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      ></div>
                      <Lightbulb
                        style={{
                          width: "48px",
                          height: "48px",
                          color: "#f59e0b",
                        }}
                      />
                    </div>
                    <div>
                      <h4
                        style={{
                          color: "#1f2937",
                          fontSize: "1.125rem",
                          fontWeight: "600",
                          marginBottom: "0.5rem",
                        }}
                      >
                        AI Content Loading
                      </h4>
                      <p
                        style={{
                          color: "#6b7280",
                          fontSize: "1rem",
                          margin: 0,
                          maxWidth: "400px",
                        }}
                      >
                        Comprehensive AI content is being generated for this
                        lesson. The content will cover{" "}
                        {currentLessonData.objective.toLowerCase()}
                        with detailed explanations and practical examples.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Summary Stats */}
              {currentLessonData.content && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FileText style={{ width: "16px", height: "16px" }} />
                    <span>
                      {currentLessonData.content.split(" ").length} words
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Clock style={{ width: "16px", height: "16px" }} />
                    <span>
                      ~
                      {Math.ceil(
                        currentLessonData.content.split(" ").length / 200
                      )}{" "}
                      min read
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Scroll style={{ width: "16px", height: "16px" }} />
                    <span>
                      {
                        currentLessonData.content
                          .split(/\n\s*\n/)
                          .filter((p) => p.trim()).length
                      }{" "}
                      sections
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Lesson Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.5rem",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <button
                onClick={prevLesson}
                disabled={currentLesson === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "12px 20px",
                  backgroundColor: currentLesson === 0 ? "#f3f4f6" : "#6b7280",
                  color: currentLesson === 0 ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: currentLesson === 0 ? "not-allowed" : "pointer",
                  fontWeight: "500",
                }}
              >
                <ChevronLeft style={{ width: "16px", height: "16px" }} />
                Previous Lesson
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                {!isCompleted && (
                  <button
                    onClick={completeLesson}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "12px 20px",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    <Check style={{ width: "16px", height: "16px" }} />
                    Mark Complete
                  </button>
                )}

                <button
                  onClick={nextLesson}
                  disabled={currentLesson === course.lessons.length - 1}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "12px 20px",
                    backgroundColor:
                      currentLesson === course.lessons.length - 1
                        ? "#f3f4f6"
                        : "#3b82f6",
                    color:
                      currentLesson === course.lessons.length - 1
                        ? "#9ca3af"
                        : "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      currentLesson === course.lessons.length - 1
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "500",
                  }}
                >
                  Next Lesson
                  <ChevronRight style={{ width: "16px", height: "16px" }} />
                </button>
              </div>
            </div>

            {/* Course Completion */}
            {currentLesson === course.lessons.length - 1 &&
              completedLessons.has(currentLesson) && (
                <div
                  style={{
                    marginTop: "2rem",
                    padding: "2rem",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    textAlign: "center",
                  }}
                >
                  <Trophy
                    style={{
                      width: "64px",
                      height: "64px",
                      color: "#059669",
                      margin: "0 auto 1rem",
                    }}
                  />

                  <h3
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#047857",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Congratulations!
                  </h3>

                  <p
                    style={{
                      color: "#065f46",
                      marginBottom: "1.5rem",
                      fontSize: "1rem",
                    }}
                  >
                    You've completed all lessons in this AI-generated course!
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {canTakeQuiz && quizzes.length > 0 && (
                      <button
                        onClick={startQuiz}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "12px 24px",
                          backgroundColor: "#f59e0b",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "500",
                          fontSize: "1rem",
                        }}
                      >
                        <HelpCircle style={{ width: "20px", height: "20px" }} />
                        Take Final AI Quiz
                      </button>
                    )}

                    {course.originalLink && (
                      <a
                        href={course.originalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "12px 24px",
                          backgroundColor: "#6b7280",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "6px",
                          fontWeight: "500",
                        }}
                      >
                        View Original Source
                      </a>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
