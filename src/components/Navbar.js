import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import BiTryLogoText from "../images/BiTryLogoText-removebg-preview.png";
import "../css/Navbar.css"; 

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // close menu on resize if desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setMenuOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="brand">
          <NavLink to="/home"><img src={BiTryLogoText} alt="BiTry logo" className="logo" /></NavLink>
        </div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <ul>
            <li>
              <NavLink to="/dashboard" end className={({ isActive }) => (isActive ? "active" : "")}>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/learn" className={({ isActive }) => (isActive ? "active" : "")}>
                Learn
              </NavLink>
            </li>
            <li>
              <NavLink to="/trade" className={({ isActive }) => (isActive ? "active" : "")}>
                Trade
              </NavLink>
            </li>
            <li>
              <NavLink to="/news" className={({ isActive }) => (isActive ? "active" : "")}>
                News
              </NavLink>
            </li>
          </ul>

          {/* Mobile-only auth combo (hidden on desktop by CSS) */}
          <div className="auth-combo mobile">
            <NavLink to="/login" className="login-btn">Login</NavLink>
            <NavLink to="/signup" className="signup-btn">Sign Up</NavLink>
          </div>
        </nav>
      </div>

      <div className="nav-right">
        {/* Desktop-only auth combo (hidden on mobile by CSS) */}
        <div className="auth-combo desktop">
          <NavLink to="/login" className="login-btn">Login</NavLink>
          <NavLink to="/signup" className="signup-btn">Sign Up</NavLink>
        </div>

        <button
          className={`hamburger ${menuOpen ? "is-active" : ""}`}
          aria-label="Toggle menu"
          onClick={() => setMenuOpen(prev => !prev)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>
    </header>
  );
}
