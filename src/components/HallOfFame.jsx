import React, { useState, useEffect } from "react";
import { Trophy, Award, Flame, Swords, Medal } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function HallOfFame() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      // 1. Alle Profile laden
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*");

      if (profileError) throw profileError;

      // 2. Alle Matches laden
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*");

      if (matchError) throw matchError;

      // 3. Stats für jeden User berechnen
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

      // Matches auswerten
      if (matches) {
        // Nach Datum sortieren für Streaks
        const sortedMatches = [...matches].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );

        sortedMatches.forEach((m) => {
          // Unterstützt sowohl Einzelspiele als auch Turniere
          const isTournament = m.details?.match_mode === "tournament_complete";
          
          if (isTournament && m.details?.tournament_rounds) {
            // Turnierrunden einzeln einrechnen
            m.details.tournament_rounds.forEach((round) => {
              const userId = m.user_id;
              if (!statsMap[userId]) return;

              statsMap[userId].gamesPlayed++;
              statsMap[userId].totalVp += Number(round.p1Vp) || 0;

              const winner = round.winner || "";
              const p1Name = round.p1Name || "";
              const isTie = winner === "Unentschieden" || round.p1Vp === round.p2Vp;
              const isUserWinner = (p1Name && winner.includes(p1Name)) || winner.includes("Spieler 1");

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
            // Normales Einzelspiel
            const userId = m.user_id;
            if (!statsMap[userId]) return;

            statsMap[userId].gamesPlayed++;
            
            const isP1 = m.player1_name?.includes(statsMap[userId].name) || m.player1_name?.includes("Spieler 1");
            const userVp = isP1 ? Number(m.player1_vp) || 0 : Number(m.player2_vp) || 0;
            statsMap[userId].totalVp += userVp;

            const winner = m.winner_name || "";
            const isTie = winner === "Unentschieden" || m.player1_vp === m.player2_vp;
            const isUserWinner = winner.includes(statsMap[userId].name) || winner.includes("Spieler 1");

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

      // In Array umwandeln und Win-Rate / Ø VP berechnen
      const calculatedList = Object.values(statsMap).map((item) => {
        const winRate = item.gamesPlayed > 0 ? Math.round((item.wins / item.gamesPlayed) * 100) : 0;
        const avgVp = item.gamesPlayed > 0 ? Math.round(item.totalVp / item.gamesPlayed) : 0;
        return { ...item, winRate, avgVp };
      });

      // Sortieren nach: 1. Siege, 2. Win-Rate, 3. Spiele Gesamt
      calculatedList.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.gamesPlayed - a.gamesPlayed;
      });

      setLeaderboard(calculatedList);
    } catch (err) {
      console.error("Fehler beim Laden der Hall of Fame:", err);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Ranglisten-Tabelle */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
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
              {leaderboard.map((player, idx) => {
                const rank = idx + 1;
                const isTopThree = rank <= 3;

                return (
                  <tr 
                    key={player.id}
                    className={`hover:bg-neutral-800/40 transition ${
                      rank === 1 ? "bg-amber-500/5 font-bold" : ""
                    }`}
                  >
                    {/* Rang mit Medaillen-Icons für Top 3 */}
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

                    {/* Spieler-Info */}
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {player.avatar ? (
                          <img src={player.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Award size={18} className="text-neutral-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-neutral-100 font-bold flex items-center gap-2">
                          {player.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">{player.club}</div>
                      </div>
                    </td>

                    {/* Spiele Gesamt */}
                    <td className="p-4 text-center text-neutral-300 font-mono">
                      {player.gamesPlayed}
                    </td>

                    {/* W / L / D */}
                    <td className="p-4 text-center font-mono">
                      <span className="text-emerald-400">{player.wins}</span>
                      <span className="text-neutral-600"> / </span>
                      <span className="text-red-400">{player.losses}</span>
                      <span className="text-neutral-600"> / </span>
                      <span className="text-neutral-400">{player.draws}</span>
                    </td>

                    {/* Win Rate */}
                    <td className="p-4 text-center font-black text-amber-500">
                      {player.winRate}%
                    </td>

                    {/* Ø VP */}
                    <td className="p-4 text-center text-neutral-300 font-mono">
                      {player.avgVp} VP
                    </td>

                    {/* Streak */}
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
      </div>
    </div>
  );
}