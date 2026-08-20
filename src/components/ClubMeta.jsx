import React, { useState, useEffect } from "react";
import { BarChart3, Swords, Shield, Trophy, Activity, AlertCircle, Target } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function ClubMeta() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState("Age of Sigmar");

  useEffect(() => {
    fetchMetaData();
  }, []);

  const fetchMetaData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [matchesRes, profilesRes] = await Promise.all([
        supabase.from("matches").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*")
      ]);

      if (matchesRes.error) throw matchesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setMatches(matchesRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (err) {
      console.error("Fehler beim Laden der Meta-Daten:", err.message);
      setErrorMsg("Meta-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  // --- SYSTEM-ABHÄNGIGE FRAKTIONS-ERFASSUNG ---
  const factionCounts = {};
  profiles.forEach((p) => {
    // Wähle je nach System die korrekte Spalte aus Supabase
    const rawArmies = selectedSystem === "Age of Sigmar" ? p.aos_armies : p.wh40k_armies;
    
    if (rawArmies) {
      const userArmies = rawArmies.split(",").map((a) => a.trim());
      userArmies.forEach((army) => {
        if (army) {
          factionCounts[army] = (factionCounts[army] || 0) + 1;
        }
      });
    }
  });

  const sortedFactions = Object.entries(factionCounts).sort((a, b) => b[1] - a[1]);

  // --- MATCH-STATISTIKEN & WIN-RATES ---
  let totalGamesCount = 0;
  let totalDrawsCount = 0;
  const battleplanCounts = {};
  const factionStats = {}; 
  const matchupMatrix = {}; 

  const recordMatchup = (f1, f2, winnerName, p1Name, p2Name) => {
    if (!f1 || !f2) return;
    
    if (!factionStats[f1]) factionStats[f1] = { wins: 0, games: 0 };
    if (!factionStats[f2]) factionStats[f2] = { wins: 0, games: 0 };
    
    factionStats[f1].games++;
    factionStats[f2].games++;

    const p1Won = winnerName && winnerName !== "Unentschieden" && (winnerName.includes(p1Name) || winnerName === p1Name);
    const p2Won = winnerName && winnerName !== "Unentschieden" && (winnerName.includes(p2Name) || winnerName === p2Name);

    if (p1Won) factionStats[f1].wins++;
    if (p2Won) factionStats[f2].wins++;

    if (!matchupMatrix[f1]) matchupMatrix[f1] = {};
    if (!matchupMatrix[f1][f2]) matchupMatrix[f1][f2] = { wins: 0, total: 0 };
    matchupMatrix[f1][f2].total++;
    if (p1Won) matchupMatrix[f1][f2].wins++;

    if (!matchupMatrix[f2]) matchupMatrix[f2] = {};
    if (!matchupMatrix[f2][f1]) matchupMatrix[f2][f1] = { wins: 0, total: 0 };
    matchupMatrix[f2][f1].total++;
    if (p2Won) matchupMatrix[f2][f1].wins++;
  };

  matches.forEach((m) => {
    const isTournamentComplete = m.details?.match_mode === "tournament_complete";
    
    if (isTournamentComplete && m.details?.tournament_rounds) {
      m.details.tournament_rounds.forEach((round) => {
        totalGamesCount++;
        if (round.winner === "Unentschieden" || round.p1Vp === round.p2Vp) {
          totalDrawsCount++;
        }
        if (round.battleplan) {
          battleplanCounts[round.battleplan] = (battleplanCounts[round.battleplan] || 0) + 1;
        }
        recordMatchup(round.p1Faction, round.p2Faction, round.winner, round.p1Name, round.p2Name);
      });
    } else {
      totalGamesCount++;
      if (m.winner_name === "Unentschieden") {
        totalDrawsCount++;
      }
      const bp = m.details?.battleplan;
      if (bp) {
        battleplanCounts[bp] = (battleplanCounts[bp] || 0) + 1;
      }
      recordMatchup(
        m.details?.player1_faction,
        m.details?.player2_faction,
        m.winner_name,
        m.player1_name,
        m.player2_name
      );
    }
  });

  const sortedBattleplans = Object.entries(battleplanCounts).sort((a, b) => b[1] - a[1]);

  const sortedFactionWinRates = Object.entries(factionStats)
    .map(([faction, stats]) => ({
      faction,
      games: stats.games,
      wins: stats.wins,
      winRate: stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games);

  const activeFactionsList = Object.keys(matchupMatrix).sort();

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-amber-600/30 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="text-amber-500" /> Fumble Forged Club-Meta
          </h2>
          <p className="text-xs text-neutral-400">
            Wissenschaftliche Auswertungen, Win-Rates und Fraktions-Matchups
          </p>
        </div>

        {/* System Filter */}
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setSelectedSystem("Age of Sigmar")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedSystem === "Age of Sigmar"
                ? "bg-amber-600 text-neutral-950"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Age of Sigmar
          </button>
          <button
            onClick={() => setSelectedSystem("Warhammer 40k")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedSystem === "Warhammer 40k"
                ? "bg-amber-600 text-neutral-950"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            Warhammer 40k
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-600/50 text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-neutral-500 italic py-12 text-center">
          Analysiere Schlachten-Daten für {selectedSystem}...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* QUICK STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Swords size={24} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Erfasste Partien ({selectedSystem})</span>
                <span className="text-xl font-black text-neutral-100">{totalGamesCount}</span>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Shield size={24} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Aktive Commander</span>
                <span className="text-xl font-black text-neutral-100">{profiles.length}</span>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Trophy size={24} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Unentschieden-Quote</span>
                <span className="text-xl font-black text-neutral-100">
                  {totalGamesCount > 0 ? Math.round((totalDrawsCount / totalGamesCount) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* HAUPTBEREICH 1: Fraktions-Win-Rates & Popularität */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Fraktions-Beliebtheit */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
              <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Activity size={16} /> Club-Fraktionen ({selectedSystem})
              </h3>

              {sortedFactions.length === 0 ? (
                <div className="text-xs text-neutral-500 italic py-6 text-center">
                  Noch keine Armeen für {selectedSystem} in den Profilen hinterlegt.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {sortedFactions.map(([faction, count], idx) => {
                    const maxCount = sortedFactions[0][1];
                    const percentage = Math.round((count / maxCount) * 100);

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-neutral-200">{faction}</span>
                          <span className="text-amber-500 font-mono">{count} Spieler</span>
                        </div>
                        <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                          <div
                            className="bg-amber-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 10)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Fraktions Win-Rates */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
              <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Target size={16} /> Fraktions Win-Rates
              </h3>

              {sortedFactionWinRates.length === 0 ? (
                <div className="text-xs text-neutral-500 italic py-6 text-center">
                  Noch keine Partien für Win-Rates erfasst.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {sortedFactionWinRates.map((item, idx) => (
                    <div key={idx} className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-neutral-200 block">{item.faction}</span>
                        <span className="text-[10px] text-neutral-500">{item.games} Partien gespielt</span>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400 font-mono font-black text-sm">{item.winRate}%</span>
                        <span className="text-[10px] text-neutral-500 block">Win-Rate</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* HAUPTBEREICH 2: Fraktion vs Fraktion Matchup Matrix */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Swords size={16} /> Matchup-Matrix (Fraktion vs. Fraktion)
            </h3>

            {activeFactionsList.length === 0 ? (
                <div className="text-xs text-neutral-500 italic py-8 text-center">
                  Trage Partien im Score Tracker ein, um die Matchup-Matrix freizuschalten.
                </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="p-2.5 font-bold">Wer / Gegen &rarr;</th>
                      {activeFactionsList.map((fac, i) => (
                        <th key={i} className="p-2.5 font-bold truncate max-w-[100px]" title={fac}>{fac}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeFactionsList.map((rowFac, rIdx) => (
                      <tr key={rIdx} className="border-b border-neutral-800/50 hover:bg-neutral-950/40">
                        <td className="p-2.5 font-bold text-amber-500 whitespace-nowrap">{rowFac}</td>
                        {activeFactionsList.map((colFac, cIdx) => {
                          if (rowFac === colFac) {
                            return <td key={cIdx} className="p-2.5 text-neutral-700 text-center">-</td>;
                          }
                          const matchData = matchupMatrix[rowFac]?.[colFac];
                          const total = matchData?.total || 0;
                          const wins = matchData?.wins || 0;
                          const rate = total > 0 ? Math.round((wins / total) * 100) : null;

                          return (
                            <td key={cIdx} className="p-2.5 text-center font-mono">
                              {total === 0 ? (
                                <span className="text-neutral-700">0</span>
                              ) : (
                                <span className={rate >= 50 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                  {rate}% <span className="text-[9px] text-neutral-500">({wins}/{total})</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BELIEBTESTE BATTLEPLANS */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Activity size={16} /> Beliebteste Battleplans & Missionen
            </h3>

            {sortedBattleplans.length === 0 ? (
              <div className="text-xs text-neutral-500 italic py-6 text-center">
                Noch keine Battleplans in Partien erfasst.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {sortedBattleplans.map(([plan, count], idx) => (
                  <div key={idx} className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold text-neutral-200 truncate pr-2">{plan}</span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}