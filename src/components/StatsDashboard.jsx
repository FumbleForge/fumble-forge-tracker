import React, { useState } from "react";
import {
  BarChart2,
  Trophy,
  Swords,
  Flame,
  Target,
  TrendingUp,
  Calendar,
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

      {/* NEU: ZEITVERLAUF / TIMELINE SECTION */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs uppercase font-bold text-neutral-400 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-amber-500" /> Win / Loss Zeitverlauf
          </div>
          
          {/* Filter-Optionen */}
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px]">
            <button
              onClick={() => setTimeFilter("30days")}
              className={`px-3 py-1 rounded-md font-bold transition ${
                timeFilter === "30days"
                  ? "bg-amber-600 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              -30 Tage
            </button>
            <button
              onClick={() => setTimeFilter("1year")}
              className={`px-3 py-1 rounded-md font-bold transition ${
                timeFilter === "1year"
                  ? "bg-amber-600 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              -1 Jahr
            </button>
            <button
              onClick={() => setTimeFilter("all")}
              className={`px-3 py-1 rounded-md font-bold transition ${
                timeFilter === "all"
                  ? "bg-amber-600 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Gesamt
            </button>
          </div>
        </div>

        {/* Visualisierter Verlauf */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
          {filteredTimelineMatches.length === 0 ? (
            <div className="text-xs text-neutral-500 italic text-center py-4">
              Keine Spiele im gewählten Zeitraum vorhanden.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[10px] text-neutral-500 border-b border-neutral-800 pb-2">
                <span>Chronologischer Verlauf ({filteredTimelineMatches.length} Partien)</span>
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Sieg</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Niederlage</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-500"></span> Unentschieden</span>
                </span>
              </div>

              {/* Timeline Items */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredTimelineMatches.map((m, idx) => {
                  const { isTie, isWin } = evaluateMatchWin(m);
                  const statusColor = isTie 
                    ? "bg-neutral-500/20 border-neutral-500/40 text-neutral-400" 
                    : isWin 
                    ? "bg-emerald-950/40 border-emerald-600/40 text-emerald-400" 
                    : "bg-red-950/40 border-red-600/40 text-red-400";
                  
                  const dotColor = isTie ? "bg-neutral-400" : isWin ? "bg-emerald-500" : "bg-red-500";
                  const labelText = isTie ? "Unentschieden" : isWin ? "Sieg" : "Niederlage";

                  return (
                    <div 
                      key={m.id || idx}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${statusColor}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`}></span>
                        <div>
                          <div className="font-bold text-neutral-200">
                            {m.details?.battleplan || "Einzelspiel / Partie"}
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {m.player1_name} vs {m.player2_name}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black uppercase tracking-wider">{labelText}</span>
                        <div className="text-[10px] text-neutral-500">
                          {new Date(m.created_at).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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