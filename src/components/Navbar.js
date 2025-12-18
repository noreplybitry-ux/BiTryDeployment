import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Function to calculate age from birthday
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Check if user is admin
  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setAdminLoading(false);
        }
        return;
      }

      setAdminLoading(true);
      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Admin check error:", error);
        }

        if (isMounted) {
          const adminStatus = profileData?.is_admin === true;
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setAdminLoading(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [user]);

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
          .from("profiles")
          .select("first_name, last_name, profile_picture_url, birthday")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Profile fetch error:", error);
        }

        if (isMounted) {
          setProfile(profileData || null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
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

  // Fetch user balance when user changes
  useEffect(() => {
    let isMounted = true;

    const fetchBalance = async () => {
      if (!user) {
        setBalance(null);
        return;
      }

      setBalanceLoading(true);
      try {
        const { data: balanceData, error } = await supabase
          .from("user_balances")
          .select("balance, currency")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Balance fetch error:", error);
        }

        if (isMounted) {
          setBalance(balanceData || null);
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
        if (isMounted) {
          setBalance(null);
        }
      } finally {
        if (isMounted) {
          setBalanceLoading(false);
        }
      }
    };

    fetchBalance();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Set up real-time subscription for balance updates
  useEffect(() => {
    if (!user) return;

    const balanceSubscription = supabase
      .channel("user-balance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_balances",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setBalance({
              balance: payload.new.balance,
              currency: payload.new.currency,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(balanceSubscription);
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
      if (!event.target.closest(".modern-user-menu")) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You will be logged out of your account.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes, logout",
        cancelButtonText: "Cancel",
        background: '#1a1e24',
        color: '#ffffff',
        confirmButtonColor: '#00d4ff',
        cancelButtonColor: '#666'
      });

      if (result.isConfirmed) {
        setDropdownOpen(false);
        setMenuOpen(false);

        await signOut();
        navigate("/home", { replace: true });

        Swal.fire({
          title: "Logged out!",
          text: "You have been logged out successfully.",
          icon: "success",
          background: '#1a1e24',
          color: '#ffffff',
          confirmButtonColor: '#00d4ff'
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      Swal.fire({
        title: "Error!",
        text: "There was an error logging you out.",
        icon: "error",
        background: '#1a1e24',
        color: '#ffffff',
        confirmButtonColor: '#00d4ff'
      });
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
      return user.email.split("@")[0];
    }
    return "User";
  };

  const fixProfileUrl = (url) => {
    if (!url) return '';
    if (url.includes('/object/public/')) return url;
    return url.replace('/object/', '/object/public/');
  };

  const getProfilePicture = () => {
    if (profile?.profile_picture_url) {
      return fixProfileUrl(profile.profile_picture_url);
    }
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    const name = getDisplayName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=00d4ff&color=0a0e13&size=200&rounded=true`;
  };

  const formatBalance = (amount) => {
    if (amount == null) return "0.00";
    return parseFloat(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const age = profile?.birthday ? calculateAge(profile.birthday) : null;
  const isUnder18 = age !== null && age < 18;

  return (
    <>
      <style>{`
        /* Modern Navbar Styles */
        .modern-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: ${scrolled ? 'rgba(10, 14, 19, 0.95)' : 'rgba(10, 14, 19, 0.8)'};
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 212, 255, 0.1);
          transition: all 0.3s ease;
        }

        .modern-navbar-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 5%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modern-nav-left {
          display: flex;
          align-items: center;
          gap: 48px;
          flex: 1;
        }

        .modern-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          font-size: 24px;
          font-weight: 800;
        }

        .modern-logo-icon {
          color: #00d4ff;
          font-size: 28px;
        }

        .modern-logo-text {
          background: linear-gradient(135deg, #00d4ff, #00fff2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .modern-nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .modern-nav-links a {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 15px;
          font-weight: 500;
          transition: color 0.3s ease;
          position: relative;
        }

        .modern-nav-links a:hover {
          color: #00d4ff;
        }

        .modern-nav-links a.active {
          color: #00d4ff;
        }

        .modern-nav-links a.active::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0;
          right: 0;
          height: 2px;
          background: #00d4ff;
          border-radius: 2px;
        }

        .modern-nav-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .modern-balance-display {
          padding: 8px 16px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
        }

        .modern-auth-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modern-login-btn {
          padding: 10px 24px;
          background: transparent;
          color: #00d4ff;
          border: 1px solid #00d4ff;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-block;
        }

        .modern-login-btn:hover {
          background: rgba(0, 212, 255, 0.1);
        }

        .modern-signup-btn {
          padding: 10px 24px;
          background: #00d4ff;
          color: #0a0e13;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-block;
        }

        .modern-signup-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 212, 255, 0.4);
        }

        .modern-user-menu {
          position: relative;
        }

        .modern-user-button {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #ffffff;
          font-size: 15px;
          font-weight: 500;
        }

        .modern-user-button:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #00d4ff;
        }

        .modern-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #00d4ff;
        }

        .modern-user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modern-admin-badge {
          padding: 2px 8px;
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          color: #00ff88;
          margin-left: 6px;
        }

        .modern-dropdown-icon {
          transition: transform 0.3s ease;
        }

        .modern-dropdown-icon.open {
          transform: rotate(180deg);
        }

        .modern-user-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          min-width: 280px;
          background: rgba(26, 30, 36, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          animation: fadeInDown 0.2s ease;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modern-dropdown-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 16px;
        }

        .modern-dropdown-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #00d4ff;
        }

        .modern-dropdown-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .modern-dropdown-info {
          flex: 1;
          min-width: 0;
        }

        .modern-dropdown-name {
          display: block;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modern-dropdown-email {
          display: block;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modern-balance-section {
          padding: 12px;
          background: rgba(0, 212, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.2);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .modern-balance-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }

        .modern-balance-row .amount {
          color: #00d4ff;
          font-weight: 700;
          font-size: 16px;
        }

        .modern-dropdown-menu {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .modern-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          text-align: left;
        }

        .modern-dropdown-item:hover {
          background: rgba(0, 212, 255, 0.1);
          color: #00d4ff;
        }

        .modern-dropdown-item svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .modern-dropdown-item.logout {
          color: #ff4444;
          margin-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 16px;
        }

        .modern-dropdown-item.logout:hover {
          background: rgba(255, 68, 68, 0.1);
        }

        .modern-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
        }

        .modern-hamburger-bar {
          width: 24px;
          height: 2px;
          background: #00d4ff;
          border-radius: 2px;
          transition: all 0.3s ease;
        }

        .modern-hamburger.active .modern-hamburger-bar:nth-child(1) {
          transform: rotate(45deg) translate(6px, 6px);
        }

        .modern-hamburger.active .modern-hamburger-bar:nth-child(2) {
          opacity: 0;
        }

        .modern-hamburger.active .modern-hamburger-bar:nth-child(3) {
          transform: rotate(-45deg) translate(6px, -6px);
        }

        .modern-loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(0, 212, 255, 0.3);
          border-top-color: #00d4ff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Styles */
        @media (max-width: 968px) {
          .modern-nav-links,
          .modern-balance-display {
            display: none;
          }

          .modern-hamburger {
            display: flex;
          }

          .modern-nav-links.mobile-open {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 73px;
            left: 0;
            right: 0;
            background: rgba(10, 14, 19, 0.98);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(0, 212, 255, 0.1);
            padding: 24px 5%;
            gap: 20px;
            animation: slideDown 0.3s ease;
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .modern-nav-links.mobile-open a {
            padding: 12px 0;
            font-size: 16px;
          }

          .modern-mobile-auth {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }

          .modern-mobile-user-info {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .modern-mobile-avatar {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 3px solid #00d4ff;
            overflow: hidden;
            margin: 0 auto;
          }

          .modern-mobile-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .modern-mobile-name {
            text-align: center;
            font-size: 18px;
            font-weight: 600;
            color: #ffffff;
          }

          .modern-mobile-balance {
            padding: 12px 16px;
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid rgba(0, 212, 255, 0.3);
            border-radius: 12px;
            text-align: center;
          }

          .modern-mobile-actions {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .modern-mobile-actions a,
          .modern-mobile-actions button {
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            text-align: center;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .modern-mobile-actions a {
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid rgba(0, 212, 255, 0.3);
            color: #00d4ff;
          }

          .modern-mobile-actions button {
            background: #ff4444;
            color: #ffffff;
          }
        }

        @media (max-width: 640px) {
          .modern-navbar-content {
            padding: 12px 5%;
          }

          .modern-logo {
            font-size: 20px;
          }

          .modern-logo-icon {
            font-size: 24px;
          }
        }
      `}</style>

      <header className="modern-navbar">
        <div className="modern-navbar-content">
          <div className="modern-nav-left">
            <NavLink to="/home" className="modern-logo">
              <span className="modern-logo-icon">₿</span>
              <span className="modern-logo-text">BiTry</span>
            </NavLink>

            <ul className={`modern-nav-links ${menuOpen ? 'mobile-open' : ''}`}>
              <li>
                <NavLink to="/home" className={({ isActive }) => (isActive ? "active" : "")}>
                  Home
                </NavLink>
              </li>
              {!adminLoading && isAdmin && (
                <li>
                  <NavLink to="/AdminDashboard" className={({ isActive }) => (isActive ? "active" : "")}>
                    Admin
                  </NavLink>
                </li>
              )}
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
              <li>
                <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? "active" : "")}>
                  Leaderboard
                </NavLink>
              </li>

              {/* Mobile Auth Section */}
              {menuOpen && (
                <div className="modern-mobile-auth">
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="modern-loading-spinner"></div>
                    </div>
                  ) : user ? (
                    <div className="modern-mobile-user-info">
                      <div className="modern-mobile-avatar">
                        <img
                          src={getProfilePicture()}
                          alt={getDisplayName()}
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              getDisplayName()
                            )}&background=00d4ff&color=0a0e13&size=200&rounded=true`;
                          }}
                        />
                      </div>
                      <div className="modern-mobile-name">
                        {getDisplayName()}
                        {!adminLoading && isAdmin && (
                          <span className="modern-admin-badge">Admin</span>
                        )}
                      </div>

                      {balanceLoading ? (
                        <div className="modern-mobile-balance">
                          <div className="modern-loading-spinner" style={{ margin: '0 auto' }}></div>
                        </div>
                      ) : balance ? (
                        <div className="modern-mobile-balance">
                          <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                            Cash Balance
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: '#00d4ff' }}>
                            ${formatBalance(balance.balance)} {balance.currency || "USD"}
                          </div>
                        </div>
                      ) : null}

                      <div className="modern-mobile-actions">
                        <NavLink to="/dashboard">View Profile</NavLink>
                        {!adminLoading && isAdmin && (
                          <NavLink to="/AdminDashboard">Admin Dashboard</NavLink>
                        )}
                        <button onClick={handleLogout}>
                          {loading ? "Logging out..." : "Logout"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <NavLink to="/login" className="modern-login-btn" style={{ flex: 1, textAlign: 'center' }}>
                        Login
                      </NavLink>
                      <NavLink to="/signup" className="modern-signup-btn" style={{ flex: 1, textAlign: 'center' }}>
                        Sign Up
                      </NavLink>
                    </div>
                  )}
                </div>
              )}
            </ul>
          </div>

          <div className="modern-nav-right">
            {/* Desktop Balance Display */}
            {user && !loading && balance && !balanceLoading && (
              <div className="modern-balance-display">
                <span>💰</span>
                <span>${formatBalance(balance.balance)}</span>
              </div>
            )}

            {/* Desktop Auth Section */}
            {loading ? (
              <div className="modern-loading-spinner"></div>
            ) : user ? (
              <div className="modern-user-menu">
                <button
                  className="modern-user-button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="modern-user-avatar">
                    <img
                      src={getProfilePicture()}
                      alt={getDisplayName()}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          getDisplayName()
                        )}&background=00d4ff&color=0a0e13&size=200&rounded=true`;
                      }}
                    />
                  </div>
                  <span>
                    {getDisplayName()}
                    {!adminLoading && isAdmin && (
                      <span className="modern-admin-badge">Admin</span>
                    )}
                  </span>
                  <svg
                    className={`modern-dropdown-icon ${dropdownOpen ? 'open' : ''}`}
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
                  <div className="modern-user-dropdown">
                    <div className="modern-dropdown-header">
                      <div className="modern-dropdown-avatar">
                        <img
                          src={getProfilePicture()}
                          alt={getDisplayName()}
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              getDisplayName()
                            )}&background=00d4ff&color=0a0e13&size=200&rounded=true`;
                          }}
                        />
                      </div>
                      <div className="modern-dropdown-info">
                        <span className="modern-dropdown-name">
                          {profile?.first_name && profile?.last_name
                            ? `${profile.first_name} ${profile.last_name}`
                            : getDisplayName()}
                        </span>
                        <span className="modern-dropdown-email">{user.email}</span>
                      </div>
                    </div>

                    {balanceLoading ? (
                      <div className="modern-balance-section">
                        <div className="modern-loading-spinner" style={{ margin: '0 auto' }}></div>
                      </div>
                    ) : balance ? (
                      <div className="modern-balance-section">
                        <div className="modern-balance-row">
                          <span>Cash Balance:</span>
                          <span className="amount">
                            ${formatBalance(balance.balance)} {balance.currency || "USD"}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <div className="modern-dropdown-menu">
                      <NavLink to="/dashboard" className="modern-dropdown-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        View Profile
                      </NavLink>

                      {!adminLoading && isAdmin && (
                        <NavLink to="/AdminDashboard" className="modern-dropdown-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 2L2 7L12 12L22 7L12 2Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M2 17L12 22L22 17"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M2 12L12 17L22 12"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Admin Dashboard
                        </NavLink>
                      )}

                      <button onClick={handleLogout} className="modern-dropdown-item logout">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {loading ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="modern-auth-buttons">
                <NavLink to="/login" className="modern-login-btn">
                  Login
                </NavLink>
                <NavLink to="/signup" className="modern-signup-btn">
                  Sign Up
                </NavLink>
              </div>
            )}

            <button
              className={`modern-hamburger ${menuOpen ? 'active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className="modern-hamburger-bar" />
              <span className="modern-hamburger-bar" />
              <span className="modern-hamburger-bar" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}