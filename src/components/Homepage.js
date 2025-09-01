import React, { useState, useEffect } from "react";
import '../css/Homepage.css';

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animateCards, setAnimateCards] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    setAnimateCards(true);
    
    // Add mouse/touch event listeners for 3D Bitcoin interaction
    const bitcoinElement = document.getElementById('bitcoin-logo');
    if (bitcoinElement) {
      const handleMouseDown = (e) => {
        setIsDragging(true);
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        setLastMouse({ x: clientX, y: clientY });
        e.preventDefault();
      };

      const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const clientX = e.clientX || e.touches?.[0]?.clientX;
        const clientY = e.clientY || e.touches?.[0]?.clientY;
        
        const deltaX = clientX - lastMouse.x;
        const deltaY = clientY - lastMouse.y;
        
        setRotation(prev => ({
          x: prev.x - deltaY * 0.5,
          y: prev.y + deltaX * 0.5
        }));
        
        setLastMouse({ x: clientX, y: clientY });
        e.preventDefault();
      };

      const handleMouseUp = () => {
        setIsDragging(false);
      };

      // Mouse events
      bitcoinElement.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Touch events
      bitcoinElement.addEventListener('touchstart', handleMouseDown, { passive: false });
      document.addEventListener('touchmove', handleMouseMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        bitcoinElement.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        bitcoinElement.removeEventListener('touchstart', handleMouseDown);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
    
    return () => clearInterval(timer);
  }, [isDragging, lastMouse]);

  const features = [
    {
      title: "AI Learning Modules",
      description: "Master cryptocurrency fundamentals with personalized AI-generated quizzes that adapt to your learning pace.",
      icon: "🧠",
      highlights: ["Interactive lessons", "AI-generated quizzes", "Progress tracking", "Personalized learning paths"],
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      source: "./learn"
    },
    {
      title: "Trading Simulator",
      description: "Practice spot and leverage trading with virtual funds in a real market environment without any risk.",
      icon: "📊",
      highlights: ["Spot trading", "Leverage up to 100x", "Real market data", "Virtual PHP balance"],
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      source: "./trade"
    },
    {
      title: "AI News Insights",
      description: "Stay informed with crypto news enhanced by AI-generated insights and market analysis.",
      icon: "📰",
      highlights: ["Real-time news", "AI analysis", "Market sentiment", "Price impact insights"],
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      source: "./news"
    }
  ];

  const handleStartLearning = () => {
    window.location.href = "./learn";
  }

  const handleTrySimulator = () => {
    window.location.href = "./trade";
  }

  const handleGetStarted = () => {
    window.location.href = "./signup";
  }

  const handleFeatureClick = (source) => {
    window.location.href = source;
  }

  return (
    <div className="homepage-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Learn. Practice. Master.
              <br />
              <span className="brand-gradient">BiTry</span> Crypto Trading
            </h1>
            <p className="hero-subtitle">
              Your comprehensive Taglish platform for cryptocurrency education and risk-free trading practice. 
              Master the markets with AI-powered learning and realistic simulations.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={handleStartLearning}>Start Learning</button>
              <button className="btn-secondary" onClick={handleTrySimulator}>Try Simulator</button>
            </div>  
          </div>
          <div className="hero-visual">
            <div className="bitcoin-3d-container">
              <div className="bitcoin-3d" id="bitcoin-logo">
                <div 
                  className="bitcoin-coin"
                  style={{
                    transform: isDragging 
                      ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` 
                      : undefined
                  }}
                >
                  <div className="coin-face coin-front">
                    <div className="bitcoin-symbol">₿</div>
                  </div>
                  <div className="coin-face coin-back">
                    <div className="bitcoin-symbol">₿</div>
                  </div>
                  <div className="coin-edge"></div>
                </div>
              </div>
              <div className="interaction-hint">Click & Drag to Rotate</div>
            </div>
            <div className="floating-elements">
              <div className="float-icon float-1">₿</div>
              <div className="float-icon float-2">Ξ</div>
              <div className="float-icon float-3">💎</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`features-section ${animateCards ? 'animate' : ''}`}>
        <div className="section-header">
          <h2 className="section-title">Why Choose BiTry?</h2>
          <p className="section-subtitle">
            Comprehensive crypto education and trading tools designed for Filipino learners
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="feature-card"
              style={{animationDelay: `${index * 0.2}s`}}
            >
              <div className="feature-header">
                <div className="feature-icon" style={{background: feature.gradient}}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
              </div>
              <p className="feature-description">{feature.description}</p>
              <ul className="feature-highlights">
                {feature.highlights.map((highlight, idx) => (
                  <li key={idx} className="highlight-item">
                    <span className="highlight-check">✓</span>
                    {highlight}
                  </li>
                ))}
              </ul>
              <button className="feature-button" onClick={() => handleFeatureClick(feature.source)}>Explore Feature</button>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-header">
          <h2 className="section-title">How BiTry Works</h2>
          <p className="section-subtitle">Start your crypto journey in three simple steps</p>
        </div>
        
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Learn the Basics</h3>
              <p>Start with our AI-powered learning modules covering cryptocurrency fundamentals, blockchain technology, and trading principles.</p>
            </div>
          </div>
          
          <div className="step-arrow">→</div>
          
          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Practice Trading</h3>
              <p>Use our realistic trading simulator with virtual funds to practice spot and leverage trading without any financial risk.</p>
            </div>
          </div>
          
          <div className="step-arrow">→</div>
          
          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Stay Informed</h3>
              <p>Get the latest crypto news with AI-generated insights to make informed decisions and understand market movements.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Master Crypto Trading?</h2>
          <p className="cta-subtitle">
            Join BiTry today and start your journey to becoming a confident cryptocurrency trader
          </p>
          <div className="cta-buttons">
            <button className="btn-primary large" onClick={handleGetStarted}>Get Started Free</button>
          </div>
          <div className="cta-note">
            No credit card required • 100% risk-free learning
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;