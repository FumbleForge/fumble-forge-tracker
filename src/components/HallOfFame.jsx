import React, { useState, useEffect } from "react";
import { Trophy, Award, Flame, Swords, Medal, Target } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function HallOfFame({ activeChallenges }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("wins"); // "wins", "streak", "vp"

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*");

      if (profileError) throw profileError;

      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*");

      if (matchError) throw matchError;

      const statsMap = {};

      profiles.forEach((p) => {
        const name = p.username || p.name || "Unbekannt";
        statsMap[p.id] = {
          id: p.id,
          name: name,
          club: p.club || "Fumble Forge",
          avatar: p.avatar_url,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          totalVp: 0,
          currentStreak: 0,
          streakType: null,
        };
      });

      if (matches) {
        const sortedMatches = [...matches].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );

        sortedMatches.forEach((m) => {
          const userId = m.user_id;
          if (!statsMap[userId]) return;

          const isTournament = m.details?.match_mode === "tournament_complete";
          
          if (isTournament && m.details?.tournament_rounds) {
            m.details.tournament_rounds.forEach((round) => {
              statsMap[userId].gamesPlayed++;
              statsMap[userId].totalVp += Number(round.p1Vp) || 0;

              const isTie = round.winner === "Unentschieden" || Number(round.p1Vp) === Number(round.p2Vp);
              const isUserWinner = Number(round.p1Vp) > Number(round.p2Vp);

              if (isTie) {
                statsMap[userId].draws++;
                statsMap[userId].currentStreak = 0;
                statsMap[userId].streakType = null;
              } else if (isUserWinner) {
                statsMap[userId].wins++;
                if (statsMap[userId].streakType === "win") {
                  statsMap[userId].currentStreak++;
                } else {
                  statsMap[userId].streakType = "win";
                  statsMap[userId].currentStreak = 1;
                }
              } else {
                statsMap[userId].losses++;
                if (statsMap[userId].streakType === "loss") {
                  statsMap[userId].currentStreak++;
                } else {
                  statsMap[userId].streakType = "loss";
                  statsMap[userId].currentStreak = 1;
                }
              }
            });
          } else {
            statsMap[userId].gamesPlayed++;
            const p1Vp = Number(m.player1_vp) || 0;
            const p2Vp = Number(m.player2_vp) || 0;
            statsMap[userId].totalVp += p1Vp;

            const isTie = m.winner_name === "Unentschieden" || p1Vp === p2Vp;
            const isUserWinner = p1Vp > p2Vp;

            if (isTie) {
              statsMap[userId].draws++;
              statsMap[userId].currentStreak = 0;
              statsMap[userId].streakType = null;
            } else if (isUserWinner) {
              statsMap[userId].wins++;
              if (statsMap[userId].streakType === "win") {
                statsMap[userId].currentStreak++;
              } else {
                statsMap[userId].streakType = "win";
                statsMap[userId].currentStreak = 1;
              }
            } else {
              statsMap[userId].losses++;
              if (statsMap[userId].streakType === "loss") {
                statsMap[userId].currentStreak++;
              } else {
                statsMap[userId].streakType = "loss";
                statsMap[userId].currentStreak = 1;
              }
            }
          }
        });
      }

      const calculatedList = Object.values(statsMap).map((item) => {
        const winRate = item.gamesPlayed > 0 ? Math.round((item.wins / item.gamesPlayed) * 100) : 0;
        const avgVp = item.gamesPlayed > 0 ? Math.round(item.totalVp / item.gamesPlayed) : 0;
        return { ...item, winRate, avgVp };
      });

      setLeaderboard(calculatedList);
    } catch (err) {
      console.error("Fehler beim Laden der Hall of Fame:", err);
    } finally {
      setLoading(false);
    }
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (filterMode === "streak") {
      const aStreak = a.streakType === "win" ? a.currentStreak : 0;
      const bStreak = b.streakType === "win" ? b.currentStreak : 0;
      if (bStreak !== aStreak) return bStreak - aStreak;
      return b.wins - a.wins;
    } else if (filterMode === "vp") {
      if (b.avgVp !== a.avgVp) return b.avgVp - a.avgVp;
      return b.wins - a.wins;
    } else {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.gamesPlayed - a.gamesPlayed;
    }
  });

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-2xl text-center text-amber-500 font-sans">
        Hall of Fame wird geladen...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <header className="border-b border-amber-600/30 pb-4">
        <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <Trophy className="text-amber-500" /> Hall of Fame & Rangliste
        </h2>
        <p className="text-xs text-neutral-400">
          Die besten Commander und Tabellenführer des Fumble Forge Clubs
        </p>
      </header>

      {/* FILTER TABS */}
      <div className="flex bg-neutral-900 p-1.5 rounded-xl border border-neutral-800 text-xs gap-1">
        <button
          onClick={() => setFilterMode("wins")}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            filterMode === "wins"
              ? "bg-amber-600 text-neutral-950 shadow"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
          }`}
        >
          <Trophy size={14} /> Gesamt-Ranking (Siege)
        </button>
        <button
          onClick={() => setFilterMode("streak")}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            filterMode === "streak"
              ? "bg-amber-600 text-neutral-950 shadow"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
          }`}
        >
          <Flame size={14} /> Siegesserien (Streaks)
        </button>
        <button
          onClick={() => setFilterMode("vp")}
          className={`flex-1 py-2.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            filterMode === "vp"
              ? "bg-amber-600 text-neutral-950 shadow"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
          }`}
        >
          <Target size={14} /> VP-Könige (Ø Punkte)
        </button>
      </div>

      {/* DESKTOP TABELLE */}
      <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-950 border-b border-neutral-800 text-[11px] uppercase tracking-wider text-neutral-400">
              <th className="p-4 text-center w-16">Rang</th>
              <th className="p-4">Commander</th>
              <th className="p-4 text-center">Spiele</th>
              <th className="p-4 text-center">W / L / D</th>
              <th className="p-4 text-center">Win Rate</th>
              <th className="p-4 text-center">Ø VP</th>
              <th className="p-4 text-center">Streak</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 text-sm">
            {sortedLeaderboard.map((player, idx) => {
              const rank = idx + 1;
              const acceptedChallenge = activeChallenges?.find(
                (c) => (c.challenger_id === player.id || c.opponent_id === player.id) && c.status === "accepted"
              );
              const playerFrameClass = acceptedChallenge
                ? acceptedChallenge.system === "aos"
                  ? "frame-challenge-aos"
                  : "frame-challenge-40k"
                : "";

              return (
                <tr 
                  key={player.id}
                  className={`hover:bg-neutral-800/40 transition ${
                    rank === 1 ? "bg-amber-500/5 font-bold" : ""
                  }`}
                >
                  <td className="p-4 text-center">
                    {rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black">
                        🥇 1
                      </span>
                    ) : rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 font-bold">
                        🥈 2
                      </span>
                    ) : rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-900/35 text-amber-600 border border-amber-800/50 font-bold">
                        🥉 3
                      </span>
                    ) : (
                      <span className="text-neutral-500 font-mono">{rank}</span>
                    )}
                  </td>

                  <td className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${playerFrameClass || "bg-neutral-950 border border-neutral-800 overflow-hidden"}`}>
                      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-neutral-950">
                        {player.avatar ? (
                          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Award size={18} className="text-neutral-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-100 font-bold">{player.name}</div>
                      <div className="text-[11px] text-neutral-500">{player.club}</div>
                    </div>
                  </td>

                  <td className="p-4 text-center text-neutral-300 font-mono">{player.gamesPlayed}</td>

                  <td className="p-4 text-center font-mono">
                    <span className="text-emerald-400">{player.wins}</span>
                    <span className="text-neutral-600"> / </span>
                    <span className="text-red-400">{player.losses}</span>
                    <span className="text-neutral-600"> / </span>
                    <span className="text-neutral-400">{player.draws}</span>
                  </td>

                  <td className="p-4 text-center font-black text-amber-500">{player.winRate}%</td>
                  <td className="p-4 text-center text-neutral-300 font-mono">{player.avgVp} VP</td>

                  <td className="p-4 text-center">
                    {player.currentStreak > 0 ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        player.streakType === "win" 
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60" 
                          : "bg-red-950 text-red-400 border border-red-800/60"
                      }`}>
                        {player.streakType === "win" ? <Flame size={12} className="text-amber-500" /> : null}
                        {player.currentStreak} {player.streakType === "win" ? "W" : "L"}
                      </span>
                    ) : (
                      <span className="text-neutral-600 text-xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE KARTEN-ANSICHT */}
      <div className="block md:hidden space-y-3">
        {sortedLeaderboard.map((player, idx) => {
          const rank = idx + 1;
          const acceptedChallenge = activeChallenges?.find(
            (c) => (c.challenger_id === player.id || c.opponent_id === player.id) && c.status === "accepted"
          );
          const playerFrameClass = acceptedChallenge
            ? acceptedChallenge.system === "aos"
              ? "frame-challenge-aos"
              : "frame-challenge-40k"
            : "";

          return (
            <div 
              key={player.id}
              className={`bg-neutral-900 border p-4 rounded-xl flex flex-col gap-3 shadow-lg ${
                rank === 1 ? "border-amber-500/60 bg-amber-500/5" : "border-neutral-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center font-bold text-xs text-amber-500 shrink-0">
                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${playerFrameClass || "bg-neutral-950 border border-neutral-800 overflow-hidden"}`}>
                      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-neutral-950">
                        {player.avatar ? (
                          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Award size={16} className="text-neutral-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-100 font-bold text-sm">{player.name}</div>
                      <div className="text-[10px] text-neutral-500">{player.club}</div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-amber-500">{player.winRate}%</div>
                  <div className="text-[9px] text-neutral-500 uppercase">Win Rate</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/60 text-center text-xs">
                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/40">
                  <div className="text-[9px] text-neutral-500 uppercase">W / L / D</div>
                  <div className="font-mono font-bold mt-0.5">
                    <span className="text-emerald-400">{player.wins}</span>/
                    <span className="text-red-400">{player.losses}</span>/
                    <span className="text-neutral-400">{player.draws}</span>
                  </div>
                </div>

                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/40">
                  <div className="text-[9px] text-neutral-500 uppercase">Ø VP</div>
                  <div className="font-mono font-bold text-neutral-300 mt-0.5">{player.avgVp} VP</div>
                </div>

                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800/40">
                  <div className="text-[9px] text-neutral-500 uppercase">Streak</div>
                  <div className="font-mono font-bold mt-0.5">
                    {player.currentStreak > 0 ? (
                      <span className={player.streakType === "win" ? "text-emerald-400" : "text-red-400"}>
                        {player.currentStreak}{player.streakType === "win" ? "W 🔥" : "L"}
                      </span>
                    ) : (
                      <span className="text-neutral-600">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}