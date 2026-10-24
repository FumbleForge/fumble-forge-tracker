import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { parseArmyListText } from "../utils/armyListParser";
import BroadcastOverlayView from "./BroadcastOverlayView";
import StreamOverlayAdmin from "./StreamOverlayAdmin";

export { parseArmyListText };

const DEFAULT_STATE = {
  activeOverlayType: "game", // "game" | "army-p1" | "army-p2" | "broadcast-p1" | "broadcast-p2"
  gameSystem: "40k",
  round: 1,
  activePlayer: null, // null | 1 | 2
  underdogPlayer: null, // null | 1 | 2
  missionTag: "TAKE AND HOLD",
  players: {
    1: {
      name: "FOLGER PYLES", 
      faction: "ADEPTUS CUSTODES", 
      cp: 4, furyDice: 0, furyPoints: 0, scoreOverride: "",
      turns: Array.from({ length: 5 }, (_, i) => ({ turn: i + 1, battleplan: 0, battle_tactic: 0 })),
      army: {
        title: "ADEPTUS CUSTODES",
        detachment: "Shield Host",
        detachmentRules: ["EMPEROR'S CHOSEN 1DP", "LIONS OF THE EMPEROR 1DP", "MIGHT OF THE MORITOI 1DP"],
        playerPhotoUrl: "",
        characterArtUrl: "",
        imageUrl: "",
        rawListText: "",
        parsedUnits: [
          { id: "p1-1", name: "TRAJANN VALORIS", count: "1x", points: "265", note: "Warlord", category: "CHARACTERS" },
          { id: "p1-2", name: "ALLARUS CUSTODIANS", count: "3x", points: "270", note: "", category: "UNITS" },
          { id: "p1-3", name: "CALADIUS GRAV-TANK", count: "1x", points: "250", note: "Twin Iliastus Accelerator Cannon", category: "UNITS" },
          { id: "p1-4", name: "CALADIUS GRAV-TANK", count: "1x", points: "250", note: "", category: "UNITS" },
          { id: "p1-5", name: "GALATUS DREADNOUGHT", count: "1x", points: "220", note: "", category: "UNITS" },
          { id: "p1-6", name: "GALATUS DREADNOUGHT", count: "1x", points: "220", note: "", category: "UNITS" },
          { id: "p1-7", name: "TELEMON DREADNOUGHT", count: "1x", points: "310", note: "Augury Uplink", category: "UNITS" },
          { id: "p1-8", name: "PROSECUTORS", count: "5x", points: "50", note: "", category: "UNITS" },
          { id: "p1-9", name: "PROSECUTORS", count: "4x", points: "45", note: "", category: "UNITS" },
          { id: "p1-10", name: "WITCHSEEKERS", count: "5x", points: "60", note: "", category: "UNITS" },
          { id: "p1-11", name: "WITCHSEEKERS", count: "5x", points: "60", note: "", category: "UNITS" }
        ],
        generalRegiment: [
          { name: "TRAJANN VALORIS", count: "x1", note: "General" }, 
          { name: "ALLARUS CUSTODIANS", count: "x3", note: "270 pts" }
        ],
        regiments: [
          {
            id: "reg-1",
            title: "Schwere Fahrzeuge",
            units: [
              { name: "CALADIUS GRAV-TANK", count: "x1", note: "250 pts" },
              { name: "TELEMON DREADNOUGHT", count: "x1", note: "310 pts - Augury Uplink" }
            ]
          }
        ],
        auxiliaries: [],
        terrain: []
      }
    },
    2: {
      name: "ENGLISH JOE", 
      faction: "SKAVEN", 
      cp: 4, furyDice: 0, furyPoints: 0, scoreOverride: "",
      turns: Array.from({ length: 5 }, (_, i) => ({ turn: i + 1, battleplan: 0, battle_tactic: 0 })),
      army: {
        title: "SKAVEN CLANS",
        detachment: "Warpcog Convocation",
        detachmentRules: ["WARP-POWERED 1DP", "CLAWLORDS DISPOSITION 1DP"],
        playerPhotoUrl: "",
        characterArtUrl: "",
        imageUrl: "",
        rawListText: "",
        parsedUnits: [
          { id: "p2-1", name: "Clawlord on Gnaw-Beast", count: "1x", points: "170", note: "General - Artefakt: Arcane Tome", category: "CHARACTERS" },
          { id: "p2-2", name: "Stormvermin", count: "20x", points: "140", note: "Schildwache", category: "BATTLELINE" },
          { id: "p2-3", name: "Warplock Jezzails", count: "3x", points: "150", note: "Fernkampf", category: "UNITS" },
          { id: "p2-4", name: "Arkanaut Company", count: "20x", points: "180", note: "", category: "UNITS" },
          { id: "p2-5", name: "Endrinriggers", count: "6x", points: "160", note: "", category: "UNITS" }
        ],
        generalRegiment: [
          { name: "Clawlord on Gnaw-Beast", count: "x1", note: "General - Artefakt: Arcane Tome" }, 
          { name: "Stormvermin", count: "x20", note: "Schildwache" }
        ],
        regiments: [
          {
            id: "reg-1",
            title: "Regiment 1",
            units: [{ name: "Warplock Jezzails", count: "x3", note: "Fernkampf" }]
          }
        ],
        auxiliaries: [],
        terrain: []
      }
    }
  }
};

export default function StreamOverlay() {
  const [view, setView] = useState("live");
  const [state, setState] = useState(DEFAULT_STATE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [syncStatus, setSyncStatus] = useState("connecting");

  const broadcastChannelRef = useRef(null);
  const nativeChannelRef = useRef(null);

  const mergeStateWithDefault = (loaded) => {
    if (!loaded || typeof loaded !== "object") return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...loaded,
      missionTag: loaded.missionTag || DEFAULT_STATE.missionTag,
      activePlayer: loaded.activePlayer !== undefined ? loaded.activePlayer : null,
      underdogPlayer: loaded.underdogPlayer !== undefined ? loaded.underdogPlayer : null,
      players: {
        1: {
          ...DEFAULT_STATE.players[1],
          ...(loaded.players?.[1] || {}),
          turns: Array.isArray(loaded.players?.[1]?.turns) ? loaded.players[1].turns : DEFAULT_STATE.players[1].turns,
          army: {
            ...DEFAULT_STATE.players[1].army,
            ...(loaded.players?.[1]?.army || {}),
            detachmentRules: Array.isArray(loaded.players?.[1]?.army?.detachmentRules) 
              ? loaded.players[1].army.detachmentRules 
              : DEFAULT_STATE.players[1].army.detachmentRules,
            parsedUnits: Array.isArray(loaded.players?.[1]?.army?.parsedUnits)
              ? loaded.players[1].army.parsedUnits
              : DEFAULT_STATE.players[1].army.parsedUnits
          }
        },
        2: {
          ...DEFAULT_STATE.players[2],
          ...(loaded.players?.[2] || {}),
          turns: Array.isArray(loaded.players?.[2]?.turns) ? loaded.players[2].turns : DEFAULT_STATE.players[2].turns,
          army: {
            ...DEFAULT_STATE.players[2].army,
            ...(loaded.players?.[2]?.army || {}),
            detachmentRules: Array.isArray(loaded.players?.[2]?.army?.detachmentRules) 
              ? loaded.players[2].army.detachmentRules 
              : DEFAULT_STATE.players[2].army.detachmentRules,
            parsedUnits: Array.isArray(loaded.players?.[2]?.army?.parsedUnits)
              ? loaded.players[2].army.parsedUnits
              : DEFAULT_STATE.players[2].army.parsedUnits
          }
        }
      }
    };
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const overlayParam = searchParams.get("overlay");
    
    if (overlayParam === "admin") {
      setView("admin");
      const auth = localStorage.getItem("fumble_overlay_auth");
      if (auth === "true") setIsAuthenticated(true);
    } else if (overlayParam) {
      setView(overlayParam);
    } else {
      setView("live");
    }

    try {
      const saved = localStorage.getItem("fumble_overlay_state");
      if (saved) {
        setState(mergeStateWithDefault(JSON.parse(saved)));
      }
    } catch (e) {
      console.error("Local storage error:", e);
    }

    if ("BroadcastChannel" in window) {
      nativeChannelRef.current = new BroadcastChannel("fumble_overlay_channel");
      nativeChannelRef.current.onmessage = (event) => {
        if (event.data?.type === "STATE_UPDATE" && event.data.payload) {
          const merged = mergeStateWithDefault(event.data.payload);
          setState(merged);
          localStorage.setItem("fumble_overlay_state", JSON.stringify(merged));
        }
      };
    }

    const channel = supabase.channel("fumble_stream_overlay", {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "STATE_UPDATE" }, ({ payload }) => {
        if (payload) {
          const merged = mergeStateWithDefault(payload);
          setState(merged);
          localStorage.setItem("fumble_overlay_state", JSON.stringify(merged));
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setSyncStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setSyncStatus("error");
        }
      });

    broadcastChannelRef.current = channel;

    return () => {
      if (nativeChannelRef.current) nativeChannelRef.current.close();
      if (broadcastChannelRef.current) supabase.removeChannel(broadcastChannelRef.current);
    };
  }, []);

  const updateState = (newState) => {
    const merged = mergeStateWithDefault(newState);
    setState(merged);
    try {
      localStorage.setItem("fumble_overlay_state", JSON.stringify(merged));
    } catch (e) {
      console.error("Storage save failed:", e);
    }

    if (nativeChannelRef.current) {
      nativeChannelRef.current.postMessage({ type: "STATE_UPDATE", payload: merged });
    }

    if (broadcastChannelRef.current && syncStatus === "connected") {
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: "STATE_UPDATE",
        payload: merged
      });
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "fumble2025" || password === "admin") {
      setIsAuthenticated(true);
      localStorage.setItem("fumble_overlay_auth", "true");
      setErrorMsg("");
    } else {
      setErrorMsg("Falsches Passwort!");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("fumble_overlay_auth");
  };

  const calculateScore = (pId) => {
    const player = state.players[pId];
    if (player.scoreOverride !== undefined && player.scoreOverride !== null && player.scoreOverride !== "") {
      const parsed = parseInt(player.scoreOverride, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return player.turns.reduce((acc, t) => acc + (t.battleplan || 0) + (t.battle_tactic || 0), 0);
  };

  if (view === "admin") {
    return (
      <StreamOverlayAdmin 
        state={state}
        updateState={updateState}
        isAuthenticated={isAuthenticated}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
        password={password}
        setPassword={setPassword}
        errorMsg={errorMsg}
        syncStatus={syncStatus}
        DEFAULT_STATE={DEFAULT_STATE}
      />
    );
  }

  const effectiveOverlay = (view === "live" || !view) 
    ? (state.activeOverlayType || "game") 
    : view;

  if (effectiveOverlay === "broadcast-p1") {
    return <BroadcastOverlayView state={state} player={state.players[1]} pId={1} />;
  }

  if (effectiveOverlay === "broadcast-p2") {
    return <BroadcastOverlayView state={state} player={state.players[2]} pId={2} />;
  }

  if (effectiveOverlay === "army-p1") {
    return <ArmyOverlay player={state.players[1]} />;
  }

  if (effectiveOverlay === "army-p2") {
    return <ArmyOverlay player={state.players[2]} />;
  }

  return (
    <div className="w-screen h-screen bg-transparent relative overflow-hidden font-sans select-none text-white animate-fade-in">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        <div className="w-20 h-20 relative flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full text-neutral-800 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 85 L85 15" strokeLinecap="round" /><path d="M15 85 L20 80 L15 75 L10 80 Z" fill="currentColor" />
            <path d="M85 85 L15 15" strokeLinecap="round" /><path d="M85 85 L80 80 L85 75 L90 80 Z" fill="currentColor" />
            <polygon points="50,12 80,26 80,64 50,88 20,64 20,26" fill="#0c0c0c" stroke="#374151" strokeWidth="3" />
            <circle cx="50" cy="48" r="26" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
          <div className="relative z-10 text-center -mt-1.5">
            <span className="block text-[7px] uppercase tracking-[0.2em] font-black text-neutral-400">RUNDE</span>
            <span className="block text-2xl font-serif font-black text-amber-500 drop-shadow">{state.round}</span>
          </div>
        </div>
      </div>

      {[1, 2].map((pId) => {
        const player = state.players[pId];
        const isLeft = pId === 1;
        const totalScore = calculateScore(pId);
        const isActive = state.activePlayer === pId;
        const activeClass = isActive ? "ring-2 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "";

        return (
          <div key={pId} className={`fixed top-0 bottom-0 w-[290px] bg-neutral-950/95 flex flex-col justify-between py-6 px-4 shadow-2xl z-40 transition-all duration-300 ${activeClass} ${isLeft ? "left-0 border-r border-neutral-800" : "right-0 border-l border-neutral-800"}`}>
            <div className="flex flex-col gap-4">
              <div className="relative py-2 border-b border-neutral-850 text-center">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[7px] font-black uppercase text-amber-500 tracking-widest">{isLeft ? "PLAYER ONE" : "PLAYER TWO"}</div>
                <h2 className="text-lg font-serif font-black tracking-wider text-white uppercase mt-1 truncate drop-shadow">{player.faction || "Faction"}</h2>
                <p className="text-[9px] font-black uppercase text-neutral-400 truncate tracking-wider mt-0.5">{player.name}</p>
                {state.underdogPlayer === pId && (
                  <span className="inline-block mt-1.5 text-[8px] font-black tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/30 py-0.5 px-2.5 rounded uppercase leading-none animate-pulse">
                    ★ Underdog
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl py-2 text-center shadow-inner">
                  <span className="block text-[8px] font-black text-neutral-400 tracking-wider">SCORE</span>
                  <span className="block text-2xl font-serif font-black text-amber-500 font-mono mt-0.5 drop-shadow">{totalScore}</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl py-2 text-center shadow-inner">
                  <span className="block text-[8px] font-black text-neutral-400 tracking-wider">COMMAND P.</span>
                  <span className="block text-2xl font-serif font-black text-blue-400 font-mono mt-0.5 drop-shadow">{player.cp}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ArmyOverlay({ player }) {
  const { title, generalRegiment, regiments, auxiliaries, terrain, imageUrl } = player?.army || {};
  
  const half = Math.ceil((regiments || []).length / 2);
  const regimentsCol1 = (regiments || []).slice(0, half);
  const regimentsCol2 = (regiments || []).slice(half);

  const renderList = (headerTitle, list = []) => (
    <div className="flex flex-col gap-2">
      <div className="border-b-2 border-amber-500/20 pb-1.5">
        <h4 className="text-xs font-serif font-black uppercase tracking-wider text-amber-500">{headerTitle}</h4>
      </div>
      <div className="flex flex-col gap-2">
        {list.length > 0 ? (
          list.map((item, idx) => (
            <div key={idx} className="flex flex-col bg-neutral-900/60 border border-neutral-850 p-2 rounded-xl text-left shadow-sm">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-neutral-100 uppercase">{item.name || "—"}</span>
                <span className="text-[10px] font-mono font-bold text-amber-400 ml-2">{item.count}</span>
              </div>
              {item.note && (
                <span className="text-[9px] text-neutral-400 mt-0.5 leading-snug">{item.note}</span>
              )}
            </div>
          ))
        ) : (
          <span className="text-xs text-neutral-500 italic text-left pl-1">Keine Einheiten</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-neutral-950 text-white font-sans select-none overflow-hidden p-6 md:p-8 flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-7xl h-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between relative shadow-2xl">
        <div className="flex justify-between items-center border-b border-neutral-850 pb-3">
          <div>
            <span className="block text-[8px] font-black uppercase text-amber-500 tracking-widest">ARMEELISTE</span>
            <h1 className="text-2xl font-serif font-black tracking-wider text-white uppercase mt-0.5 drop-shadow">{title || "Armee"}</h1>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black uppercase text-neutral-400">SPIELSYSTEM</span>
            <span className="text-sm font-bold text-amber-500 mt-0.5 uppercase">Warhammer / AoS</span>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-neutral-850 pb-2.5 mt-4">
          <div>
            <span className="block text-[9px] font-black uppercase text-amber-500/80">FAKTION</span>
            <span className="text-xs font-bold text-neutral-200 mt-0.5 uppercase">{player?.faction || "Faktion"}</span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] font-black uppercase text-neutral-400">SPIELER / GENERAL</span>
            <span className="text-xs font-bold text-neutral-200 mt-0.5 uppercase">{player?.name}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 flex-1 mt-6 items-stretch min-h-0">
          <div className="flex flex-col gap-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-8 text-left">
            {renderList("General's Regiment", generalRegiment)}
            {renderList("Gelände / Auxiliaries", terrain)}
          </div>

          <div className="flex flex-col gap-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-8 text-left">
            {regimentsCol1?.length > 0 ? regimentsCol1.map((reg) => (
              <div key={reg.id} className="shrink-0">
                {renderList(reg.title || "Regiment", reg.units)}
              </div>
            )) : (
              <div className="flex flex-col gap-2">
                <div className="border-b-2 border-amber-500/20 pb-1.5"><h4 className="text-xs font-serif font-black uppercase text-amber-500">Regimenter</h4></div>
                <span className="text-xs text-neutral-500 italic text-left pl-1">Keine Regimenter</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 max-h-[700px] overflow-y-auto custom-scrollbar pr-2 pb-8 text-left">
            {regimentsCol2?.length > 0 && regimentsCol2.map((reg) => (
              <div key={reg.id} className="shrink-0">
                {renderList(reg.title || "Regiment", reg.units)}
              </div>
            ))}
            {renderList("Auxiliary Regiments", auxiliaries)}
          </div>

          <div className="flex justify-center items-center relative bg-neutral-900/20 border border-neutral-900 rounded-2xl p-4 h-[700px] shadow-inner">
            {imageUrl ? (
              <img src={imageUrl} alt="Miniatur" className="w-full h-full object-contain rounded-xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-neutral-800">
                <svg className="w-24 h-24 text-neutral-800" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="50" cy="50" r="40" strokeDasharray="3 3" /><path d="M30 70 L70 30" /><path d="M70 70 L30 30" /></svg>
                <span className="text-[10px] font-black tracking-widest text-neutral-500">FUMBLE FORGE</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-neutral-850 pt-2 text-[7px] font-black uppercase text-neutral-500">
          <span>SYSTEM DISPOSITION MATCH</span>
          <span className="text-amber-500">Fumble Forge HUD</span>
        </div>
      </div>
    </div>
  );
}
