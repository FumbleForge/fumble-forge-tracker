import React, { useState, useEffect } from "react";
import {
  Users,
  Shield,
  Award,
  Trophy,
  Flame,
  MapPin,
  Wrench,
  Magnet,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import { supabase } from "../supabaseClient";

// Zuordnung der Badge-IDs zu Icons & Namen für die Mini-Ansicht
const BADGE_ICONS = {
  blood_and_honor: { icon: Award, title: "Blut & Ehre" },
  club_veteran: { icon: Trophy, title: "Veteran des Clubs" },
  winning_streak: { icon: Flame, title: "Aufstieg der Legende" },
  tournament_winner: { icon: Shield, title: "Der Hausmeister" },
  draw_master: { icon: MapPin, title: "Unbeugsam" },
  machinist: { icon: Wrench, title: "Der Maschinist" },
  master_of_magnets: { icon: Magnet, title: "Master of Magnets" },
  on_tour: { icon: Calendar, title: "On Tour" },
  stammtisch: { icon: Users, title: "Fumble Forged Stammtisch" },
  early_bird: { icon: Clock, title: "Frühe Vögel" },
  face_of_the_club: { icon: User, title: "Gesicht des Clubs" },
};

export default function MemberList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    fetchMembersAndEvaluateBadges();
  }, []);

  const fetchMembersAndEvaluateBadges = async () => {
    try {
      setLoading(true);

      // 1. Alle Profile laden
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });

      if (profilesError) throw profilesError;
      if (!profilesData) return;

      // 2. Alle Matches und Event-Teilnahmen für alle User vorab laden
      const { data: allMatches } = await supabase.from("matches").select("*");
      const { data: allEvents } = await supabase.from("event_attendees").select("*");

      // 3. Für jedes Mitglied die Badges zentral live berechnen und in Supabase aktualisieren, falls etwas fehlt
      const updatedMembers = await Promise.all(
        profilesData.map(async (member) => {
          const userMatches = (allMatches || []).filter((m) => m.user_id === member.id);
          const userEvents = (allEvents || []).filter((e) => e.user_id === member.id);
          const username = member.username || "";
          const custom = Array.isArray(member.custom_badges) ? member.custom_badges : [];
          const loginDays = Array.isArray(member.login_days) ? member.login_days : [];

          const calculatedBadges = [];

          // --- BADGE LOGIK PRÜFUNG ---
          // Blut & Ehre (>= 1 Match)
          if (userMatches.length >= 1) calculatedBadges.push("blood_and_honor");

          // Veteran des Clubs (>= 5 Matches)
          if (userMatches.length >= 5) calculatedBadges.push("club_veteran");

          // Winning Streak (3 in Folge)
          let currentStreak = 0;
          let hasWinningStreak = false;
          for (const m of userMatches) {
            const isTournament = m.details?.match_mode === "tournament_complete";
            if (isTournament && m.details?.tournament_rounds) {
              for (const round of m.details.tournament_rounds) {
                const winner = round.winner || "";
                const p1Name = round.p1Name || "";
                const isTie = winner === "Unentschieden" || round.p1Vp === round.p2Vp;
                const isUserWinner =
                  (p1Name && winner.includes(p1Name)) ||
                  winner.includes("Spieler 1") ||
                  (username && winner.toLowerCase().includes(username.toLowerCase()));

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
              const winner = m.winner_name || "";
              const isTie = winner === "Unentschieden";
              const isUserWinner =
                winner.includes("Spieler 1") ||
                (username && winner.toLowerCase().includes(username.toLowerCase()));

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

          // Turnier-Gewinner ("Der Hausmeister")
          const hasWonTournament = userMatches.some((m) => {
            const isTournament = m.details?.match_mode === "tournament_complete";
            const winner = m.winner_name || "";
            return isTournament && username && winner.toLowerCase().includes(username.toLowerCase());
          });
          if (hasWonTournament) calculatedBadges.push("tournament_winner");

          // Unentschieden ("Unbeugsam")
          const hasDraw = userMatches.some((m) => {
            const isTournament = m.details?.match_mode === "tournament_complete";
            if (isTournament && m.details?.tournament_rounds) {
              return m.details.tournament_rounds.some(
                (r) => r.winner === "Unentschieden" || r.p1Vp === r.p2Vp
              );
            }
            return m.winner_name === "Unentschieden";
          });
          if (hasDraw) calculatedBadges.push("draw_master");

          // Admin Werkstatt Badges
          if (custom.includes("machinist")) calculatedBadges.push("machinist");
          if (custom.includes("master_of_magnets")) calculatedBadges.push("master_of_magnets");

          // Community Badges (On Tour / Events)
          if (userEvents.length > 0) {
            calculatedBadges.push("on_tour");
            calculatedBadges.push("early_bird");
          }

          // Stammtisch (>= 5 Login Tage)
          if (loginDays.length >= 5) calculatedBadges.push("stammtisch");

          // Gesicht des Clubs (Avatar vorhanden)
          if (member.avatar_url) {
            calculatedBadges.push("face_of_the_club");
          }

          const existingUnlocked = Array.isArray(member.unlocked_badges) ? member.unlocked_badges : [];
          const mergedBadges = Array.from(new Set([...existingUnlocked, ...calculatedBadges]));

          // Falls sich neue Badges ergeben haben, direkt im Hintergrund in Supabase speichern
          if (mergedBadges.length !== existingUnlocked.length) {
            await supabase
              .from("profiles")
              .update({ unlocked_badges: mergedBadges })
              .eq("id", member.id);
            member.unlocked_badges = mergedBadges;
          }

          return member;
        })
      );

      setMembers(updatedMembers);
    } catch (err) {
      console.error("Fehler beim Laden und Evaluieren der Mitglieder:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <header className="border-b border-amber-600/30 pb-4">
        <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <Users className="text-amber-500" /> Fumble Forged Mitglieder
        </h2>
        <p className="text-xs text-neutral-400">
          Die Commanders, Spielsysteme und Armeen unserer Community
        </p>
      </header>

      {loading ? (
        <div className="text-xs text-neutral-500 italic py-8 text-center">
          Lade Mitgliederliste und synchronisiere Trophäen...
        </div>
      ) : members.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl text-xs text-neutral-500 italic text-center">
          Noch keine Mitglieder registriert.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => {
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

            const unlocked = parseArrayField(member.unlocked_badges);
            const custom = parseArrayField(member.custom_badges);
            const memberBadges = Array.from(new Set([...unlocked, ...custom]));

            return (
              <div
                key={member.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-amber-600/50 transition rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-neutral-950 border-2 border-amber-600/40 flex items-center justify-center overflow-hidden shrink-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.username || "Mitglied"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users size={24} className="text-neutral-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-neutral-100">
                        {member.username || "Unbenannter Commander"}
                      </h3>
                      <p className="text-xs text-amber-500 font-bold flex items-center gap-1 mt-0.5">
                        <Shield size={12} /> {member.club || "Fumble Forged"}
                      </p>
                    </div>
                  </div>

                  {memberBadges.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap justify-end max-w-[140px]">
                      {memberBadges.map((badgeId) => {
                        const badgeInfo = BADGE_ICONS[badgeId];
                        if (!badgeInfo) return null;
                        const IconComp = badgeInfo.icon;
                        const title = badgeInfo.title;
                        const tooltipKey = `${member.id}-${badgeId}`;

                        return (
                          <div
                            key={badgeId}
                            className="relative group cursor-pointer"
                            onMouseEnter={() => setActiveTooltip(tooltipKey)}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-sm shrink-0 hover:border-amber-400 transition">
                              <IconComp size={14} />
                            </div>

                            {activeTooltip === tooltipKey && (
                              <div className="absolute bottom-full right-0 mb-1.5 px-2.5 py-1 bg-neutral-950 border border-amber-500/60 text-amber-300 text-[10px] font-bold rounded-md shadow-xl whitespace-nowrap z-50 pointer-events-none">
                                {title}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 pt-3 border-t border-neutral-800/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Spielsysteme:
                    </span>
                    <span className="text-neutral-300 font-medium">
                      {member.game_systems || "Keine angegeben"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Armeen / Fraktionen:
                    </span>
                    <span className="text-neutral-300 font-medium">
                      {member.armies || "Keine angegeben"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}