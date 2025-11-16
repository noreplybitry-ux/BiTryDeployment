import React, { useState, useEffect, useRef } from "react";

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
      <style>{`
        /* Global Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .bitry-homepage {
          background: #0b0e11;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        /* Particle Canvas */
        .particle-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          opacity: 0.15;
          pointer-events: none;
        }

        /* Hero Section */
        .hero-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 120px 5% 80px;
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

        .hero-heading {
          font-size: 64px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -2px;
        }

        .gradient-text {
          background: linear-gradient(135deg, #00d4ff 0%, #00fff2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
        }

        .hero-description {
          font-size: 18px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 40px;
          max-width: 540px;
        }

        .hero-actions {
          display: flex;
          gap: 20px;
          margin-bottom: 60px;
        }

        .btn-primary-glow {
          position: relative;
          padding: 16px 40px;
          font-size: 16px;
          font-weight: 600;
          color: #0b0e11;
          background: #00d4ff;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .btn-primary-glow span {
          position: relative;
          z-index: 2;
        }

        .btn-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 70%);
          opacity: 0;
          animation: glowRotate 10s linear infinite;
          pointer-events: none;
        }

        .btn-primary-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(0, 212, 255, 0.4);
        }

        .btn-primary-glow:hover .btn-glow {
          opacity: 1;
        }

        .btn-primary-glow.large {
          padding: 20px 50px;
          font-size: 18px;
        }

        .btn-outline {
          padding: 16px 40px;
          font-size: 16px;
          font-weight: 600;
          color: #00d4ff;
          background: transparent;
          border: 2px solid #00d4ff;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-outline::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: rgba(0, 212, 255, 0.1);
          transition: left 0.3s ease;
        }

        .btn-outline:hover::before {
          left: 0;
        }

        .btn-outline:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 212, 255, 0.2);
        }

        .hero-stats {
          display: flex;
          gap: 40px;
          align-items: center;
        }

        .stat-item {
          text-align: left;
        }

        .stat-value {
          font-size: 32px;
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

        /* Holographic Globe */
        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
          animation: fadeIn 1.5s ease-out;
        }

        .holographic-globe {
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

        .ring-1 {
          width: 120px;
          height: 120px;
          animation: ringRotate 10s linear infinite;
        }

        .ring-2 {
          width: 160px;
          height: 160px;
          animation: ringRotate 15s linear infinite reverse;
        }

        .ring-3 {
          width: 200px;
          height: 200px;
          animation: ringRotate 20s linear infinite;
        }

        .crypto-marker {
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
          background-image: 
            linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          border-radius: 50%;
          opacity: 0.2;
          animation: gridRotate 30s linear infinite;
        }

        .energy-waves {
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

        .wave-1 {
          animation: waveExpand 3s ease-out infinite;
        }

        .wave-2 {
          animation: waveExpand 3s ease-out infinite 1s;
        }

        .wave-3 {
          animation: waveExpand 3s ease-out infinite 2s;
        }

        /* Features Section */
        .features-section {
          padding: 120px 5%;
          position: relative;
          z-index: 1;
        }

        .section-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .label-line {
          width: 60px;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #00d4ff 50%, transparent 100%);
        }

        .section-heading {
          text-align: center;
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 80px;
          letter-spacing: -1px;
        }

        .features-grid-modern {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .feature-card-modern {
          position: relative;
          padding: 40px 30px;
          background: rgba(22, 26, 30, 0.6);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          cursor: pointer;
          transition: all 0.4s ease;
          overflow: hidden;
        }

        .card-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        .feature-card-modern:hover .card-glow {
          opacity: 0.15;
        }

        .feature-card-modern:hover {
          transform: translateY(-10px);
          border-color: #00d4ff;
          box-shadow: 0 20px 60px rgba(0, 212, 255, 0.2);
        }

        .card-content {
          position: relative;
          z-index: 2;
        }

        .card-icon {
          font-size: 48px;
          margin-bottom: 20px;
          display: inline-block;
          animation: iconFloat 3s ease-in-out infinite;
        }

        .card-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #ffffff;
        }

        .card-description {
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 20px;
        }

        .card-stats {
          display: inline-block;
          padding: 6px 16px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          color: #00d4ff;
        }

        .card-arrow {
          position: absolute;
          bottom: 30px;
          right: 30px;
          font-size: 24px;
          color: #00d4ff;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
        }

        .feature-card-modern:hover .card-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* Technology Section */
        .tech-section {
          padding: 120px 5%;
          position: relative;
          z-index: 1;
          background: linear-gradient(180deg, transparent 0%, rgba(0, 212, 255, 0.02) 100%);
        }

        .tech-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          align-items: center;
        }

        .tech-visual {
          display: flex;
          justify-content: center;
          position: relative;
          z-index: 1;
        }

        .tech-hexagon {
          position: relative;
          width: 300px;
          height: 300px;
          animation: float 8s ease-in-out infinite;
        }

        .hex-layer {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(0deg);
          width: 200px;
          height: 200px;
          border: 2px solid #00d4ff;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          opacity: 0.3;
        }

        .layer-1 {
          animation: hexRotate 15s linear infinite;
        }

        .layer-2 {
          width: 160px;
          height: 160px;
          animation: hexRotate 20s linear infinite reverse;
        }

        .layer-3 {
          width: 120px;
          height: 120px;
          animation: hexRotate 25s linear infinite;
        }

        .hex-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, #00d4ff 0%, transparent 70%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: corePulse 3s ease-in-out infinite;
        }

        .center-icon {
          font-size: 40px;
          color: #00d4ff;
          text-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
        }

        .tech-content {
          text-align: left;
        }

        .tech-features {
          display: flex;
          flex-direction: column;
          gap: 30px;
          margin-top: 40px;
        }

        .tech-item {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          padding: 24px;
          background: rgba(22, 26, 30, 0.4);
          border: 1px solid rgba(0, 212, 255, 0.1);
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .tech-item:hover {
          border-color: #00d4ff;
          background: rgba(22, 26, 30, 0.6);
          transform: translateX(10px);
        }

        .tech-number {
          font-size: 32px;
          font-weight: 800;
          color: #00d4ff;
          opacity: 0.3;
          min-width: 50px;
        }

        .tech-info h4 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #ffffff;
        }

        .tech-info p {
          font-size: 15px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.6);
        }

        /* CTA Section */
        .cta-section-modern {
          padding: 120px 5%;
          position: relative;
          z-index: 1;
        }

        .cta-container {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
          padding: 80px 60px;
          background: rgba(22, 26, 30, 0.6);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 30px;
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }

        .cta-glow-effect {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%);
          animation: glowRotate 15s linear infinite;
          pointer-events: none;
        }

        .cta-heading {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 20px;
          letter-spacing: -1px;
          position: relative;
          z-index: 2;
        }

        .cta-text {
          font-size: 18px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 40px;
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

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes corePulse {
          0%, 100% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
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
          0% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(3);
          }
        }

        @keyframes gridRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes waveExpand {
          0% {
            width: 100px;
            height: 100px;
            opacity: 0.6;
          }
          100% {
            width: 400px;
            height: 400px;
            opacity: 0;
          }
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes hexRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes glowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .hero-grid {
            gap: 60px;
          }
          
          .hero-heading {
            font-size: 52px;
          }
          
          .holographic-globe {
            width: 350px;
            height: 350px;
          }
          
          .features-grid-modern {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 968px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 60px;
          }
          
          .hero-heading {
            font-size: 48px;
          }
          
          .hero-visual {
            order: -1;
          }
          
          .holographic-globe {
            width: 300px;
            height: 300px;
          }
          
          .tech-grid {
            grid-template-columns: 1fr;
            gap: 60px;
          }
          
          .section-heading {
            font-size: 40px;
          }

          .features-grid-modern {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .hero-container {
            padding: 100px 6% 60px;
          }
          
          .hero-heading {
            font-size: 40px;
            margin-bottom: 20px;
          }
          
          .hero-description {
            font-size: 16px;
            line-height: 1.7;
            max-width: 100%;
          }
          
          .hero-actions {
            flex-direction: column;
            gap: 15px;
            width: 100%;
          }
          
          .btn-primary-glow,
          .btn-outline {
            width: 100%;
            padding: 14px 20px;
            text-align: center;
          }
          
          .hero-stats {
            flex-wrap: wrap;
            gap: 30px 20px;
          }
          
          .stat-divider {
            display: none;
          }
          
          .stat-value {
            font-size: 28px;
          }

          .stat-label {
            font-size: 13px;
          }
          
          .features-grid-modern {
            gap: 30px;
          }
          
          .feature-card-modern {
            padding: 36px 24px;
          }

          .card-icon {
            font-size: 56px;
            margin-bottom: 20px;
          }

          .card-title {
            font-size: 22px;
            margin-bottom: 12px;
          }

          .card-description {
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 16px;
          }

          .card-stats {
            font-size: 13px;
          }

          .card-arrow {
            display: none;
          }
          
          .section-heading {
            font-size: 32px;
            margin-bottom: 50px;
          }
          
          .cta-container {
            padding: 50px 30px;
          }
          
          .cta-heading {
            font-size: 32px;
          }

          .cta-text {
            font-size: 16px;
          }
          
          .holographic-globe {
            width: 250px;
            height: 250px;
          }

          .features-section,
          .tech-section,
          .cta-section-modern {
            padding: 80px 6%;
          }

          .tech-visual {
            order: -1;
            margin-bottom: 20px;
          }

          .tech-content .section-heading {
            text-align: center;
          }

          .tech-features {
            gap: 20px;
          }

          .tech-item {
            padding: 20px;
          }

          .tech-number {
            font-size: 28px;
            min-width: 40px;
          }

          .tech-info h4 {
            font-size: 18px;
            margin-bottom: 6px;
          }

          .tech-info p {
            font-size: 14px;
          }

          .tech-hexagon {
            width: 220px;
            height: 220px;
          }

          /* Hide hex layers on mobile */
          .hex-layer {
            display: none;
          }

          .hex-center {
            width: 100px;
            height: 100px;
          }

          .center-icon {
            font-size: 50px;
          }
        }

        @media (max-width: 480px) {
          .hero-container {
            padding: 80px 5% 50px;
          }

          .hero-heading {
            font-size: 32px;
            letter-spacing: -1px;
          }
          
          .hero-description {
            font-size: 15px;
            line-height: 1.6;
          }

          .btn-primary-glow,
          .btn-outline {
            padding: 12px 20px;
            font-size: 15px;
          }

          .btn-primary-glow.large {
            padding: 16px 30px;
            font-size: 16px;
          }

          .hero-stats {
            gap: 24px 16px;
          }

          .stat-value {
            font-size: 24px;
          }

          .stat-label {
            font-size: 12px;
          }
          
          .section-heading {
            font-size: 28px;
            margin-bottom: 40px;
          }

          .section-label {
            font-size: 12px;
            gap: 12px;
          }

          .label-line {
            width: 40px;
          }
          
          .cta-heading {
            font-size: 28px;
            margin-bottom: 16px;
          }

          .cta-text {
            font-size: 15px;
            margin-bottom: 30px;
          }

          .cta-note {
            font-size: 13px;
          }
          
          .card-title {
            font-size: 20px;
          }

          .card-description {
            font-size: 14px;
          }

          .card-icon {
            font-size: 48px;
          }

          .features-grid-modern {
            gap: 24px;
          }

          .feature-card-modern {
            padding: 30px 20px;
            border-radius: 16px;
          }

          .tech-hexagon {
            width: 180px;
            height: 180px;
          }

          .hex-center {
            width: 80px;
            height: 80px;
          }

          .center-icon {
            font-size: 40px;
          }

          .cta-container {
            padding: 40px 24px;
            border-radius: 20px;
          }

          .tech-item {
            padding: 16px;
            gap: 16px;
          }

          .tech-number {
            font-size: 24px;
            min-width: 35px;
          }

          .tech-info h4 {
            font-size: 16px;
          }

          .tech-info p {
            font-size: 13px;
            line-height: 1.5;
          }

          .holographic-globe {
            width: 200px;
            height: 200px;
          }

          .features-section,
          .tech-section,
          .cta-section-modern {
            padding: 60px 5%;
          }
        }
      `}</style>
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