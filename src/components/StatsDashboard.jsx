import React, { useState } from "react";
import {
  BarChart2,
  Trophy,
  Swords,
  Flame,
  Target,
  TrendingUp,
} from "lucide-react";

export default function StatsDashboard({ matches, username }) {
  if (!matches || matches.length === 0) return null;

  // Filter-State für den Zeitverlauf: "30days", "1year", "all"
  const [timeFilter, setTimeFilter] = useState("all");

  let totalGames = matches.length;
  let wins = 0;
  let losses = 0;
  let draws = 0;

  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  let currentStreak = 0;
  let streakType = null;

  const battleplans = {};
  const battleTactics = {};

  // Hilfsfunktion zur Bestimmung ob ein Match ein Sieg ist
  const evaluateMatchWin = (m) => {
    const winner = m.winner_name || "";
    const p1Name = m.player1_name || "";
    const isTie = winner === "Unentschieden" || m.player1_vp === m.player2_vp;

    const isUserWinner = 
      (p1Name && winner.includes(p1Name)) || 
      (username && winner.toLowerCase().includes(username.toLowerCase())) ||
      winner.includes("Spieler 1");

    return { isTie, isWin: !isTie && isUserWinner };
  };

  sortedMatches.forEach((m) => {
    const { isTie, isWin } = evaluateMatchWin(m);

    if (isTie) {
      draws++;
      currentStreak = 0;
      streakType = null;
    } else if (isWin) {
      wins++;
      if (streakType === "win") {
        currentStreak++;
      } else {
        streakType = "win";
        currentStreak = 1;
      }
    } else {
      losses++;
      if (streakType === "loss") {
        currentStreak++;
      } else {
        streakType = "loss";
        currentStreak = 1;
      }
    }

    // Battleplan Auswertung
    const bpName = m.details?.battleplan || "Unbekannt";
    if (!battleplans[bpName]) battleplans[bpName] = { played: 0, wins: 0 };
    battleplans[bpName].played++;
    if (isWin) battleplans[bpName].wins++;

    // Taktiken Auswertung
    const history = m.details?.history || [];
    history.forEach((h) => {
      if (h.action && h.action.includes("Battle Tactic erfüllt")) {
        const tacticName =
          h.action.split(" erfüllt: ")[1]?.split(" (")[0] || "Taktik";
        if (!battleTactics[tacticName])
          battleTactics[tacticName] = { count: 0, wins: 0 };
        battleTactics[tacticName].count++;
        if (isWin) battleTactics[tacticName].wins++;
      }
    });
  });

  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const avgVP = Math.round(
    matches.reduce((acc, m) => {
      const isP1 =
        m.player1_name?.includes(username) ||
        m.player1_name?.includes("Spieler 1");
      return acc + (isP1 ? m.player1_vp : m.player2_vp);
    }, 0) / totalGames
  );

  // Zeitverlauf-Filter anwenden
  const now = new Date();
  const filteredTimelineMatches = sortedMatches.filter((m) => {
    const matchDate = new Date(m.created_at);
    if (timeFilter === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return matchDate >= thirtyDaysAgo;
    } else if (timeFilter === "1year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return matchDate >= oneYearAgo;
    }
    return true; // "all"
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 font-sans">
      <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
        <BarChart2 size={18} /> Commander Statistik & Metriken
      </h3>

      {/* KACHELN: 4er GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div className="text-[10px] text-neutral-500 uppercase flex items-center gap-1">
            <Swords size={12} /> Spiele Gesamt
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {totalGames}
          </div>
        </div>

        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div className="text-[10px] text-neutral-500 uppercase flex items-center gap-1">
            <Trophy size={12} className="text-emerald-500" /> Wins / Losses /
            Draws
          </div>
          <div className="text-xl font-black text-emerald-400 mt-1">
            {wins} <span className="text-neutral-600">/</span> {losses}{" "}
            <span className="text-neutral-600">/</span> {draws}
          </div>
        </div>

        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div className="text-[10px] text-neutral-500 uppercase">Win Rate</div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {winRate}%
          </div>
        </div>

        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div className="text-[10px] text-neutral-500 uppercase flex items-center gap-1">
            <Flame size={12} className="text-amber-500" /> Streak
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              streakType === "win"
                ? "text-emerald-400"
                : streakType === "loss"
                ? "text-red-500"
                : "text-neutral-400"
            }`}
          >
            {currentStreak > 0
              ? `${currentStreak} ${
                  streakType === "win" ? "Win 🔥" : "Loss ❄️"
                }`
              : "Keine"}
          </div>
        </div>
      </div>

      {/* ZUSATZ-KACHEL (Ø VP) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
          <div className="text-[10px] text-neutral-500 uppercase">
            Ø Victory Points (Erzielt)
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {avgVP} VP
          </div>
        </div>
      </div>

      {/* WIN RATE OVER TIME - SVG LINIENDIAGRAMM */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs uppercase font-bold text-neutral-400 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-amber-500" /> Win Rate Over Time
          </div>
          
          {/* Filter-Optionen */}
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px]">
            {["30days", "1year", "all"].map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded-md font-bold transition ${
                  timeFilter === filter ? "bg-amber-600 text-neutral-950" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {filter === "30days" ? "-30 Tage" : filter === "1year" ? "-1 Jahr" : "Gesamt"}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Box */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 relative h-48 flex items-center">
          {filteredTimelineMatches.length < 2 ? (
            <div className="text-xs text-neutral-500 italic w-full text-center">
              Mindestens 2 Spiele im gewählten Zeitraum erforderlich.
            </div>
          ) : (
            <div className="w-full h-full flex">
              {/* Prozent-Skala links */}
              <div className="flex flex-col justify-between text-[10px] text-neutral-500 pr-3 py-1 select-none shrink-0 h-full">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>

              {/* SVG Diagramm mit key-Attribut für erzwungenes Neu-Rerendering */}
              <div className="relative flex-1 h-full">
                <svg key={timeFilter} className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Horizontale Gitternetzlinien (25%, 50%, 75%) */}
                  {[25, 50, 75].map((val) => (
                    <line
                      key={val}
                      x1="0"
                      y1={100 - val}
                      x2="100"
                      y2={100 - val}
                      stroke="#262626"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                  ))}

                  {/* SVG Kurvenpfad */}
                  <path
                    d={(() => {
                      const points = filteredTimelineMatches.map((m, i) => {
                        let wCount = 0;
                        for (let k = 0; k <= i; k++) {
                          const { isTie, isWin } = evaluateMatchWin(filteredTimelineMatches[k]);
                          if (isWin) wCount += 100; 
                          else if (isTie) wCount += 50;
                        }
                        const rate = wCount / (i + 1);
                        const x = (i / (filteredTimelineMatches.length - 1)) * 100;
                        const y = 100 - rate;
                        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).join(" ");
                      return points;
                    })()}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BATTLEPLAN STATISTIK */}
      <div className="space-y-3 pt-2 border-t border-neutral-800">
        <div className="text-xs uppercase font-bold text-neutral-400 flex items-center gap-1">
          <Target size={14} className="text-amber-500" /> Battleplan Performance
          & Win Rate
        </div>
        <div className="space-y-2">
          {Object.entries(battleplans).map(([bp, data]) => {
            const bpWinRate = Math.round((data.wins / data.played) * 100);
            return (
              <div
                key={bp}
                className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-neutral-200">{bp}</span>
                  <div className="text-[10px] text-neutral-500">
                    {data.played}x gespielt ({data.wins} Siege)
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-amber-400">
                    {bpWinRate}%
                  </span>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    Win Rate
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}