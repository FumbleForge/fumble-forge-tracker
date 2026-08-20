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
} from "lucide-react";
import { supabase } from "../supabaseClient";
import StatsDashboard from "./StatsDashboard";

// DEFINITION DER AUTOMATISIERTEN BADGES
const BADGE_DEFINITIONS = [
  {
    id: "blood_and_honor",
    title: "Blut & Ehre",
    desc: "Trage dein allererstes Match im Score Tracker ein.",
    icon: Award,
    check: (matches, events) => matches.length >= 1,
  },
  {
    id: "club_veteran",
    title: "Veteran des Clubs",
    desc: "Trage insgesamt mindestens 5 Matches über den Tracker ein.",
    icon: Trophy,
    check: (matches, events) => matches.length >= 5,
  },
  {
    id: "winning_streak",
    title: "Aufstieg der Legende",
    desc: "Erreiche eine Siegesserie von 3 gewonnenen Spielen in Folge.",
    icon: Flame,
    check: (matches, events, username) => {
      // Prüft ob in den letzten Spielen eine Streak von 3 Wins vorliegt
      let currentStreak = 0;
      for (const m of matches) {
        const winner = m.winner_name || "";
        const isUserWinner = username && winner.toLowerCase().includes(username.toLowerCase());
        if (isUserWinner) {
          currentStreak++;
          if (currentStreak >= 3) return true;
        } else {
          currentStreak = 0;
        }
      }
      return false;
    },
  },
  {
    id: "tournament_winner",
    title: "Der Hausmeister",
    desc: "Gewinne ein über den internen Turnier-Modus erstelltes Turnier.",
    icon: Shield,
    check: (matches, events, username) => {
      return matches.some((m) => {
        const isTournament = m.details?.match_mode === "tournament_complete";
        const winner = m.winner_name || "";
        return isTournament && username && winner.toLowerCase().includes(username.toLowerCase());
      });
    },
  },
  {
    id: "draw_master",
    title: "Unbeugsam",
    desc: "Erzähle oder erziele ein Unentschieden in einem getrackten Match.",
    icon: MapPin,
    check: (matches, events) => {
      return matches.some((m) => m.winner_name === "Unentschieden");
    },
  },
  {
    id: "on_tour",
    title: "On Tour",
    desc: "Bestätige deine Teilnahme an einem externen Event (z.B. Raccoon Rumble).",
    icon: Trophy,
    check: (matches, events) => events.length > 0,
  },
];

export default function UserProfile({ user, onUpdateProfile }) {
  const [username, setUsername] = useState(
    user?.username || user?.user_metadata?.username || ""
  );
  const [club, setClub] = useState(user?.club || "");
  const [armies, setArmies] = useState(user?.armies || "");
  const [gameSystems, setGameSystems] = useState(user?.game_systems || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [matches, setMatches] = useState([]);
  const [flattenedMatches, setFlattenedMatches] = useState([]);
  const [userEvents, setUserEvents] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user?.id) return;

    // 1. Matches laden
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

    // 2. Event-Teilnahmen laden für das "On Tour" Badge
    const { data: eventData } = await supabase
      .from("event_attendees")
      .select("*")
      .eq("user_id", user.id);

    if (eventData) {
      setUserEvents(eventData);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Datei ist zu groß (maximal 5MB vor der Komprimierung).");
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
        armies,
        game_systems: gameSystems,
        avatar_url: avatarUrl,
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
    if (window.confirm("Dieses Match wirklich löschen?")) {
      await supabase.from("matches").delete().eq("id", id);
      fetchUserData();
    }
  };

  const evaluateRoundWin = (round) => {
    const winner = round.winner || "";
    const p1Name = round.p1Name || "";
    const isTie = winner === "Unentschieden" || round.p1Vp === round.p2Vp;

    const isUserWinner = 
      (p1Name && winner.includes(p1Name)) || 
      (username && winner.toLowerCase().includes(username.toLowerCase())) ||
      winner.includes("Spieler 1");

    return { isTie, isWin: !isTie && isUserWinner };
  };

  // Zähle freigeschaltete Badges
  const unlockedBadgesCount = BADGE_DEFINITIONS.filter((badge) =>
    badge.check(matches, userEvents, username)
  ).length;

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans">
      <header className="border-b border-amber-600/30 pb-4">
        <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <User className="text-amber-500" /> Mitglieder-Profil
        </h2>
        <p className="text-xs text-neutral-400">
          Verwalte deine persönlichen Daten und Armeen
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
              {user?.role === "admin"
                ? "Administrator"
                : "Fumble Forge Mitglied"}
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

          <div>
            <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
              Spielsysteme
            </label>
            <input
              type="text"
              value={gameSystems}
              onChange={(e) => setGameSystems(e.target.value)}
              placeholder="z. B. Warhammer Age of Sigmar, Kill Team..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
              Meine Armeen
            </label>
            <textarea
              rows={3}
              value={armies}
              onChange={(e) => setArmies(e.target.value)}
              placeholder="z. B. Daughters of Khaine, Sylvaneth, Skaven..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm resize-none"
            />
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
            className="bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold px-6 py-2.5 rounded-lg text-sm uppercase flex items-center gap-2 transition disabled:opacity-50"
          >
            <Save size={16} /> {loading ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </form>

      {/* FUMBLE FORGE TROPHÄEN & BADGES SEKTION */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <Trophy size={16} /> Fumble Forge Trophäen & Abzeichen
          </h3>
          <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/25">
            {unlockedBadgesCount} / {BADGE_DEFINITIONS.length} Freigeschaltet
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BADGE_DEFINITIONS.map((badge) => {
            const isUnlocked = badge.check(matches, userEvents, username);
            const IconComponent = badge.icon;

            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition ${
                  isUnlocked
                    ? "bg-neutral-950 border-amber-500/40 shadow-lg shadow-amber-950/20"
                    : "bg-neutral-950/40 border-neutral-800/60 opacity-50"
                }`}
              >
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
                    {isUnlocked && (
                      <span className="text-[9px] uppercase font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                        Freigeschaltet
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-snug">
                    {badge.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Commander Statistik Dashboard */}
      <StatsDashboard matches={flattenedMatches} username={username} />

      {/* GESPEICHERTE MATCHES */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" /> Gespeicherte Matches (
          {matches.length})
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
                      <div className="text-xs text-neutral-300">
                        <span className="font-bold">{m.player1_name}</span> vs{" "}
                        <span className="font-bold">{m.player2_name}</span> |
                        Sieger: {m.winner_name}
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
                    className="p-2 text-neutral-500 hover:text-red-500 transition self-start"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}