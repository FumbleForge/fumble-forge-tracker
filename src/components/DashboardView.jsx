import React, { useState, useEffect } from "react";
import { Trophy, Swords, Flame, Calendar, Users, ArrowRight, Award } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function DashboardView({ user, setActiveTab }) {
  const [myStats, setMyStats] = useState({ games: 0, wins: 0, winRate: 0, streak: 0, streakType: null });
  const [recentClubMatches, setRecentClubMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Alle Matches laden für den Club-Feed & eigene Stats
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });

      if (matchError) throw matchError;

      // 2. Alle Profile für die Spielernamen im Feed laden
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*");

      if (profileError) throw profileError;

      const profileMap = {};
      profiles?.forEach((p) => {
        profileMap[p.id] = p.username || p.name || "Commander";
      });

      if (matches) {
        // Club Live-Feed vorbereiten (die letzten 5 Matches des gesamten Clubs)
        const feedItems = matches.slice(0, 5).map((m) => {
          const playerName = profileMap[m.user_id] || "Club-Mitglied";
          const isTournament = m.details?.match_mode === "tournament_complete";
          
          return {
            id: m.id,
            playerName,
            createdAt: m.created_at,
            title: isTournament ? m.details.match_title : `${m.player1_name || playerName} vs ${m.player2_name || "Gegner"}`,
            winner: isTournament ? "Turnier beendet" : m.winner_name,
            isTournament,
          };
        });
        setRecentClubMatches(feedItems);

        // Eigene Stats berechnen (inklusive aufgeschlüsselter Turnierrunden wie in der Hall of Fame)
        let games = 0;
        let wins = 0;
        let currentStreak = 0;
        let streakType = null;

        // Nach Datum sortieren für korrekte Streaks
        const sortedMatches = [...matches].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );

        sortedMatches.forEach((m) => {
          const isUserMatch = m.user_id === user.id;
          if (!isUserMatch) return;

          const isTournament = m.details?.match_mode === "tournament_complete";
          const username = user.username || user.name || "";

          if (isTournament && m.details?.tournament_rounds) {
            m.details.tournament_rounds.forEach((round) => {
              games++;
              const winner = round.winner || "";
              const p1Name = round.p1Name || "";
              const isTie = winner === "Unentschieden" || round.p1Vp === round.p2Vp;
              const isUserWinner = (p1Name && winner.includes(p1Name)) || winner.includes("Spieler 1") || (username && winner.toLowerCase().includes(username.toLowerCase()));

              if (isTie) {
                currentStreak = 0;
                streakType = null;
              } else if (isUserWinner) {
                wins++;
                if (streakType === "win") {
                  currentStreak++;
                } else {
                  streakType = "win";
                  currentStreak = 1;
                }
              } else {
                if (streakType === "loss") {
                  currentStreak++;
                } else {
                  streakType = "loss";
                  currentStreak = 1;
                }
              }
            });
          } else {
            games++;
            const isP1 = m.player1_name?.includes(username) || m.player1_name?.includes("Spieler 1");
            const winner = m.winner_name || "";
            const isTie = winner === "Unentschieden";
            const isUserWinner = winner.includes(username) || winner.includes("Spieler 1");

            if (isTie) {
              currentStreak = 0;
              streakType = null;
            } else if (isUserWinner) {
              wins++;
              if (streakType === "win") {
                currentStreak++;
              } else {
                streakType = "win";
                currentStreak = 1;
              }
            } else {
              if (streakType === "loss") {
                currentStreak++;
              } else {
                streakType = "loss";
                currentStreak = 1;
              }
            }
          }
        });

        const winRate = games > 0 ? Math.round((wins / games) * 100) : 0;
        setMyStats({ games, wins, winRate, streak: currentStreak, streakType });
      }
    } catch (err) {
      console.error("Fehler beim Laden des Dashboards:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* HEADER & WILLKOMMEN */}
      <header className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-amber-500 uppercase tracking-widest">
            Commander Zentrale
          </h2>
          <p className="text-sm text-neutral-300 mt-1">
            Willkommen zurück, <span className="text-amber-400 font-bold">{user.username || user.name}</span>! Bereit für die nächste Schlacht?
          </p>
        </div>
        <button
          onClick={() => setActiveTab("score")}
          className="bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 transition shadow-lg shrink-0"
        >
          <Swords size={16} /> Partie erfassen <ArrowRight size={14} />
        </button>
      </header>

      {/* QUICK STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-center space-y-1">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Gespielte Spiele</div>
          <div className="text-2xl font-mono font-bold text-neutral-100">{myStats.games}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-center space-y-1">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Siege</div>
          <div className="text-2xl font-mono font-bold text-emerald-400">{myStats.wins}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-center space-y-1">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Win Rate</div>
          <div className="text-2xl font-mono font-bold text-amber-500">{myStats.winRate}%</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl text-center space-y-1">
          <div className="text-[10px] uppercase font-bold text-neutral-500">Form / Streak</div>
          <div className="text-lg font-mono font-bold text-neutral-200 mt-1">
            {myStats.streak > 0 ? (
              <span className={`inline-flex items-center gap-1 ${myStats.streakType === "win" ? "text-emerald-400" : "text-red-400"}`}>
                {myStats.streakType === "win" ? <Flame size={14} className="text-amber-500" /> : null}
                {myStats.streak}{myStats.streakType === "win" ? "W" : "L"}
              </span>
            ) : (
              <span className="text-neutral-500 text-sm">-</span>
            )}
          </div>
        </div>
      </div>

      {/* ZWEI SPALTEN: LIVE-FEED & EVENTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* SPALTE 1 & 2: Club Live-Feed */}
        <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
              <Swords size={16} /> Club Live-Feed (Letzte Schlachten)
            </h3>
          </div>

          {loading ? (
            <div className="text-xs text-neutral-500 text-center py-6">Lade Live-Feed...</div>
          ) : recentClubMatches.length === 0 ? (
            <div className="text-xs text-neutral-500 italic py-6 text-center">
              Noch keine Partien im Club eingetragen. Sei der Erste!
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentClubMatches.map((m) => (
                <div key={m.id} className="bg-neutral-950 border border-neutral-800/60 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-neutral-200 flex items-center gap-2">
                      <span className="text-amber-500 font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {m.playerName}
                      </span>
                      {m.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {new Date(m.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40">
                      🏆 {m.winner}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SPALTE 3: Events & Quick Links */}
        <div className="space-y-6">
          {/* Turnier & Event Ticker */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Calendar size={16} /> Events & Termine
            </h3>
            <div className="space-y-3 text-xs">
              <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl space-y-1">
                <div className="font-bold text-neutral-200">Raccoon Rumble 2026</div>
                <p className="text-neutral-400 text-[11px]">Ausflug nach Hof mit dem Fumble Forge Team.</p>
                <span className="inline-block text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mt-1">
                  Teilnahme bestätigt 🎟️
                </span>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl space-y-1">
                <div className="font-bold text-neutral-200">Fumble Forge Cup</div>
                <p className="text-neutral-400 text-[11px]">Internes Club-Turnier in Planung.</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Trophy size={16} className="text-amber-500" /> Schnellzugriff
            </h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => setActiveTab("hof")}
                className="w-full text-left bg-neutral-950 hover:bg-neutral-800/60 p-2.5 rounded-xl text-neutral-300 font-bold transition flex items-center justify-between border border-neutral-800"
              >
                <span>🏆 Hall of Fame</span> <ArrowRight size={14} className="text-neutral-500" />
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className="w-full text-left bg-neutral-950 hover:bg-neutral-800/60 p-2.5 rounded-xl text-neutral-300 font-bold transition flex items-center justify-between border border-neutral-800"
              >
                <span>👥 Club-Mitglieder</span> <ArrowRight size={14} className="text-neutral-500" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}