// Leaderboard.js
import React, { useState, useEffect } from "react";
import "../css/Leaderboard.css";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

const Leaderboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ALLTIME");
  const [leaderboardData, setLeaderboardData] = useState({
    DAILY: [],
    WEEKLY: [],
    MONTHLY: [],
    ALLTIME: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getPHTDateComponents = () => {
    const phtMs = new Date().getTime() + 8 * 60 * 60 * 1000;
    const phtDate = new Date(phtMs);
    return {
      year: phtDate.getUTCFullYear(),
      month: phtDate.getUTCMonth() + 1,
      day: phtDate.getUTCDate(),
      dayOfWeek: phtDate.getUTCDay(),
    };
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const { year, month, day, dayOfWeek } = getPHTDateComponents();
      const pad = (n) => String(n).padStart(2, "0");

      // Today start
      const today = `${year}-${pad(month)}-${pad(day)}T00:00:00+08:00`;

      // Month start
      const monthStart = `${year}-${pad(month)}-01T00:00:00+08:00`;

      // Week start (Monday)
      let mondayDay = day - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      let weekStartYear = year;
      let weekStartMonth = month;
      if (mondayDay < 1) {
        weekStartMonth -= 1;
        if (weekStartMonth < 1) {
          weekStartMonth = 12;
          weekStartYear -= 1;
        }
        const daysInPrevMonth = new Date(
          weekStartYear,
          weekStartMonth,
          0
        ).getDate();
        mondayDay += daysInPrevMonth;
      }
      const weekStart = `${weekStartYear}-${pad(weekStartMonth)}-${pad(
        mondayDay
      )}T00:00:00+08:00`;

      const periods = {
        DAILY: today,
        WEEKLY: weekStart,
        MONTHLY: monthStart,
      };

      const data = {};
      for (const [period, start] of Object.entries(periods)) {
        // Fetch balance changes
        const { data: changes, error: chErr } = await supabase
          .from("balance_history")
          .select("user_id, change_amount, change_type")
          .gte("created_at", start);

        if (chErr) throw chErr;

        // Filter out DEPOSIT and WITHDRAWAL
        const filteredChanges = changes.filter(
          (c) => !["DEPOSIT", "WITHDRAWAL"].includes(c.change_type)
        );

        // Compute sum per user
        const userGains = {};
        filteredChanges.forEach((c) => {
          const uid = c.user_id;
          if (!userGains[uid]) userGains[uid] = 0;
          userGains[uid] += c.change_amount;
        });

        // Fetch trades
        const { data: trades, error: trErr } = await supabase
          .from("trade_history")
          .select("user_id")
          .gte("created_at", start);

        if (trErr) throw trErr;

        // Compute count per user
        const userTrades = {};
        trades.forEach((t) => {
          const uid = t.user_id;
          if (!userTrades[uid]) userTrades[uid] = 0;
          userTrades[uid]++;
        });

        // Get unique user_ids
        const userIds = new Set([
          ...Object.keys(userGains),
          ...Object.keys(userTrades),
        ]);

        // Fetch public profiles
        const { data: users, error: uErr } = await supabase
          .from("profiles")
          .select("id, display_name, profile_picture_url")
          .in("id", Array.from(userIds))
          .eq("is_public", true);

        if (uErr) throw uErr;

        // Map users
        const userMap = {};
        users.forEach((u) => {
          userMap[u.id] = u;
        });

        // Build stats
        const stats = [];
        Object.keys(userMap).forEach((uid) => {
          const gain = userGains[uid] || 0;
          const count = userTrades[uid] || 0;
          stats.push({
            id: uid,
            total_pnl: gain,
            trade_count: count,
            user: userMap[uid],
          });
        });

        // Sort by gain desc
        stats.sort((a, b) => b.total_pnl - a.total_pnl);

        // Limit to 100
        data[period] = stats.slice(0, 100);
      }

      // All-time based on total balance (balance + portfolio_value)
      const { data: balances, error: balErr } = await supabase
        .from("user_balances")
        .select("user_id, balance, portfolio_value, trade_count");

      if (balErr) throw balErr;

      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, profile_picture_url")
        .eq("is_public", true);

      if (profErr) throw profErr;

      const profileMap = {};
      profiles.forEach((p) => {
        profileMap[p.id] = p;
      });

      const allTimeStats = balances
        .filter((b) => profileMap[b.user_id])
        .map((b) => ({
          id: b.user_id,
          total_pnl: (b.balance || 0) + (b.portfolio_value || 0),
          trade_count: b.trade_count || 0,
          user: profileMap[b.user_id],
        }))
        .sort((a, b) => b.total_pnl - a.total_pnl)
        .slice(0, 100);

      data["ALLTIME"] = allTimeStats;

      setLeaderboardData(data);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setError("Failed to load leaderboard: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTop3 = (data) => {
    if (data.length < 1) return <div className="empty-state">No data yet</div>;
    const medals = ["🥇", "🥈", "🥉"];
    return (
      <div className="top-3">
        <h2 className="podium-title">Podium Winners</h2>
        {data.slice(0, 3).map((entry, index) => (
          <div key={entry.id} className={`podium place-${index + 1}`}>
            <div className="avatar">
              <img
                src={
                  entry.user.profile_picture_url || "https://placeholder.co/100"
                }
                alt={entry.user.display_name}
              />
              <div className="rank-badge">{medals[index]}</div>
            </div>
            <div className="user-info">
              <h3>{entry.user.display_name}</h3>
              <p className={entry.total_pnl >= 0 ? "positive" : "negative"}>
                ${entry.total_pnl.toFixed(2)} ({entry.trade_count} trades)
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTable = (data) => {
    if (data.length <= 3) return null;
    const valueLabel = activeTab === "ALLTIME" ? "Total Wealth" : "Net Gain";
    return (
      <div className="table-wrapper">
        <h2 className="table-title">Full Leaderboard</h2>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>{valueLabel}</th>
              <th>Trades</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(3).map((entry, index) => (
              <tr key={entry.id}>
                <td>{index + 4}</td>
                <td>{entry.user.display_name}</td>
                <td className={entry.total_pnl >= 0 ? "positive" : "negative"}>
                  ${entry.total_pnl.toFixed(2)}
                </td>
                <td>{entry.trade_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading leaderboard...</div>;
  }

  return (
    <div className="leaderboard-page">
      <header className="leaderboard-header">
        <h1>Trader Leaderboards</h1>
        <div className="tabs">
          {["DAILY", "WEEKLY", "MONTHLY", "ALLTIME"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button
          className="refresh-btn"
          onClick={fetchLeaderboard}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>
      {error && <div className="error">{error}</div>}
      <div className="leaderboard-content">
        {renderTop3(leaderboardData[activeTab])}
        {renderTable(leaderboardData[activeTab])}
      </div>
      {!user && <div className="auth-notice">Login to see your rank</div>}
    </div>
  );
};

export default Leaderboard;
