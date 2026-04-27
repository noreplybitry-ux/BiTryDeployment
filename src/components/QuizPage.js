// src/components/QuizPage.js
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";

// ─── SweetAlert2 base mixin styled to match the app's dark theme ────────────
const QuizAlert = Swal.mixin({
  background: "var(--bg-tertiary, #1a1a2e)",
  color: "var(--text-primary, #ffffff)",
  confirmButtonColor: "#6c5ce7",
  cancelButtonColor: "#444",
  customClass: {
    popup: "quiz-swal-popup",
    confirmButton: "quiz-swal-confirm",
    cancelButton: "quiz-swal-cancel",
    progressSteps: "quiz-swal-steps",
  },
});

// ─── Inject custom SweetAlert2 styles once ──────────────────────────────────
const injectSwalStyles = () => {
  if (document.getElementById("quiz-swal-styles")) return;
  const style = document.createElement("style");
  style.id = "quiz-swal-styles";
  style.textContent = `
    .quiz-swal-popup {
      border: 1px solid rgba(108, 92, 231, 0.35) !important;
      border-radius: 24px !important;
      box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(108,92,231,0.15) !important;
      font-family: inherit !important;
      padding: 36px 32px !important;
    }
    .quiz-swal-confirm {
      border-radius: 12px !important;
      font-weight: 600 !important;
      padding: 12px 28px !important;
      font-size: 15px !important;
      letter-spacing: 0.3px !important;
    }
    .quiz-swal-cancel {
      border-radius: 12px !important;
      font-weight: 600 !important;
      padding: 12px 28px !important;
      font-size: 15px !important;
    }
    .quiz-swal-steps {
      margin-bottom: 16px !important;
    }
    .quiz-swal-steps .swal2-progress-step {
      background: rgba(108, 92, 231, 0.3) !important;
      color: rgba(255,255,255,0.5) !important;
      width: 32px !important;
      height: 32px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      border-radius: 50% !important;
    }
    .quiz-swal-steps .swal2-progress-step.swal2-active-progress-step {
      background: linear-gradient(135deg, #6c5ce7, #00d4ff) !important;
      color: #fff !important;
      box-shadow: 0 0 18px rgba(108,92,231,0.6) !important;
    }
    .quiz-swal-steps .swal2-progress-step-line {
      background: rgba(108, 92, 231, 0.25) !important;
      height: 3px !important;
    }
    .swal2-title {
      color: var(--text-primary, #ffffff) !important;
      font-size: 22px !important;
      font-weight: 700 !important;
    }
    .swal2-html-container {
      color: var(--text-secondary, #aaa) !important;
      font-size: 15px !important;
      line-height: 1.7 !important;
      text-align: left !important;
      margin-top: 8px !important;
    }
    .quiz-info-card {
      background: rgba(108, 92, 231, 0.1);
      border: 1px solid rgba(108, 92, 231, 0.25);
      border-radius: 14px;
      padding: 16px 20px;
      margin: 10px 0;
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .quiz-info-icon {
      font-size: 26px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .quiz-info-text strong {
      color: #ffffff;
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
    }
    .quiz-info-text span {
      color: rgba(255,255,255,0.6);
      font-size: 13.5px;
      line-height: 1.6;
    }
    .quiz-level-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-top: 12px;
    }
    .quiz-level-card {
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 14px 10px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .quiz-level-card .lvl-emoji { font-size: 22px; }
    .quiz-level-card .lvl-label {
      font-size: 11px;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-top: 4px;
    }
    .quiz-level-card .lvl-pts {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, #6c5ce7, #00d4ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-top: 2px;
    }
    .quiz-pill {
      display: inline-block;
      background: rgba(0, 212, 255, 0.15);
      border: 1px solid rgba(0, 212, 255, 0.35);
      border-radius: 99px;
      padding: 3px 12px;
      font-size: 12.5px;
      color: #00d4ff;
      font-weight: 600;
      margin-left: 6px;
      vertical-align: middle;
    }
    .quiz-result-emoji {
      font-size: 72px;
      line-height: 1;
      margin-bottom: 8px;
      display: block;
      animation: quiz-emoji-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }
    @keyframes quiz-emoji-pop {
      from { transform: scale(0.4) rotate(-8deg); opacity: 0; }
      to   { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    .quiz-result-score-big {
      font-size: 52px;
      font-weight: 900;
      line-height: 1;
      margin: 8px 0 4px;
    }
    .quiz-result-pct {
      font-size: 17px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 16px;
    }
    .quiz-result-points-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(0, 212, 255, 0.12);
      border: 1px solid rgba(0, 212, 255, 0.35);
      border-radius: 14px;
      padding: 10px 20px;
      font-size: 18px;
      font-weight: 700;
      color: #00d4ff;
      margin: 8px 0 4px;
    }
    .quiz-result-msg {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      margin-top: 6px;
      font-style: italic;
    }
  `;
  document.head.appendChild(style);
};

// ─── Carousel intro: 4 slides explaining how the quiz works ─────────────────
const showQuizCarousel = async (module) => {
  const level = module?.level || "Beginner";
  const pointsMap = { Beginner: 300, Intermediate: 500, Advanced: 700 };
  const basePoints = pointsMap[level] || 300;
  const bonusPoints = Math.floor(basePoints * 1.02);

  const StepMixin = Swal.mixin({
    background: "var(--bg-tertiary, #1a1a2e)",
    color: "var(--text-primary, #ffffff)",
    confirmButtonColor: "#6c5ce7",
    progressSteps: ["1", "2", "3", "4"],
    showClass: {
      backdrop: "swal2-noanimation",
      popup: "animate__animated animate__fadeInUp animate__faster",
    },
    hideClass: {
      backdrop: "swal2-noanimation",
      popup: "",
    },
    customClass: {
      popup: "quiz-swal-popup",
      confirmButton: "quiz-swal-confirm",
      progressSteps: "quiz-swal-steps",
    },
  });

  // Step 1 — Overview
  await StepMixin.fire({
    currentProgressStep: 0,
    title: "📋 Quiz Overview",
    confirmButtonText: "Next →",
    html: `
      <div class="quiz-info-card">
        <div class="quiz-info-icon">🎯</div>
        <div class="quiz-info-text">
          <strong>What to expect</strong>
          <span>You'll answer <b style="color:#fff">5 multiple-choice questions</b> drawn randomly from the question bank. Each question has 4 options — choose the best one!</span>
        </div>
      </div>
      <div class="quiz-info-card">
        <div class="quiz-info-icon">🌐</div>
        <div class="quiz-info-text">
          <strong>Pick your language</strong>
          <span>Questions are available in <b style="color:#fff">English</b> or <b style="color:#fff">Taglish</b>. You choose before starting — pick what feels most comfortable.</span>
        </div>
      </div>
      <div class="quiz-info-card">
        <div class="quiz-info-icon">🔄</div>
        <div class="quiz-info-text">
          <strong>Navigate freely</strong>
          <span>Go back and forth between questions anytime before submitting. Change your answers as many times as you like!</span>
        </div>
      </div>
    `,
  });

  // Step 2 — Passing & Scoring
  await StepMixin.fire({
    currentProgressStep: 1,
    title: "✅ Passing the Quiz",
    confirmButtonText: "Next →",
    html: `
      <div class="quiz-info-card">
        <div class="quiz-info-icon">🏁</div>
        <div class="quiz-info-text">
          <strong>Passing score <span class="quiz-pill">80%+</span></strong>
          <span>You need to answer at least <b style="color:#fff">4 out of 5</b> questions correctly to pass and unlock your barya points reward.</span>
        </div>
      </div>
      <div class="quiz-info-card">
        <div class="quiz-info-icon">😊</div>
        <div class="quiz-info-text">
          <strong>Score grades at a glance</strong>
          <span>
            😊 <b style="color:#4ade80">80–100%</b> — Passing! Barya points earned.<br/>
            😐 <b style="color:#facc15">60–79%</b> — Almost there, keep going.<br/>
            😢 <b style="color:#f87171">Below 60%</b> — Don't give up, try again!
          </span>
        </div>
      </div>
      <div class="quiz-info-card">
        <div class="quiz-info-icon">🔁</div>
        <div class="quiz-info-text">
          <strong>Retakes are allowed</strong>
          <span>You can retake the quiz anytime to improve your knowledge — but barya points are only awarded <b style="color:#fff">once</b> per module.</span>
        </div>
      </div>
    `,
  });

  // Step 3 — Barya Points
  await StepMixin.fire({
    currentProgressStep: 2,
    title: "🪙 Earning Barya Points",
    confirmButtonText: "Next →",
    html: `
      <div style="margin-bottom:12px;font-size:14px;color:rgba(255,255,255,0.55);">Points vary by module difficulty. Score 80%+ on your <b style="color:#fff">first passing attempt</b> to earn:</div>
      <div class="quiz-level-grid">
        <div class="quiz-level-card">
          <div class="lvl-emoji">🌱</div>
          <div class="lvl-label">Beginner</div>
          <div class="lvl-pts">300</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px;">barya pts</div>
        </div>
        <div class="quiz-level-card">
          <div class="lvl-emoji">⚡</div>
          <div class="lvl-label">Intermediate</div>
          <div class="lvl-pts">500</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px;">barya pts</div>
        </div>
        <div class="quiz-level-card">
          <div class="lvl-emoji">🔥</div>
          <div class="lvl-label">Advanced</div>
          <div class="lvl-pts">700</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px;">barya pts</div>
        </div>
      </div>
      <div class="quiz-info-card" style="margin-top:14px;">
        <div class="quiz-info-icon">💰</div>
        <div class="quiz-info-text">
          <strong>This module — <span style="color:#00d4ff">${level}</span> level</strong>
          <span>Pass on your first try and you'll earn <b style="color:#fff">${basePoints} barya points</b> added straight to your wallet balance.</span>
        </div>
      </div>
    `,
  });

  // Step 4 — Perfect Score Bonus
  await StepMixin.fire({
    currentProgressStep: 3,
    title: "🌟 Perfect Score Bonus",
    confirmButtonText: "Let's Go! 🚀",
    html: `
      <div class="quiz-info-card">
        <div class="quiz-info-icon">💯</div>
        <div class="quiz-info-text">
          <strong>Get 100% for an extra bonus!</strong>
          <span>Answer every single question correctly on your first passing attempt and receive a <b style="color:#00d4ff">+2% bonus</b> on top of your base reward.</span>
        </div>
      </div>
      <div style="background:rgba(0,212,255,0.07);border:1px solid rgba(0,212,255,0.2);border-radius:14px;padding:20px;text-align:center;margin:12px 0;">
        <div style="font-size:13px;color:rgba(255,255,255,0.45);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;">Perfect score reward for ${level}</div>
        <div style="font-size:36px;font-weight:900;background:linear-gradient(135deg,#6c5ce7,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${bonusPoints} pts</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:4px;">vs. ${basePoints} pts for a regular pass</div>
      </div>
      <div class="quiz-info-card">
        <div class="quiz-info-icon">💡</div>
        <div class="quiz-info-text">
          <strong>Pro tip</strong>
          <span>Review the learning material thoroughly before attempting. Questions are randomized each time, so a retake is a fresh challenge!</span>
        </div>
      </div>
    `,
  });
};

// ─── Result SweetAlert after submitting ─────────────────────────────────────
const showResultAlert = async ({ correct, total, points, percentage }) => {
  let emoji, grade, gradColor, message, extraHtml;

  if (percentage >= 80) {
    emoji = "😊";
    grade = "Passed!";
    gradColor = "linear-gradient(135deg, #4ade80, #00d4ff)";
    message =
      percentage === 100
        ? "Flawless! You aced it with a perfect score! 🏆"
        : percentage >= 90
        ? "Outstanding performance! You nailed it! 🎯"
        : "Great job! You cleared the passing threshold! 🎉";
    extraHtml =
      points > 0
        ? `<div class="quiz-result-points-badge">🪙 +${points} barya points earned!</div>
           <p class="quiz-result-msg">Credited to your wallet balance.</p>`
        : `<p class="quiz-result-msg" style="color:rgba(255,200,0,0.7);">You've already claimed points for this module.</p>`;
  } else if (percentage >= 60) {
    emoji = "😐";
    grade = "Almost There";
    gradColor = "linear-gradient(135deg, #facc15, #fb923c)";
    message = "Not quite passing, but you're close! A little more review and you'll get it. 💪";
    extraHtml = `<p class="quiz-result-msg">Score 80%+ to earn barya points on your first pass.</p>`;
  } else {
    emoji = "😢";
    grade = "Keep Going";
    gradColor = "linear-gradient(135deg, #f87171, #c084fc)";
    message = "Don't be discouraged! Every attempt builds knowledge. Review the material and try again. 📚";
    extraHtml = `<p class="quiz-result-msg">You've got this — practice makes perfect!</p>`;
  }

  await QuizAlert.fire({
    html: `
      <div style="text-align:center;padding:8px 0 4px;">
        <span class="quiz-result-emoji">${emoji}</span>
        <div class="quiz-result-score-big" style="background:${gradColor};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
          ${correct} / ${total}
        </div>
        <div class="quiz-result-pct">${Math.round(percentage)}% correct &nbsp;·&nbsp; ${grade}</div>
        <p style="font-size:15px;color:rgba(255,255,255,0.75);margin:8px 0 14px;line-height:1.6;">${message}</p>
        ${extraHtml}
      </div>
    `,
    showConfirmButton: true,
    confirmButtonText: "See Full Results",
    showCancelButton: true,
    cancelButtonText: "Retake Quiz",
    reverseButtons: true,
    customClass: {
      popup: "quiz-swal-popup",
      confirmButton: "quiz-swal-confirm",
      cancelButton: "quiz-swal-cancel",
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// QuizPage Component
// ═══════════════════════════════════════════════════════════════════════════
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

  // Inject SweetAlert styles on mount
  useEffect(() => {
    injectSwalStyles();
  }, []);

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

  // ── Show intro carousel once when the start screen first appears ──────────
  const hasShownIntro = useRef(false);
  useEffect(() => {
    if (module && questions.length === 0 && !showScore && !hasShownIntro.current) {
      hasShownIntro.current = true;
      showQuizCarousel(module);
    }
  }, [module, questions.length, showScore]);

  const startQuiz = async () => {
    const isTaglish = quizLanguage === "taglish";
    const available = isTaglish ? taglishCount : englishCount;

    if (available < defaultQuizQuestions) {
      QuizAlert.fire({
        icon: "warning",
        title: "Not Enough Questions",
        text: `There aren't enough ${quizLanguage} questions available yet. Try the other language!`,
      });
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
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const prevQuestion = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
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

      const result = { correct, total, points, percentage };
      setScoreData(result);

      // Show the result SweetAlert first, THEN reveal the in-page score screen
      await showResultAlert(result);
      setShowScore(true);
    } catch (err) {
      console.error(err);
      QuizAlert.fire({
        icon: "error",
        title: "Submission Failed",
        text: "Something went wrong while submitting your quiz. Please try again.",
      });
    }
  };

  if (!module) return <div>Loading...</div>;

  // ── Start / Language Selection Screen ─────────────────────────────────────
  if (questions.length === 0) {
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
            style={{ width: "100%", maxWidth: "400px", marginBottom: "20px" }}
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

          {/* "How it works" re-trigger button */}
          <div style={{ marginBottom: "30px" }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: "13px", padding: "8px 18px", opacity: 0.7 }}
              onClick={() => showQuizCarousel(module)}
            >
              ℹ️ How does this quiz work?
            </button>
          </div>

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

  // ── Score Screen ──────────────────────────────────────────────────────────
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
            <button className="btn btn-accent" onClick={() => { setQuestions([]); hasShownIntro.current = false; }}>
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

  // ── Active Quiz Screen ────────────────────────────────────────────────────
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
