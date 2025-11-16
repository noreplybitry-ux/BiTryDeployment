import React, { useState, useEffect, useRef } from "react";
import '../css/Homepage.css';
import { Home } from "lucide-react";

const Homepage = () => {
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeCard, setActiveCard] = useState(null);
  const globeRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize particles
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Create particles
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1
        });
      }

      // Animate particles
      const animateParticles = () => {
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

        requestAnimationFrame(animateParticles);
      };

      animateParticles();
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const features = [
    {
      id: 1,
      title: "Neural Learning",
      description: "AI-created cryptocurrency modules in English and Taglish",
      icon: "🧠",
      stats: "Growing User Base",
      color: "#00d4ff",
      link: "./learn"
    },
    {
      id: 2,
      title: "Quantum Simulator",
      description: "Real-time trading simulation with leverage and spot markets",
      icon: "⚡",
      stats: "$10K Virtual",
      color: "#00fff2",
      link: "./trade"
    },
    {
      id: 3,
      title: "Market Intelligence",
      description: "AI-powered news analysis and market sentiment tracking",
      icon: "🔮",
      stats: "24/7 Updates",
      color: "#00d4ff",
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

  return (
    <div className="bitry-homepage">
      <canvas id="particle-canvas" className="particle-canvas"></canvas>
      
      {/* Hero Section */}
      <section className="hero-container">
        <div className="hero-grid">
          <div className="hero-content">
            
            <h1 className="hero-heading">
              The Future of
              <br />
              <span className="gradient-text">Crypto Learning</span>
              <br />
              Starts Here
            </h1>
            
            <p className="hero-description">
              Experience next-generation cryptocurrency education with BiTry. 
              AI-powered learning, risk-free trading simulations, and real-time 
              market intelligence — available in Taglish.
            </p>
            
            <div className="hero-actions">
              <button className="btn-primary-glow" onClick={() => window.location.href = './signup'}>
                <span>Launch Platform</span>
                <div className="btn-glow"></div>
              </button>
              <button className="btn-outline" onClick={() => window.location.href = '#features'}>
                <span>Explore Features</span>
              </button>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-value">100+</div>
                <div className="stat-label">Crypto Pairs</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">24/7</div>
                <div className="stat-label">News</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-value">100%</div>
                <div className="stat-label">Risk-Free</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="holographic-globe" ref={globeRef}>
              <div className="globe-core">
                <div className="core-inner"></div>
                <div className="core-ring ring-1"></div>
                <div className="core-ring ring-2"></div>
                <div className="core-ring ring-3"></div>
              </div>
              
              {cryptoMarkers.map((marker, idx) => (
                <div 
                  key={idx}
                  className="crypto-marker"
                  style={{
                    '--angle': `${marker.angle}deg`,
                    '--radius': `${marker.radius}px`,
                    animationDelay: `${idx * 0.2}s`
                  }}
                >
                  <div className="marker-dot"></div>
                  <div className="marker-label">{marker.name}</div>
                  <div className="marker-pulse"></div>
                </div>
              ))}
              
              <div className="globe-grid"></div>
              <div className="energy-waves">
                <div className="wave wave-1"></div>
                <div className="wave wave-2"></div>
                <div className="wave wave-3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-label">
          <span className="label-line"></span>
          <span>Core Features</span>
          <span className="label-line"></span>
        </div>
        
        <h2 className="section-heading">
          Powered by <span className="gradient-text">Advanced AI</span>
        </h2>

        <div className="features-grid-modern">
          {features.map((feature) => (
            <div 
              key={feature.id}
              className={`feature-card-modern ${activeCard === feature.id ? 'active' : ''}`}
              onMouseEnter={() => setActiveCard(feature.id)}
              onMouseLeave={() => setActiveCard(null)}
              onClick={() => window.location.href = feature.link}
            >
              <div className="card-glow" style={{ '--glow-color': feature.color }}></div>
              <div className="card-content">
                <div className="card-icon">{feature.icon}</div>
                <h3 className="card-title">{feature.title}</h3>
                <p className="card-description">{feature.description}</p>
                <div className="card-stats">{feature.stats}</div>
              </div>
              <div className="card-arrow">→</div>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Section */}
      <section className="tech-section">
        <div className="tech-grid">
          <div className="tech-visual">
            <div className="tech-hexagon">
              <div className="hex-layer layer-1"></div>
              <div className="hex-layer layer-2"></div>
              <div className="hex-layer layer-3"></div>
              <div className="hex-center">
                <div className="center-icon">₿</div>
              </div>
            </div>
          </div>

          <div className="tech-content">
            <div className="section-label">
              <span className="label-line"></span>
              <span>Technology</span>
            </div>
            
            <h2 className="section-heading">
              Built for the <span className="gradient-text">Next Generation</span>
            </h2>
            
            <div className="tech-features">
              <div className="tech-item">
                <div className="tech-number">01</div>
                <div className="tech-info">
                  <h4>AI-Powered Information</h4>
                  <p>Learn with AI by your side</p>
                </div>
              </div>
              
              <div className="tech-item">
                <div className="tech-number">02</div>
                <div className="tech-info">
                  <h4>Real-Time Market Data</h4>
                  <p>Live cryptocurrency prices and trading simulations</p>
                </div>
              </div>
              
              <div className="tech-item">
                <div className="tech-number">03</div>
                <div className="tech-info">
                  <h4>Secure & Private</h4>
                  <p>Your learning data stays protected and encrypted</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section-modern">
        <div className="cta-container">
          <div className="cta-glow-effect"></div>
          <h2 className="cta-heading">
            Start Your Crypto Journey <span className="gradient-text">Today</span>
          </h2>
          <p className="cta-text">
            Join thousands of Filipino learners mastering cryptocurrency trading with BiTry
          </p>
          <button className="btn-primary-glow large" onClick={() => window.location.href = './signup'}>
            <span>Get Started Free</span>
            <div className="btn-glow"></div>
          </button>
          <div className="cta-note">Start learning in minutes</div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;