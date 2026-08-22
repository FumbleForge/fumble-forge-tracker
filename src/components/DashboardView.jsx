import React, { useState, useEffect } from "react";
import {
  Swords,
  Flame,
  ArrowRight,
  Globe,
  Trophy,
  Award,
  Shield,
  MapPin,
  Wrench,
  Magnet,
  Calendar,
  Clock,
  User,
  Users,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const BADGE_ICONS = {
  blood_and_honor: { icon: Award, title: "Blut & Ehre", desc: "Trage dein allererstes Match im Score Tracker ein." },
  club_veteran: { icon: Trophy, title: "Veteran des Clubs", desc: "Trage insgesamt 5 Matches über den Tracker ein." },
  winning_streak: { icon: Flame, title: "Aufstieg der Legende", desc: "Erreiche eine Siegesserie von 3 gewonnenen Spielen in Folge." },
  tournament_winner: { icon: Shield, title: "Der Hausmeister", desc: "Gewinne ein über den internen Turnier-Modus erstelltes Turnier." },
  draw_master: { icon: MapPin, title: "Unbeugsam", desc: "Erziele ein Unentschieden in einem getrackten Match." },
  machinist: { icon: Wrench, title: "Der Maschinist", desc: "Vom Admin verliehen: Aktive Bereitstellung von gedrucktem Club-Gelände." },
  master_of_magnets: { icon: Magnet, title: "Master of Magnets", desc: "Vom Admin verliehen: Vorbildlich magnetisierte modulare Ruinen." },
  on_tour: { icon: Calendar, title: "On Tour", desc: "Bestätige deine Teilnahme an einem externen Event (z.B. Raccoon Rumble)." },
  stammtisch: { icon: Users, title: "Fumble Forged Stammtisch", desc: "Logge dich an 5 verschiedenen Tagen im Club-Portal ein." },
  early_bird: { icon: Clock, title: "Frühe Vögel", desc: "Zusage zu einem Event direkt nach Ankündigung." },
  face_of_the_club: { icon: User, title: "Gesicht des Clubs", desc: "Lade ein eigens Profilbild im Mitglieder-Profil hoch." },
};

export default function DashboardView({ user, setActiveTab, onOpenLegal }) {
  const isAdmin = user?.role === "admin" || user?.email === "namebereitsvergeben@gmail.com";
  const [myStats, setMyStats] = useState({ games: 0, wins: 0, winRate: 0, streak: 0, streakType: null });
  const [recentClubMatches, setRecentClubMatches] = useState([]);
  const [activeAosGame, setActiveAosGame] = useState(null);
  const [active40kGame, setActive40kGame] = useState(null);
  const [myBadges, setMyBadges] = useState([]);
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    // Check AoS game
    const aosStep = localStorage.getItem("fumble_forge_aos_setupStep");
    if (aosStep && aosStep !== '"mode_select"') {
      try {
        const stepParsed = JSON.parse(aosStep);
        if (stepParsed !== "mode_select") {
          const title = JSON.parse(localStorage.getItem("fumble_forge_aos_matchTitle") || '"Freies Spiel"');
          const round = JSON.parse(localStorage.getItem("fumble_forge_aos_currentRound") || '1');
          const players = JSON.parse(localStorage.getItem("fumble_forge_aos_players") || '{}');
          const p1Name = players?.player1?.name || "Player 1";
          const p2Name = players?.player2?.name || "Player 2";
          setActiveAosGame({ title, round, p1Name, p2Name });
        } else {
          setActiveAosGame(null);
        }
      } catch (e) {
        setActiveAosGame(null);
      }
    } else {
      setActiveAosGame(null);
    }

    // Check 40k game
    const whStep = localStorage.getItem("fumble_forge_40k_step");
    if (whStep && whStep !== '"setup"') {
      try {
        const stepParsed = JSON.parse(whStep);
        if (stepParsed !== "setup") {
          const p1Name = JSON.parse(localStorage.getItem("fumble_forge_40k_player1Name") || '"Player 1"');
          const p2Name = JSON.parse(localStorage.getItem("fumble_forge_40k_player2Name") || '"Player 2"');
          const round = JSON.parse(localStorage.getItem("fumble_forge_40k_currentRound") || '1');
          setActive40kGame({ p1Name, p2Name, round });
        } else {
          setActive40kGame(null);
        }
      } catch (e) {
        setActive40kGame(null);
      }
    } else {
      setActive40kGame(null);
    }
  }, []);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });

      if (matchError) throw matchError;

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*");

      if (profileError) throw profileError;

      const profileMap = {};
      profiles?.forEach((p) => {
        profileMap[p.id] = p.username || p.name || "Commander";
      });

      const myProfile = profiles?.find((p) => p.id === user.id);
      if (myProfile) {
        const parseArrayField = (field) => {
          if (Array.isArray(field)) return field;
          if (typeof field === "string") {
            try {
              const parsed = JSON.parse(field);
              if (Array.isArray(parsed)) return parsed;
            } catch (e) {
              return [];
            }
          }
          return [];
        };
        const custom = parseArrayField(myProfile.custom_badges);
        const loginDays = parseArrayField(myProfile.login_days);
        
        // Fetch my events
        const { data: myEvents } = await supabase
          .from("event_attendees")
          .select("*")
          .eq("user_id", user.id);

        const myMatches = matches?.filter((m) => m.user_id === user.id) || [];

        // Evaluate calculated badges
        const calculatedBadges = [];
        if (myMatches.length >= 1) calculatedBadges.push("blood_and_honor");
        if (myMatches.length >= 5) calculatedBadges.push("club_veteran");

        let currentStreak = 0;
        let hasWinningStreak = false;

        for (const m of myMatches) {
          const isTournament = m.details?.match_mode === "tournament_complete";
          if (isTournament && m.details?.tournament_rounds) {
            for (const round of m.details.tournament_rounds) {
              const p1Vp = Number(round.p1Vp) || 0;
              const p2Vp = Number(round.p2Vp) || 0;
              const isTie = round.winner === "Unentschieden" || p1Vp === p2Vp;
              const isUserWinner = p1Vp > p2Vp;

              if (isTie) {
                currentStreak = 0;
              } else if (isUserWinner) {
                currentStreak++;
                if (currentStreak >= 3) hasWinningStreak = true;
              } else {
                currentStreak = 0;
              }
            }
          } else {
            const p1Vp = Number(m.player1_vp) || 0;
            const p2Vp = Number(m.player2_vp) || 0;
            const isTie = m.winner_name === "Unentschieden" || p1Vp === p2Vp;
            const isUserWinner = p1Vp > p2Vp;

            if (isTie) {
              currentStreak = 0;
            } else if (isUserWinner) {
              currentStreak++;
              if (currentStreak >= 3) hasWinningStreak = true;
            } else {
              currentStreak = 0;
            }
          }
        }

        if (hasWinningStreak) calculatedBadges.push("winning_streak");

        const hasWonTournament = myMatches.some((m) => {
          const isTournament = m.details?.match_mode === "tournament_complete";
          const p1Vp = Number(m.player1_vp) || 0;
          const p2Vp = Number(m.player2_vp) || 0;
          return isTournament && p1Vp > p2Vp;
        });
        if (hasWonTournament) calculatedBadges.push("tournament_winner");

        const hasDraw = myMatches.some((m) => {
          const isTournament = m.details?.match_mode === "tournament_complete";
          if (isTournament && m.details?.tournament_rounds) {
            return m.details.tournament_rounds.some(
              (r) => r.winner === "Unentschieden" || Number(r.p1Vp) === Number(r.p2Vp)
            );
          }
          return m.winner_name === "Unentschieden" || Number(m.player1_vp) === Number(m.player2_vp);
        });
        if (hasDraw) calculatedBadges.push("draw_master");

        if (custom.includes("machinist")) calculatedBadges.push("machinist");
        if (custom.includes("master_of_magnets")) calculatedBadges.push("master_of_magnets");

        if (myEvents && myEvents.length > 0) {
          calculatedBadges.push("on_tour");
          calculatedBadges.push("early_bird");
        }

        if (loginDays.length >= 5) calculatedBadges.push("stammtisch");

        if (myProfile.avatar_url) {
          calculatedBadges.push("face_of_the_club");
        }

        const existingUnlocked = parseArrayField(myProfile.unlocked_badges);
        const mergedBadges = Array.from(new Set([...existingUnlocked, ...calculatedBadges]));

        if (mergedBadges.length !== existingUnlocked.length) {
          await supabase
            .from("profiles")
            .update({ unlocked_badges: mergedBadges })
            .eq("id", user.id);
        }

        setMyBadges(Array.from(new Set([...mergedBadges, ...custom])));
      }

      if (matches) {
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
            player1_name: m.player1_name || playerName,
            player2_name: m.player2_name || "Gegner",
            player1_vp: m.player1_vp,
            player2_vp: m.player2_vp,
            winner_name: m.winner_name,
          };
        });
        setRecentClubMatches(feedItems);

        let games = 0;
        let wins = 0;
        let currentStreak = 0;
        let streakType = null;

        const sortedMatches = [...matches].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );

        sortedMatches.forEach((m) => {
          const isUserMatch = m.user_id === user.id;
          if (!isUserMatch) return;

          const isTournament = m.details?.match_mode === "tournament_complete";

          if (isTournament && m.details?.tournament_rounds) {
            m.details.tournament_rounds.forEach((round) => {
              games++;
              const p1Vp = Number(round.p1Vp) || 0;
              const p2Vp = Number(round.p2Vp) || 0;
              const isTie = round.winner === "Unentschieden" || p1Vp === p2Vp;
              const isUserWinner = p1Vp > p2Vp;

              if (isTie) {
                currentStreak = 0;
                streakType = null;
              } else if (isUserWinner) {
                wins++;
                if (streakType === "win") currentStreak++;
                else { streakType = "win"; currentStreak = 1; }
              } else {
                if (streakType === "loss") currentStreak++;
                else { streakType = "loss"; currentStreak = 1; }
              }
            });
          } else {
            games++;
            const p1Vp = Number(m.player1_vp) || 0;
            const p2Vp = Number(m.player2_vp) || 0;
            const isTie = m.winner_name === "Unentschieden" || p1Vp === p2Vp;
            const isUserWinner = p1Vp > p2Vp;

            if (isTie) {
              currentStreak = 0;
              streakType = null;
            } else if (isUserWinner) {
              wins++;
              if (streakType === "win") currentStreak++;
              else { streakType = "win"; currentStreak = 1; }
            } else {
              if (streakType === "loss") currentStreak++;
              else { streakType = "loss"; currentStreak = 1; }
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("score")}
            className="bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 transition shadow-lg shrink-0 cursor-pointer justify-center"
          >
            <Swords size={16} /> Partie AoS erfassen <ArrowRight size={14} />
          </button>
          <button
            onClick={() => setActiveTab("score_40k")}
            className="bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold px-5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 transition shadow-lg shrink-0 cursor-pointer justify-center"
          >
            <Swords size={16} /> Partie 40k erfassen <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* LAUFENDE PARTIEN FORTSETZEN */}
      {(activeAosGame || active40kGame) && (
        <div className="bg-neutral-900 border border-amber-600/30 p-5 rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <Flame size={16} className="text-amber-500" /> Laufende Schlacht fortführen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAosGame && (
              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-neutral-200 text-sm mb-1">Age of Sigmar</div>
                  <div className="text-neutral-400 font-bold">{activeAosGame.title}</div>
                  <div className="text-neutral-500 mt-1">{activeAosGame.p1Name} vs {activeAosGame.p2Name} • Runde {activeAosGame.round}</div>
                </div>
                <button
                  onClick={() => setActiveTab("score")}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-2 rounded-lg text-xs uppercase transition cursor-pointer"
                >
                  Schlacht fortsetzen ➔
                </button>
              </div>
            )}

            {active40kGame && (
              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-neutral-200 text-sm mb-1">Warhammer 40.000</div>
                  <div className="text-neutral-400 font-bold">{active40kGame.p1Name} vs {active40kGame.p2Name}</div>
                  <div className="text-neutral-500 mt-1">Runde {active40kGame.round} / 5</div>
                </div>
                <button
                  onClick={() => setActiveTab("score_40k")}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-2 rounded-lg text-xs uppercase transition cursor-pointer"
                >
                  Schlacht fortsetzen ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* VERDIENTE TROPHÄEN / BADGES */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl space-y-3.5 shadow-xl">
        <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" /> Verdiente Trophäen & Abzeichen ({myBadges.length})
        </h3>
        {myBadges.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">
            Noch keine Trophäen verdient. Trage deine ersten Spiele ein, lade ein Profilbild hoch oder nimm an Club-Events teil!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {myBadges.map((badgeId) => {
              const badgeInfo = BADGE_ICONS[badgeId];
              if (!badgeInfo) return null;
              const IconComp = badgeInfo.icon;
              const title = badgeInfo.title;
              const desc = badgeInfo.desc;
              const tooltipKey = `dashboard-${badgeId}`;

              return (
                <div
                  key={badgeId}
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setActiveTooltip(tooltipKey)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  onClick={() => setActiveTooltip(activeTooltip === tooltipKey ? null : tooltipKey)}
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg hover:bg-amber-500/20 hover:border-amber-400 transition transform hover:-translate-y-0.5">
                    <IconComp size={20} />
                  </div>

                  {activeTooltip === tooltipKey && (
                    <div
                      className="fixed bottom-4 left-4 right-4 z-50 mb-0 w-auto p-4 bg-neutral-950 border-2 border-amber-500/80 text-neutral-100 rounded-2xl shadow-2xl sm:absolute sm:bottom-full sm:left-1/2 sm:-translate-x-1/2 sm:mb-2.5 sm:p-3 sm:w-56 sm:border sm:border-amber-500/60 sm:rounded-xl sm:shadow-2xl text-left cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(null);
                      }}
                    >
                      <div className="text-xs font-black text-amber-400 flex items-center gap-1.5 mb-1">
                        <IconComp size={12} /> {title}
                      </div>
                      <p className="text-[10px] text-neutral-300 leading-normal font-medium">
                        {desc}
                      </p>
                      <div className="text-[8px] uppercase tracking-wider font-bold text-emerald-400 mt-1.5">
                        Freigeschaltet ✓
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
              {recentClubMatches.map((m) => {
                const isTie = m.winner === "Unentschieden" || m.winner_name === "Unentschieden";
                const badgeColor = isTie
                  ? "text-orange-400 bg-orange-950/40 border border-orange-800/40"
                  : "text-emerald-400 bg-emerald-950/40 border border-emerald-800/40";

                return (
                  <div key={m.id} className="bg-neutral-950 border border-neutral-800/60 p-3 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber-500 font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {m.playerName}
                        </span>
                        
                        {m.isTournament ? (
                          <span className="font-bold text-neutral-200">{m.title}</span>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-200 leading-tight">{m.player1_name}</span>
                              <span className="text-amber-500 font-mono text-[11px] font-bold leading-none">{m.player1_vp ?? 0} VP</span>
                            </div>
                            <span className="text-neutral-500 font-bold">vs</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-200 leading-tight">{m.player2_name}</span>
                              <span className="text-amber-500 font-mono text-[11px] font-bold leading-none">{m.player2_vp ?? 0} VP</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        {new Date(m.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-[11px] font-bold px-2 py-1 rounded border ${badgeColor}`}>
                        🏆 {m.winner}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SPALTE 3: Quick Links */}
        <div className="space-y-6">
          {/* Fumble Forged Netzwerk */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Globe size={16} className="text-amber-500" /> Fumble Forged Netzwerk
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <a
                href="https://www.fumble-forged.de"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-950 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-xl transition text-[11px] font-bold group"
                title="Fumble Forged Website"
              >
                <Globe size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span>Web</span>
              </a>

              <a
                href="https://www.instagram.com/fumbleforged?igsi=aWtucHRkMWQxeG42"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-950 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-xl transition text-[11px] font-bold group"
                title="Instagram"
              >
                <svg
                  className="w-4 h-4 fill-current text-amber-500 group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Insta</span>
              </a>

              <a
                href="https://discord.gg/zK2j7NpRfF"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-950 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-xl transition text-[11px] font-bold group"
                title="Discord Server"
              >
                <svg
                  className="w-4 h-4 fill-current text-amber-500 group-hover:scale-110 transition-transform"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.011c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Discord</span>
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Impressum & Datenschutz */}
      <div className="text-center pt-8 border-t border-neutral-800">
        <button
          onClick={onOpenLegal}
          className="text-[10px] text-neutral-500 hover:text-amber-400 transition underline underline-offset-2 cursor-pointer"
        >
          Impressum & Datenschutz
        </button>
      </div>
    </div>
  );
}
