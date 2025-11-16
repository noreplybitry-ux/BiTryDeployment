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
  const [userRanks, setUserRanks] = useState({});
  const [userPnls, setUserPnls] = useState({});
  const [userTradeCounts, setUserTradeCounts] = useState({});
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
      const uRanks = {};
      const uPnls = {};
      const uTrades = {};

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
        let stats = [];
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

        // Filter out users with no trades
        stats = stats.filter((s) => s.trade_count > 0);

        // Sort by gain desc
        stats.sort((a, b) => b.total_pnl - a.total_pnl);

        // Compute user rank if applicable
        if (user) {
          const userIndex = stats.findIndex((s) => s.id === user.id);
          if (userIndex !== -1) {
            uRanks[period] = userIndex + 1;
            uPnls[period] = stats[userIndex].total_pnl;
            uTrades[period] = stats[userIndex].trade_count;
          }
        }

        // Limit to 100
        data[period] = stats.slice(0, 100);
      }

      // All-time based on balance only (excluding portfolio_value), fetching all trades regardless of date
      // Fetch all trades
      const { data: allTrades, error: trErr } = await supabase
        .from("trade_history")
        .select("user_id");

      if (trErr) throw trErr;

      // Compute count per user
      const allUserTrades = {};
      allTrades.forEach((t) => {
        const uid = t.user_id;
        if (!allUserTrades[uid]) allUserTrades[uid] = 0;
        allUserTrades[uid]++;
      });

      // Get unique user_ids with trades > 0
      const userIdsWithTrades = Object.keys(allUserTrades).filter(
        (uid) => allUserTrades[uid] > 0
      );

      // Fetch balances for these users
      const { data: balances, error: balErr } = await supabase
        .from("user_balances")
        .select("user_id, balance")
        .in("user_id", userIdsWithTrades);

      if (balErr) throw balErr;

      // Fetch public profiles for these users
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, profile_picture_url")
        .in("id", userIdsWithTrades)
        .eq("is_public", true);

      if (profErr) throw profErr;

      const profileMap = {};
      profiles.forEach((p) => {
        profileMap[p.id] = p;
      });

      let allTimeStats = balances
        .filter((b) => profileMap[b.user_id])
        .map((b) => ({
          id: b.user_id,
          total_pnl: b.balance || 0,
          trade_count: allUserTrades[b.user_id] || 0,
          user: profileMap[b.user_id],
        }))
        .sort((a, b) => b.total_pnl - a.total_pnl);

      // Compute user rank for ALLTIME
      if (user) {
        const userIndex = allTimeStats.findIndex((s) => s.id === user.id);
        if (userIndex !== -1) {
          uRanks["ALLTIME"] = userIndex + 1;
          uPnls["ALLTIME"] = allTimeStats[userIndex].total_pnl;
          uTrades["ALLTIME"] = allTimeStats[userIndex].trade_count;
        }
      }

      data["ALLTIME"] = allTimeStats.slice(0, 100);

      setLeaderboardData(data);
      setUserRanks(uRanks);
      setUserPnls(uPnls);
      setUserTradeCounts(uTrades);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setError("Failed to load leaderboard: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixProfileUrl = (url) => {
    if (!url) return '';
    if (url.includes('/object/public/')) return url;
    return url.replace('/object/', '/object/public/');
  };

  const renderTop3 = (data) => {
    const isPercent = false;
    if (data.length < 1) return <div className="empty-state">No data yet</div>;

    const top3 = data.slice(0, 3);
    const num = top3.length;

    let podiumOrder, podiumMedals, places;

    if (num === 1) {
      podiumOrder = [0];
      podiumMedals = ["🥇"];
      places = [1];
    } else if (num === 2) {
      podiumOrder = [1, 0];
      podiumMedals = ["🥈", "🥇"];
      places = [2, 1];
    } else {
      podiumOrder = [1, 0, 2];
      podiumMedals = ["🥈", "🥇", "🥉"];
      places = [2, 1, 3];
    }

    return (
      <div className="top-3">
        <h2 className="podium-title">Podium Winners</h2>
        <div className="podium-container">
          {podiumOrder.map((idx, pos) => (
            <div key={top3[idx].id} className={`podium place-${places[pos]}`}>
              <div className="avatar">
                <img
                  src={
                    fixProfileUrl(top3[idx].user.profile_picture_url) ||
                    "https://via.placeholder.com/100/808080/FFFFFF?text=👤"
                  }
                  alt={top3[idx].user.display_name}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/100/808080/FFFFFF?text=👤'; }}
                />
                <div className="rank-badge">{podiumMedals[pos]}</div>
              </div>
              <div className="user-info">
                <h3>{top3[idx].user.display_name}</h3>
                <p
                  className={top3[idx].total_pnl >= 0 ? "positive" : "negative"}
                >
                  ${top3[idx].total_pnl.toFixed(2)} ({top3[idx].trade_count}{" "}
                  trades)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTable = (data) => {
    let valueLabel;
    if (activeTab === "ALLTIME") {
      valueLabel = "Total Wealth";
    } else {
      valueLabel = "Net Gain";
    }

    if (data.length <= 3) return null;
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

  const currentRank = userRanks[activeTab];
  const currentPnl = userPnls[activeTab];
  const currentTrades = userTradeCounts[activeTab];

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
      {user ? (
        currentRank ? (
          <div className="your-rank">
            <h3>Your Rank: #{currentRank}</h3>
            <p className={currentPnl >= 0 ? "positive" : "negative"}>
              ${currentPnl.toFixed(2)} ({currentTrades} trades)
            </p>
          </div>
        ) : (
          <div className="your-rank">Not ranked in this category</div>
        )
      ) : (
        <div className="auth-notice">Login to see your rank</div>
      )}
    </div>
  );
};

export default Leaderboard;