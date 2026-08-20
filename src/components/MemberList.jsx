import React, { useState, useEffect } from "react";
import { Users, Shield, Award } from "lucide-react";
import { supabase } from "../supabaseClient";

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
          <Users className="text-amber-500" /> Fumble Forge Mitglieder
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
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-neutral-900 border border-neutral-800 hover:border-amber-600/50 transition rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between"
            >
              {/* OBERER BEREICH: Avatar & Name */}
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
                  {member.club && (
                    <p className="text-xs text-amber-500 font-bold flex items-center gap-1 mt-0.5">
                      <Shield size={12} /> {member.club}
                    </p>
                  )}
                </div>
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
          ))}
        </div>
      )}
    </div>
  );
}