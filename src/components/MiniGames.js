// MiniGames.js
import React, { useState } from "react";
import { supabase } from "../lib/supabase";

// Define consistent color scheme
const theme = {
  primaryGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  successGradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  errorGradient: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
  infoGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  warningGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  backgroundLight: "rgba(255,255,255,0.95)",
  textPrimary: "#667eea",
  textDark: "#333",
  textLight: "#fff",
  shadow: "0 20px 60px rgba(0,0,0,0.3)",
  shadowSmall: "0 4px 15px rgba(0,0,0,0.2)",
  shadowHover: "0 6px 20px rgba(0,0,0,0.3)",
};

// Enhanced HangmanGame (already fits, minor adjustments for consistency)
export const HangmanGame = ({ data, onComplete }) => {
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
        background: theme.primaryGradient,
        borderRadius: "20px",
        padding: "32px",
        boxShadow: theme.shadow,
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
          background: theme.backgroundLight,
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
            background: theme.primaryGradient,
            padding: "16px",
            borderRadius: "12px",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: theme.textLight,
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
            color: theme.textPrimary,
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
                wrongGuesses >= maxWrong ? "#ff6b6b" : theme.warningGradient,
              padding: "12px 24px",
              borderRadius: "12px",
              color: theme.textLight,
              fontWeight: "bold",
            }}
          >
            ❌ Wrong: {wrongGuesses} / {maxWrong}
          </div>
          <div
            style={{
              background: theme.infoGradient,
              padding: "12px 24px",
              borderRadius: "12px",
              color: theme.textLight,
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
                    ? theme.successGradient
                    : isWrong
                    ? theme.errorGradient
                    : theme.primaryGradient,
                  color: theme.textLight,
                  transform: isGuessed ? "scale(0.95)" : "scale(1)",
                  opacity: isGuessed ? 0.6 : 1,
                  transition: "all 0.3s ease",
                  boxShadow: !isGuessed ? theme.shadowSmall : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isGuessed && !isWon && !isLost) {
                    e.target.style.transform = "scale(1.1)";
                    e.target.style.boxShadow = theme.shadowHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGuessed) {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = theme.shadowSmall;
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
            background: isWon ? theme.successGradient : theme.errorGradient,
            padding: "24px",
            borderRadius: "16px",
            textAlign: "center",
            marginBottom: "16px",
            animation: "bounce 0.5s",
          }}
        >
          <p
            style={{
              fontSize: "24px",
              margin: "0 0 12px 0",
              color: theme.textLight,
            }}
          >
            {isWon ? "🎉 Correct!" : "😔 Game Over!"}
          </p>
          <p
            style={{
              fontSize: "18px",
              margin: "0 0 16px 0",
              color: theme.textLight,
              fontWeight: "bold",
            }}
          >
            The word was: {currentWord}
          </p>
          <button
            onClick={nextWord}
            style={{
              background: theme.backgroundLight,
              color: isWon ? "#11998e" : "#ee0979",
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: theme.shadowSmall,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = theme.shadowHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = theme.shadowSmall;
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
            background: theme.backgroundLight,
            padding: "24px",
            borderRadius: "16px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "24px",
              margin: "0 0 16px 0",
              color: theme.textPrimary,
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
              background: theme.primaryGradient,
              color: theme.textLight,
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: theme.shadowSmall,
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

// Enhanced MatchingGame (updated to primary color scheme)
export const MatchingGame = ({ data, onComplete }) => {
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
        background: theme.primaryGradient,
        borderRadius: "20px",
        padding: "32px",
        boxShadow: theme.shadow,
      }}
    >
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      <div
        style={{
          background: theme.backgroundLight,
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            textAlign: "center",
            color: theme.textPrimary,
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
                      ? theme.successGradient
                      : isSelected
                      ? theme.primaryGradient
                      : theme.warningGradient,
                    color: theme.textLight,
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor: isMatched || showResult ? "not-allowed" : "pointer",
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.3s ease",
                    boxShadow: isSelected
                      ? theme.shadowHover
                      : theme.shadowSmall,
                    opacity: isMatched ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isMatched && !showResult) {
                      e.target.style.transform = "scale(1.05)";
                      e.target.style.boxShadow = theme.shadowHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !isMatched) {
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = theme.shadowSmall;
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
                      ? theme.successGradient
                      : theme.infoGradient,
                    color: theme.textLight,
                    fontSize: "16px",
                    fontWeight: "bold",
                    cursor:
                      isMatched || showResult || !selectedLeft
                        ? "not-allowed"
                        : "pointer",
                    transform: "scale(1)",
                    transition: "all 0.3s ease",
                    boxShadow: theme.shadowSmall,
                    opacity: isMatched ? 0.7 : !selectedLeft ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isMatched && !showResult && selectedLeft) {
                      e.target.style.transform = "scale(1.05)";
                      e.target.style.boxShadow = theme.shadowHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMatched) {
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = theme.shadowSmall;
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
              background: theme.successGradient,
              padding: "24px",
              borderRadius: "12px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: theme.textLight,
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
                background: theme.backgroundLight,
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

// Updated FillBlanksGame with inline styles and animations
export const FillBlanksGame = ({ data, onComplete }) => {
  const [answers, setAnswers] = useState(data.blanks.map(() => ""));
  const [showResult, setShowResult] = useState(false);
  const [shakeIndices, setShakeIndices] = useState([]);
  const handleChange = (idx, value) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[idx] = value;
    setAnswers(newAnswers);
  };
  const submit = () => {
    const shakes = [];
    data.blanks.forEach((b, idx) => {
      if (answers[idx].toLowerCase().trim() !== b.answer.toLowerCase().trim()) {
        shakes.push(idx);
      }
    });
    setShakeIndices(shakes);
    setTimeout(() => setShakeIndices([]), 500);
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
    setShakeIndices([]);
  };
  return (
    <div
      style={{
        background: theme.primaryGradient,
        borderRadius: "20px",
        padding: "32px",
        boxShadow: theme.shadow,
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
      <div
        style={{
          background: theme.backgroundLight,
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            textAlign: "center",
            color: theme.textPrimary,
            marginBottom: "24px",
            fontSize: "24px",
          }}
        >
          📝 Fill in the Blanks!
        </h3>
        {data.blanks.map((b, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "20px",
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.8)",
              boxShadow: theme.shadowSmall,
            }}
          >
            <p
              style={{
                fontSize: "18px",
                color: theme.textDark,
                marginBottom: "8px",
                textAlign: "center",
              }}
            >
              {b.sentence.replace(/_/g, "_____")}
            </p>
            <input
              value={answers[idx]}
              onChange={(e) => handleChange(idx, e.target.value)}
              disabled={showResult}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${theme.textPrimary}`,
                fontSize: "16px",
                width: "100%",
                boxSizing: "border-box",
                transition: "all 0.3s ease",
                animation: shakeIndices.includes(idx) ? "shake 0.5s" : "none",
              }}
            />
            {showResult && (
              <p
                style={{
                  color:
                    answers[idx].toLowerCase().trim() ===
                    b.answer.toLowerCase().trim()
                      ? "#11998e"
                      : "#ee0979",
                  fontWeight: "bold",
                  marginTop: "8px",
                  textAlign: "center",
                }}
              >
                Correct: {b.answer}
              </p>
            )}
          </div>
        ))}
        {!showResult ? (
          <button
            onClick={submit}
            disabled={answers.some((a) => !a.trim())}
            style={{
              background: theme.primaryGradient,
              color: theme.textLight,
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "block",
              margin: "0 auto",
              boxShadow: theme.shadowSmall,
              transition: "all 0.3s ease",
              opacity: answers.some((a) => !a.trim()) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!answers.some((a) => !a.trim())) {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = theme.shadowHover;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = theme.shadowSmall;
            }}
          >
            Submit Answers
          </button>
        ) : (
          <button
            onClick={reset}
            style={{
              background: theme.primaryGradient,
              color: theme.textLight,
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "block",
              margin: "0 auto",
              boxShadow: theme.shadowSmall,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = theme.shadowHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = theme.shadowSmall;
            }}
          >
            🔄 Play Again
          </button>
        )}
      </div>
    </div>
  );
};

// Updated AnagramGame with inline styles and animations
export const AnagramGame = ({ data, onComplete }) => {
  const [answers, setAnswers] = useState(data.anagrams.map(() => ""));
  const [showResult, setShowResult] = useState(false);
  const [shakeIndices, setShakeIndices] = useState([]);
  const handleChange = (idx, value) => {
    if (showResult) return;
    const newAnswers = [...answers];
    newAnswers[idx] = value;
    setAnswers(newAnswers);
  };
  const submit = () => {
    const shakes = [];
    data.anagrams.forEach((a, idx) => {
      if (
        answers[idx].toLowerCase().trim() !== a.original.toLowerCase().trim()
      ) {
        shakes.push(idx);
      }
    });
    setShakeIndices(shakes);
    setTimeout(() => setShakeIndices([]), 500);
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
    setShakeIndices([]);
  };
  return (
    <div
      style={{
        background: theme.primaryGradient,
        borderRadius: "20px",
        padding: "32px",
        boxShadow: theme.shadow,
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
      <div
        style={{
          background: theme.backgroundLight,
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            textAlign: "center",
            color: theme.textPrimary,
            marginBottom: "24px",
            fontSize: "24px",
          }}
        >
          🔀 Solve the Anagrams!
        </h3>
        {data.anagrams.map((a, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: "20px",
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.8)",
              boxShadow: theme.shadowSmall,
            }}
          >
            <p
              style={{
                fontSize: "18px",
                color: theme.textDark,
                marginBottom: "8px",
              }}
            >
              Scrambled: {a.scrambled}
            </p>
            <p
              style={{
                fontSize: "16px",
                color: theme.textDark,
                marginBottom: "8px",
              }}
            >
              Hint: {a.hint}
            </p>
            <input
              value={answers[idx]}
              onChange={(e) => handleChange(idx, e.target.value)}
              disabled={showResult}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: `1px solid ${theme.textPrimary}`,
                fontSize: "16px",
                width: "100%",
                boxSizing: "border-box",
                transition: "all 0.3s ease",
                animation: shakeIndices.includes(idx) ? "shake 0.5s" : "none",
              }}
            />
            {showResult && (
              <p
                style={{
                  color:
                    answers[idx].toLowerCase().trim() ===
                    a.original.toLowerCase().trim()
                      ? "#11998e"
                      : "#ee0979",
                  fontWeight: "bold",
                  marginTop: "8px",
                  textAlign: "center",
                }}
              >
                Correct: {a.original}
              </p>
            )}
          </div>
        ))}
        {!showResult ? (
          <button
            onClick={submit}
            disabled={answers.some((a) => !a.trim())}
            style={{
              background: theme.primaryGradient,
              color: theme.textLight,
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "block",
              margin: "0 auto",
              boxShadow: theme.shadowSmall,
              transition: "all 0.3s ease",
              opacity: answers.some((a) => !a.trim()) ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!answers.some((a) => !a.trim())) {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = theme.shadowHover;
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = theme.shadowSmall;
            }}
          >
            Submit Answers
          </button>
        ) : (
          <button
            onClick={reset}
            style={{
              background: theme.primaryGradient,
              color: theme.textLight,
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "block",
              margin: "0 auto",
              boxShadow: theme.shadowSmall,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = theme.shadowHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = theme.shadowSmall;
            }}
          >
            🔄 Play Again
          </button>
        )}
      </div>
    </div>
  );
};

// Helper functions remain the same
export const getDirection = (start, end) => {
  const dr = end.r - start.r;
  const dc = end.c - start.c;
  if (dr === 0 && dc !== 0) return "horizontal";
  if (dc === 0 && dr !== 0) return "vertical";
  if (Math.abs(dr) === Math.abs(dc) && dr !== 0) return "diagonal";
  return null;
};
export const getPath = (start, end, direction) => {
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
export const extractWord = (grid, path) => {
  return path.map((pos) => grid[pos.r][pos.c]).join("");
};

// Updated WordSearchGame with inline styles and improvements
export const WordSearchGame = ({ data, onComplete }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const [foundPaths, setFoundPaths] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
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
    let path = getPath(startPos, currentPos, dir);
    let word = extractWord(grid, path);
    let reversePath = [...path].reverse();
    let reverseWord = extractWord(grid, reversePath);
    let matched = words.find(
      (w) =>
        w.lower === word.toLowerCase() || w.lower === reverseWord.toLowerCase()
    );
    if (matched && !foundWords.includes(matched.lower)) {
      const finalPath =
        word.toLowerCase() === matched.lower ? path : reversePath;
      setFoundPaths([
        ...foundPaths,
        {
          path: finalPath.map((p) => ({ r: p.r, c: p.c })),
          word: matched.original,
        },
      ]);
      if (foundPaths.length + 1 === words.length) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1000);
      }
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
    setCelebrate(false);
  };
  return (
    <div
      style={{
        background: theme.primaryGradient,
        borderRadius: "20px",
        padding: "32px",
        boxShadow: theme.shadow,
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
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      <div
        style={{
          background: theme.backgroundLight,
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            textAlign: "center",
            color: theme.textPrimary,
            marginBottom: "24px",
            fontSize: "24px",
          }}
        >
          🔍 Word Search!
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${grid[0].length}, 1fr)`,
            gap: "2px",
            marginBottom: "24px",
            userSelect: "none",
          }}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsSelecting(false)}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <span
                key={`${r}-${c}`}
                style={{
                  padding: "12px",
                  background: isInPath(
                    r,
                    c,
                    foundPaths.map((p) => p.path).flat()
                  )
                    ? "#11998e"
                    : isInPath(r, c, currentPath)
                    ? "#ffd700"
                    : "#fff",
                  border: "1px solid #ddd",
                  textAlign: "center",
                  fontSize: "18px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  color: isInPath(r, c, foundPaths.map((p) => p.path).flat())
                    ? theme.textLight
                    : theme.textDark,
                  transition: "all 0.3s ease",
                }}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
              >
                {cell}
              </span>
            ))
          )}
        </div>
        <div
          style={{
            marginTop: "20px",
          }}
        >
          <h4
            style={{
              textAlign: "center",
              color: theme.textPrimary,
              marginBottom: "12px",
              fontSize: "18px",
            }}
          >
            Words to Find:
          </h4>
          <ul
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "10px",
              listStyle: "none",
              padding: 0,
            }}
          >
            {words.map((w, idx) => (
              <li
                key={idx}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#f0f0f0",
                  fontSize: "16px",
                  textDecoration: foundWords.includes(w.lower)
                    ? "line-through"
                    : "none",
                  color: foundWords.includes(w.lower)
                    ? "#11998e"
                    : theme.textDark,
                  boxShadow: theme.shadowSmall,
                  transition: "all 0.3s ease",
                }}
              >
                {w.original}
              </li>
            ))}
          </ul>
        </div>
        {!showResult ? (
          <button
            onClick={submit}
            style={{
              background: theme.primaryGradient,
              color: theme.textLight,
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "block",
              margin: "24px auto 0",
              boxShadow: theme.shadowSmall,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = theme.shadowHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = theme.shadowSmall;
            }}
          >
            Submit
          </button>
        ) : (
          <button
            onClick={reset}
            style={{
              background: theme.primaryGradient,
              color: theme.textLight,
              padding: "14px 32px",
              borderRadius: "12px",
              border: "none",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "block",
              margin: "24px auto 0",
              boxShadow: theme.shadowSmall,
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.05)";
              e.target.style.boxShadow = theme.shadowHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = theme.shadowSmall;
            }}
          >
            🔄 Play Again
          </button>
        )}
      </div>
    </div>
  );
};

// GameRenderer (updated with consistent styling)
export const GameRenderer = ({ game, user, moduleId }) => {
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
      <div
        style={{
          background: theme.successGradient,
          borderRadius: "16px",
          padding: "24px",
          textAlign: "center",
          boxShadow: theme.shadowSmall,
        }}
      >
        <div
          style={{
            fontSize: "24px",
            color: theme.textLight,
            marginBottom: "16px",
            fontWeight: "bold",
          }}
        >
          🎉 Game Completed! Score: {score} / {total}
        </div>
        <button
          onClick={() => setCompleted(false)}
          style={{
            background: theme.backgroundLight,
            color: "#11998e",
            padding: "14px 32px",
            borderRadius: "12px",
            border: "none",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: theme.shadowSmall,
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
            e.target.style.boxShadow = theme.shadowHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
            e.target.style.boxShadow = theme.shadowSmall;
          }}
        >
          🔄 Play Again
        </button>
      </div>
    );
  }
  return (
    <div>
      <h5
        style={{
          textAlign: "center",
          color: theme.textPrimary,
          marginBottom: "16px",
          fontSize: "20px",
        }}
      >
        {capitalize(game.game_type)} Game
      </h5>
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
