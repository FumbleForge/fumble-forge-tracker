import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function StreamOverlay() {
  const [match, setMatch] = useState({
    system: "aos", p1Name: "", p2Name: "", p1Faction: "", p2Faction: "", p1Vp: 0, p2Vp: 0, round: 1, mission: "", active: false,
  });

  const loadState = () => {
    const sys = window.location.search.includes("overlay=40k") ? "40k" : "aos";
    if (sys === "aos") {
      const rawPlayers = localStorage.getItem("fumble_forge_aos_players");
      const rawRound = localStorage.getItem("fumble_forge_aos_currentRound");
      const rawP1Vp = localStorage.getItem("fumble_forge_aos_p1_total_vp");
      const rawP2Vp = localStorage.getItem("fumble_forge_aos_p2_total_vp");
      const rawBpId = localStorage.getItem("fumble_forge_aos_battleplanId");
      const rawStep = localStorage.getItem("fumble_forge_aos_setupStep");
      const isActive = rawStep ? JSON.parse(rawStep) === "playing" : false;
      if (rawPlayers) {
        try {
          const players = JSON.parse(rawPlayers);
          setMatch({
            system: "aos",
            p1Name: players.player1?.name || "Player 1",
            p2Name: players.player2?.name || "Player 2",
            p1Faction: players.player1?.faction || "AoS Faktion",
            p2Faction: players.player2?.faction || "AoS Faktion",
            p1Vp: rawP1Vp ? JSON.parse(rawP1Vp) : 0, p2Vp: rawP2Vp ? JSON.parse(rawP2Vp) : 0,
            round: (rawRound ? JSON.parse(rawRound) : 0) + 1,
            mission: rawBpId ? JSON.parse(rawBpId) : "Battleplan",
            active: isActive,
          });
          return;
        } catch (e) {}
      }
    } else {
      const rawP1Name = localStorage.getItem("fumble_forge_40k_player1Name");
      const rawP2Name = localStorage.getItem("fumble_forge_40k_player2Name");
      const rawP1Faction = localStorage.getItem("fumble_forge_40k_player1Faction");
      const rawP2Faction = localStorage.getItem("fumble_forge_40k_player2Faction");
      const rawRound = localStorage.getItem("fumble_forge_40k_currentRound");
      const rawP1Vp = localStorage.getItem("fumble_forge_40k_p1_total_vp");
      const rawP2Vp = localStorage.getItem("fumble_forge_40k_p2_total_vp");
      const rawStep = localStorage.getItem("fumble_forge_40k_step");
      const rawMissionId = localStorage.getItem("fumble_forge_40k_selectedMissionId");
      const isActive = rawStep ? JSON.parse(rawStep) === "live_tracker" : false;
      if (rawP1Name) {
        try {
          setMatch({
            system: "40k",
            p1Name: JSON.parse(rawP1Name),
            p2Name: rawP2Name ? JSON.parse(rawP2Name) : "Player 2",
            p1Faction: rawP1Faction ? JSON.parse(rawP1Faction) : "40k Faktion",
            p2Faction: rawP2Faction ? JSON.parse(rawP2Faction) : "40k Faktion",
            p1Vp: rawP1Vp ? JSON.parse(rawP1Vp) : 0, p2Vp: rawP2Vp ? JSON.parse(rawP2Vp) : 0,
            round: rawRound ? JSON.parse(rawRound) : 1,
            mission: rawMissionId ? JSON.parse(rawMissionId) : "Missions-Szenario",
            active: isActive,
          });
          return;
        } catch (e) {}
      }
    }
    setMatch((prev) => ({ ...prev, active: false }));
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("user_id");

    if (userId) {
      // Connect to the database-free realtime channel for device-to-device syncing
      const channel = supabase.channel(`live-score-${userId}`, {
        config: { broadcast: { ack: false, self: true } },
      });

      channel
        .on("broadcast", { event: "score-update" }, ({ payload }) => {
          if (payload) {
            setMatch(payload);
          }
        })
        .subscribe();

      // Load initial state locally as a fallback
      loadState();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // If no user_id parameter, fallback to local tab-to-tab localStorage sync
      loadState();
      window.addEventListener("storage", loadState);
      const interval = setInterval(loadState, 1000);
      return () => {
        window.removeEventListener("storage", loadState);
        clearInterval(interval);
      };
    }
  }, []);

  if (!match.active) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-transparent">
        <div className="bg-neutral-900/90 border border-neutral-800 text-neutral-400 p-6 rounded-2xl flex flex-col items-center gap-2 max-w-sm text-center shadow-2xl">
          <Activity size={32} className="text-amber-500 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200">Warte auf aktives Spiel...</h2>
          <p className="text-[11px] text-neutral-500">Dieses Overlay befüllt sich, sobald ein Spiel im Tracker läuft.</p>
        </div>
      </div>
    );
  }

  const isAos = match.system === "aos";

  return (
    <div className="w-screen h-screen bg-transparent p-4 flex flex-col items-center font-sans">
      <div className="w-full max-w-5xl bg-neutral-950/95 border border-neutral-800 rounded-2xl shadow-2xl flex items-stretch overflow-hidden">
        <div className="flex-1 flex items-center justify-between pl-6 pr-4 bg-gradient-to-r from-sky-950/20 to-transparent">
          <div>
            <div className="text-xs font-black uppercase text-sky-400 truncate">{match.p1Name}</div>
            <div className="text-[10px] font-bold text-neutral-400 truncate mt-0.5">{match.p1Faction}</div>
          </div>
          <div className="text-4xl font-black font-mono text-sky-400 ml-4">{match.p1Vp}</div>
        </div>

        <div className="px-6 flex flex-col items-center justify-center border-x border-neutral-800 bg-neutral-900/50 min-w-[200px]">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">{isAos ? "Age of Sigmar" : "Warhammer 40k"}</div>
          <div className="text-lg font-black text-white font-mono uppercase mt-0.5">RUNDE {match.round}</div>
          <div className="text-[9px] font-bold text-neutral-400 text-center truncate max-w-[180px] mt-0.5">{match.mission}</div>
        </div>

        <div className="flex-1 flex items-center justify-between pl-4 pr-6 bg-gradient-to-l from-red-950/20 to-transparent">
          <div className="text-4xl font-black font-mono text-red-400 mr-4">{match.p2Vp}</div>
          <div className="min-w-0 flex-1 text-right">
            <div className="text-xs font-black uppercase text-red-400 truncate">{match.p2Name}</div>
            <div className="text-[10px] font-bold text-neutral-400 truncate mt-0.5">{match.p2Faction}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
