// src/components/QuizPage.js
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";

const QuizPage = ({
  moduleId: propModuleId,
  onBack: propOnBack,
  defaultQuizQuestions = 5,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { moduleId: paramModuleId } = useParams();
  const moduleId = propModuleId || paramModuleId;
  const onBack = propOnBack || (() => navigate(-1));

  const [module, setModule] = useState(null);
  const [englishCount, setEnglishCount] = useState(0);
  const [taglishCount, setTaglishCount] = useState(0);
  const [quizLanguage, setQuizLanguage] = useState("english");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);
  const [scoreData, setScoreData] = useState(null);

  useEffect(() => {
    const loadModuleAndCounts = async () => {
      const { data: mod } = await supabase
        .from("learning_modules")
        .select("title, level")
        .eq("id", moduleId)
        .single();
      setModule(mod);

      const { data: counts } = await supabase
        .from("quiz_questions")
        .select("is_taglish")
        .eq("module_id", moduleId)
        .eq("status", "approved");

      let eng = 0,
        tag = 0;
      counts?.forEach((c) => (c.is_taglish ? tag++ : eng++));
      setEnglishCount(eng);
      setTaglishCount(tag);
    };

    loadModuleAndCounts();
  }, [moduleId]);

  const startQuiz = async () => {
    const isTaglish = quizLanguage === "taglish";
    const available = isTaglish ? taglishCount : englishCount;

    if (available < defaultQuizQuestions) {
      alert(`Not enough ${quizLanguage} questions available.`);
      return;
    }

    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("module_id", moduleId)
      .eq("status", "approved")
      .eq("is_taglish", isTaglish);

    const shuffled = [...data].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, defaultQuizQuestions));
    setCurrentIndex(0);
    setAnswers({});
    setShowScore(false);
  };

  const selectAnswer = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const submitQuiz = async () => {
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) correct++;
    });

    const total = questions.length;
    const percentage = (correct / total) * 100;
    let points = 0;

    try {
      const { data: previousAttempts } = await supabase
        .from("quiz_attempts")
        .select("barya_points_earned")
        .eq("user_id", user.id)
        .eq("module_id", moduleId);

      const alreadyRewarded = previousAttempts?.some(
        (a) => a.barya_points_earned > 0
      );

      if (!alreadyRewarded && percentage >= 80) {
        let basePoints = 300;
        if (module.level === "Intermediate") basePoints = 500;
        if (module.level === "Advanced") basePoints = 700;

        points = basePoints;
        if (percentage === 100) points = Math.floor(basePoints * 1.02);
      }

      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        module_id: moduleId,
        score: correct,
        total_questions: total,
        barya_points_earned: points,
      });

      if (points > 0) {
        const { data: ub } = await supabase
          .from("user_balances")
          .select("balance")
          .eq("user_id", user.id)
          .single();

        const newBal = ub.balance + points;

        await supabase
          .from("user_balances")
          .update({ balance: newBal })
          .eq("user_id", user.id);

        await supabase.from("balance_history").insert({
          user_id: user.id,
          change_amount: points,
          balance_after: newBal,
          change_type: "DEPOSIT",
          description: `Quiz reward for module ${moduleId}`,
        });
      }

      setScoreData({ correct, total, points, percentage });
      setShowScore(true);
    } catch (err) {
      console.error(err);
      alert("Failed to submit quiz");
    }
  };

  if (!module) return <div>Loading...</div>;

  if (questions.length === 0) {
    // Language selection / start screen
    return (
      <div
        className="quiz-fullscreen"
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          padding: "40px 20px",
        }}
      >
        <div
          style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}
        >
          <button
            className="btn btn-secondary"
            onClick={onBack}
            style={{ marginBottom: "30px" }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>
            Quiz: {module.title}
          </h1>
          <p
            style={{
              fontSize: "18px",
              color: "var(--text-secondary)",
              marginBottom: "40px",
            }}
          >
            Choose your language and start the quiz
          </p>

          <select
            className="form-select"
            value={quizLanguage}
            onChange={(e) => setQuizLanguage(e.target.value)}
            style={{ width: "100%", maxWidth: "400px", marginBottom: "30px" }}
          >
            <option
              value="english"
              disabled={englishCount < defaultQuizQuestions}
            >
              English ({englishCount} questions available)
            </option>
            <option
              value="taglish"
              disabled={taglishCount < defaultQuizQuestions}
            >
              Taglish ({taglishCount} questions available)
            </option>
          </select>

          <button
            className="btn btn-accent"
            style={{ padding: "16px 40px", fontSize: "18px" }}
            onClick={startQuiz}
            disabled={
              (quizLanguage === "english" ? englishCount : taglishCount) <
              defaultQuizQuestions
            }
          >
            Start Quiz ({defaultQuizQuestions} questions)
          </button>
        </div>
      </div>
    );
  }

  if (showScore) {
    return (
      <div
        className="quiz-fullscreen"
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "40px", marginBottom: "20px" }}>
            Quiz Complete! 🎉
          </h1>
          <div
            style={{
              fontSize: "56px",
              fontWeight: "800",
              color: scoreData.percentage >= 80 ? "#00d4ff" : "#ff6b6b",
              margin: "40px 0",
            }}
          >
            {scoreData.correct} / {scoreData.total}
          </div>
          <p style={{ fontSize: "24px", marginBottom: "30px" }}>
            {Math.round(scoreData.percentage)}% correct
          </p>
          {scoreData.points > 0 && (
            <p style={{ fontSize: "28px", color: "#00d4ff", margin: "40px 0" }}>
              +{scoreData.points} barya points earned!
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: "20px",
              justifyContent: "center",
              marginTop: "50px",
            }}
          >
            <button className="btn btn-accent" onClick={() => setQuestions([])}>
              Retake Quiz
            </button>
            <button className="btn btn-secondary" onClick={onBack}>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLast = currentIndex === questions.length - 1;
  const canProceed = answers[currentQ.id] !== undefined;

  return (
    <div
      className="quiz-fullscreen"
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        padding: "20px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ margin: 0, fontSize: "24px" }}>{module.title}</h2>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
              {quizLanguage.toUpperCase()} • Question {currentIndex + 1} of{" "}
              {questions.length}
            </p>
          </div>
          <div />
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: "10px",
            background: "var(--border)",
            borderRadius: "5px",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #6c5ce7, #00d4ff)",
              borderRadius: "5px",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Question card */}
        <div
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: "20px",
            padding: "50px 40px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          }}
        >
          <h3
            style={{
              fontSize: "28px",
              marginBottom: "40px",
              lineHeight: "1.4",
            }}
          >
            {currentQ.question_text}
          </h3>

          <div style={{ display: "grid", gap: "18px" }}>
            {currentQ.options.map((opt, idx) => (
              <label
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "20px",
                  background:
                    answers[currentQ.id] === idx
                      ? "rgba(0, 212, 255, 0.15)"
                      : "var(--bg-secondary)",
                  border:
                    answers[currentQ.id] === idx
                      ? "2px solid var(--accent-blue)"
                      : "2px solid transparent",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontSize: "18px",
                  transition: "all 0.2s",
                }}
              >
                <input
                  type="radio"
                  name={`q${currentQ.id}`}
                  checked={answers[currentQ.id] === idx}
                  onChange={() => selectAnswer(currentQ.id, idx)}
                  style={{ marginRight: "16px", transform: "scale(1.3)" }}
                />
                <span>
                  {String.fromCharCode(65 + idx)}. {opt}
                </span>
              </label>
            ))}
          </div>

          {/* Navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "50px",
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={prevQuestion}
              disabled={currentIndex === 0}
            >
              Previous
            </button>

            <button
              className="btn btn-accent"
              disabled={!canProceed}
              onClick={isLast ? submitQuiz : nextQuestion}
            >
              {isLast ? "Submit Quiz" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
