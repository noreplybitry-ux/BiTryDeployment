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

    // Particle animation
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1
        });
      }

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

    return () => window.removeEventListener('scroll', handleScroll);
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
    <div style={styles.container}>
      <canvas ref={canvasRef} style={styles.canvas} />

      {/* Hero Section */}
      <section style={styles.hero}>
        <div style={styles.heroGrid}>
          <div style={styles.heroContent}>
            <div style={styles.badge}>
              <span style={styles.badgeDot} />
              <span>AI-Powered Platform</span>
            </div>
            
            <h1 style={styles.heroTitle}>
              Learn Crypto Trading<br />
              <span style={styles.gradient}>Risk-Free</span>
            </h1>
            
            <p style={styles.heroSubtitle}>
              Master cryptocurrency with AI guidance, virtual trading, 
              and real market data — designed for Filipinos.
            </p>

            <div style={styles.heroButtons}>
              {!user && (
                <button style={styles.primaryButton} onClick={() => window.location.href = './signup'}>
                  Start Free →
                </button>
              )}
              <button style={styles.secondaryButton} onClick={() => window.location.href = '#features'}>
                Explore
              </button>
            </div>

            <div style={styles.statsRow}>
              <div style={styles.stat}>
                <div style={styles.statValue}>100+</div>
                <div style={styles.statLabel}>Crypto Pairs</div>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.stat}>
                <div style={styles.statValue}>24/7</div>
                <div style={styles.statLabel}>Live Data</div>
              </div>
              <div style={styles.statDivider} />
              <div style={styles.stat}>
                <div style={styles.statValue}>100%</div>
                <div style={styles.statLabel}>Risk-Free</div>
              </div>
            </div>
          </div>

          <div style={styles.heroVisual}>
            <div style={styles.globe}>
              <div style={styles.globeCore}>
                <div style={styles.coreInner} />
                <div style={{...styles.coreRing, ...styles.ring1}} />
                <div style={{...styles.coreRing, ...styles.ring2}} />
                <div style={{...styles.coreRing, ...styles.ring3}} />
              </div>
              
              {cryptoMarkers.map((marker, idx) => (
                <div 
                  key={idx}
                  style={{
                    ...styles.marker,
                    '--angle': `${marker.angle}deg`,
                    '--radius': `${marker.radius}px`
                  }}
                >
                  <div style={styles.markerDot} />
                  <div style={styles.markerLabel}>{marker.name}</div>
                  <div style={styles.markerPulse} />
                </div>
              ))}
              
              <div style={styles.globeGrid} />
              <div style={styles.waves}>
                <div style={{...styles.wave, ...styles.wave1}} />
                <div style={{...styles.wave, ...styles.wave2}} />
                <div style={{...styles.wave, ...styles.wave3}} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.howItWorks} id="about">
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTag}>HOW IT WORKS</span>
          <h2 style={styles.sectionTitle}>
            Your Journey to <span style={styles.gradient}>Crypto Mastery</span>
          </h2>
        </div>

        <div style={styles.stepsContainer}>
          {(() => {
            const stepIcons = ["📝", "📚", "💹", "📊"];
            const steps = [
              { step: "01", title: "Sign Up Free", desc: "Create your account in seconds. No credit card required." },
              { step: "02", title: "Learn Basics", desc: "Start with AI-guided lessons in English or Taglish." },
              { step: "03", title: "Practice Trading", desc: "Use virtual funds to practice real trading strategies." },
              { step: "04", title: "Track Progress", desc: "Monitor your learning and trading performance." }
            ];

            return steps.map((item, idx) => (
              <div key={idx} style={styles.stepCard}>
                <div style={styles.stepBadge}>
                  <div style={styles.stepCircle}>{stepIcons[idx]}</div>
                  <div style={styles.stepNumberPill}>{item.step}</div>
                </div>
                <h3 style={styles.stepTitle}>{item.title}</h3>
                <p style={styles.stepDesc}>{item.desc}</p>
                {idx < 3 && <div style={styles.stepConnector} />}
              </div>
            ));
          })()}
        </div>
      </section>

      {/* Features Section */}
      <section style={styles.features} id="features">
        <div style={styles.sectionTag}>CORE FEATURES</div>
        <h2 style={styles.sectionTitle}>
          Everything You Need
        </h2>

        <div style={styles.featuresGrid}>
          {features.map((feature) => (
            <div 
              key={feature.id}
              style={styles.featureCard}
              onMouseEnter={() => setActiveCard(feature.id)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => window.location.href = feature.link}
            >
              <div style={styles.cardIcon}>{feature.icon}</div>
              <h3 style={styles.cardTitle}>{feature.title}</h3>
              <p style={styles.cardDesc}>{feature.description}</p>
              <div style={styles.cardArrow}>→</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={styles.cta}>
        <div style={styles.ctaCard}>
          <div style={styles.ctaGlow} />
          {user ? (
            <div>
              <h2 style={styles.ctaTitle}>Welcome back, {displayName}</h2>
              <p style={styles.ctaSubtitle}>Last activity: <strong>Completed — Lesson 2: Market Basics</strong></p>

              <div style={{display:'flex', gap:'12px', justifyContent:'center', marginTop:20}}>
                <button style={styles.ctaButton} onClick={() => window.location.href = './learn'}>Review Lesson</button>
                <button style={styles.secondaryButton} onClick={() => window.location.href = './dashboard'}>View Dashboard</button>
              </div>

              <p style={styles.ctaNote}>Last quiz: <strong>Quiz 1</strong> — Score: <span style={{color:'#00ff9e', fontWeight:800}}>87%</span></p>
            </div>
          ) : (
            <div>
              <h2 style={styles.ctaTitle}>
                Ready to Start?
              </h2>
              <p style={styles.ctaSubtitle}>
                Join thousands learning crypto the smart way
              </p>
              <button style={styles.ctaButton} onClick={() => window.location.href = './signup'}>
                Get Started Free
              </button>
              <p style={styles.ctaNote}>No credit card required</p>
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
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0b0e11',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  canvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
    opacity: 0.15,
    pointerEvents: 'none'
  },
  hero: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    padding: '140px 6% 100px',
    position: 'relative',
    zIndex: 1
  },
  heroGrid: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '80px',
    alignItems: 'center',
    width: '100%'
  },
  heroContent: {
    animation: 'fadeInUp 1s ease-out'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 24px',
    background: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#00d4ff',
    marginBottom: '32px'
  },
  badgeDot: {
    width: '8px',
    height: '8px',
    background: '#00d4ff',
    borderRadius: '50%',
    animation: 'pulse 2s infinite'
  },
  heroTitle: {
    fontSize: '72px',
    fontWeight: '900',
    lineHeight: '1.1',
    marginBottom: '24px',
    letterSpacing: '-2px'
  },
  gradient: {
    background: 'linear-gradient(135deg, #00d4ff, #00fff2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  heroSubtitle: {
    fontSize: '20px',
    lineHeight: '1.7',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '48px',
    maxWidth: '540px'
  },
  heroButtons: {
    display: 'flex',
    gap: '16px',
    marginBottom: '60px'
  },
  primaryButton: {
    padding: '18px 40px',
    background: '#00d4ff',
    color: '#0b0e11',
    border: 'none',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  },
  secondaryButton: {
    padding: '18px 40px',
    background: 'transparent',
    color: '#00d4ff',
    border: '2px solid #00d4ff',
    borderRadius: '12px',
    fontSize: '17px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  },
  statsRow: {
    display: 'flex',
    gap: '40px',
    alignItems: 'center'
  },
  stat: {
    textAlign: 'left'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#00d4ff',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)'
  },
  statDivider: {
    width: '1px',
    height: '40px',
    background: 'rgba(255, 255, 255, 0.1)'
  },
  heroVisual: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  globe: {
    position: 'relative',
    width: '400px',
    height: '400px',
    animation: 'float 6s ease-in-out infinite'
  },
  globeCore: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '200px',
    height: '200px'
  },
  coreInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100px',
    height: '100px',
    background: 'radial-gradient(circle, #00d4ff 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'corePulse 3s ease-in-out infinite'
  },
  coreRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    border: '2px solid #00d4ff',
    borderRadius: '50%',
    opacity: 0.3
  },
  ring1: {
    width: '120px',
    height: '120px',
    animation: 'ringRotate 10s linear infinite'
  },
  ring2: {
    width: '160px',
    height: '160px',
    animation: 'ringRotate 15s linear infinite reverse'
  },
  ring3: {
    width: '200px',
    height: '200px',
    animation: 'ringRotate 20s linear infinite'
  },
  marker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '40px',
    height: '40px',
    transformOrigin: 'center',
    animation: 'markerOrbit 20s linear infinite'
  },
  markerDot: {
    width: '12px',
    height: '12px',
    background: '#00d4ff',
    borderRadius: '50%',
    boxShadow: '0 0 20px rgba(0, 212, 255, 0.8)',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'
  },
  markerLabel: {
    position: 'absolute',
    top: '-30px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    fontWeight: '600',
    color: '#00d4ff',
    whiteSpace: 'nowrap',
    textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
  },
  markerPulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '12px',
    height: '12px',
    background: '#00d4ff',
    borderRadius: '50%',
    animation: 'markerPulse 2s ease-out infinite'
  },
  globeGrid: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '300px',
    height: '300px',
    backgroundImage: `linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)`,
    backgroundSize: '30px 30px',
    borderRadius: '50%',
    opacity: 0.2,
    animation: 'gridRotate 30s linear infinite'
  },
  waves: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    height: '100%'
  },
  wave: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    border: '2px solid #00d4ff',
    borderRadius: '50%',
    opacity: 0
  },
  wave1: {
    animation: 'waveExpand 3s ease-out infinite'
  },
  wave2: {
    animation: 'waveExpand 3s ease-out infinite 1s'
  },
  wave3: {
    animation: 'waveExpand 3s ease-out infinite 2s'
  },
  features: {
    padding: '120px 6%',
    position: 'relative',
    zIndex: 1
  },
  sectionTag: {
    display: 'block',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: '#00d4ff',
    letterSpacing: '3px',
    marginBottom: '20px'
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: '56px',
    fontWeight: '900',
    marginBottom: '80px',
    letterSpacing: '-1px'
  },
  featuresGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '32px'
  },
  /* How It Works */
  howItWorks: {
    padding: '100px 6%',
    background: 'transparent',
    position: 'relative',
    zIndex: 1
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  stepsContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '24px',
    alignItems: 'start'
  },
  stepCard: {
    position: 'relative',
    padding: '28px',
    background: 'rgba(22,26,30,0.6)',
    border: '1px solid rgba(0,212,255,0.08)',
    borderRadius: '16px',
    textAlign: 'left'
  },
  stepNumber: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: '#00d4ff',
    color: '#0b0e11',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    marginBottom: '16px'
  },
  stepTitle: {
    fontSize: '18px',
    fontWeight: 800,
    marginBottom: '8px'
  },
  stepDesc: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    lineHeight: 1.6
  },
  stepConnector: {
    position: 'absolute',
    right: '-12px',
    top: '50%',
    width: '24px',
    height: '2px',
    background: 'rgba(255,255,255,0.06)',
    transform: 'translateY(-50%)'
  },
  stepBadge: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '14px'
  },
  stepCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00d4ff, #00fff2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    boxShadow: '0 16px 40px rgba(0,212,255,0.12)'
  },
  stepNumberPill: {
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    background: '#071018',
    color: '#00d4ff',
    border: '2px solid rgba(255,255,255,0.06)',
    padding: '6px 10px',
    borderRadius: '12px',
    fontWeight: 800,
    fontSize: '12px'
  },
  featureCard: {
    padding: '48px 36px',
    background: 'rgba(22, 26, 30, 0.6)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    borderRadius: '24px',
    backdropFilter: 'blur(10px)',
    cursor: 'pointer',
    transition: 'all 0.4s',
    position: 'relative',
    overflow: 'hidden'
  },
  cardIcon: {
    fontSize: '56px',
    marginBottom: '24px',
    display: 'block'
  },
  cardTitle: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#ffffff'
  },
  cardDesc: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: 'rgba(255, 255, 255, 0.6)'
  },
  cardArrow: {
    position: 'absolute',
    bottom: '36px',
    right: '36px',
    fontSize: '24px',
    color: '#00d4ff',
    opacity: 0,
    transition: 'all 0.3s'
  },
  cta: {
    padding: '100px 6% 120px',
    position: 'relative',
    zIndex: 1
  },
  ctaCard: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '80px 60px',
    background: 'rgba(22, 26, 30, 0.6)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '32px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  ctaGlow: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(0, 212, 255, 0.1), transparent 70%)',
    animation: 'glowRotate 20s linear infinite'
  },
  ctaTitle: {
    fontSize: '52px',
    fontWeight: '900',
    marginBottom: '20px',
    position: 'relative',
    zIndex: 2
  },
  ctaSubtitle: {
    fontSize: '20px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '40px',
    position: 'relative',
    zIndex: 2
  },
  ctaButton: {
    padding: '20px 48px',
    background: '#00d4ff',
    color: '#0b0e11',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    position: 'relative',
    zIndex: 2
  },
  ctaNote: {
    marginTop: '20px',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)',
    position: 'relative',
    zIndex: 2
  },
  '@media (max-width: 968px)': {
    heroGrid: {
      gridTemplateColumns: '1fr',
      gap: '60px'
    },
    heroTitle: {
      fontSize: '52px'
    },
    featuresGrid: {
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    stepsContainer: {
      gridTemplateColumns: 'repeat(2, 1fr)'
    }
  },
  '@media (max-width: 640px)': {
    heroTitle: {
      fontSize: '40px'
    },
    heroSubtitle: {
      fontSize: '18px'
    },
    statsRow: {
      flexWrap: 'wrap'
    },
    featuresGrid: {
      gridTemplateColumns: '1fr'
    },
    sectionTitle: {
      fontSize: '40px'
    },
    ctaTitle: {
      fontSize: '36px'
    }
  }
};

export default BiTryHomepage;