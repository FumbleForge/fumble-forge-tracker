import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle2, XCircle, Users } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function EventsView({ user }) {
  const clubEvents = [
    { 
      id: "raccoon-rumble", 
      title: "Raccoon Rumble 2026", 
      desc: "Ausflug nach Hof mit dem Fumble Forge Team." 
    },
    { 
      id: "ff-cup", 
      title: "Fumble Bowl VI", 
      desc: "Unser Turnier am 10.10.2026" 
    }
  ];

  const [eventAttendees, setEventAttendees] = useState(
    clubEvents.reduce((acc, ev) => ({ ...acc, [ev.id]: [] }), {})
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventAttendees();
  }, [user]);

  const fetchEventAttendees = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*");

      if (profileError) throw profileError;

      const profileMap = {};
      profiles?.forEach((p) => {
        profileMap[p.id] = p.username || p.name || "Commander";
      });

      const { data: attendees, error: attError } = await supabase
        .from("event_attendees")
        .select("*");

      if (!attError && attendees) {
        const grouped = clubEvents.reduce((acc, ev) => ({ ...acc, [ev.id]: [] }), {});
        attendees.forEach((att) => {
          if (grouped[att.event_id]) {
            grouped[att.event_id].push({
              userId: att.user_id,
              name: profileMap[att.user_id] || "Commander",
            });
          }
        });
        setEventAttendees(grouped);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Event-Zusagen:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async (eventId) => {
    const attendeesList = eventAttendees[eventId] || [];
    const isAlreadyAttending = attendeesList.some((a) => a.userId === user.id);

    try {
      if (isAlreadyAttending) {
        const { error } = await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);

        if (!error) {
          setEventAttendees({
            ...eventAttendees,
            [eventId]: attendeesList.filter((a) => a.userId !== user.id),
          });
        }
      } else {
        const { error } = await supabase
          .from("event_attendees")
          .insert([{ event_id: eventId, user_id: user.id }]);

        if (!error) {
          const userName = user.username || user.name || "Commander";
          setEventAttendees({
            ...eventAttendees,
            [eventId]: [...attendeesList, { userId: user.id, name: userName }],
          });
        }
      }
    } catch (err) {
      console.error("Fehler beim RSVP:", err);
    }
  };

  const isAttendingEvent = (eventId) => {
    return (eventAttendees[eventId] || []).some((a) => a.userId === user.id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* HEADER */}
      <header className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col justify-between items-start gap-2 shadow-xl">
        <h2 className="text-2xl font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <Calendar size={24} className="text-amber-500" /> Turniere und Events
        </h2>
        <p className="text-sm text-neutral-300 mt-1">
          Hier findest du alle anstehenden Club-Events und Turniere. Melde dich an, um deinen Platz zu sichern!
        </p>
      </header>

      {/* EVENTS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clubEvents.map((event) => {
          const attendeesList = eventAttendees[event.id] || [];
          const attending = isAttendingEvent(event.id);

          return (
            <div key={event.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col justify-between gap-4 shadow-xl">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-100">{event.title}</h3>
                    <p className="text-neutral-400 text-xs mt-1 leading-relaxed">{event.desc}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800">
                  <div className="text-xs text-neutral-400 font-bold mb-2 flex items-center gap-1.5">
                    <Users size={14} className="text-neutral-500" /> Dabei ({attendeesList.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {loading ? (
                      <span className="text-xs text-neutral-500 animate-pulse">Lade Teilnehmer...</span>
                    ) : attendeesList.length === 0 ? (
                      <span className="text-xs text-neutral-600 italic">Noch keine Zusagen</span>
                    ) : (
                      attendeesList.map((att, idx) => (
                        <span key={idx} className="text-[11px] bg-neutral-950 text-amber-400 px-2.5 py-1 rounded border border-neutral-800 font-mono">
                          {att.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRsvp(event.id)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer uppercase tracking-wider ${
                  attending
                    ? "bg-red-950/60 text-red-400 border border-red-800/50 hover:bg-red-900/60"
                    : "bg-amber-600 text-neutral-950 hover:bg-amber-500"
                }`}
              >
                {attending ? (
                  <>
                    <XCircle size={16} /> Teilnahme absagen
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Teilnahme bestätigen
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
