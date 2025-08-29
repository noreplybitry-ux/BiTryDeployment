import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import BiTryLogoText from "../images/BiTryLogoText-removebg-preview.png";
import "../css/Navbar.css"; 

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch user profile when user changes
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, profile_picture_url')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Profile fetch error:', error);
        }

        if (isMounted) {
          setProfile(profileData || null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (isMounted) {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Close menu on resize if desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
        setDropdownOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('.user-menu')) {
        setDropdownOpen(false);
      }
    }
    
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      setDropdownOpen(false);
      await signOut();
      navigate('/home');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.user_metadata?.firstName) {
      return user.user_metadata.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getProfilePicture = () => {
    if (profile?.profile_picture_url) {
      return profile.profile_picture_url;
    }
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    // Generate default avatar based on name
    const name = getDisplayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00d4ff&color=ffffff&size=200&rounded=true`;
  };

  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="brand">
          <NavLink to="/home">
            <img src={BiTryLogoText} alt="BiTry logo" className="logo" />
          </NavLink>
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

          {/* Mobile-only auth section */}
          <div className="auth-combo mobile">
            {loading ? (
              <div className="auth-loading">
                <div className="loading-spinner-small"></div>
              </div>
            ) : user ? (
              <div className="mobile-user-info">
                <div className="mobile-user-avatar">
                  <img 
                    src={getProfilePicture()} 
                    alt={getDisplayName()}
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName())}&background=00d4ff&color=ffffff&size=200&rounded=true`;
                    }}
                  />
                </div>
                <span className="mobile-user-name">Hi, {getDisplayName()}!</span>
                <div className="mobile-user-actions">
                  <NavLink to="/profile" className="profile-link">Profile</NavLink>
                  <button onClick={handleLogout} className="logout-btn" disabled={loading}>
                    {loading ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <NavLink to="/login" className="login-btn">Login</NavLink>
                <NavLink to="/signup" className="signup-btn">Sign Up</NavLink>
              </>
            )}
          </div>
        </nav>
      </div>

      <div className="nav-right">
        {/* Desktop-only auth section */}
        <div className="auth-combo desktop">
          {loading ? (
            <div className="auth-loading">
              <div className="loading-spinner-small"></div>
            </div>
          ) : user ? (
            <div className="user-menu">
              <button 
                className="user-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                disabled={loading}
              >
                <div className="user-avatar">
                  <img 
                    src={getProfilePicture()} 
                    alt={getDisplayName()}
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName())}&background=00d4ff&color=ffffff&size=200&rounded=true`;
                    }}
                  />
                </div>
                <span className="user-name">Hi, {getDisplayName()}!</span>
                <svg 
                  className={`dropdown-icon ${dropdownOpen ? 'open' : ''}`}
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none"
                >
                  <path 
                    d="M6 9L12 15L18 9" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      <img 
                        src={getProfilePicture()} 
                        alt={getDisplayName()}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName())}&background=00d4ff&color=ffffff&size=200&rounded=true`;
                        }}
                      />
                    </div>
                    <div className="dropdown-info">
                      <span className="dropdown-name">
                        {profile?.first_name && profile?.last_name 
                          ? `${profile.first_name} ${profile.last_name}`
                          : getDisplayName()
                        }
                      </span>
                      <span className="dropdown-email">{user.email}</span>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <div className="dropdown-menu">
                    <NavLink to="/dashboard" className="dropdown-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      View Profile
                    </NavLink>
                  
                    
                    <button 
                      onClick={handleLogout} 
                      className="dropdown-item logout"
                      disabled={loading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {loading ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink to="/login" className="login-btn">Login</NavLink>
              <NavLink to="/signup" className="signup-btn">Sign Up</NavLink>
            </>
          )}
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
};