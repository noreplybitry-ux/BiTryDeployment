import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

const BiTryHomepage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [activeCard, setActiveCard] = useState(null);
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Reset particles on resize to prevent them from being out of bounds
        particlesRef.current = [];
        const particleCount = window.innerWidth < 768 ? 20 : 50;
        for (let i = 0; i < particleCount; i++) {
          particlesRef.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: Math.random() * 2 + 1
          });
        }
      }
    };

    // Particle animation
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      handleResize(); // Initial setup

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00d4ff';
        
        particlesRef.current.forEach(particle => {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
          if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        });

        requestAnimationFrame(animate);
      };

      animate();
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const features = [
    {
      id: 1,
      title: "AI Learning",
      description: "Personalized crypto education in English and Taglish",
      icon: "🧠",
      link: "./learn"
    },
    {
      id: 2,
      title: "Virtual Trading",
      description: "Practice with $10K virtual funds, zero risk",
      icon: "⚡",
      link: "./trade"
    },
    {
      id: 3,
      title: "Live Markets",
      description: "Real-time data for 100+ cryptocurrencies",
      icon: "📈",
      link: "./news"
    }
  ];

  const cryptoMarkers = [
    { name: "BTC", angle: 0, radius: 120 },
    { name: "ETH", angle: 60, radius: 120 },
    { name: "BNB", angle: 120, radius: 120 },
    { name: "SOL", angle: 180, radius: 120 },
    { name: "XRP", angle: 240, radius: 120 },
    { name: "ADA", angle: 300, radius: 120 }
  ];

  const { user } = useAuth();
  const displayName = (user && (user.user_metadata?.full_name || user.email?.split('@')?.[0])) || 'Trader';

  return (
    <div className="container">
      <canvas ref={canvasRef} className="canvas" />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="badge">
              <span className="badge-dot" />
              <span>AI-Powered Platform</span>
            </div>
            
            <h1 className="hero-title">
              Learn Crypto Trading<br />
              <span className="gradient">Risk-Free</span>
            </h1>
            
            <p className="hero-subtitle">
              Master cryptocurrency with AI guidance, virtual trading, 
              and real market data — designed for Filipinos.
            </p>

            <div className="hero-buttons">
              {!user && (
                <button className="primary-button" onClick={() => window.location.href = './signup'}>
                  Start Free →
                </button>
              )}
              <button className="secondary-button" onClick={() => window.location.href = '#features'}>
                Explore
              </button>
            </div>

            <div className="stats-row">
              <div className="stat">
                <div className="stat-value">100+</div>
                <div className="stat-label">Crypto Pairs</div>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <div className="stat-value">24/7</div>
                <div className="stat-label">Live Data</div>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <div className="stat-value">100%</div>
                <div className="stat-label">Risk-Free</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="globe">
              <div className="globe-core">
                <div className="core-inner" />
                <div className="core-ring ring1" />
                <div className="core-ring ring2" />
                <div className="core-ring ring3" />
              </div>
              
              {cryptoMarkers.map((marker, idx) => (
                <div 
                  key={idx}
                  className="marker"
                  style={{
                    '--angle': `${marker.angle}deg`,
                    '--radius': `${marker.radius}px`
                  }}
                >
                  <div className="marker-dot" />
                  <div className="marker-label">{marker.name}</div>
                  <div className="marker-pulse" />
                </div>
              ))}
              
              <div className="globe-grid" />
              <div className="waves">
                <div className="wave wave1" />
                <div className="wave wave2" />
                <div className="wave wave3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="about">
        <div className="section-header">
          <span className="section-tag">HOW IT WORKS</span>
          <h2 className="section-title">
            Your Journey to <span className="gradient">Crypto Mastery</span>
          </h2>
        </div>

        <div className="steps-container">
          {(() => {
            const stepIcons = ["📝", "📚", "💹", "📊"];
            const steps = [
              { step: "01", title: "Sign Up Free", desc: "Create your account in seconds. No credit card required." },
              { step: "02", title: "Learn Basics", desc: "Start with AI-guided lessons in English or Taglish." },
              { step: "03", title: "Practice Trading", desc: "Use virtual funds to practice real trading strategies." },
              { step: "04", title: "Track Progress", desc: "Monitor your learning and trading performance." }
            ];

            return steps.map((item, idx) => (
              <div key={idx} className="step-card">
                <div className="step-badge">
                  <div className="step-circle">{stepIcons[idx]}</div>
                  <div className="step-number-pill">{item.step}</div>
                </div>
                <h3 className="step-title">{item.title}</h3>
                <p className="step-desc">{item.desc}</p>
                {idx < 3 && <div className="step-connector" />}
              </div>
            ));
          })()}
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-tag">CORE FEATURES</div>
        <h2 className="section-title">
          Everything You Need
        </h2>

        <div className="features-grid">
          {features.map((feature) => (
            <div 
              key={feature.id}
              className="feature-card"
              onMouseEnter={() => setActiveCard(feature.id)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => window.location.href = feature.link}
            >
              <div className="card-icon">{feature.icon}</div>
              <h3 className="card-title">{feature.title}</h3>
              <p className="card-desc">{feature.description}</p>
              <div className="card-arrow">→</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-card">
          <div className="cta-glow" />
          {user ? (
            <div>
              <h2 className="cta-title">Welcome back, {displayName}</h2>
              <p className="cta-subtitle">Last activity: <strong>Completed — Lesson 2: Market Basics</strong></p>

              <div className="cta-buttons">
                <button className="cta-button" onClick={() => window.location.href = './learn'}>Review Lesson</button>
                <button className="secondary-button" onClick={() => window.location.href = './dashboard'}>View Dashboard</button>
              </div>

              <p className="cta-note">Last quiz: <strong>Quiz 1</strong> — Score: <span className="cta-score">87%</span></p>
            </div>
          ) : (
            <div>
              <h2 className="cta-title">
                Ready to Start?
              </h2>
              <p className="cta-subtitle">
                Join thousands learning crypto the smart way
              </p>
              <button className="cta-button" onClick={() => window.location.href = './signup'}>
                Get Started Free
              </button>
              <p className="cta-note">No credit card required</p>
            </div>
          )}
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes corePulse {
          0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }

        @keyframes ringRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes markerOrbit {
          from {
            transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--radius)) rotate(calc(-1 * var(--angle)));
          }
          to {
            transform: translate(-50%, -50%) rotate(calc(var(--angle) + 360deg)) translateX(var(--radius)) rotate(calc(-1 * (var(--angle) + 360deg)));
          }
        }

        @keyframes markerPulse {
          0% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(3); }
        }

        @keyframes gridRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes waveExpand {
          0% { width: 100px; height: 100px; opacity: 0.6; }
          100% { width: 400px; height: 400px; opacity: 0; }
        }

        @keyframes glowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .container {
          min-height: 100vh;
          background: #0b0e11;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          opacity: 0.15;
          pointer-events: none;
        }

        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 140px 6% 100px;
          position: relative;
          z-index: 1;
        }

        .hero-grid {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
          width: 100%;
        }

        .hero-content {
          animation: fadeInUp 1s ease-out;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 24px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 50px;
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
          margin-bottom: 32px;
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          background: #00d4ff;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .hero-title {
          font-size: 72px;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -2px;
        }

        .gradient {
          background: linear-gradient(135deg, #00d4ff, #00fff2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 20px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 48px;
          max-width: 540px;
        }

        .hero-buttons {
          display: flex;
          gap: 16px;
          margin-bottom: 60px;
        }

        .primary-button {
          padding: 18px 40px;
          background: #00d4ff;
          color: #0b0e11;
          border: none;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .secondary-button {
          padding: 18px 40px;
          background: transparent;
          color: #00d4ff;
          border: 2px solid #00d4ff;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          white-space: nowrap;
        }

        .stats-row {
          display: flex;
          gap: 40px;
          align-items: center;
        }

        .stat {
          text-align: left;
        }

        .stat-value {
          font-size: 36px;
          font-weight: 800;
          color: #00d4ff;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(255, 255, 255, 0.1);
        }

        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .globe {
          position: relative;
          width: 400px;
          height: 400px;
          animation: float 6s ease-in-out infinite;
        }

        .globe-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
        }

        .core-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, #00d4ff 0%, transparent 70%);
          border-radius: 50%;
          animation: corePulse 3s ease-in-out infinite;
        }

        .core-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid #00d4ff;
          border-radius: 50%;
          opacity: 0.3;
        }

        .ring1 {
          width: 120px;
          height: 120px;
          animation: ringRotate 10s linear infinite;
        }

        .ring2 {
          width: 160px;
          height: 160px;
          animation: ringRotate 15s linear infinite reverse;
        }

        .ring3 {
          width: 200px;
          height: 200px;
          animation: ringRotate 20s linear infinite;
        }

        .marker {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 40px;
          height: 40px;
          transform-origin: center;
          animation: markerOrbit 20s linear infinite;
        }

        .marker-dot {
          width: 12px;
          height: 12px;
          background: #00d4ff;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .marker-label {
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          font-weight: 600;
          color: #00d4ff;
          white-space: nowrap;
          text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }

        .marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #00d4ff;
          border-radius: 50%;
          animation: markerPulse 2s ease-out infinite;
        }

        .globe-grid {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 300px;
          height: 300px;
          background-image: linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          border-radius: 50%;
          opacity: 0.2;
          animation: gridRotate 30s linear infinite;
        }

        .waves {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
        }

        .wave {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid #00d4ff;
          border-radius: 50%;
          opacity: 0;
        }

        .wave1 {
          animation: waveExpand 3s ease-out infinite;
        }

        .wave2 {
          animation: waveExpand 3s ease-out infinite 1s;
        }

        .wave3 {
          animation: waveExpand 3s ease-out infinite 2s;
        }

        .features {
          padding: 120px 6%;
          position: relative;
          z-index: 1;
        }

        .section-tag {
          display: block;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          color: #00d4ff;
          letter-spacing: 3px;
          margin-bottom: 20px;
        }

        .section-title {
          text-align: center;
          font-size: 56px;
          font-weight: 900;
          margin-bottom: 80px;
          letter-spacing: -1px;
        }

        .features-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }

        /* How It Works */
        .how-it-works {
          padding: 100px 6%;
          background: transparent;
          position: relative;
          z-index: 1;
        }

        .section-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .steps-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          align-items: start;
        }

        .step-card {
          position: relative;
          padding: 28px;
          background: rgba(22,26,30,0.6);
          border: 1px solid rgba(0,212,255,0.08);
          border-radius: 16px;
          text-align: left;
        }

        .step-title {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .step-desc {
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          line-height: 1.6;
        }

        .step-connector {
          position: absolute;
          right: -12px;
          top: 50%;
          width: 24px;
          height: 2px;
          background: rgba(255,255,255,0.06);
          transform: translateY(-50%);
        }

        .step-badge {
          position: relative;
          display: inline-block;
          margin-bottom: 14px;
        }

        .step-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00d4ff, #00fff2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          box-shadow: 0 16px 40px rgba(0,212,255,0.12);
        }

        .step-number-pill {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #071018;
          color: #00d4ff;
          border: 2px solid rgba(255,255,255,0.06);
          padding: 6px 10px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 12px;
        }

        .feature-card {
          padding: 48px 36px;
          background: rgba(22, 26, 30, 0.6);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 24px;
          backdrop-filter: blur(10px);
          cursor: pointer;
          transition: all 0.4s;
          position: relative;
          overflow: hidden;
        }

        .card-icon {
          font-size: 56px;
          margin-bottom: 24px;
          display: block;
        }

        .card-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #ffffff;
        }

        .card-desc {
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.6);
        }

        .card-arrow {
          position: absolute;
          bottom: 36px;
          right: 36px;
          font-size: 24px;
          color: #00d4ff;
          opacity: 0;
          transition: all 0.3s;
        }

        .cta {
          padding: 100px 6% 120px;
          position: relative;
          z-index: 1;
        }

        .cta-card {
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 60px;
          background: rgba(22, 26, 30, 0.6);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 32px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.1), transparent 70%);
          animation: glowRotate 20s linear infinite;
        }

        .cta-title {
          font-size: 52px;
          font-weight: 900;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }

        .cta-subtitle {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 40px;
          position: relative;
          z-index: 2;
        }

        .cta-button {
          padding: 20px 48px;
          background: #00d4ff;
          color: #0b0e11;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          z-index: 2;
        }

        .cta-note {
          margin-top: 20px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          position: relative;
          z-index: 2;
        }

        .cta-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        }

        .cta-score {
          color: #00ff9e;
          font-weight: 800;
        }

        @media (max-width: 1200px) {
          .hero-grid {
            gap: 60px;
          }
          .hero-title {
            font-size: 64px;
          }
          .globe {
            width: 350px;
            height: 350px;
          }
          .globe-grid {
            width: 250px;
            height: 250px;
          }
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .steps-container {
            grid-template-columns: repeat(2, 1fr);
          }
          .section-title {
            font-size: 48px;
          }
        }

        @media (max-width: 968px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 60px;
          }
          .hero-title {
            font-size: 52px;
          }
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .steps-container {
            grid-template-columns: repeat(2, 1fr);
          }
          .globe {
            width: 300px;
            height: 300px;
          }
          .globe-grid {
            width: 220px;
            height: 220px;
          }
          .marker-label {
            font-size: 10px;
            top: -25px;
          }
          .hero {
            padding: 120px 6% 80px;
          }
          .how-it-works, .features, .cta {
            padding: 100px 6%;
          }
          .cta-card {
            padding: 60px 40px;
          }
        }

        @media (max-width: 768px) {
          .hero {
            padding: 100px 6% 60px;
          }
          .hero-title {
            font-size: 36px;
            letter-spacing: -1px;
            line-height: 1.2;
          }
          .hero-subtitle {
            font-size: 15px;
            line-height: 1.7;
            max-width: 100%;
            margin-bottom: 32px;
          }
          .hero-buttons {
            flex-direction: column;
            gap: 12px;
          }
          .primary-button, .secondary-button {
            width: 100%;
            padding: 14px 20px;
            text-align: center;
            white-space: normal;
          }
          .stats-row {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }
          .stat-divider {
            display: none;
          }
          .stat-value {
            font-size: 28px;
          }
          .features-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .feature-card {
            padding: 32px 24px;
            border-radius: 20px;
          }
          .card-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .card-title {
            font-size: 24px;
            margin-bottom: 12px;
          }
          .card-desc {
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 16px;
          }
          .card-arrow {
            bottom: 32px;
            right: 32px;
          }
          .section-title {
            font-size: 32px;
            margin-bottom: 48px;
          }
          .cta-title {
            font-size: 32px;
          }
          .globe {
            width: 280px;
            height: 280px;
          }
          .globe-core {
            width: 160px;
            height: 160px;
          }
          .core-inner {
            width: 80px;
            height: 80px;
          }
          .ring1 {
            width: 100px;
            height: 100px;
          }
          .ring2 {
            width: 130px;
            height: 130px;
          }
          .ring3 {
            width: 160px;
            height: 160px;
          }
          .globe-grid {
            width: 200px;
            height: 200px;
          }
          .marker {
            width: 30px;
            height: 30px;
          }
          .marker-dot, .marker-pulse {
            width: 10px;
            height: 10px;
          }
          .marker-label {
            font-size: 10px;
            top: -20px;
          }
          .steps-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .step-card {
            padding: 24px;
          }
          .step-circle {
            width: 56px;
            height: 56px;
            font-size: 24px;
          }
          .step-title {
            font-size: 16px;
          }
          .step-desc {
            font-size: 13px;
          }
          .step-connector {
            display: none;
          }
          .how-it-works, .features, .cta {
            padding: 80px 6%;
          }
          .cta-card {
            padding: 60px 30px;
            border-radius: 24px;
          }
          .cta-subtitle {
            font-size: 16px;
          }
          .cta-button {
            width: 100%;
            padding: 16px 20px;
          }
          .cta-buttons {
            flex-direction: column;
            gap: 12px;
          }
          .badge {
            font-size: 12px;
            padding: 8px 20px;
          }
        }

        @media (max-width: 640px) {
          .hero-title {
            font-size: 40px;
          }
          .hero-subtitle {
            font-size: 18px;
          }
          .stats-row {
            flex-wrap: wrap;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
          .section-title {
            font-size: 40px;
          }
          .cta-title {
            font-size: 36px;
          }
        }

        @media (max-width: 480px) {
          .hero {
            padding: 80px 5% 40px;
          }
          .hero-title {
            font-size: 28px;
            letter-spacing: -0.5px;
            line-height: 1.2;
          }
          .hero-subtitle {
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 28px;
          }
          .hero-buttons {
            gap: 10px;
          }
          .primary-button, .secondary-button {
            padding: 12px 16px;
            font-size: 14px;
          }
          .section-title {
            font-size: 26px;
            margin-bottom: 40px;
          }
          .cta-title {
            font-size: 26px;
          }
          .card-title {
            font-size: 22px;
          }
          .badge {
            font-size: 11px;
            padding: 6px 14px;
          }
          .cta-subtitle {
            font-size: 14px;
          }
          .stat-value {
            font-size: 24px;
          }
          .stat-label {
            font-size: 12px;
          }
          .features-grid {
            gap: 20px;
          }
          .feature-card {
            padding: 28px 20px;
            border-radius: 16px;
          }
          .card-icon {
            font-size: 42px;
            margin-bottom: 16px;
          }
          .card-title {
            font-size: 20px;
          }
          .card-desc {
            font-size: 14px;
          }
          .card-arrow {
            bottom: 28px;
            right: 28px;
          }
          .globe {
            width: 220px;
            height: 220px;
          }
          .globe-core {
            width: 140px;
            height: 140px;
          }
          .core-inner {
            width: 70px;
            height: 70px;
          }
          .ring1 {
            width: 90px;
            height: 90px;
          }
          .ring2 {
            width: 110px;
            height: 110px;
          }
          .ring3 {
            width: 140px;
            height: 140px;
          }
          .globe-grid {
            width: 160px;
            height: 160px;
          }
          .marker-label {
            display: none;
          }
          .how-it-works, .features, .cta {
            padding: 60px 5%;
          }
          .step-circle {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }
          .step-number-pill {
            top: -8px;
            right: -8px;
            padding: 4px 8px;
            font-size: 10px;
          }
          .cta-card {
            padding: 50px 20px;
            border-radius: 20px;
          }
          .cta-button {
            padding: 14px 16px;
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default BiTryHomepage;