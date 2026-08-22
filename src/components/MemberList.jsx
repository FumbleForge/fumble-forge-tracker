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

export default function MemberList({ currentUser }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [activeChallenges, setActiveChallenges] = useState([]);

  const isAdmin = currentUser?.role === "admin" || currentUser?.email === "namebereitsvergeben@gmail.com";

  useEffect(() => {
    fetchMembersAndEvaluateBadges();
  }, []);

  const hasAnyActiveChallenge = (userId) => {
    return activeChallenges.some(
      (c) => (c.challenger_id === userId || c.opponent_id === userId) && (c.status === "pending" || c.status === "accepted")
    );
  };

  const getAcceptedChallenge = (userId) => {
    return activeChallenges.find(
      (c) => (c.challenger_id === userId || c.opponent_id === userId) && c.status === "accepted"
    );
  };

  const handleChallenge = async (opponentId, system) => {
    if (!currentUser) return;
    try {
      const { data: existingCheck, error: checkErr } = await supabase
        .from("challenges")
        .select("*")
        .in("status", ["pending", "accepted"]);
      
      if (checkErr) throw checkErr;

      const someoneHasActive = (existingCheck || []).some(
        (c) => c.challenger_id === currentUser.id || c.opponent_id === currentUser.id || c.challenger_id === opponentId || c.opponent_id === opponentId
      );

      if (someoneHasActive) {
        alert("Entweder du oder dein Gegner ist bereits in einer aktiven Herausforderung!");
        return;
      }

      const { error } = await supabase
        .from("challenges")
        .insert([
          {
            challenger_id: currentUser.id,
            opponent_id: opponentId,
            system,
            status: "pending"
          }
        ]);

      if (error) throw error;

      alert("Herausforderung erfolgreich gesendet!");
      fetchMembersAndEvaluateBadges();
    } catch (err) {
      console.error("Fehler beim Erstellen der Herausforderung:", err);
      alert("Fehler beim Erstellen der Herausforderung: " + err.message);
    }
  };

  const handleRevokeBadge = async (memberId, badgeId) => {
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;

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

      const custom = parseArrayField(member.custom_badges);
      const unlocked = parseArrayField(member.unlocked_badges);

      const updatedCustom = [...custom.filter((b) => b !== badgeId), `revoked:${badgeId}`];
      const updatedUnlocked = unlocked.filter((b) => b !== badgeId);

      const { error } = await supabase
        .from("profiles")
        .update({
          custom_badges: updatedCustom,
          unlocked_badges: updatedUnlocked,
          updated_at: new Date()
        })
        .eq("id", memberId);

      if (error) throw error;

      await fetchMembersAndEvaluateBadges();
      setActiveTooltip(null);
    } catch (err) {
      console.error("Fehler beim Entziehen des Abzeichens:", err);
    }
  };

  const handleRestoreBadge = async (memberId, badgeId) => {
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;

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

      const custom = parseArrayField(member.custom_badges);

      const updatedCustom = custom.filter((b) => b !== `revoked:${badgeId}`);

      const { error } = await supabase
        .from("profiles")
        .update({
          custom_badges: updatedCustom,
          updated_at: new Date()
        })
        .eq("id", memberId);

      if (error) throw error;

      await fetchMembersAndEvaluateBadges();
      setActiveTooltip(null);
    } catch (err) {
      console.error("Fehler beim Wiederherstellen des Abzeichens:", err);
    }
  };

  const fetchMembersAndEvaluateBadges = async () => {
    try {
      setLoading(true);

      const { data: challengesData } = await supabase
        .from("challenges")
        .select("*")
        .in("status", ["pending", "accepted"]);
      setActiveChallenges(challengesData || []);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });

      if (profilesError) throw profilesError;
      if (!profilesData) return;

      const { data: allMatches } = await supabase.from("matches").select("*");
      const { data: allEvents } = await supabase.from("event_attendees").select("*");

      const updatedMembers = await Promise.all(
        profilesData.map(async (member) => {
          const userMatches = (allMatches || []).filter((m) => m.user_id === member.id);
          const userEvents = (allEvents || []).filter((e) => e.user_id === member.id);
          const custom = Array.isArray(member.custom_badges) ? member.custom_badges : [];
          const loginDays = Array.isArray(member.login_days) ? member.login_days : [];

          const calculatedBadges = [];

          if (userMatches.length >= 1) calculatedBadges.push("blood_and_honor");
          if (userMatches.length >= 5) calculatedBadges.push("club_veteran");

          let currentStreak = 0;
          let hasWinningStreak = false;

          for (const m of userMatches) {
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

          const hasWonTournament = userMatches.some((m) => {
            const isTournament = m.details?.match_mode === "tournament_complete";
            const p1Vp = Number(m.player1_vp) || 0;
            const p2Vp = Number(m.player2_vp) || 0;
            return isTournament && p1Vp > p2Vp;
          });
          if (hasWonTournament) calculatedBadges.push("tournament_winner");

          const hasDraw = userMatches.some((m) => {
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

          if (userEvents.length > 0) {
            calculatedBadges.push("on_tour");
            calculatedBadges.push("early_bird");
          }

          if (loginDays.length >= 5) calculatedBadges.push("stammtisch");

          if (member.avatar_url) {
            calculatedBadges.push("face_of_the_club");
          }

          const revokedBadgeIds = custom
            .filter((b) => typeof b === "string" && b.startsWith("revoked:"))
            .map((b) => b.replace("revoked:", ""));

          const filteredCalculated = calculatedBadges.filter((id) => !revokedBadgeIds.includes(id));
          const existingUnlocked = Array.isArray(member.unlocked_badges) ? member.unlocked_badges : [];
          const filteredExisting = existingUnlocked.filter((id) => !revokedBadgeIds.includes(id));

          const mergedBadges = Array.from(new Set([...filteredExisting, ...filteredCalculated]));

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
            const revokedBadgeIds = custom
              .filter((b) => typeof b === "string" && b.startsWith("revoked:"))
              .map((b) => b.replace("revoked:", ""));

            const filteredUnlocked = unlocked.filter((id) => !revokedBadgeIds.includes(id));
            const filteredCustom = custom.filter((id) => typeof id === "string" && !id.startsWith("revoked:"));
            const memberBadges = Array.from(new Set([...filteredUnlocked, ...filteredCustom]));

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

                  {(memberBadges.length > 0 || (isAdmin && revokedBadgeIds.length > 0)) && (
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTooltip(activeTooltip === tooltipKey ? null : tooltipKey);
                            }}
                          >
                            <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-sm shrink-0 hover:border-amber-400 transition">
                              <IconComp size={14} />
                            </div>

                            {activeTooltip === tooltipKey && (
                              <div
                                className="fixed bottom-4 left-4 right-4 z-50 mb-0 w-auto p-4 bg-neutral-950 border-2 border-amber-500/80 text-amber-300 text-xs font-bold rounded-2xl shadow-2xl sm:absolute sm:bottom-full sm:right-0 sm:mb-1.5 sm:px-2.5 sm:py-1 sm:border sm:border-amber-500/60 sm:text-[10px] sm:rounded-md sm:shadow-xl sm:whitespace-nowrap sm:w-auto sm:transform-none cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltip(null);
                                }}
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <IconComp size={14} className="text-amber-400 shrink-0" />
                                    <span>{title}</span>
                                  </div>
                                  {isAdmin && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Möchtest du dieses Abzeichen (${title}) für dieses Mitglied wirklich entziehen/löschen?`)) {
                                          await handleRevokeBadge(member.id, badgeId);
                                        }
                                      }}
                                      className="mt-1 bg-red-950 text-red-400 border border-red-800 hover:bg-red-900 px-2 py-0.5 rounded font-bold text-[9px] cursor-pointer transition text-center"
                                    >
                                      Entziehen
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {isAdmin && revokedBadgeIds.map((badgeId) => {
                        const badgeInfo = BADGE_ICONS[badgeId];
                        if (!badgeInfo) return null;
                        const IconComp = badgeInfo.icon;
                        const title = badgeInfo.title;
                        const tooltipKey = `${member.id}-${badgeId}-revoked`;

                        return (
                          <div
                            key={badgeId}
                            className="relative group cursor-pointer opacity-30"
                            onMouseEnter={() => setActiveTooltip(tooltipKey)}
                            onMouseLeave={() => setActiveTooltip(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTooltip(activeTooltip === tooltipKey ? null : tooltipKey);
                            }}
                          >
                            <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-red-500/40 text-red-400 flex items-center justify-center shadow-sm shrink-0 hover:border-red-400 transition">
                              <IconComp size={14} />
                            </div>

                            {activeTooltip === tooltipKey && (
                              <div
                                className="fixed bottom-4 left-4 right-4 z-50 mb-0 w-auto p-4 bg-neutral-950 border-2 border-red-500/80 text-red-300 text-xs font-bold rounded-2xl shadow-2xl sm:absolute sm:bottom-full sm:right-0 sm:mb-1.5 sm:px-2.5 sm:py-1 sm:border sm:border-red-500/60 sm:text-[10px] sm:rounded-md sm:shadow-xl sm:whitespace-nowrap sm:w-auto sm:transform-none cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTooltip(null);
                                }}
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <IconComp size={14} className="text-red-400 shrink-0" />
                                    <span>{title} (Entzogen)</span>
                                  </div>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleRestoreBadge(member.id, badgeId);
                                    }}
                                    className="mt-1 bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 px-2 py-0.5 rounded font-bold text-[9px] cursor-pointer transition text-center"
                                  >
                                    Wiederherstellen
                                  </button>
                                </div>
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
                      {member.armies 
                        ? member.armies.split(",").map(a => a.trim() === "-" ? "Ogor Mawtribes" : a.trim()).join(", ") 
                        : "Keine angegeben"}
                    </span>
                  </div>

                  {currentUser && member.id !== currentUser.id && (
                    <div className="pt-3 border-t border-neutral-800/80 flex gap-2">
                      <button
                        disabled={hasAnyActiveChallenge(currentUser.id) || hasAnyActiveChallenge(member.id)}
                        onClick={() => handleChallenge(member.id, "aos")}
                        className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-500/30 hover:border-amber-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        Herausfordern (AoS)
                      </button>
                      <button
                        disabled={hasAnyActiveChallenge(currentUser.id) || hasAnyActiveChallenge(member.id)}
                        onClick={() => handleChallenge(member.id, "40k")}
                        className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/30 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        Herausfordern (40k)
                      </button>
                    </div>
                  )}
                  {currentUser && (hasAnyActiveChallenge(currentUser.id) || hasAnyActiveChallenge(member.id)) && member.id !== currentUser.id && (
                    <p className="text-[10px] text-neutral-500 italic text-center mt-1">
                      Bereits in einer aktiven Herausforderung
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}