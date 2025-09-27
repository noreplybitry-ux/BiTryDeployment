import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import PieStat from "../components/DashboardPieStat";
import { Line, Bar } from "react-chartjs-2";
import "chart.js/auto";
import {
  FaUsers,
  FaExchangeAlt,
  FaChartLine,
  FaSpinner,
  FaCalendarAlt,
  FaUser,
  FaHistory,
} from "react-icons/fa";
import { IoBarChart, IoRefresh, IoEye, IoEyeOff } from "react-icons/io5";
import "../css/Dashboard.css";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [balanceVisible, setBalanceVisible] = useState(true);

  // UI filters
  const [volumeFilter, setVolumeFilter] = useState("7d");
  const [newUsersFilter, setNewUsersFilter] = useState("month"); // 'month' or 'week'
  const [selectedBuySellPeriod, setSelectedBuySellPeriod] = useState("all");
  const [selectedTradeTypePeriod, setSelectedTradeTypePeriod] = useState("all");

  // summary stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalTradesExecuted, setTotalTradesExecuted] = useState(0);
  const [activePositions, setActivePositions] = useState(0);
  const [totalFeesEarned, setTotalFeesEarned] = useState(0);

  // Learning metrics
  const [avgQuizScore, setAvgQuizScore] = useState(0);
  const [quizPassRate, setQuizPassRate] = useState(0);
  const [totalQuizAttempts, setTotalQuizAttempts] = useState(0);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);

  // lists & charts
  const [topUsersByBalance, setTopUsersByBalance] = useState([]);
  const [newUsersThisPeriod, setNewUsersThisPeriod] = useState([]);
  const [mostTradedSymbols, setMostTradedSymbols] = useState([]);
  const [openVsClosedPositions, setOpenVsClosedPositions] = useState({
    open: 0,
    closed: 0,
    worst: 0,
  });
  const [tradeVolumeData, setTradeVolumeData] = useState([]);
  const [tradeVolumeLabels, setTradeVolumeLabels] = useState([]);
  const [buySellRatios, setBuySellRatios] = useState({});
  const [tradeTypeRatios, setTradeTypeRatios] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeFilter, newUsersFilter]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Total Users
      const { count: userCount, error: usersError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (usersError) throw usersError;
      setTotalUsers(userCount || 0);

      // Total Trades Executed
      const { count: tradeCount, error: tradesError } = await supabase
        .from("trade_history")
        .select("id", { count: "exact", head: true });
      if (tradesError) throw tradesError;
      setTotalTradesExecuted(tradeCount || 0);

      // Total Fees Earned
      const { data: feesData, error: feesError } = await supabase
        .from("trade_history")
        .select("fee");
      if (feesError) throw feesError;
      const totalFees = (feesData || []).reduce(
        (sum, trade) => sum + (Number(trade.fee) || 0),
        0
      );
      setTotalFeesEarned(totalFees || 0);

      // Active Positions
      const { count: positionCount, error: positionsError } = await supabase
        .from("positions")
        .select("id", { count: "exact", head: true })
        .eq("status", "OPEN");
      if (positionsError) throw positionsError;
      setActivePositions(positionCount || 0);

      // Top 5 Users by Balance
      const { data: balances = [], error: balancesError } = await supabase
        .from("user_balances")
        .select("user_id, balance, best_trade")
        .order("balance", { ascending: false })
        .limit(5);
      if (balancesError) throw balancesError;
      const topUsers = await Promise.all(
        (balances || []).map(async (ub) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", ub.user_id)
            .single();
          return {
            user:
              profile?.display_name || `user${(ub.user_id || "").slice(0, 6)}`,
            balance: ub.balance || 0,
            bestTrade: ub.best_trade || 0,
          };
        })
      );
      setTopUsersByBalance(topUsers);

      // New Users This Month / This Week (toggle)
      let startDateForNewUsers;
      if (newUsersFilter === "month") {
        startDateForNewUsers = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // week: last 7 days
        startDateForNewUsers = new Date();
        startDateForNewUsers.setDate(now.getDate() - 7);
      }
      const { data: newUsers = [], error: newUsersError } = await supabase
        .from("profiles")
        .select("id, created_at, is_public, display_name")
        .gte("created_at", startDateForNewUsers.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);
      if (newUsersError) throw newUsersError;
      setNewUsersThisPeriod(
        (newUsers || []).map((u) => ({
          name: u.display_name || (u.id || "").slice(0, 8),
          date: new Date(u.created_at).toLocaleDateString(),
          propriety: u.is_public ? "Public" : "Private",
        }))
      );

      // Most Traded Symbols (top 5)
      const { data: tradeData = [], error: symbolError } = await supabase
        .from("trade_history")
        .select("symbol");
      if (symbolError) throw symbolError;
      const symbolCounts = (tradeData || []).reduce((acc, t) => {
        if (!t.symbol) return acc;
        acc[t.symbol] = (acc[t.symbol] || 0) + 1;
        return acc;
      }, {});
      const sortedSymbols = Object.entries(symbolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      setMostTradedSymbols(sortedSymbols);

      // Open vs Closed Positions
      const { data: positionStats = [], error: posStatsError } = await supabase
        .from("positions")
        .select("status");
      if (posStatsError) throw posStatsError;
      const stats = (positionStats || []).reduce(
        (acc, p) => {
          if (p.status === "OPEN") acc.open++;
          if (p.status === "CLOSED") acc.closed++;
          if (p.status === "LIQUIDATED") acc.worst++;
          return acc;
        },
        { open: 0, closed: 0, worst: 0 }
      );
      setOpenVsClosedPositions(stats);

      // Trade Volume Over Time (1d/7d/30d)
      let days;
      switch (volumeFilter) {
        case "1d":
          days = 1;
          break;
        case "30d":
          days = 30;
          break;
        default:
          days = 7;
      }
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const { data: volumeTrades = [], error: volumeError } = await supabase
        .from("trade_history")
        .select("created_at")
        .gte("created_at", startDate.toISOString());
      if (volumeError) throw volumeError;

      const dailyVolumes = Array(days).fill(0);
      (volumeTrades || []).forEach((trade) => {
        const tradeDate = new Date(trade.created_at);
        const dayIndex = Math.floor((now - tradeDate) / (1000 * 60 * 60 * 24));
        if (dayIndex < days) dailyVolumes[days - 1 - dayIndex]++;
      });
      setTradeVolumeData(dailyVolumes);

      const labels = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString());
      }
      setTradeVolumeLabels(labels);

      // Fetch counts for buy/sell and market type ratios by period (fixed for accuracy)
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const periodConfigs = {
        all: { since: null },
        weekly: {
          since: new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        monthly: {
          since: new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        yearly: { since: oneYearAgo.toISOString() },
      };

      const buyCounts = {};
      const sellCounts = {};
      const futuresCounts = {};
      const spotCounts = {};

      for (const [period, config] of Object.entries(periodConfigs)) {
        let buyQuery = supabase
          .from("trade_history")
          .select("id", { count: "exact", head: true })
          .eq("side", "BUY"); // Assuming side is stored uppercase; adjust if needed

        let totalQuery = supabase
          .from("trade_history")
          .select("id", { count: "exact", head: true });

        let futuresQuery = supabase
          .from("trade_history")
          .select("id", { count: "exact", head: true })
          .eq("market_type", "FUTURES"); // Assuming market_type is stored uppercase

        if (config.since) {
          buyQuery = buyQuery.gte("created_at", config.since);
          totalQuery = totalQuery.gte("created_at", config.since);
          futuresQuery = futuresQuery.gte("created_at", config.since);
        }

        const { count: buyCount, error: buyError } = await buyQuery;
        if (buyError) throw buyError;

        const { count: totalCount, error: totalError } = await totalQuery;
        if (totalError) throw totalError;

        const { count: futuresCount, error: futuresError } = await futuresQuery;
        if (futuresError) throw futuresError;

        buyCounts[period] = buyCount || 0;
        sellCounts[period] = (totalCount || 0) - (buyCount || 0);
        futuresCounts[period] = futuresCount || 0;
        spotCounts[period] = (totalCount || 0) - (futuresCount || 0);
      }

      const newBuySellRatios = {};
      const newTradeTypeRatios = {};
      ["all", "weekly", "monthly", "yearly"].forEach((period) => {
        const buyTotal = buyCounts[period] + sellCounts[period];
        newBuySellRatios[period] =
          buyTotal > 0 ? Math.round((buyCounts[period] / buyTotal) * 100) : 0;

        const tradeTypeTotal = futuresCounts[period] + spotCounts[period];
        newTradeTypeRatios[period] =
          tradeTypeTotal > 0
            ? Math.round((futuresCounts[period] / tradeTypeTotal) * 100)
            : 0;
      });

      setBuySellRatios(newBuySellRatios);
      setTradeTypeRatios(newTradeTypeRatios);

      // Learning Metrics from quiz_attempts
      const { data: quizData = [], error: quizError } = await supabase
        .from("quiz_attempts")
        .select("score, total_questions, barya_points_earned");
      if (quizError) throw quizError;

      const totalAttempts = quizData.length;
      const totalPoints = quizData.reduce(
        (sum, q) => sum + (q.barya_points_earned || 0),
        0
      );
      const avgScore =
        totalAttempts > 0
          ? (quizData.reduce((sum, q) => sum + q.score / q.total_questions, 0) /
              totalAttempts) *
            100
          : 0;
      const passRate =
        totalAttempts > 0
          ? (quizData.filter((q) => q.score >= 0.7 * q.total_questions).length /
              totalAttempts) *
            100
          : 0;

      setTotalQuizAttempts(totalAttempts);
      setTotalPointsEarned(totalPoints);
      setAvgQuizScore(avgScore.toFixed(1));
      setQuizPassRate(passRate.toFixed(1));
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <main className="main-content">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <FaSpinner
              className="spinning"
              style={{ fontSize: "48px", color: "#b7bdc6" }}
            />
          </div>
        </main>
      </div>
    );
  }

  // Enhanced chart configurations
  const lineChartData = {
    labels: tradeVolumeLabels,
    datasets: [
      {
        label: "Trade Volume",
        data: tradeVolumeData,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        tension: 0.2,
        fill: true,
      },
    ],
  };

  const mostTradedBar = {
    labels: mostTradedSymbols.map(([symbol]) => symbol),
    datasets: [
      {
        label: "Trades",
        data: mostTradedSymbols.map(([, count]) => count),
        backgroundColor: [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
        ],
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const formatCurrency = (amount) => {
    return balanceVisible
      ? `$${Math.abs(amount).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "••••••";
  };

  const formatNumber = (num) => {
    return balanceVisible ? num.toLocaleString() : "••••••";
  };

  const periods = ["all", "weekly", "monthly", "yearly"];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar" aria-label="Sidebar">
        <nav className="sidebar-nav">
          <div
            className={`sidebar-item ${
              activeTab === "overview" ? "active" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("overview")}
          >
            <IoBarChart className="sidebar-icon" />
            <span className="sidebar-label">Overview</span>
          </div>

          <div
            className={`sidebar-item ${
              activeTab === "analytics" ? "active" : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("analytics")}
          >
            <FaChartLine className="sidebar-icon" />
            <span className="sidebar-label">Analytics</span>
          </div>

          <div
            className={`sidebar-item ${activeTab === "users" ? "active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("users")}
          >
            <FaUser className="sidebar-icon" />
            <span className="sidebar-label">Users</span>
          </div>
        </nav>
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
                    <FaUsers />
                    <span>Total Users</span>
                  </div>
                  <button
                    className="visibility-toggle"
                    onClick={() => setBalanceVisible(!balanceVisible)}
                  >
                    {balanceVisible ? <IoEye /> : <IoEyeOff />}
                  </button>
                </div>
                <div className="balance-display">
                  <div className="primary-balance">
                    {balanceVisible ? totalUsers.toLocaleString() : "••••••"}
                  </div>
                  <div className="secondary-balance">Registered Users</div>
                  <div className="balance-change positive">
                    <span>+3% (This Month)</span>
                  </div>
                </div>
              </div>

              <div className="summary-card pnl-card">
                <div className="card-header">
                  <div className="card-title">
                    <FaExchangeAlt />
                    <span>Total Trades</span>
                  </div>
                </div>
                <div className="pnl-display">
                  <div className="pnl-total">
                    {balanceVisible
                      ? totalTradesExecuted.toLocaleString()
                      : "••••••"}
                  </div>
                  <div className="pnl-breakdown">
                    <div className="pnl-item">
                      <span>Active:</span>
                      <span className="positive">{activePositions}</span>
                    </div>
                    <div className="pnl-item">
                      <span>Completed:</span>
                      <span>{totalTradesExecuted - activePositions}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="summary-card stats-card">
                <div className="card-header">
                  <div className="card-title">
                    <FaCalendarAlt />
                    <span>Platform Engagement</span>
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">
                      {balanceVisible ? `${avgQuizScore}%` : "••••••"}
                    </div>
                    <div className="stat-label">Avg Quiz Score</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {balanceVisible ? `${quizPassRate}%` : "••••••"}
                    </div>
                    <div className="stat-label">Quiz Pass Rate</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {formatNumber(totalQuizAttempts)}
                    </div>
                    <div className="stat-label">Total Quiz Attempts</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {formatNumber(totalPointsEarned)}
                    </div>
                    <div className="stat-label">Total Points Earned</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Volume Chart */}
            <section className="page-card positions-section">
              <div className="section-header">
                <h3>Trade Volume Over Time</h3>
                <div className="section-actions">
                  <div className="time-filters">
                    {["1d", "7d", "30d"].map((period) => (
                      <button
                        key={period}
                        className={`filter-btn ${
                          volumeFilter === period ? "active" : ""
                        }`}
                        onClick={() => setVolumeFilter(period)}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                  <button
                    className="action-btn secondary"
                    onClick={fetchAdminData}
                  >
                    <IoRefresh />
                    Refresh
                  </button>
                </div>
              </div>

              <div style={{ height: "400px", padding: "20px" }}>
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: "#f0f0f0",
                        },
                      },
                      x: {
                        grid: {
                          display: false,
                        },
                      },
                    },
                  }}
                />
              </div>
            </section>

            {/* Buy/Sell Ratio and Trade Types */}
            <div className="analytics-grid">
              <div className="chart-card">
                <div className="chart-header">
                  <h4>Buy vs Sell Distribution</h4>
                  <div className="time-filters">
                    {periods.map((period) => (
                      <button
                        key={period}
                        className={`filter-btn ${
                          selectedBuySellPeriod === period ? "active" : ""
                        }`}
                        onClick={() => setSelectedBuySellPeriod(period)}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-content">
                  <PieStat
                    data={[
                      {
                        name: "Buy",
                        value: buySellRatios[selectedBuySellPeriod] || 0,
                      },
                      {
                        name: "Sell",
                        value:
                          100 - (buySellRatios[selectedBuySellPeriod] || 0),
                      },
                    ]}
                    colors={["#10b981", "#ef4444"]}
                    size={180}
                    centerLabel={`${
                      buySellRatios[selectedBuySellPeriod] || 0
                    }%`}
                    subLabel="Buy Orders"
                  />
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: "#10b981" }}
                      ></div>
                      <span>
                        Buy Orders: {buySellRatios[selectedBuySellPeriod] || 0}%
                      </span>
                    </div>
                    <div className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: "#ef4444" }}
                      ></div>
                      <span>
                        Sell Orders:{" "}
                        {100 - (buySellRatios[selectedBuySellPeriod] || 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <h4>Futures vs Spot Distribution</h4>
                  <div className="time-filters">
                    {periods.map((period) => (
                      <button
                        key={period}
                        className={`filter-btn ${
                          selectedTradeTypePeriod === period ? "active" : ""
                        }`}
                        onClick={() => setSelectedTradeTypePeriod(period)}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-content">
                  <PieStat
                    data={[
                      {
                        name: "Futures",
                        value: tradeTypeRatios[selectedTradeTypePeriod] || 0,
                      },
                      {
                        name: "Spot",
                        value:
                          100 - (tradeTypeRatios[selectedTradeTypePeriod] || 0),
                      },
                    ]}
                    colors={["#3b82f6", "#10b981"]}
                    size={180}
                    centerLabel={`${
                      tradeTypeRatios[selectedTradeTypePeriod] || 0
                    }%`}
                    subLabel="Futures Trades"
                  />
                  <div className="chart-legend">
                    <div className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: "#3b82f6" }}
                      ></div>
                      <span>
                        Futures Trades:{" "}
                        {tradeTypeRatios[selectedTradeTypePeriod] || 0}%
                      </span>
                    </div>
                    <div className="legend-item">
                      <div
                        className="legend-color"
                        style={{ backgroundColor: "#10b981" }}
                      ></div>
                      <span>
                        Spot Trades:{" "}
                        {100 - (tradeTypeRatios[selectedTradeTypePeriod] || 0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "analytics" && (
          <section className="page-card">
            <div className="section-header">
              <h3>Most Traded Symbols</h3>
              <div className="section-actions">
                <button
                  className="action-btn secondary"
                  onClick={fetchAdminData}
                >
                  <IoRefresh />
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ height: "400px", padding: "20px" }}>
              <Bar
                data={mostTradedBar}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </section>
        )}

        {activeTab === "users" && (
          <>
            {/* Top Users Table */}
            <section className="page-card">
              <div className="section-header">
                <h3>Top Users by Balance</h3>
                <div className="section-actions">
                  <button
                    className="action-btn secondary"
                    onClick={fetchAdminData}
                  >
                    <IoRefresh />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Balance</th>
                      <th>Best Trade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsersByBalance.map((user, idx) => (
                      <tr key={idx} className="trade-row">
                        <td>
                          <div className="market-cell">
                            <div className="user-avatar">
                              {user.user.charAt(0).toUpperCase()}
                            </div>
                            <div className="market-info">
                              <div className="symbol">{user.user}</div>
                            </div>
                          </div>
                        </td>
                        <td className="numeric">
                          {formatCurrency(user.balance)}
                        </td>
                        <td className="numeric positive">
                          {formatCurrency(user.bestTrade)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* New Users Table */}
            <section className="page-card">
              <div className="section-header">
                <h3>New Users</h3>
                <div className="section-actions">
                  <div className="time-filters">
                    <button
                      className={`filter-btn ${
                        newUsersFilter === "week" ? "active" : ""
                      }`}
                      onClick={() => setNewUsersFilter("week")}
                    >
                      Week
                    </button>
                    <button
                      className={`filter-btn ${
                        newUsersFilter === "month" ? "active" : ""
                      }`}
                      onClick={() => setNewUsersFilter("month")}
                    >
                      Month
                    </button>
                  </div>
                  <button
                    className="action-btn secondary"
                    onClick={fetchAdminData}
                  >
                    <IoRefresh />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Registration Date</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newUsersThisPeriod.map((user, idx) => (
                      <tr key={idx} className="trade-row">
                        <td>
                          <div className="market-cell">
                            <div className="user-avatar">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="market-info">
                              <div className="symbol">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="timestamp">{user.date}</td>
                        <td>
                          <span
                            className={`position-badge ${user.propriety.toLowerCase()}`}
                          >
                            {user.propriety}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      <style jsx>{`
        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .chart-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .chart-header {
          margin-bottom: 1.5rem;
        }

        .chart-header h4 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .chart-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .chart-legend {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-color.wins {
          background-color: #10b981;
        }

        .legend-color.losses {
          background-color: #ef4444;
        }
      `}</style>
    </div>
  );
}
