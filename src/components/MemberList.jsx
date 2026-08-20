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
};

export default function MemberList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });

      if (error) throw error;
      if (data) setMembers(data);
    } catch (err) {
      console.error("Fehler beim Laden der Mitglieder:", err.message);
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
          Lade Mitgliederliste...
        </div>
      ) : members.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl text-xs text-neutral-500 italic text-center">
          Noch keine Mitglieder registriert.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => {
            // Sammle freigeschaltete Badges aus unlocked_badges oder custom_badges
            const memberBadges = Array.from(
              new Set([
                ...(member.unlocked_badges || []),
                ...(member.custom_badges || []),
              ])
            );

            return (
              <div
                key={member.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-amber-600/50 transition rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between"
              >
                {/* OBERER BEREICH: Avatar, Name & Trophäen-Icons */}
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

                  {/* BADGES / MINI-TROPHÄEN AUF DER VISITENKARTE */}
                  {memberBadges.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap justify-end max-w-[140px]">
                      {memberBadges.map((badgeId) => {
                        const badgeInfo = BADGE_ICONS[badgeId];
                        const IconComp = badgeInfo ? badgeInfo.icon : Trophy;
                        const title = badgeInfo ? badgeInfo.title : badgeId;

                        return (
                          <div
                            key={badgeId}
                            className="w-7 h-7 rounded-lg bg-neutral-950 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-sm shrink-0"
                            title={title}
                          >
                            <IconComp size={14} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* UNTERER BEREICH: Details (Spielsysteme & Armeen) */}
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