// Leaderboard.js – NO artificial limits (fetches & displays EVERY trader with ≥1 trade, sorted by PNL)
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

      const today = `${year}-${pad(month)}-${pad(day)}T00:00:00+08:00`;
      const monthStart = `${year}-${pad(month)}-01T00:00:00+08:00`;

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
        ALLTIME: null,
      };

      const data = {};
      const uRanks = {};
      const uPnls = {};
      const uTrades = {};

      for (const [period, start] of Object.entries(periods)) {
        // Fetch ALL traders (no limit) – sorted by PNL desc server-side
        const { data: rawStats, error: rpcErr } = await supabase.rpc(
          "get_leaderboard",
          {
            start_ts: start, // null for ALLTIME
            p_limit: null, // ← this removes the limit → returns every trader with ≥1 trade
          }
        );

        if (rpcErr) throw rpcErr;

        if (!rawStats || rawStats.length === 0) {
          data[period] = [];
          continue;
        }

        // Fetch profiles (RLS gives public + own profile)
        const userIds = rawStats.map((s) => s.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, profile_picture_url")
          .in("id", userIds);

        const profileMap = {};
        profiles?.forEach((p) => {
          profileMap[p.id] = p;
        });

        const stats = rawStats.map((raw) => ({
          id: raw.user_id,
          total_pnl: raw.total_pnl,
          trade_count: raw.trade_count,
          user: {
            display_name:
              profileMap[raw.user_id]?.display_name || "Anonymous Trader",
            profile_picture_url:
              profileMap[raw.user_id]?.profile_picture_url || null,
          },
        }));

        // User's own PNL and trade count (even if negative)
        if (user) {
          const userStat = stats.find((s) => s.id === user.id);
          if (userStat) {
            uPnls[period] = userStat.total_pnl;
            uTrades[period] = userStat.trade_count;
          }
          // if no trades → no PNL/trades → stays undefined
        }

        // Filter to only positive or zero PNL
        const filteredStats = stats.filter((s) => s.total_pnl >= 0);

        // User's rank only if PNL >= 0 (accurate because we have all data)
        if (user && uPnls[period] >= 0) {
          const userIndex = filteredStats.findIndex((s) => s.id === user.id);
          if (userIndex !== -1) {
            uRanks[period] = userIndex + 1;
          }
        }

        data[period] = filteredStats; // ← NO slice → show every single trader with PNL >= 0
      }

      setLeaderboardData(data);
      setUserRanks(uRanks);
      setUserPnls(uPnls);
      setUserTradeCounts(uTrades);
    } catch (err) {
      console.error(err);
      setError("Failed to load leaderboard: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixProfileUrl = (url) => {
    if (!url) return "";
    if (url.includes("/object/public/")) return url;
    return url.replace("/object/", "/object/public/");
  };

  const renderTop3 = (data) => {
    if (data.length === 0)
      return <div className="empty-state">No traders yet this period</div>;

    const top3 = data.slice(0, Math.min(3, data.length));

    const podiumOrder =
      top3.length === 1 ? [0] : top3.length === 2 ? [1, 0] : [1, 0, 2];
    const podiumMedals =
      top3.length === 1
        ? ["🥇"]
        : top3.length === 2
        ? ["🥈", "🥇"]
        : ["🥈", "🥇", "🥉"];
    const places =
      top3.length === 1 ? [1] : top3.length === 2 ? [2, 1] : [2, 1, 3];

    return (
      <div className="top-3">
        <h2 className="podium-title">Podium Winners</h2>
        <div className="podium-container">
          {podiumOrder.map((idx, pos) => (
            <div key={top3[idx].id} className={`podium place-${places[pos]}`}>
              <div className="avatar">
                {top3[idx].user.profile_picture_url ? (
                  <img
                    src={fixProfileUrl(top3[idx].user.profile_picture_url)}
                    alt={top3[idx].user.display_name}
                    onError={(e) =>
                      (e.target.src =
                        "https://via.placeholder.com/100/333333/FFFFFF?text=👤")
                    }
                  />
                ) : (
                  <div className="initials-avatar">
                    {top3[idx].user.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
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
    if (data.length <= 3) return null;

    const valueLabel =
      activeTab === "ALLTIME" ? "Lifetime Trading PNL" : "Period Net PNL";

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

  if (loading) return <div className="loading">Loading leaderboard...</div>;
  if (error) return <div className="error">{error}</div>;

  const currentData = leaderboardData[activeTab] || [];
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
              {tab === "ALLTIME"
                ? "All Time"
                : tab.charAt(0) + tab.slice(1).toLowerCase()}
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

      {renderTop3(currentData)}
      {renderTable(currentData)}

      {user ? (
        currentTrades !== undefined ? (
          currentRank ? (
            <div className="your-rank">
              <h3>Your Rank: #{currentRank}</h3>
              <p className={currentPnl >= 0 ? "positive" : "negative"}>
                ${Number(currentPnl || 0).toFixed(2)} ({currentTrades || 0}{" "}
                trades)
              </p>
            </div>
          ) : (
            <div className="your-rank">
              <h3>Your PNL is negative</h3>
              <p className={currentPnl >= 0 ? "positive" : "negative"}>
                ${Number(currentPnl || 0).toFixed(2)} ({currentTrades || 0}{" "}
                trades)
              </p>
              <p>Achieve positive PNL to appear on the leaderboard!</p>
            </div>
          )
        ) : (
          <div className="your-rank">
            Make your first trade to appear on the leaderboard!
          </div>
        )
      ) : (
        <div className="auth-notice">Log in to see your rank</div>
      )}
    </div>
  );
};

export default Leaderboard;
