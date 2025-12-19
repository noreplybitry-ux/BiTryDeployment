// ModuleDetail.js
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const ProcessedMarkdown = ({ content }) => {
  const parts = content.split(/(\[QUIZ:[^\]]*\][\s\S]*?\[\/QUIZ\])/i);

  return (
    <>
      {parts.map((part, index) => {
        const quizMatch = part.match(/\[QUIZ:([^\]]*)\]([\s\S]*?)\[\/QUIZ\]/i);
        if (quizMatch) {
          return <QuizComponent key={index} content={part} />;
        } else if (part.trim()) {
          return (
            <ReactMarkdown
              key={index}
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {part}
            </ReactMarkdown>
          );
        }
        return null;
      })}
    </>
  );
};

const QuizComponent = ({ content }) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Parse the quiz content with more flexible regex
  const quizMatch = content.match(/\[QUIZ:([^\]]*)\]([\s\S]*?)\[\/QUIZ\]/i);
  if (!quizMatch) {
    console.warn("No quiz block found in content");
    return null;
  }

  const type = quizMatch[1].trim().toLowerCase();
  const quizContent = quizMatch[2];

  // More flexible parsing that handles extra whitespace and newlines
  const questionMatch = quizContent.match(
    /Question:\s*([^\n]*?)(?=\s*(?:Options:|Answer:|Explanation:|\[\/QUIZ\]|$))/is
  );
  const optionsMatch = quizContent.match(
    /Options:\s*([^\n]*?)(?=\s*(?:Answer:|Explanation:|\[\/QUIZ\]|$))/is
  );
  const answerMatch = quizContent.match(
    /Answer:\s*([^\n]*?)(?=\s*(?:Explanation:|\[\/QUIZ\]|$))/is
  );
  const explanationMatch = quizContent.match(
    /Explanation:\s*(.*?)(?=\s*\[\/QUIZ\]|$)/is
  );

  const question = questionMatch ? questionMatch[1].trim() : "";
  const options = optionsMatch
    ? optionsMatch[1]
        .split(",")
        .map((opt) => opt.trim())
        .filter((opt) => opt.length > 0)
    : [];
  const correctAnswer = answerMatch ? answerMatch[1].trim() : "";
  const explanation = explanationMatch ? explanationMatch[1].trim() : "";

  // Debug logging
  console.log("Quiz parsed:", {
    type,
    question,
    options,
    correctAnswer,
    explanation,
  });

  const handleSubmit = () => {
    const userAnswerLower = userAnswer.toLowerCase().trim();
    const correctAnswerLower = correctAnswer.toLowerCase().trim();
    setIsCorrect(userAnswerLower === correctAnswerLower);
    setShowResult(true);
  };

  const resetQuiz = () => {
    setUserAnswer("");
    setShowResult(false);
    setIsCorrect(false);
  };

  // Validation
  if (!question || !correctAnswer) {
    console.warn("Quiz parsing failed - missing required fields:", {
      question,
      correctAnswer,
    });
    return null;
  }

  return (
    <div className="mini-quiz">
      <h5>🧠 Quick Check!</h5>
      <p className="quiz-question">{question}</p>

      {!showResult ? (
        <div className="quiz-input">
          {type === "truefalse" && (
            <div className="true-false-options">
              <button
                className={`quiz-option ${
                  userAnswer === "True" ? "selected" : ""
                }`}
                onClick={() => setUserAnswer("True")}
              >
                ✓ True
              </button>
              <button
                className={`quiz-option ${
                  userAnswer === "False" ? "selected" : ""
                }`}
                onClick={() => setUserAnswer("False")}
              >
                ✗ False
              </button>
            </div>
          )}

          {type === "multiplechoice" && options.length > 0 && (
            <div className="multiple-choice-options">
              {options.map((option, index) => (
                <button
                  key={index}
                  className={`quiz-option ${
                    userAnswer === option ? "selected" : ""
                  }`}
                  onClick={() => setUserAnswer(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {type === "fillblank" && (
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && userAnswer && handleSubmit()
              }
              placeholder="Type your answer here..."
              className="fill-blank-input"
            />
          )}

          <button
            className="quiz-submit-btn"
            onClick={handleSubmit}
            disabled={!userAnswer}
          >
            Check Answer ✨
          </button>
        </div>
      ) : (
        <div className="quiz-result">
          <div
            className={`result-message ${isCorrect ? "correct" : "incorrect"}`}
          >
            {isCorrect ? "🎉 Correct! Great job!" : "❌ Not quite right!"}
          </div>
          <p className="explanation">
            <strong>💡 Explanation:</strong> {explanation}
          </p>
          <button className="quiz-reset-btn" onClick={resetQuiz}>
            🔄 Try Again
          </button>
        </div>
      )}
    </div>
  );
};

// Enhanced HangmanGame
const HangmanGame = ({ data, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [scores, setScores] = useState([]);
  const [shake, setShake] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const maxWrong = 6;
  const currentWord = data.words[currentIndex].word.toUpperCase();
  const hint = data.words[currentIndex].hint;
  const displayedWord = currentWord
    .split("")
    .map((letter) => (guesses.includes(letter) ? letter : "_"))
    .join(" ");
  const isWon = !displayedWord.includes("_");
  const isLost = wrongGuesses >= maxWrong;
  const handleGuess = (letter) => {
    if (guesses.includes(letter) || isWon || isLost) return;
    const newGuesses = [...guesses, letter];
    setGuesses(newGuesses);

    if (!currentWord.includes(letter)) {
      setWrongGuesses(wrongGuesses + 1);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else if (
      currentWord.split("").every((l) => [...newGuesses].includes(l))
    ) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1000);
    }
  };
  const nextWord = () => {
    const score = isWon ? 1 : 0;
    setScores([...scores, score]);
    setGuesses([]);
    setWrongGuesses(0);
    if (currentIndex + 1 < data.words.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const totalScore = scores.reduce((a, b) => a + b, 0) + score;
      setShowResult(true);
      onComplete(totalScore, data.words.length);
    }
  };
  const reset = () => {
    setCurrentIndex(0);
    setGuesses([]);
    setWrongGuesses(0);
    setShowResult(false);
    setScores([]);
  };
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderRadius: "20px",
        padding: "32px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {celebrate && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: "-10%",
                animation: `fall ${1 + Math.random() * 2}s linear`,
                fontSize: "24px",
              }}
            >
              {["🎉", "⭐", "✨", "🎊"][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes fall {
          to { transform: translateY(110vh) rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .letter-box {
          animation: bounce 0.5s ease;
        }
      `}</style>
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
        }}
      >
        {/* Hangman Character */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "300px",
            position: "relative",
            animation: shake ? "shake 0.5s" : "none",
          }}
        >
          <svg width="250" height="300" viewBox="0 0 250 300">
            {/* Gallows */}
            <line
              x1="20"
              y1="280"
              x2="150"
              y2="280"
              stroke="#8B4513"
              strokeWidth="4"
            />
            <line
              x1="50"
              y1="280"
              x2="50"
              y2="20"
              stroke="#8B4513"
              strokeWidth="4"
            />
            <line
              x1="50"
              y1="20"
              x2="150"
              y2="20"
              stroke="#8B4513"
              strokeWidth="4"
            />
            <line
              x1="150"
              y1="20"
              x2="150"
              y2="50"
              stroke="#8B4513"
              strokeWidth="4"
            />

            {/* Character parts with animations */}
            {wrongGuesses > 0 && (
              <g style={{ animation: "bounce 0.5s" }}>
                <circle
                  cx="150"
                  cy="70"
                  r="20"
                  fill="#FFD700"
                  stroke="#FF6B6B"
                  strokeWidth="3"
                />
                <circle cx="145" cy="67" r="3" fill="#000" />
                <circle cx="155" cy="67" r="3" fill="#000" />
                {wrongGuesses > 1 && (
                  <path
                    d="M 145 75 Q 150 78 155 75"
                    stroke="#000"
                    strokeWidth="2"
                    fill="none"
                  />
                )}
              </g>
            )}

            {wrongGuesses > 1 && (
              <line
                x1="150"
                y1="90"
                x2="150"
                y2="150"
                stroke="#4ECDC4"
                strokeWidth="6"
                strokeLinecap="round"
                style={{ animation: "bounce 0.5s" }}
              />
            )}

            {wrongGuesses > 2 && (
              <line
                x1="150"
                y1="110"
                x2="120"
                y2="140"
                stroke="#4ECDC4"
                strokeWidth="5"
                strokeLinecap="round"
                style={{ animation: "bounce 0.5s" }}
              />
            )}

            {wrongGuesses > 3 && (
              <line
                x1="150"
                y1="110"
                x2="180"
                y2="140"
                stroke="#4ECDC4"
                strokeWidth="5"
                strokeLinecap="round"
                style={{ animation: "bounce 0.5s" }}
              />
            )}

            {wrongGuesses > 4 && (
              <line
                x1="150"
                y1="150"
                x2="130"
                y2="200"
                stroke="#4ECDC4"
                strokeWidth="5"
                strokeLinecap="round"
                style={{ animation: "bounce 0.5s" }}
              />
            )}

            {wrongGuesses > 5 && (
              <line
                x1="150"
                y1="150"
                x2="170"
                y2="200"
                stroke="#4ECDC4"
                strokeWidth="5"
                strokeLinecap="round"
                style={{ animation: "bounce 0.5s" }}
              />
            )}
          </svg>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "white",
              fontSize: "14px",
              margin: "0 0 8px 0",
              fontWeight: "600",
            }}
          >
            💡 Hint
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: "16px",
              margin: 0,
              fontWeight: "500",
            }}
          >
            {hint}
          </p>
        </div>
        <div
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            textAlign: "center",
            letterSpacing: "8px",
            marginBottom: "20px",
            fontFamily: "monospace",
            color: "#667eea",
          }}
        >
          {displayedWord.split("").map((char, i) => (
            <span
              key={i}
              className="letter-box"
              style={{
                display: "inline-block",
                minWidth: char === "_" ? "30px" : "auto",
                borderBottom: char === "_" ? "3px solid #667eea" : "none",
                margin: "0 4px",
              }}
            >
              {char}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background:
                wrongGuesses >= maxWrong
                  ? "#ff6b6b"
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              padding: "12px 24px",
              borderRadius: "12px",
              color: "white",
              fontWeight: "bold",
            }}
          >
            ❌ Wrong: {wrongGuesses} / {maxWrong}
          </div>
          <div
            style={{
              background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
              padding: "12px 24px",
              borderRadius: "12px",
              color: "white",
              fontWeight: "bold",
            }}
          >
            📝 Word {currentIndex + 1} / {data.words.length}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(45px, 1fr))",
            gap: "8px",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {alphabet.map((letter) => {
            const isGuessed = guesses.includes(letter);
            const isCorrect = isGuessed && currentWord.includes(letter);
            const isWrong = isGuessed && !currentWord.includes(letter);

            return (
              <button
                key={letter}
                onClick={() => handleGuess(letter)}
                disabled={isGuessed || isWon || isLost}
                style={{
                  padding: "12px",
                  fontSize: "18px",
                  fontWeight: "bold",
                  borderRadius: "12px",
                  border: "none",
                  cursor:
                    isGuessed || isWon || isLost ? "not-allowed" : "pointer",
                  background: isCorrect
                    ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                    : isWrong
                    ? "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  transform: isGuessed ? "scale(0.95)" : "scale(1)",
                  opacity: isGuessed ? 0.6 : 1,
                  transition: "all 0.3s ease",
                  boxShadow: !isGuessed ? "0 4px 15px rgba(0,0,0,0.2)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isGuessed && !isWon && !isLost) {
                    e.target.style.transform = "scale(1.1)";
                    e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGuessed) {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
                  }
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
      {(isWon || isLost) && !showResult && (
        <div
          style={{
            background: isWon
              ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
              : "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
            padding: "24px",
            borderRadius: "16px",
            textAlign: "center",
            marginBottom: "16px",
            animation: "bounce 0.5s",
          }}
        >
          <p style={{ fontSize: "24px", margin: "0 0 12px 0", color: "white" }}>
            {isWon ? "🎉 Correct!" : "😔 Game Over!"}
          </p>
          <p
            style={{
              fontSize: "18px",
              margin: "0 0 16px 0",
              color: "white",
              fontWeight: "bold",
            }}
          >
            The word was: {currentWord}
          </p>
          <button
            onClick={nextWord}
            style={{
              background: "white",
              color: isWon ? "#11998e" : "#ee0979",
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
            }}
          >
            {currentIndex + 1 < data.words.length
              ? "➡️ Next Word"
              : "🏁 Finish"}
          </button>
        </div>
      )}
      {showResult && (
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            padding: "24px",
            borderRadius: "16px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "24px",
              margin: "0 0 16px 0",
              color: "#667eea",
              fontWeight: "bold",
            }}
          >
            🎮 Game Complete!
          </p>
          <p
            style={{
              fontSize: "32px",
              margin: "0 0 16px 0",
              color: "#11998e",
              fontWeight: "bold",
            }}
          >
            Score: {scores.reduce((a, b) => a + b, 0)} / {data.words.length}
          </p>
          <button
            onClick={reset}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
            }}
          >
            🔄 Play Again
          </button>
        </div>
      )}
    </div>
  );
};

// Enhanced MatchingGame
const MatchingGame = ({ data, onComplete }) => {
  const [shuffledRight, setShuffledRight] = useState(
    [...data.pairs].map((p) => p[1]).sort(() => Math.random() - 0.5)
  );
  const [matches, setMatches] = useState({});
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const handleLeftClick = (left) => {
    if (showResult) return;
    setSelectedLeft(left === selectedLeft ? null : left);
  };
  const handleRightClick = (right) => {
    if (showResult || !selectedLeft) return;
    const newMatches = { ...matches, [selectedLeft]: right };
    setMatches(newMatches);
    setSelectedLeft(null);

    if (Object.keys(newMatches).length === data.pairs.length) {
      let score = 0;
      for (const [l, r] of Object.entries(newMatches)) {
        const correct = data.pairs.find((p) => p[0] === l)[1];
        if (correct === r) score++;
      }
      setCelebrating(true);
      setTimeout(() => {
        setShowResult(true);
        onComplete(score, data.pairs.length);
      }, 1000);
    }
  };
  const reset = () => {
    setMatches({});
    setSelectedLeft(null);
    setShowResult(false);
    setCelebrating(false);
    setShuffledRight(
      [...data.pairs].map((p) => p[1]).sort(() => Math.random() - 0.5)
    );
  };
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        borderRadius: "20px",
        padding: "32px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            textAlign: "center",
            color: "#f5576c",
            marginBottom: "24px",
            fontSize: "24px",
          }}
        >
          🎯 Match the Pairs!
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {data.pairs.map((p, idx) => {
              const left = p[0];
              const isMatched = matches[left];
              const isSelected = selectedLeft === left;

              return (
                <button
                  key={idx}
                  onClick={() => handleLeftClick(left)}
                  disabled={showResult || isMatched}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: "none",
                    background: isMatched
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : isSelected
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: isMatched || showResult ? "not-allowed" : "pointer",
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.3s ease",
                    boxShadow: isSelected
                      ? "0 8px 25px rgba(0,0,0,0.3)"
                      : "0 4px 15px rgba(0,0,0,0.2)",
                    opacity: isMatched ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isMatched && !showResult) {
                      e.target.style.transform = "scale(1.05)";
                      e.target.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isMatched) {
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
                    }
                  }}
                >
                  {isMatched && "✓ "}
                  {left}
                </button>
              );
            })}
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {shuffledRight.map((right, idx) => {
              const isMatched = Object.values(matches).includes(right);

              return (
                <button
                  key={idx}
                  onClick={() => handleRightClick(right)}
                  disabled={showResult || isMatched || !selectedLeft}
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    border: "none",
                    background: isMatched
                      ? "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor:
                      isMatched || showResult || !selectedLeft
                        ? "not-allowed"
                        : "pointer",
                    transform: "scale(1)",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                    opacity: isMatched ? 0.7 : !selectedLeft ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isMatched && !showResult && selectedLeft) {
                      e.target.style.transform = "scale(1.05)";
                      e.target.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMatched) {
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
                    }
                  }}
                >
                  {isMatched && "✓ "}
                  {right}
                </button>
              );
            })}
          </div>
        </div>
        {celebrating && (
          <div
            style={{
              textAlign: "center",
              fontSize: "48px",
              animation: "bounce 1s infinite",
            }}
          >
            🎉
          </div>
        )}
        {showResult && (
          <div
            style={{
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              padding: "24px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: "white",
                fontSize: "20px",
                margin: "0 0 16px 0",
                fontWeight: "bold",
              }}
            >
              🎉 All Matched!
            </p>
            <button
              onClick={reset}
              style={{
                background: "white",
                color: "#11998e",
                padding: "14px 32px",
                borderRadius: "12px",
                border: "none",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
              }}
            >
              🔄 Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const FillBlanksGame = ({ data, onComplete }) => {
  const [answers, setAnswers] = useState(data.blanks.map(() => ""));
  const [showResult, setShowResult] = useState(false);

  const handleChange = (idx, value) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[idx] = value;
    setAnswers(newAnswers);
  };

  const submit = () => {
    let score = 0;
    data.blanks.forEach((b, idx) => {
      if (answers[idx].toLowerCase().trim() === b.answer.toLowerCase().trim())
        score++;
    });
    setShowResult(true);
    onComplete(score, data.blanks.length);
  };

  const reset = () => {
    setAnswers(data.blanks.map(() => ""));
    setShowResult(false);
  };

  return (
    <div className="fillblanks-game">
      {data.blanks.map((b, idx) => (
        <div key={idx} className="blank-item">
          <p>{b.sentence.replace(/_/g, "_____")}</p>
          <input
            value={answers[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            disabled={showResult}
            className="fill-blank-input"
          />
          {showResult && (
            <p
              className={`result ${
                answers[idx].toLowerCase().trim() ===
                b.answer.toLowerCase().trim()
                  ? "correct"
                  : "incorrect"
              }`}
            >
              Correct: {b.answer}
            </p>
          )}
        </div>
      ))}
      {!showResult ? (
        <button
          className="quiz-submit-btn"
          onClick={submit}
          disabled={answers.some((a) => !a.trim())}
        >
          Submit Answers
        </button>
      ) : (
        <button className="quiz-reset-btn" onClick={reset}>
          Play Again
        </button>
      )}
    </div>
  );
};

const AnagramGame = ({ data, onComplete }) => {
  const [answers, setAnswers] = useState(data.anagrams.map(() => ""));
  const [showResult, setShowResult] = useState(false);

  const handleChange = (idx, value) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[idx] = value;
    setAnswers(newAnswers);
  };

  const submit = () => {
    let score = 0;
    data.anagrams.forEach((a, idx) => {
      if (answers[idx].toLowerCase().trim() === a.original.toLowerCase().trim())
        score++;
    });
    setShowResult(true);
    onComplete(score, data.anagrams.length);
  };

  const reset = () => {
    setAnswers(data.anagrams.map(() => ""));
    setShowResult(false);
  };

  return (
    <div className="anagram-game">
      {data.anagrams.map((a, idx) => (
        <div key={idx} className="anagram-item">
          <p>Scrambled: {a.scrambled}</p>
          <p>Hint: {a.hint}</p>
          <input
            value={answers[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            disabled={showResult}
            className="fill-blank-input"
          />
          {showResult && (
            <p
              className={`result ${
                answers[idx].toLowerCase().trim() ===
                a.original.toLowerCase().trim()
                  ? "correct"
                  : "incorrect"
              }`}
            >
              Correct: {a.original}
            </p>
          )}
        </div>
      ))}
      {!showResult ? (
        <button
          className="quiz-submit-btn"
          onClick={submit}
          disabled={answers.some((a) => !a.trim())}
        >
          Submit Answers
        </button>
      ) : (
        <button className="quiz-reset-btn" onClick={reset}>
          Play Again
        </button>
      )}
    </div>
  );
};

const getDirection = (start, end) => {
  const dr = end.r - start.r;
  const dc = end.c - start.c;
  if (dr === 0 && dc !== 0) return "horizontal";
  if (dc === 0 && dr !== 0) return "vertical";
  if (Math.abs(dr) === Math.abs(dc) && dr !== 0) return "diagonal";
  return null;
};

const getPath = (start, end, direction) => {
  const path = [];
  let r = start.r;
  let c = start.c;
  const dr = Math.sign(end.r - start.r);
  const dc = Math.sign(end.c - start.c);
  while (r !== end.r + dr || c !== end.c + dc) {
    path.push({ r, c });
    r += dr;
    c += dc;
  }
  return path;
};

const extractWord = (grid, path) => {
  return path.map((pos) => grid[pos.r][pos.c]).join("");
};

const WordSearchGame = ({ data, onComplete }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [foundPaths, setFoundPaths] = useState([]); // array of {path: [{r,c}], word: string}
  const [showResult, setShowResult] = useState(false);

  const grid = data.grid;
  const words = data.words.map((w) => ({
    original: w,
    lower: w.toLowerCase(),
  }));

  const foundWords = foundPaths.map((p) => p.word.toLowerCase());

  const handleMouseDown = (r, c) => {
    setIsSelecting(true);
    setStartPos({ r, c });
    setCurrentPos({ r, c });
  };

  const handleMouseEnter = (r, c) => {
    if (!isSelecting || !startPos) return;
    const dir = getDirection(startPos, { r, c });
    if (dir) {
      setCurrentPos({ r, c });
    }
  };

  const handleMouseUp = () => {
    if (!isSelecting || !startPos || !currentPos) return;
    setIsSelecting(false);
    const dir = getDirection(startPos, currentPos);
    if (!dir) return;
    const path = getPath(startPos, currentPos, dir);
    let word = extractWord(grid, path);
    let reverseWord = extractWord(grid, path.reverse());
    let matched = words.find(
      (w) =>
        w.lower === word.toLowerCase() || w.lower === reverseWord.toLowerCase()
    );
    if (matched && !foundWords.includes(matched.lower)) {
      setFoundPaths([
        ...foundPaths,
        { path: path.map((p) => ({ r: p.r, c: p.c })), word: matched.original },
      ]);
    }
    setStartPos(null);
    setCurrentPos(null);
  };

  const currentPath =
    startPos && currentPos
      ? getPath(startPos, currentPos, getDirection(startPos, currentPos))
      : [];

  const isInPath = (r, c, paths) => paths.some((p) => p.r === r && p.c === c);

  const submit = () => {
    setShowResult(true);
    onComplete(foundPaths.length, words.length);
  };

  const reset = () => {
    setFoundPaths([]);
    setShowResult(false);
    setIsSelecting(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  return (
    <div className="wordsearch-game">
      <div
        className="grid"
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsSelecting(false)}
      >
        {grid.map((row, r) => (
          <div key={r} className="grid-row">
            {row.map((cell, c) => (
              <span
                key={c}
                className={`grid-cell ${
                  isInPath(r, c, foundPaths.map((p) => p.path).flat())
                    ? "found"
                    : ""
                } ${isInPath(r, c, currentPath) ? "selecting" : ""}`}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
              >
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="words-to-find">
        <h6>Find these words:</h6>
        <ul>
          {words.map((w, idx) => (
            <li
              key={idx}
              className={foundWords.includes(w.lower) ? "found-word" : ""}
            >
              {w.original}
            </li>
          ))}
        </ul>
      </div>
      {!showResult ? (
        <button className="quiz-submit-btn" onClick={submit}>
          Submit
        </button>
      ) : (
        <button className="quiz-reset-btn" onClick={reset}>
          Play Again
        </button>
      )}
    </div>
  );
};

const GameRenderer = ({ game, user, moduleId }) => {
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const handleComplete = async (gameScore, maxScore) => {
    setScore(gameScore);
    setTotal(maxScore);
    setCompleted(true);
    if (!user) return;
    const barya = (gameScore / maxScore) * 5; // Example: max 5 barya per game
    try {
      const { error } = await supabase.from("mini_game_attempts").insert({
        user_id: user.id,
        module_id: moduleId,
        mini_game_id: game.id,
        score: gameScore,
        total_points: maxScore,
        barya_points_earned: barya,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Error saving game attempt:", err);
    }
  };

  if (completed) {
    return (
      <div className="quiz-result">
        <div className="result-message correct">
          🎉 Game Completed! Score: {score} / {total}
        </div>
        <button className="quiz-reset-btn" onClick={() => setCompleted(false)}>
          🔄 Play Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h5>{capitalize(game.game_type)} Game</h5>
      {game.game_type === "matching" && (
        <MatchingGame data={game.data} onComplete={handleComplete} />
      )}
      {game.game_type === "fillblanks" && (
        <FillBlanksGame data={game.data} onComplete={handleComplete} />
      )}
      {game.game_type === "anagram" && (
        <AnagramGame data={game.data} onComplete={handleComplete} />
      )}
      {game.game_type === "hangman" && (
        <HangmanGame data={game.data} onComplete={handleComplete} />
      )}
      {game.game_type === "wordsearch" && (
        <WordSearchGame data={game.data} onComplete={handleComplete} />
      )}
    </div>
  );
};

const ModuleDetail = ({
  module,
  onBack,
  onTakeQuiz,
  moduleQuestionCounts,
  moduleTaglishQuestionCounts,
  user,
}) => {
  const { user: authUser } = useAuth();
  const [language, setLanguage] = useState("english");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'helpful' or 'not-helpful'
  const [miniGames, setMiniGames] = useState([]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchMiniGames = async () => {
      try {
        const { data, error } = await supabase
          .from("mini_games")
          .select("*")
          .eq("module_id", module.id)
          .eq("status", "approved")
          .eq("is_taglish", language === "taglish");
        if (error) throw error;
        setMiniGames(data || []);
      } catch (err) {
        console.error("Error fetching mini-games:", err.message);
      }
    };
    fetchMiniGames();
  }, [language, module.id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="module-detail-container">
      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${scrollProgress}%` }}
        ></div>
      </div>
      <style>{`
        .module-detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          background: var(--bg-primary);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .progress-bar-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          z-index: 1000;
        }
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
          transition: width 0.3s ease;
        }
        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 24px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .breadcrumbs a {
          color: var(--accent-blue);
          text-decoration: none;
          transition: color 0.3s;
        }
        .breadcrumbs a:hover {
          color: var(--accent-purple);
        }
        .breadcrumbs span {
          color: var(--text-muted);
        }
        .module-detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .module-detail-header h3 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .module-meta {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .module-level {
          padding: 4px 12px;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 20px;
          font-size: 14px;
          color: var(--accent-blue);
          border: 1px solid rgba(0, 212, 255, 0.2);
        }
        .module-content-wrapper {
          display: flex;
          gap: 32px;
        }
        .toc-sidebar {
          flex: 0 0 250px;
          position: sticky;
          top: 100px;
          height: fit-content;
          background: var(--bg-tertiary);
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        .toc-sidebar h4 {
          margin-bottom: 16px;
          font-size: 18px;
        }
        .toc-sidebar ul {
          list-style: none;
          padding: 0;
        }
        .toc-sidebar li {
          margin-bottom: 12px;
        }
        .toc-sidebar a {
          color: var(--text-secondary);
          text-decoration: none;
          transition: color 0.3s, padding-left 0.3s;
          display: block;
          padding: 4px 0;
        }
        .toc-sidebar a:hover {
          color: var(--accent-blue);
          padding-left: 4px;
        }
        .main-content {
          flex: 1;
        }
        .module-intro-section, .module-section, .media-section {
          margin-bottom: 48px;
          padding: 24px;
          background: var(--bg-secondary);
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .module-intro-section:hover, .module-section:hover, .media-section:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .media-section img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          display: block;
          margin: 0 auto;
        }
        .video-wrapper {
          position: relative;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
          height: 0;
          overflow: hidden;
          max-width: 100%;
          background: #000;
          border-radius: 8px;
        }
        .video-wrapper iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        .context {
          margin-bottom: 16px;
          color: var(--text-secondary);
        }
        .module-detail-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }
        .quiz-button {
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          transition: transform 0.3s;
        }
        .quiz-button:hover {
          transform: scale(1.05);
        }

        /* Feedback Section */
        .feedback-section {
          margin-top: 32px;
          padding: 24px;
          background: var(--bg-secondary);
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        .feedback-section h5 {
          margin-bottom: 16px;
          color: var(--text-primary);
        }
        .feedback-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        .feedback-btn {
          padding: 12px 24px;
          border: 2px solid var(--accent-blue);
          background: transparent;
          color: var(--accent-blue);
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .feedback-btn:hover {
          background: var(--accent-blue);
          color: white;
          transform: scale(1.05);
        }
        .feedback-btn.active {
          background: var(--accent-blue);
          color: white;
        }
        .feedback-thanks {
          color: var(--accent-purple);
          font-weight: 500;
        }

        html {
          scroll-behavior: smooth;
        }

        /* Engaging styles for markdown content */
        .module-intro-section p, .module-section p {
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .module-intro-section ul, .module-section ul {
          list-style: none;
          padding-left: 0;
        }
        .module-intro-section li, .module-section li {
          position: relative;
          padding-left: 24px;
          margin-bottom: 12px;
          color: var(--text-primary);
        }
        .module-intro-section li::before, .module-section li::before {
          content: "🚀";
          position: absolute;
          left: 0;
          top: 0;
          font-size: 16px;
        }
        .module-intro-section strong, .module-section strong {
          color: var(--accent-blue);
          font-weight: 700;
        }
        .module-intro-section em, .module-section em {
          color: var(--accent-purple);
          font-style: italic;
        }
        .module-intro-section h5, .module-section h5 {
          color: var(--accent-blue);
          margin-top: 20px;
          margin-bottom: 10px;
          font-size: 18px;
        }
        .module-intro-section blockquote, .module-section blockquote {
          border-left: 4px solid var(--accent-purple);
          padding-left: 16px;
          margin: 20px 0;
          color: var(--text-secondary);
          font-style: italic;
        }

        /* Mini Quiz Styles */
        .mini-quiz {
          background: var(--bg-tertiary);
          border: 2px solid var(--accent-blue);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .mini-quiz h5 {
          color: var(--accent-blue);
          margin-bottom: 12px;
          font-size: 18px;
        }
        .quiz-question {
          font-weight: 600;
          margin-bottom: 16px;
          color: var(--text-primary);
        }
        .quiz-input {
          margin-bottom: 16px;
        }
        .true-false-options, .multiple-choice-options {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .quiz-option {
          padding: 10px 16px;
          border: 2px solid var(--accent-purple);
          background: transparent;
          color: var(--accent-purple);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        .quiz-option:hover {
          background: var(--accent-purple);
          color: white;
        }
        .quiz-option.selected {
          background: var(--accent-purple);
          color: white;
        }
        .fill-blank-input {
          width: 100%;
          padding: 10px;
          border: 2px solid var(--accent-purple);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 16px;
        }
        .quiz-submit-btn {
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: transform 0.3s;
        }
        .quiz-submit-btn:hover:not(:disabled) {
          transform: scale(1.05);
        }
        .quiz-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .quiz-result {
          text-align: center;
        }
        .result-message {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 12px;
          padding: 12px;
          border-radius: 8px;
        }
        .result-message.correct {
          background: rgba(0, 255, 0, 0.1);
          color: #28a745;
          border: 2px solid #28a745;
        }
        .result-message.incorrect {
          background: rgba(255, 0, 0, 0.1);
          color: #dc3545;
          border: 2px solid #dc3545;
        }
        .explanation {
          margin-bottom: 16px;
          color: var(--text-secondary);
        }
        .quiz-reset-btn {
          background: var(--accent-blue);
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .quiz-reset-btn:hover {
          background: var(--accent-purple);
        }

        /* Mini Games Styles */
        .mini-games-section {
          margin-bottom: 48px;
          padding: 24px;
          background: var(--bg-secondary);
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .mini-games-section:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .mini-game {
          background: var(--bg-tertiary);
          border: 2px solid var(--accent-purple);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .mini-game h5 {
          color: var(--accent-purple);
          margin-bottom: 16px;
        }
        .matching-game, .fillblanks-game, .anagram-game, .hangman-game, .wordsearch-game {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .left-column, .right-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .match-item {
          padding: 8px 16px;
          border-radius: 8px;
          border: 2px solid var(--border);
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .match-item:hover {
          border-color: var(--accent-blue);
        }
        .match-item.selected {
          background: rgba(0, 212, 255, 0.2);
          border-color: var(--accent-blue);
        }
        .match-item.matched {
          background: rgba(40, 167, 69, 0.2);
          border-color: #28a745;
          cursor: not-allowed;
        }
        .blank-item p, .anagram-item p {
          margin-bottom: 8px;
        }
        .result {
          font-size: 14px;
          margin-top: 4px;
        }
        .alphabet {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          justify-content: center;
        }
        .alphabet-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 2px solid var(--border);
          background: transparent;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .alphabet-btn:hover {
          background: var(--accent-blue);
          color: white;
        }
        .alphabet-btn.correct {
          background: #28a745;
          color: white;
          border-color: #28a745;
        }
        .alphabet-btn.incorrect {
          background: #dc3545;
          color: white;
          border-color: #dc3545;
        }
        .word-display {
          font-family: monospace;
          font-size: 24px;
          letter-spacing: 2px;
        }
        .hangman-figure {
          font-family: monospace;
          white-space: pre;
          margin: 0 auto;
          text-align: left;
        }
        .grid {
          user-select: none;
        }
        .grid-row {
          display: flex;
        }
        .grid-cell {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          font-family: monospace;
          cursor: pointer;
          transition: background 0.2s;
        }
        .grid-cell.found {
          background: rgba(40, 167, 69, 0.5);
        }
        .grid-cell.selecting {
          background: rgba(255, 193, 7, 0.5);
        }
        .words-to-find ul {
          list-style: none;
          padding: 0;
        }
        .words-to-find li {
          margin-bottom: 8px;
        }
        .found-word {
          text-decoration: line-through;
          color: #28a745;
        }

        /* Media queries for mobile responsiveness */
        @media (max-width: 768px) {
          .module-detail-container {
            padding: 16px;
            border-radius: 0;
          }
          .module-detail-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 24px;
          }
          .module-detail-header h3 {
            font-size: 24px;
          }
          .module-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .module-content-wrapper {
            flex-direction: column;
            gap: 24px;
          }
          .toc-sidebar {
            flex: none;
            position: static;
            top: auto;
            padding: 16px;
          }
          .toc-sidebar h4 {
            font-size: 16px;
          }
          .module-intro-section, .module-section, .media-section {
            padding: 16px;
            margin-bottom: 32px;
          }
          .module-detail-footer {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          .quiz-button, .btn {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .breadcrumbs {
            font-size: 12px;
            gap: 4px;
          }
          .module-detail-header h3 {
            font-size: 20px;
          }
          .toc-sidebar {
            padding: 12px;
          }
          .toc-sidebar ul li {
            margin-bottom: 8px;
          }
        }
      `}</style>
      <div className="breadcrumbs">
        <a href="#" onClick={onBack}>
          Learning Modules
        </a>
        <span>/</span>
        <span>{module.title}</span>
      </div>
      <div className="module-detail-header">
        <h3>{module.title}</h3>
        <span className="module-level">{module.level}</span>
      </div>
      <div className="module-meta">
        <span className="module-date">
          Created: {formatDate(module.created_at)}
        </span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="form-select"
        >
          <option value="english">English</option>
          <option value="taglish">TagLish</option>
        </select>
      </div>
      <div className="module-content-wrapper">
        <div className="toc-sidebar">
          <h4>Table of Contents</h4>
          <ul>
            <li>
              <a href="#intro">Introduction</a>
            </li>
            {(language === "english"
              ? module.content.sections
              : module.taglish_content?.sections || []
            ).map((section, index) => (
              <li key={index}>
                <a href={`#section-${index}`}>{section.title}</a>
              </li>
            ))}
            {(language === "english"
              ? module.content.media
              : module.taglish_content?.media
            )?.video && (
              <li>
                <a href="#video">Explanatory Video</a>
              </li>
            )}
            <li>
              <a href="#mini-games">Mini-Games</a>
            </li>
          </ul>
        </div>
        <div className="main-content">
          <div id="intro" className="module-intro-section">
            <h4>Introduction</h4>
            <ProcessedMarkdown
              content={
                language === "english"
                  ? module.content.intro
                  : module.taglish_content?.intro ||
                    "No TagLish content available"
              }
            />
          </div>
          {(language === "english"
            ? module.content.media
            : module.taglish_content?.media
          )?.image && (
            <div className="media-section">
              <h4>Illustrative Image</h4>
              <p className="context">
                This image provides visual context for the module "
                {module.title}
                ", illustrating key concepts such as{" "}
                {module.keywords.join(", ")}.
              </p>
              <img
                src={
                  (language === "english"
                    ? module.content.media
                    : module.taglish_content?.media
                  ).image.url
                }
                alt="Module illustration"
              />
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "8px",
                  textAlign: "center",
                }}
              >
                Photo by{" "}
                <a
                  href={
                    (language === "english"
                      ? module.content.media
                      : module.taglish_content?.media
                    ).image.photographer_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {
                    (language === "english"
                      ? module.content.media
                      : module.taglish_content?.media
                    ).image.photographer
                  }
                </a>{" "}
                on Pexels
              </p>
            </div>
          )}
          <div className="module-sections">
            {(language === "english"
              ? module.content.sections
              : module.taglish_content?.sections || []
            ).map((section, index) => (
              <div
                key={index}
                id={`section-${index}`}
                className="module-section"
              >
                <h4>{section.title}</h4>
                <ProcessedMarkdown content={section.body} />
              </div>
            ))}
          </div>
          {(language === "english"
            ? module.content.media
            : module.taglish_content?.media
          )?.video && (
            <div id="video" className="media-section">
              <h4>Explanatory Video</h4>
              <p className="context">
                This video tutorial complements the module "{module.title}" by
                providing a practical demonstration of concepts like{" "}
                {module.keywords.join(", ")}.
              </p>
              <div className="video-wrapper">
                <iframe
                  src={
                    (language === "english"
                      ? module.content.media
                      : module.taglish_content?.media
                    ).video
                  }
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}
          <div id="mini-games" className="mini-games-section">
            <h4>🎮 Mini-Games</h4>
            {miniGames.length === 0 ? (
              <p>No mini-games available yet for this module and language.</p>
            ) : (
              miniGames.map((game) => (
                <div key={game.id} className="mini-game">
                  <GameRenderer
                    game={game}
                    user={authUser}
                    moduleId={module.id}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="module-detail-footer">
        <button className="btn btn-secondary" onClick={onBack}>
          Back to Modules
        </button>
        {(moduleQuestionCounts[module.id] >= 5 ||
          moduleTaglishQuestionCounts[module.id] >= 5) &&
          user && (
            <button className="btn quiz-button" onClick={onTakeQuiz}>
              Proceed to Quiz
            </button>
          )}
      </div>
      {/* Feedback Section */}
      <div className="feedback-section">
        <h5>Was this module helpful? 🎉</h5>
        <div className="feedback-buttons">
          <button
            className={`feedback-btn ${feedback === "helpful" ? "active" : ""}`}
            onClick={() => setFeedback("helpful")}
          >
            👍 Yes!
          </button>
          <button
            className={`feedback-btn ${
              feedback === "not-helpful" ? "active" : ""
            }`}
            onClick={() => setFeedback("not-helpful")}
          >
            👎 Not really
          </button>
        </div>
        {feedback && (
          <p className="feedback-thanks">
            Thanks for your feedback! It helps us improve. 🚀
          </p>
        )}
      </div>
    </div>
  );
};

export default ModuleDetail;
