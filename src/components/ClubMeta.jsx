import React, { useState, useEffect } from "react";
import { BarChart3, Swords, Shield, Trophy, Activity, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function ClubMeta() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    fetchMetaData();
  }, []);

  const fetchMetaData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Matches und Profile parallel laden
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

  // --- STATISTIK BERECHNUNGEN ---

  // 1. Fraktions-Verteilung (Aus den Armeen-Angaben der Profile oder Match-Details)
  const factionCounts = {};
  profiles.forEach((p) => {
    if (p.armies) {
      // Teilt Armeen auf, falls Komma-getrennt
      const userArmies = p.armies.split(",").map((a) => a.trim());
      userArmies.forEach((army) => {
        if (army) {
          factionCounts[army] = (factionCounts[army] || 0) + 1;
        }
      });
    }
  });

  const sortedFactions = Object.entries(factionCounts).sort((a, b) => b[1] - a[1]);

  // 2. Match-Statistiken (Gesamtspiele, Unentschieden, etc.)
  let totalGamesCount = 0;
  let totalDrawsCount = 0;
  const battleplanCounts = {};

  matches.forEach((m) => {
    const isTournament = m.details?.match_mode === "tournament_complete";
    if (isTournament && m.details?.tournament_rounds) {
      m.details.tournament_rounds.forEach((round) => {
        totalGamesCount++;
        if (round.winner === "Unentschieden" || round.p1Vp === round.p2Vp) {
          totalDrawsCount++;
        }
        if (round.battleplan) {
          battleplanCounts[round.battleplan] = (battleplanCounts[round.battleplan] || 0) + 1;
        }
      });
    } else {
      totalGamesCount++;
      if (m.winner_name === "Unentschieden") {
        totalDrawsCount++;
      }
    }
  });

  const sortedBattleplans = Object.entries(battleplanCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <header className="border-b border-amber-600/30 pb-4">
        <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <BarChart3 className="text-amber-500" /> Fumble Forged Club-Meta
        </h2>
        <p className="text-xs text-neutral-400">
          Wissenschaft, Statistiken und Fraktions-Analysen aus allen Club-Schlachtfeldern
        </p>
      </header>

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-600/50 text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-neutral-500 italic py-12 text-center">
          Analysiere Schlachten-Daten und Berechne Club-Meta...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* OBERER BEREICH: Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <Swords size={24} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Erfasste Partien</span>
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

          {/* HAUPTBEREICH: Zwei Spalten (Fraktionen & Battleplans) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SPALTE 1: Fraktions-Beliebtheit im Club */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
              <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Activity size={16} /> Club-Fraktionen (Armee-Verteilung)
              </h3>

              {sortedFactions.length === 0 ? (
                <div className="text-xs text-neutral-500 italic py-6 text-center">
                  Noch keine Armeen in den Profilen hinterlegt.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedFactions.map(([faction, count], idx) => {
                    const maxCount = sortedFactions[0][1];
                    const percentage = Math.round((count / maxCount) * 100);

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-neutral-200">{faction}</span>
                          <span className="text-amber-500 font-mono">{count} {count === 1 ? "Spieler" : "Spieler"}</span>
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

            {/* SPALTE 2: Beliebteste Battleplans / Missionen */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-lg">
              <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Swords size={16} /> Beliebteste Battleplans
              </h3>

              {sortedBattleplans.length === 0 ? (
                <div className="text-xs text-neutral-500 italic py-6 text-center">
                  Noch keine Battleplans in Partien erfasst.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedBattleplans.map(([plan, count], idx) => (
                    <div key={idx} className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-200 truncate pr-2">{plan}</span>
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold shrink-0">
                        {count} {count === 1 ? "Mal" : "Mal"} gespielt
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* UNTERER BEREICH: Stammtisch Info-Box */}
          <div className="bg-neutral-900 border border-amber-600/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-amber-500 uppercase">Stammtisch-Meta Analyse</h4>
              <p className="text-xs text-neutral-400 max-w-xl">
                Je fleißiger ihr eure Partien und Turniere über den Score Tracker eintragt, desto präziser füttert ihr die Club-Statistik. Welcher Commander knackt die nächste Win-Rate-Marke?
              </p>
            </div>
            <div className="shrink-0 font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
              Status: Live aktiv ⚔️
            </div>
          </div>

        </div>
      )}
    </div>
  );
}