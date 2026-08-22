import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Swords, X, Check } from "lucide-react";

export default function ChallengeModal({ currentUser, onChallengeStatusChanged }) {
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [challengerName, setChallengerName] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchIncomingChallenge = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("opponent_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        handleIncomingChallenge(data[0]);
      }
    } catch (err) {
      console.error("Fehler beim Laden eingehender Herausforderung:", err);
    }
  };

  const handleIncomingChallenge = async (challenge) => {
    setCurrentChallenge(challenge);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", challenge.challenger_id)
        .single();
      if (profile) {
        setChallengerName(profile.username || "Ein Commander");
      } else {
        setChallengerName("Ein Commander");
      }
    } catch (err) {
      setChallengerName("Ein Commander");
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    fetchIncomingChallenge();

    const channel = supabase
      .channel("challenges-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "challenges",
          filter: `opponent_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.status === "pending") {
            handleIncomingChallenge(payload.new);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `opponent_id=eq.${currentUser.id}`,
        },
        (payload) => {
          if (payload.new && payload.new.status === "pending") {
            handleIncomingChallenge(payload.new);
          } else if (payload.new && payload.new.status === "cancelled" && currentChallenge?.id === payload.new.id) {
            setCurrentChallenge(null);
            setChallengerName("");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentChallenge?.id]);

  const handleAccept = async () => {
    if (!currentChallenge) return;
    setProcessing(true);
    try {
      // 1. Update status to 'accepted'
      const { error: updateErr } = await supabase
        .from("challenges")
        .update({ status: "accepted" })
        .eq("id", currentChallenge.id);

      if (updateErr) throw updateErr;

      // 2. Fetch profiles for player names
      const { data: challengerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentChallenge.challenger_id)
        .single();

      const { data: opponentProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentChallenge.opponent_id)
        .single();

      const p1Name = challengerProfile?.username || "Challenger";
      const p2Name = opponentProfile?.username || "Opponent";

      // 3. Create planned match
      const matchData = {
        user_id: currentChallenge.challenger_id,
        opponent_id: currentChallenge.opponent_id,
        challenge_id: currentChallenge.id,
        player1_name: p1Name,
        player2_name: p2Name,
        player1_vp: 0,
        player2_vp: 0,
        rounds_played: 0,
        winner_name: "Unentschieden",
        status: "planned",
        system: currentChallenge.system,
        details: {
          match_title: `Herausforderung (${currentChallenge.system === "aos" ? "AoS" : "40k"})`,
          match_mode: "single",
          is_challenge: true,
        },
      };

      const { error: matchErr } = await supabase
        .from("matches")
        .insert([matchData]);

      if (matchErr) throw matchErr;

      alert("Herausforderung angenommen! Spiel ist in eurem Dashboard unter 'Geplante Spiele' verfügbar.");
      setCurrentChallenge(null);
      if (onChallengeStatusChanged) {
        onChallengeStatusChanged();
      }
    } catch (err) {
      console.error("Fehler beim Annehmen der Herausforderung:", err);
      alert("Fehler beim Annehmen: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!currentChallenge) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("challenges")
        .update({ status: "declined" })
        .eq("id", currentChallenge.id);

      if (error) throw error;

      alert("Herausforderung abgelehnt.");
      setCurrentChallenge(null);
      if (onChallengeStatusChanged) {
        onChallengeStatusChanged();
      }
    } catch (err) {
      console.error("Fehler beim Ablehnen der Herausforderung:", err);
      alert("Fehler beim Ablehnen: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!currentChallenge) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-neutral-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
          <Swords size={32} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-neutral-100 uppercase tracking-wider">
            Eingehende Herausforderung!
          </h3>
          <p className="text-sm text-neutral-300">
            <span className="font-extrabold text-amber-500">{challengerName}</span> fordert dich zu einer 1v1-Partie in{" "}
            <span className="font-extrabold text-neutral-100 uppercase">
              {currentChallenge.system === "aos" ? "Age of Sigmar (AoS)" : "Warhammer 40k"}
            </span>{" "}
            heraus!
          </p>
        </div>

        <div className="flex gap-4 pt-2">
          <button
            disabled={processing}
            onClick={handleDecline}
            className="flex-1 bg-red-950/40 hover:bg-red-950/80 text-red-400 border border-red-800 hover:border-red-600 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            <X size={16} /> Ablehnen
          </button>
          <button
            disabled={processing}
            onClick={handleAccept}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-lg shadow-amber-500/20"
          >
            <Check size={16} /> Annehmen
          </button>
        </div>
      </div>
    </div>
  );
}
