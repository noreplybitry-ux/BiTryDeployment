import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import PieStat from "../components/DashboardPieStat";
import "../css/Dashboard.css";
import {
  IoBarChart,
  IoWalletOutline,
  IoTrendingUp,
  IoTrendingDown,
  IoRefresh,
  IoLogOut,
  IoEye,
  IoEyeOff,
  IoClose,
  IoCheckmark
} from "react-icons/io5";
import {
  FaUser,
  FaUserCircle,
  FaEdit,
  FaChartLine,
  FaExchangeAlt,
  FaHistory,
  FaCamera,
  FaLock,
  FaSpinner
} from "react-icons/fa";

// Mock data with more realistic crypto trading data
const portfolioData = {
  totalBalance: 15847.23,
  totalBalanceBTC: 0.142857,
  availableBalance: 12340.50,
  unrealizedPnL: 1247.73,
  totalPnL: 3507.00,
  todayPnL: 247.50,
  dayChange: 1.85
};

const ongoingTradesData = [
  {
    id: 1,
    symbol: "BTCUSDT",
    coin: "Bitcoin",
    position: "Long",
    size: "0.025",
    entryPrice: "67,450.00",
    markPrice: "68,200.00",
    margin: "1,686.25",
    pnl: 18.75,
    pnlPercent: 1.11,
    leverage: "10x",
    timestamp: "2025-01-20 14:30"
  },
  {
    id: 2,
    symbol: "ETHUSDT",
    coin: "Ethereum",
    position: "Short",
    size: "0.5",
    entryPrice: "3,420.00",
    markPrice: "3,380.00",
    margin: "342.00",
    pnl: 20.0,
    pnlPercent: 5.85,
    leverage: "5x",
    timestamp: "2025-01-20 12:15"
  },
  {
    id: 3,
    symbol: "ADAUSDT",
    coin: "Cardano",
    position: "Long",
    size: "1000",
    entryPrice: "0.4250",
    markPrice: "0.4180",
    margin: "85.00",
    pnl: -7.0,
    pnlPercent: -8.24,
    leverage: "2x",
    timestamp: "2025-01-19 16:45"
  }
];

const recentTradesData = [
  {
    id: 1,
    symbol: "BTCUSDT",
    coin: "Bitcoin",
    side: "Long",
    size: "0.05",
    entryPrice: "65,200.00",
    exitPrice: "66,800.00",
    pnl: 80.0,
    pnlPercent: 12.31,
    fees: 2.67,
    closeTime: "2025-01-20 10:30"
  },
  {
    id: 2,
    symbol: "ETHUSDT",
    coin: "Ethereum",
    side: "Short",
    size: "1.2",
    entryPrice: "3,550.00",
    exitPrice: "3,480.00",
    pnl: 84.0,
    pnlPercent: 19.72,
    fees: 4.26,
    closeTime: "2025-01-19 18:15"
  },
  {
    id: 3,
    symbol: "BNBUSDT",
    coin: "BNB",
    side: "Long",
    size: "5",
    entryPrice: "635.00",
    exitPrice: "618.50",
    pnl: -82.5,
    pnlPercent: -2.59,
    fees: 3.18,
    closeTime: "2025-01-19 14:22"
  },
  {
    id: 4,
    symbol: "SOLUSDT",
    coin: "Solana",
    side: "Long",
    size: "15",
    entryPrice: "248.00",
    exitPrice: "267.50",
    pnl: 292.5,
    pnlPercent: 7.86,
    fees: 7.43,
    closeTime: "2025-01-18 21:00"
  }
];

// Fallback icon mapping (used if fetch to CoinGecko fails or no match)
const fallbackIconMap = {
  btc: { icon: "₿", color: "#F7931A" },
  eth: { icon: "Ξ", color: "#627EEA" },
  bnb: { icon: "B", color: "#F3BA2F" },
  ada: { icon: "₳", color: "#0033AD" },
  sol: { icon: "◎", color: "#9945FF" },
  xrp: { icon: "X", color: "#23292F" },
  dot: { icon: "●", color: "#E6007A" },
  avax: { icon: "▲", color: "#E84142" },
  matic: { icon: "◆", color: "#8247E5" }
};

/**
 * CryptoLogo
 * - Attempts to fetch a matching crypto logo from CoinGecko (public API).
 * - If not found or on error, falls back to a stylized circular glyph using fallbackIconMap.
 *
 * Props:
 * - symbol (e.g. 'BTCUSDT' or 'btc')
 * - size (number px)
 */
const CryptoLogo = ({ symbol, size = 36 }) => {
  const baseSymbol = symbol.replace(/usdt$/i, "").replace(/ticker:/i, "").toLowerCase();
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrored(false);
    setImgUrl(null);

    // Use CoinGecko search endpoint which returns thumb & large URLs for matches
    // e.g. https://api.coingecko.com/api/v3/search?query=btc
    const query = encodeURIComponent(baseSymbol);
    const url = `https://api.coingecko.com/api/v3/search?query=${query}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json();
      })
      .then((json) => {
        if (!mounted) return;
        // prefer exact symbol match (symbol field), otherwise pick first coin whose id or name contains the query
        const coins = json.coins || [];
        let match = coins.find((c) => c.symbol?.toLowerCase() === baseSymbol);
        if (!match) {
          match = coins.find(
            (c) =>
              c.id?.toLowerCase() === baseSymbol ||
              c.name?.toLowerCase() === baseSymbol ||
              c.id?.toLowerCase().includes(baseSymbol)
          );
        }
        if (match && (match.large || match.thumb)) {
          // use large if available, else thumb
          setImgUrl(match.large || match.thumb);
        } else {
          // no suitable match found
          setImgUrl(null);
          setErrored(true);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setImgUrl(null);
        setErrored(true);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [baseSymbol]);

  // If we have an image URL, render it (with onError fallback)
  if (imgUrl && !errored) {
    return (
      <img
        src={imgUrl}
        alt={`${baseSymbol.toUpperCase()} logo`}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", display: "inline-block" }}
        onError={() => setErrored(true)}
      />
    );
  }

  // Fallback: stylized circle with glyph or generic dot
  const fallback = fallbackIconMap[baseSymbol] || { icon: "◯", color: "#6B7280" };
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: fallback.color,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(12, Math.floor(size * 0.5)),
        fontWeight: "700",
        textTransform: "uppercase",
        userSelect: "none"
      }}
      aria-hidden="true"
    >
      {fallback.icon}
    </div>
  );
};

// Modal component for editing profile information
const EditModal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <IoClose />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [timeFilter, setTimeFilter] = useState("7d");
  
  // Profile state
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    profile_picture_url: null,
    birthday: null
  });
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [editNameModal, setEditNameModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  
  // Form states
  const [nameForm, setNameForm] = useState({ first_name: '', last_name: '' });
  const [passwordForm, setPasswordForm] = useState({ 
    current_password: '', 
    new_password: '', 
    confirm_password: '' 
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [messages, setMessages] = useState({ success: '', error: '' });
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', isValid: false });
  
  const fileInputRef = useRef(null);

  // Calculate stats
  const totalTrades = recentTradesData.length + ongoingTradesData.length;
  const winningTrades = recentTradesData.filter((trade) => trade.pnl > 0).length;
  const losingTrades = recentTradesData.filter((trade) => trade.pnl < 0).length;
  const winRate =
    totalTrades > 0 ? ((winningTrades / recentTradesData.length) * 100).toFixed(1) : 0;

  const totalRealizedPnL = recentTradesData.reduce((sum, trade) => sum + trade.pnl, 0);
  const totalUnrealizedPnL = ongoingTradesData.reduce((sum, trade) => sum + trade.pnl, 0);

  const avgReturn =
    recentTradesData.length > 0 ? (totalRealizedPnL / recentTradesData.length).toFixed(2) : 0;

  const totalPositionsData = [{ name: "Wins", value: winningTrades }, { name: "Losses", value: losingTrades }];

  const winRateData = [{ name: "Wins", value: parseFloat(winRate) }, { name: "Losses", value: 100 - parseFloat(winRate) }];

  // Fetch user profile on component mount
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Password validation function
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);
    
    const validations = {
      minLength,
      hasLower,
      hasUpper,
      hasDigit,
      hasSpecial
    };
    
    const validCount = Object.values(validations).filter(Boolean).length;
    const isValid = validCount === 5;
    
    let strength = 'Weak';
    let score = 0;
    
    if (validCount >= 3) {
      strength = 'Medium';
      score = 1;
    }
    
    if (isValid && password.length >= 12) {
      strength = 'Strong';
      score = 2;
    } else if (isValid) {
      strength = 'Medium';
      score = 1;
    }
    
    return {
      isValid,
      score,
      text: strength,
      validations,
      requirements: {
        minLength: 'At least 8 characters',
        hasLower: 'At least one lowercase letter',
        hasUpper: 'At least one uppercase letter',
        hasDigit: 'At least one number',
        hasSpecial: 'At least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)'
      }
    };
  };

  // Update password strength when password changes
  useEffect(() => {
    if (passwordForm.new_password) {
      const strength = validatePassword(passwordForm.new_password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, text: '', isValid: false });
    }
  }, [passwordForm.new_password]);

  // Check if user is from Google OAuth
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First try to get existing profile
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no record exists

      if (error) {
        console.error('Error fetching profile:', error);
        // If there's an error, try to create a new profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id,
            first_name: user.user_metadata?.firstName || '',
            last_name: user.user_metadata?.lastName || '',
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }
        data = newProfile;
      }

      if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id,
            first_name: user.user_metadata?.firstName || '',
            last_name: user.user_metadata?.lastName || '',
          }])
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }
        data = newProfile;
      }

      setProfile(data);
      setNameForm({ 
        first_name: data.first_name || '', 
        last_name: data.last_name || '' 
      });
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setMessages({ ...messages, error: 'Failed to fetch profile data' });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'No user found' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, ...updates },
          { 
            onConflict: 'id',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single();

      if (error) {
        console.error('Update profile error:', error);
        throw error;
      }

      setProfile(data);
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updateProfile({
        first_name: nameForm.first_name.trim(),
        last_name: nameForm.last_name.trim()
      });

      if (result.success) {
        setMessages({ success: 'Name updated successfully!', error: '' });
        // Close modal after 1 second
        setTimeout(() => {
          setEditNameModal(false);
        }, 1000);
      } else {
        setMessages({ error: result.error, success: '' });
        // Close modal after 3 seconds even on error
        setTimeout(() => {
          setEditNameModal(false);
        }, 3000);
      }
    } catch (error) {
      setMessages({ error: 'Failed to update name', success: '' });
      setTimeout(() => {
        setEditNameModal(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessages({ error: 'Please select an image file', success: '' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessages({ error: 'Image must be less than 5MB', success: '' });
      return;
    }

    setUploadingImage(true);
    
    try {
      // Delete old profile picture if it exists
      if (profile.profile_picture_url) {
        const oldFileName = profile.profile_picture_url.split('/').pop();
        await supabase.storage
          .from('profile-pictures')
          .remove([`${user.id}/${oldFileName}`]);
      }

      // Upload new profile picture
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update profile with new picture URL
      const result = await updateProfile({
        profile_picture_url: urlData.publicUrl
      });

      if (result.success) {
        setMessages({ success: 'Profile picture updated successfully!', error: '' });
      } else {
        setMessages({ error: result.error, success: '' });
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setMessages({ error: 'Failed to upload profile picture', success: '' });
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!passwordStrength.isValid) {
      setMessages({ error: 'Password does not meet security requirements', success: '' });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessages({ error: 'New passwords do not match', success: '' });
      return;
    }

    setLoading(true);
    
    try {
      // For Google users, they might not have a current password, so we skip verification
      if (!isGoogleUser) {
        // Verify current password by attempting to sign in
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: passwordForm.current_password
        });

        if (verifyError) {
          setMessages({ error: 'Current password is incorrect', success: '' });
          setLoading(false);
          return;
        }
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.new_password
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }

      setMessages({ success: 'Password changed successfully!', error: '' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      
      // Close modal after 1 second
      setTimeout(() => {
        setChangePasswordModal(false);
      }, 1000);
    } catch (error) {
      console.error('Error changing password:', error);
      setMessages({ error: 'Failed to change password', success: '' });
      // Close modal after 3 seconds even on error
      setTimeout(() => {
        setChangePasswordModal(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (messages.success || messages.error) {
      const timer = setTimeout(() => {
        setMessages({ success: '', error: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const formatCurrency = (amount) => {
    return balanceVisible
      ? `₱${Math.abs(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "••••••";
  };

  const formatPnL = (pnl, showSign = true) => {
    const sign = pnl >= 0 ? "+" : "";
    return `${showSign ? sign : ""}₱${Math.abs(pnl).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (percent, showSign = true) => {
    const sign = percent >= 0 ? "+" : "";
    return `${showSign ? sign : ""}${percent.toFixed(2)}%`;
  };

  const getDisplayName = () => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  };

  return (
    <div className="dashboard">
      {/* Messages */}
      {(messages.success || messages.error) && (
        <div className={`message-banner ${messages.error ? 'error' : 'success'}`}>
          {messages.success || messages.error}
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar" aria-label="Sidebar">
        <nav className="sidebar-nav">
          <div
            className={`sidebar-item ${activeTab === "overview" ? "active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("overview")}
          >
            <IoBarChart className="sidebar-icon" />
            <span className="sidebar-label">Overview</span>
          </div>

          <div
            className={`sidebar-item ${activeTab === "history" ? "active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("history")}
          >
            <FaHistory className="sidebar-icon" />
            <span className="sidebar-label">History</span>
          </div>

          <div
            className={`sidebar-item ${activeTab === "profile" ? "active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("profile")}
          >
            <FaUser className="sidebar-icon" />
            <span className="sidebar-label">Profile</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-item" onClick={handleSignOut}>
            <IoLogOut className="sidebar-icon" />
            <span className="sidebar-label">Logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" role="main">
        {activeTab === "overview" && (
          <>
            {/* Portfolio Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card balance-card">
                <div className="card-header">
                  <div className="card-title">
                    <IoWalletOutline />
                    <span>Total Balance</span>
                  </div>
                  <button className="visibility-toggle" onClick={() => setBalanceVisible(!balanceVisible)}>
                    {balanceVisible ? <IoEye /> : <IoEyeOff />}
                  </button>
                </div>
                <div className="balance-display">
                  <div className="primary-balance">{formatCurrency(portfolioData.totalBalance)}</div>
                  <div className="secondary-balance">{balanceVisible ? `≈ ${portfolioData.totalBalanceBTC} BTC` : "••••••"}</div>
                  <div className={`balance-change ${portfolioData.dayChange >= 0 ? "positive" : "negative"}`}>
                    {portfolioData.dayChange >= 0 ? <IoTrendingUp /> : <IoTrendingDown />}
                    {formatPercent(portfolioData.dayChange)} (24h)
                  </div>
                </div>
              </div>

              <div className="summary-card pnl-card">
                <div className="card-header">
                  <div className="card-title">
                    <FaChartLine />
                    <span>Total P&L</span>
                  </div>
                </div>
                <div className="pnl-display">
                  <div className={`pnl-total ${portfolioData.totalPnL >= 0 ? "positive" : "negative"}`}>{formatPnL(portfolioData.totalPnL)}</div>
                  <div className="pnl-breakdown">
                    <div className="pnl-item">
                      <span>Realized:</span>
                      <span className={totalRealizedPnL >= 0 ? "positive" : "negative"}>{formatPnL(totalRealizedPnL)}</span>
                    </div>
                    <div className="pnl-item">
                      <span>Unrealized:</span>
                      <span className={totalUnrealizedPnL >= 0 ? "positive" : "negative"}>{formatPnL(totalUnrealizedPnL)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="summary-card stats-card">
                <div className="card-header">
                  <div className="card-title">
                    <IoBarChart />
                    <span>Trading Stats</span>
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{winRate}%</div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{recentTradesData.length}</div>
                    <div className="stat-label">Total Trades</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">₱{avgReturn}</div>
                    <div className="stat-label">Avg Return</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{ongoingTradesData.length}</div>
                    <div className="stat-label">Open Positions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Positions */}
            <section className="page-card positions-section">
              <div className="section-header">
                <h3>Active Positions</h3>
                <div className="section-actions">
                  <button className="action-btn secondary">
                    <IoRefresh />
                    Refresh
                  </button>
                </div>
              </div>

              {ongoingTradesData.length > 0 ? (
                <div className="table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>Side</th>
                        <th>Size</th>
                        <th>Entry Price</th>
                        <th>Mark Price</th>
                        <th>Margin</th>
                        <th>PnL</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ongoingTradesData.map((trade) => (
                        <tr key={trade.id} className="trade-row">
                          <td>
                            <div className="market-cell">
                              <CryptoLogo symbol={trade.symbol} size={36} />
                              <div className="market-info">
                                <div className="symbol">{trade.symbol}</div>
                                <div className="leverage-badge">{trade.leverage}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`position-badge ${trade.position.toLowerCase()}`}>{trade.position}</span>
                          </td>
                          <td className="numeric">{trade.size}</td>
                          <td className="numeric">${trade.entryPrice}</td>
                          <td className="numeric">${trade.markPrice}</td>
                          <td className="numeric">₱{trade.margin}</td>
                          <td className="pnl-cell">
                            <div className={`pnl-value ${trade.pnl >= 0 ? "positive" : "negative"}`}>{formatPnL(trade.pnl)}</div>
                            <div className={`pnl-percent ${trade.pnl >= 0 ? "positive" : "negative"}`}>{formatPercent(trade.pnlPercent)}</div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-sm btn-danger">Close</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <FaExchangeAlt className="empty-icon" />
                  <div className="empty-title">No Active Positions</div>
                  <div className="empty-subtitle">Open your first position to start trading</div>
                </div>
              )}
            </section>

            {/* Performance Analytics */}
            <section className="page-card analytics-section">
              <div className="section-header">
                <h3>Performance Analytics</h3>
                <div className="time-filters">
                  {["1d", "7d", "30d", "90d"].map((period) => (
                    <button key={period} className={`filter-btn ${timeFilter === period ? "active" : ""}`} onClick={() => setTimeFilter(period)}>
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              <div className="analytics-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h4>Win/Loss Distribution</h4>
                  </div>
                  <div className="chart-content">
                    <PieStat data={totalPositionsData} colors={["#10b981", "#ef4444"]} size={120} centerLabel={`${totalTrades}`} subLabel="Total Trades" />
                    <div className="chart-legend">
                      <div className="legend-item">
                        <div className="legend-color wins"></div>
                        <span>Wins: {winningTrades}</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color losses"></div>
                        <span>Losses: {losingTrades}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h4>Win Rate</h4>
                  </div>
                  <div className="chart-content">
                    <PieStat data={winRateData} colors={["#10b981", "#ef4444"]} size={120} centerLabel={`${winRate}%`} subLabel="Success Rate" />
                    <div className="performance-metrics">
                      <div className="metric">
                        <span className="metric-label">Best Trade:</span>
                        <span className="metric-value positive">+₱292.50</span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Worst Trade:</span>
                        <span className="metric-value negative">-₱82.50</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "history" && (
          <section className="page-card">
            <div className="section-header">
              <h3>Trading History</h3>
              <div className="section-actions">
                <select className="filter-select">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                </select>
              </div>
            </div>

            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Side</th>
                    <th>Size</th>
                    <th>Entry Price</th>
                    <th>Exit Price</th>
                    <th>PnL</th>
                    <th>Close Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTradesData.map((trade) => (
                    <tr key={trade.id} className="trade-row">
                      <td>
                        <div className="market-cell">
                          <CryptoLogo symbol={trade.symbol} size={28} />
                          <div className="market-info">
                            <div className="symbol">{trade.symbol}</div>
                            <div className="coin-name">{trade.coin}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`position-badge ${trade.side.toLowerCase()}`}>{trade.side}</span>
                      </td>
                      <td className="numeric">{trade.size}</td>
                      <td className="numeric">${trade.entryPrice}</td>
                      <td className="numeric">${trade.exitPrice}</td>
                      <td className="pnl-cell">
                        <div className={`pnl-value ${trade.pnl >= 0 ? "positive" : "negative"}`}>{formatPnL(trade.pnl)}</div>
                        <div className={`pnl-percent ${trade.pnl >= 0 ? "positive" : "negative"}`}>{formatPercent(trade.pnlPercent)}</div>
                      </td>
                      <td className="timestamp">{trade.closeTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="page-card profile-section">
            <div className="profile-header">
              <div className="profile-avatar">
                {profile.profile_picture_url ? (
                  <img 
                    src={profile.profile_picture_url} 
                    alt="Profile" 
                    className="profile-image"
                  />
                ) : (
                  <FaUserCircle />
                )}
                <button 
                  className="avatar-edit" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? <FaSpinner className="spinning" /> : <FaCamera />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleProfilePictureUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
              <div className="profile-info">
                <h2>{getDisplayName()}</h2>
                <p className="profile-email">{user?.email}</p>
              </div>
            </div>

            <div className="profile-grid">
              <div className="profile-card">
                <h4>Profile Settings</h4>
                <div className="setting-items">
                  <div className="setting-item">
                    <div className="setting-info">
                      <FaEdit className="setting-icon" />
                      <div>
                        <span>Change Name</span>
                        <small>Update your display name</small>
                      </div>
                    </div>
                    <button className="setting-btn" onClick={() => setEditNameModal(true)}>
                      Edit
                    </button>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <FaCamera className="setting-icon" />
                      <div>
                        <span>Change Profile Picture</span>
                        <small>Upload a new profile image</small>
                      </div>
                    </div>
                    <button 
                      className="setting-btn" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                  {!isGoogleUser && (
                    <div className="setting-item">
                      <div className="setting-info">
                        <FaLock className="setting-icon" />
                        <div>
                          <span>Change Password</span>
                          <small>Update your account password</small>
                        </div>
                      </div>
                      <button className="setting-btn" onClick={() => setChangePasswordModal(true)}>
                        Change
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="profile-card">
                <h4>Quick Stats</h4>
                <div className="account-stats">
                  <div className="stat-row">
                    <span>Win Rate</span>
                    <strong className="positive">{winRate}%</strong>
                  </div>
                  <div className="stat-row">
                    <span>Best Trade</span>
                    <strong className="positive">+₱292.50</strong>
                  </div>
                  <div className="stat-row">
                    <span>Worst Trade</span>
                    <strong className="negative">-₱82.50</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Edit Name Modal */}
        <EditModal
          isOpen={editNameModal}
          onClose={() => setEditNameModal(false)}
          title="Edit Name"
        >
          <form onSubmit={handleNameUpdate}>
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                value={nameForm.first_name}
                onChange={(e) => setNameForm({ ...nameForm, first_name: e.target.value })}
                className="form-input"
                placeholder="Enter your first name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                value={nameForm.last_name}
                onChange={(e) => setNameForm({ ...nameForm, last_name: e.target.value })}
                className="form-input"
                placeholder="Enter your last name"
              />
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setEditNameModal(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="spinning" />
                    Saving...
                  </>
                ) : (
                  <>
                    <IoCheckmark />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </EditModal>

        {/* Change Password Modal */}
        <EditModal
          isOpen={changePasswordModal}
          onClose={() => setChangePasswordModal(false)}
          title="Change Password"
        >
          <form onSubmit={handlePasswordChange}>
            {!isGoogleUser && (
              <div className="form-group">
                <label htmlFor="current_password">Current Password</label>
                <input
                  type="password"
                  id="current_password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="form-input"
                  placeholder="Enter your current password"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="new_password">New Password</label>
              <input
                type="password"
                id="new_password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                className="form-input"
                placeholder="Enter your new password"
                required
                minLength={8}
              />
              {passwordForm.new_password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div 
                      className={`strength-fill ${passwordStrength.score === 0 ? 'weak' : passwordStrength.score === 1 ? 'medium' : 'strong'}`}
                      style={{ width: `${(passwordStrength.score + 1) * 33.33}%` }}
                    ></div>
                  </div>
                  <div className={`strength-text ${passwordStrength.score === 0 ? 'weak' : passwordStrength.score === 1 ? 'medium' : 'strong'}`}>
                    {passwordStrength.text}
                  </div>
                  <div className="password-requirements">
                    {Object.entries(passwordStrength.requirements || {}).map(([key, requirement]) => (
                      <div 
                        key={key} 
                        className={`requirement ${passwordStrength.validations?.[key] ? 'met' : 'unmet'}`}
                      >
                        <span className="requirement-icon">
                          {passwordStrength.validations?.[key] ? '✓' : '✗'}
                        </span>
                        {requirement}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="confirm_password">Confirm New Password</label>
              <input
                type="password"
                id="confirm_password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                className="form-input"
                placeholder="Confirm your new password"
                required
                minLength={8}
              />
              {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                <div className="password-mismatch">
                  Passwords do not match
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setChangePasswordModal(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading || !passwordStrength.isValid || passwordForm.new_password !== passwordForm.confirm_password}
              >
                {loading ? (
                  <>
                    <FaSpinner className="spinning" />
                    Changing...
                  </>
                ) : (
                  <>
                    <FaLock />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </EditModal>
      </main>
    </div>
  );
}