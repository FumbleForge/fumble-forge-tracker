import React, { useState, useEffect } from "react";
import {
  User,
  Camera,
  Save,
  Check,
  AlertCircle,
  Trophy,
  Trash2,
  Award,
  Flame,
  Shield,
  MapPin,
  Lock,
  Wrench,
  Magnet,
  Calendar,
  Users,
  Clock,
  X,
  Swords,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import StatsDashboard from "./StatsDashboard";

const BADGE_DEFINITIONS = [
  {
    id: "blood_and_honor",
    title: "Blut & Ehre",
    desc: "Trage dein allererstes Match im Score Tracker ein.",
    category: "Schlachtfelder",
    icon: Award,
    check: (matches) => matches.length >= 1,
  },
  {
    id: "club_veteran",
    title: "Veteran des Clubs",
    desc: "Trage insgesamt 5 Matches über den Tracker ein.",
    category: "Schlachtfelder",
    icon: Trophy,
    check: (matches) => matches.length >= 5,
  },
  {
    id: "winning_streak",
    title: "Aufstieg der Legende",
    desc: "Erreiche eine Siegesserie von 3 gewonnenen Spielen in Folge.",
    category: "Schlachtfelder",
    icon: Flame,
    check: (matches) => {
      let currentStreak = 0;
      for (const m of matches) {
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
              if (currentStreak >= 3) return true;
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
            if (currentStreak >= 3) return true;
          } else {
            currentStreak = 0;
          }
        }
      }
      return false;
    },
  },
  {
    id: "tournament_winner",
    title: "Der Hausmeister",
    desc: "Gewinne ein über den internen Turnier-Modus erstelltes Turnier.",
    category: "Schlachtfelder",
    icon: Shield,
    check: (matches) => {
      return matches.some((m) => {
        const isTournament = m.details?.match_mode === "tournament_complete";
        const p1Vp = Number(m.player1_vp) || 0;
        const p2Vp = Number(m.player2_vp) || 0;
        return isTournament && p1Vp > p2Vp;
      });
    },
  },
  {
    id: "draw_master",
    title: "Unbeugsam",
    desc: "Erziele ein Unentschieden in einem getrackten Match.",
    category: "Schlachtfelder",
    icon: MapPin,
    check: (matches) => {
      return matches.some((m) => {
        const isTournament = m.details?.match_mode === "tournament_complete";
        if (isTournament && m.details?.tournament_rounds) {
          return m.details.tournament_rounds.some(
            (r) => r.winner === "Unentschieden" || Number(r.p1Vp) === Number(r.p2Vp)
          );
        }
        return m.winner_name === "Unentschieden" || Number(m.player1_vp) === Number(m.player2_vp);
      });
    },
  },
  {
    id: "machinist",
    title: "Der Maschinist",
    desc: "Vom Admin verliehen: Aktive Bereitstellung von gedrucktem Club-Gelände.",
    category: "Werkstatt",
    icon: Wrench,
    check: (matches, events, username, user, customBadges) => customBadges.includes("machinist"),
  },
  {
    id: "master_of_magnets",
    title: "Master of Magnets",
    desc: "Vom Admin verliehen: Vorbildlich magnetisierte modulare Ruinen.",
    category: "Werkstatt",
    icon: Magnet,
    check: (matches, events, username, user, customBadges) => customBadges.includes("master_of_magnets"),
  },
  {
    id: "on_tour",
    title: "On Tour",
    desc: "Bestätige deine Teilnahme an einem externen Event (z.B. Raccoon Rumble).",
    category: "Community",
    icon: Calendar,
    check: (matches, events) => events.length > 0,
  },
  {
    id: "stammtisch",
    title: "Fumble Forged Stammtisch",
    desc: "Logge dich an 5 verschiedenen Tagen im Club-Portal ein.",
    category: "Community",
    icon: Users,
    check: (matches, events, username, user, customBadges, loginDays) => loginDays.length >= 5,
  },
  {
    id: "early_bird",
    title: "Frühe Vögel",
    desc: "Zusage zu einem Event direkt nach Ankündigung.",
    category: "Community",
    icon: Clock,
    check: (matches, events) => events.length > 0,
  },
  {
    id: "face_of_the_club",
    title: "Gesicht des Clubs",
    desc: "Lade ein eigenes Profilbild im Mitglieder-Profil hoch.",
    category: "Community",
    icon: User,
    check: (matches, events, username, user, customBadges, loginDays, avatarUrl) => Boolean(avatarUrl),
  },
];

export default function UserProfile({ user, onUpdateProfile, onOpenLegal }) {
  const [username, setUsername] = useState(
    user?.username || user?.user_metadata?.username || ""
  );
  const [club, setClub] = useState(user?.club || "");
  const [aosArmies, setAosArmies] = useState(user?.aos_armies || user?.armies || "");
  const [wh40kArmies, setWh40kArmies] = useState(user?.wh40k_armies || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [matches, setMatches] = useState([]);
  const [flattenedMatches, setFlattenedMatches] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [customBadges, setCustomBadges] = useState([]);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState([]);
  const [loginDays, setLoginDays] = useState([]);
  const [hasLoadedUserData, setHasLoadedUserData] = useState(false);
  
  const [showAllBadgesModal, setShowAllBadgesModal] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user?.id) return;

    try {
      const { data: matchData } = await supabase
        .from("matches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (matchData) {
        setMatches(matchData);

        const processed = [];
        matchData.forEach((m) => {
          const isTournament = m.details?.match_mode === "tournament_complete";
          if (isTournament && m.details?.tournament_rounds) {
            m.details.tournament_rounds.forEach((round) => {
              processed.push({
                ...m,
                player1_vp: round.p1Vp,
                player2_vp: round.p2Vp,
                winner_name: round.winner,
                player1_name: round.p1Name || username,
                player2_name: round.p2Name || "Gegner",
              });
            });
          } else {
            processed.push(m);
          }
        });
        setFlattenedMatches(processed);
      }

      const { data: eventData } = await supabase
        .from("event_attendees")
        .select("*")
        .eq("user_id", user.id);

      if (eventData) {
        setUserEvents(eventData);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        if (profileData.custom_badges) setCustomBadges(profileData.custom_badges);
        if (profileData.unlocked_badges) setUnlockedBadgeIds(profileData.unlocked_badges);
        if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
        if (profileData.aos_armies) setAosArmies(profileData.aos_armies);
        else if (profileData.armies) setAosArmies(profileData.armies);
        if (profileData.wh40k_armies) setWh40kArmies(profileData.wh40k_armies);
        
        const todayStr = new Date().toISOString().split("T")[0];
        let days = profileData.login_days || [];
        if (!days.includes(todayStr)) {
          days.push(todayStr);
          await supabase
            .from("profiles")
            .upsert({ id: user.id, login_days: days, updated_at: new Date() });
        }
        setLoginDays(days);
      }
      setHasLoadedUserData(true);
    } catch (err) {
      console.error("Fehler beim Laden der Benutzerdaten:", err.message);
    }
  };

  useEffect(() => {
    if (!user?.id || !hasLoadedUserData || BADGE_DEFINITIONS.length === 0) return;

    const revokedBadgeIds = customBadges
      .filter((b) => typeof b === "string" && b.startsWith("revoked:"))
      .map((b) => b.replace("revoked:", ""));

    const currentUnlocked = BADGE_DEFINITIONS.filter((badge) =>
      badge.check(matches, userEvents, username, user, customBadges, loginDays, avatarUrl)
    )
      .map((b) => b.id)
      .filter((id) => !revokedBadgeIds.includes(id));

    const filteredExisting = unlockedBadgeIds.filter((id) => !revokedBadgeIds.includes(id));
    const merged = Array.from(new Set([...filteredExisting, ...currentUnlocked]));

    if (merged.length !== unlockedBadgeIds.length) {
      setUnlockedBadgeIds(merged);
      supabase
        .from("profiles")
        .upsert({ id: user.id, unlocked_badges: merged, updated_at: new Date() })
        .then();
    }
  }, [matches, userEvents, username, customBadges, loginDays, avatarUrl, hasLoadedUserData]);

  const toggleAdminBadge = async (badgeId) => {
    if (!isAdmin) return;
    const updated = customBadges.includes(badgeId)
      ? customBadges.filter((b) => b !== badgeId)
      : [...customBadges, badgeId];

    setCustomBadges(updated);

    try {
      await supabase
        .from("profiles")
        .upsert({ id: user.id, custom_badges: updated, updated_at: new Date() });
    } catch (err) {
      console.error("Fehler beim Speichern des Admin-Badges:", err);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Datei ist zu groß (maximal 5MB).");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const compressedBlob = await resizeImage(file, 400, 400, 0.8);
      const fileName = `${user.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressedBlob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const newAvatarUrl = publicUrlData.publicUrl;
      setAvatarUrl(newAvatarUrl);
    } catch (err) {
      setErrorMsg(err.message || "Fehler beim Bild-Upload.");
    } finally {
      setLoading(false);
    }
  };

  const resizeImage = (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
        };
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const updates = {
        id: user.id,
        username,
        club,
        aos_armies: aosArmies,
        wh40k_armies: wh40kArmies,
        armies: aosArmies,
        game_systems: "Age of Sigmar, Warhammer 40k",
        avatar_url: avatarUrl,
        custom_badges: customBadges,
        unlocked_badges: unlockedBadgeIds,
        updated_at: new Date(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) throw error;

      onUpdateProfile({ ...user, ...updates });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrorMsg(err.message || "Fehler beim Speichern.");
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = async (id) => {
    if (window.confirm("Möchtest du dieses Match wirklich unwiderruflich löschen?")) {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (!error) {
        fetchUserData();
      } else {
        setErrorMsg("Fehler beim Löschen des Matches.");
      }
    }
  };

  const evaluateRoundWin = (round) => {
    const p1Vp = Number(round.p1Vp) || 0;
    const p2Vp = Number(round.p2Vp) || 0;
    const isTie = round.winner === "Unentschieden" || p1Vp === p2Vp;
    const isWin = p1Vp > p2Vp;

    return { isTie, isWin };
  };

  const revokedBadgeIds = customBadges
    .filter((b) => typeof b === "string" && b.startsWith("revoked:"))
    .map((b) => b.replace("revoked:", ""));

  const unlockedBadges = BADGE_DEFINITIONS.filter((badge) =>
    unlockedBadgeIds.includes(badge.id) && !revokedBadgeIds.includes(badge.id)
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans">
      <header className="border-b border-amber-600/30 pb-4">
        <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <User className="text-amber-500" /> Mitglieder-Profil
        </h2>
        <p className="text-xs text-neutral-400">
          Verwalte deine persönlichen Daten und Armeen nach Systemen getrennt
        </p>
      </header>

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-600/50 text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* PROFIL FORMULAR */}
      <form
        onSubmit={handleSave}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-neutral-800">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-neutral-950 border-2 border-amber-600/50 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={40} className="text-neutral-600" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-amber-600 hover:bg-amber-500 text-neutral-950 p-2 rounded-full cursor-pointer transition shadow-lg">
              <Camera size={14} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-200">
              {username || "Mitglied"}
            </h3>
            <p className="text-xs text-neutral-500">
              {isAdmin ? "Administrator" : "Fumble Forged Mitglied"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
              Spielername / Nickname
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
              Club / Team
            </label>
            <input
              type="text"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
            <div>
              <label className="block text-xs uppercase font-bold text-amber-500 mb-1 flex items-center gap-1.5">
                <Shield size={14} /> Age of Sigmar Armeen
              </label>
              <textarea
                rows={3}
                value={aosArmies}
                onChange={(e) => setAosArmies(e.target.value)}
                placeholder="z. B. Skaven, Sylvaneth..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-amber-500 mb-1 flex items-center gap-1.5">
                <Swords size={14} /> Warhammer 40k Armeen
              </label>
              <textarea
                rows={3}
                value={wh40kArmies}
                onChange={(e) => setWh40kArmies(e.target.value)}
                placeholder="z. B. Space Marines, Adeptus Custodes..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
          {saved ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <Check size={14} /> Profil in Supabase gespeichert!
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold px-6 py-2.5 rounded-lg text-sm uppercase flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} /> {loading ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </form>

      {/* FUMBLE FORGED TROPHÄEN & ABZEICHEN */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <Trophy size={16} /> Fumble Forged Trophäen & Abzeichen
          </h3>
          <button
            onClick={() => setShowAllBadgesModal(true)}
            className="text-xs font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>{unlockedBadges.length} / {BADGE_DEFINITIONS.length} Freigeschaltet</span>
            <span className="text-[10px] opacity-75">➔ Alle anzeigen</span>
          </button>
        </div>

        {unlockedBadges.length === 0 ? (
          <div className="text-xs text-neutral-500 italic py-4 text-center">
            Noch keine Abzeichen freigeschaltet. Trage dein erstes Match ein!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlockedBadges.map((badge) => {
              const IconComponent = badge.icon;
              return (
                <div
                  key={badge.id}
                  className="bg-neutral-950 border border-amber-500/40 p-3.5 rounded-xl flex items-start gap-3 shadow-lg shadow-amber-950/20"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center shrink-0">
                    <IconComponent size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-100">
                        {badge.title}
                      </span>
                      <span className="text-[9px] uppercase font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                        Freigeschaltet
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ALLE BADGES IM DETAIL */}
      {showAllBadgesModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-amber-600/40 p-6 rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                  <Trophy size={16} /> Alle Fumble Forged Abzeichen ({unlockedBadges.length}/{BADGE_DEFINITIONS.length})
                </h3>
                {isAdmin && (
                  <p className="text-[10px] text-amber-400/80 mt-0.5">
                    🛡️ Admin-Modus aktiv: Du kannst Werkstatt-Badges vergeben/entziehen.
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowAllBadgesModal(false)}
                className="text-neutral-400 hover:text-neutral-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {BADGE_DEFINITIONS.map((badge) => {
                const isUnlocked = unlockedBadgeIds.includes(badge.id);
                const IconComponent = badge.icon;
                const isMakerBadge = badge.id === "machinist" || badge.id === "master_of_magnets";

                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition ${
                      isUnlocked
                        ? "bg-neutral-950 border-amber-500/40 shadow-lg shadow-amber-950/20"
                        : "bg-neutral-950/40 border-neutral-800/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                          isUnlocked
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                            : "bg-neutral-900 border-neutral-800 text-neutral-600"
                        }`}
                      >
                        {isUnlocked ? <IconComponent size={20} /> : <Lock size={16} />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isUnlocked ? "text-neutral-100" : "text-neutral-400"}`}>
                            {badge.title}
                          </span>
                          <span className="text-[9px] text-neutral-500 uppercase font-mono">
                            [{badge.category}]
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 leading-snug">
                          {badge.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isUnlocked ? (
                        <span className="text-[9px] uppercase font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                          Freigeschaltet ✓
                        </span>
                      ) : (
                        <span className="text-[9px] uppercase font-bold bg-neutral-800 text-neutral-500 px-1.5 py-0.2 rounded">
                          Gesperrt
                        </span>
                      )}

                      {isAdmin && isMakerBadge && (
                        <button
                          onClick={() => toggleAdminBadge(badge.id)}
                          className={`mt-1 text-[10px] px-2 py-1 rounded font-bold transition cursor-pointer ${
                            customBadges.includes(badge.id)
                              ? "bg-red-950 text-red-400 border border-red-800 hover:bg-red-900"
                              : "bg-amber-600 text-neutral-950 hover:bg-amber-500"
                          }`}
                        >
                          {customBadges.includes(badge.id) ? "Entziehen" : "Verleihen"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Commander Statistik Dashboard */}
      <StatsDashboard matches={flattenedMatches} username={username} />

      {/* GESPEICHERTE MATCHES */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" /> Gespeicherte Matches ({matches.length})
          </span>
        </h3>

        {matches.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl text-xs text-neutral-500 italic">
            Noch keine gespeicherten Partien.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => {
              const rounds = m.details?.tournament_rounds || [];
              return (
                <div
                  key={m.id}
                  className={`bg-neutral-950 border p-4 rounded-xl flex justify-between items-start ${
                    m.details?.match_mode === "tournament_complete"
                      ? "border-amber-600/50"
                      : "border-neutral-800"
                  }`}
                >
                  <div className="flex flex-col gap-2 w-full pr-4">
                    {m.details?.match_mode === "tournament_complete" ? (
                      <div className="space-y-2">
                        <div className="text-sm font-black text-amber-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-1.5">
                          <span className="flex items-center gap-2">
                            <Trophy size={16} /> {m.details.match_title}
                          </span>
                          
                          <div className="flex items-center gap-1.5 text-xs font-mono">
                            <span className="text-neutral-400 font-sans text-[11px]">
                              {rounds.length} {rounds.length === 1 ? "Spiel" : "Spiele"}:
                            </span>
                            <div className="flex items-center gap-1">
                              {rounds.map((round, rIdx) => {
                                const { isTie, isWin } = evaluateRoundWin(round);
                                const badgeColor = isTie 
                                  ? "bg-neutral-800 text-neutral-300 border-neutral-700" 
                                  : isWin 
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-600/60" 
                                  : "bg-red-950/80 text-red-400 border-red-600/60";
                                const label = isTie ? "D" : isWin ? "W" : "L";

                                return (
                                  <span
                                    key={rIdx}
                                    className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] border ${badgeColor}`}
                                    title={`Spiel ${round.matchIndex}: ${label}`}
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5">
                          {rounds.length > 0 ? (
                            rounds.map((roundRes, rIdx) => (
                              <div key={rIdx} className="text-xs bg-neutral-900 border border-neutral-800/60 p-2 rounded-lg flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-amber-400 mr-2">Spiel {roundRes.matchIndex}:</span>
                                  <span className="text-neutral-300">{roundRes.battleplan}</span>
                                </div>
                                <div className="text-neutral-400">
                                  {roundRes.p1Name} ({roundRes.p1Vp}) vs {roundRes.p2Name} ({roundRes.p2Vp}) ➔ <strong className="text-amber-500">{roundRes.winner}</strong>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-neutral-500 italic">Keine Runden-Details verfügbar.</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-300 flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-200">{m.player1_name}</span>
                            <span className="text-amber-500 font-mono text-[11px] font-bold">{m.player1_vp ?? 0} VP</span>
                          </div>
                          <span className="text-neutral-500 font-bold">vs</span>
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-200">{m.player2_name}</span>
                            <span className="text-amber-500 font-mono text-[11px] font-bold">{m.player2_vp ?? 0} VP</span>
                          </div>
                        </div>
                        <div className="pt-1 border-t border-neutral-900 flex items-center gap-1">
                          <span className="text-emerald-500 font-bold">Sieger</span>:{" "}
                          <span className="text-amber-500 font-bold">{m.winner_name}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-neutral-500 font-mono pt-1">
                      Abgeschlossen am:{" "}
                      {new Date(m.created_at).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMatch(m.id)}
                    className="p-2 text-neutral-500 hover:text-red-500 transition self-start cursor-pointer"
                    title="Match löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Impressum & Datenschutz */}
      <div className="text-center pt-8 border-t border-neutral-800">
        <button
          type="button"
          onClick={onOpenLegal}
          className="text-[10px] text-neutral-500 hover:text-amber-400 transition underline underline-offset-2 cursor-pointer"
        >
          Impressum & Datenschutz
        </button>
      </div>
    </div>
  );
}
