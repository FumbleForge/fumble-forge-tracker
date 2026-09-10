import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, Lock, Unlock, Settings, Plus, Minus, RotateCcw, 
  Copy, ExternalLink, Check, Trash2, Layers, ShieldAlert 
} from "lucide-react";
import { supabase } from "../supabaseClient";

const DEFAULT_STATE = {
  activeOverlayType: "game", // "game" | "army-p1" | "army-p2"
  gameSystem: "AoS",
  round: 1,
  players: {
    1: {
      name: "Player 1", faction: "Skaven", cp: 4, scoreOverride: "",
      turns: Array.from({ length: 5 }, (_, i) => ({ turn: i + 1, battleplan: 0, battle_tactic: 0 })),
      army: {
        title: "SKAVEN CLANS",
        generalRegiment: [{ name: "Clawlord on Gnaw-Beast", count: "x1" }, { name: "Stormvermin", count: "x20" }],
        regiment: [{ name: "Warplock Jezzails", count: "x3" }],
        terrain: [{ name: "Gnawholes", count: "x3" }],
        imageUrl: ""
      }
    },
    2: {
      name: "Player 2", faction: "Kharadron Overlords", cp: 4, scoreOverride: "",
      turns: Array.from({ length: 5 }, (_, i) => ({ turn: i + 1, battleplan: 0, battle_tactic: 0 })),
      army: {
        title: "KHARADRON OVERLORDS",
        generalRegiment: [{ name: "Brokk Grungsson", count: "x1" }, { name: "Arkanaut Frigate", count: "x1" }],
        regiment: [{ name: "Arkanaut Company", count: "x20" }, { name: "Endrinriggers", count: "x6" }],
        terrain: [{ name: "Zontari Endrin Dock", count: "x1" }],
        imageUrl: ""
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
  const [copiedIndex, setCopiedIndex] = useState(null);
  const broadcastChannelRef = useRef(null);

  const mergeStateWithDefault = (loaded) => {
    if (!loaded || typeof loaded !== "object") return DEFAULT_STATE;
    return {
      ...DEFAULT_STATE,
      ...loaded,
      players: {
        1: {
          ...DEFAULT_STATE.players[1],
          ...(loaded.players?.[1] || {}),
          turns: Array.isArray(loaded.players?.[1]?.turns) ? loaded.players[1].turns : DEFAULT_STATE.players[1].turns,
          army: {
            ...DEFAULT_STATE.players[1].army,
            ...(loaded.players?.[1]?.army || {}),
            generalRegiment: Array.isArray(loaded.players?.[1]?.army?.generalRegiment) ? loaded.players[1].army.generalRegiment : DEFAULT_STATE.players[1].army.generalRegiment,
            regiment: Array.isArray(loaded.players?.[1]?.army?.regiment) ? loaded.players[1].army.regiment : DEFAULT_STATE.players[1].army.regiment,
            terrain: Array.isArray(loaded.players?.[1]?.army?.terrain) ? loaded.players[1].army.terrain : DEFAULT_STATE.players[1].army.terrain,
          }
        },
        2: {
          ...DEFAULT_STATE.players[2],
          ...(loaded.players?.[2] || {}),
          turns: Array.isArray(loaded.players?.[2]?.turns) ? loaded.players[2].turns : DEFAULT_STATE.players[2].turns,
          army: {
            ...DEFAULT_STATE.players[2].army,
            ...(loaded.players?.[2]?.army || {}),
            generalRegiment: Array.isArray(loaded.players?.[2]?.army?.generalRegiment) ? loaded.players[2].army.generalRegiment : DEFAULT_STATE.players[2].army.generalRegiment,
            regiment: Array.isArray(loaded.players?.[2]?.army?.regiment) ? loaded.players[2].army.regiment : DEFAULT_STATE.players[2].army.regiment,
            terrain: Array.isArray(loaded.players?.[2]?.army?.terrain) ? loaded.players[2].army.terrain : DEFAULT_STATE.players[2].army.terrain,
          }
        }
      }
    };
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const overlayParam = params.get("overlay");
    setView(overlayParam === "admin" ? "admin" : (overlayParam || "live"));
  }, []);

  useEffect(() => {
    broadcastChannelRef.current = supabase.channel("fumble-forge-stream-overlay-broadcast", {
      config: { broadcast: { ack: false, self: true } },
    });
    broadcastChannelRef.current
      .on("broadcast", { event: "overlay-update" }, ({ payload }) => {
        if (payload) setState(mergeStateWithDefault(payload));
      })
      .subscribe();

    const loadAndSubscribe = async () => {
      try {
        const { data, error } = await supabase.from("stream_overlays").select("data").eq("id", "active_game").maybeSingle();
        if (error) throw error;
        if (data?.data) setState(mergeStateWithDefault(data.data));
        setSyncStatus("active_db");

        supabase.channel("fumble-forge-stream-overlay-db")
          .on("postgres_changes", { event: "*", schema: "public", table: "stream_overlays", filter: "id=eq.active_game" }, (payload) => {
            if (payload.new?.data) setState(mergeStateWithDefault(payload.new.data));
          })
          .subscribe();
      } catch (err) {
        setSyncStatus("broadcast_only");
        const local = localStorage.getItem("fumble_forge_stream_overlay_state");
        if (local) {
          try { setState(mergeStateWithDefault(JSON.parse(local))); } catch (e) {}
        }
      }
    };
    loadAndSubscribe();

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
        if (profile?.role === "admin") setIsAuthenticated(true);
      }
      if (localStorage.getItem("fumble_forge_overlay_admin_auth") === "true") {
        setIsAuthenticated(true);
      }
    };
    checkAuth();

    return () => {
      if (broadcastChannelRef.current) supabase.removeChannel(broadcastChannelRef.current);
    };
  }, []);

  const updateState = async (newState) => {
    const merged = mergeStateWithDefault(newState);
    setState(merged);
    localStorage.setItem("fumble_forge_stream_overlay_state", JSON.stringify(merged));
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({ type: "broadcast", event: "overlay-update", payload: merged }).catch(() => {});
    }
    try {
      const { error } = await supabase.from("stream_overlays").upsert({ id: "active_game", data: merged, updated_at: new Date() });
      setSyncStatus(error ? "broadcast_only" : "active_db");
    } catch (e) {
      setSyncStatus("broadcast_only");
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (["fumbleforge", "forge2026", "fumbleoverlay"].includes(password.toLowerCase())) {
      setIsAuthenticated(true);
      localStorage.setItem("fumble_forge_overlay_admin_auth", "true");
      setErrorMsg("");
    } else {
      setErrorMsg("Ungültiges Passwort. Versuche 'fumbleforge'.");
    }
  };

  const calculateScore = (pId) => {
    const p = state?.players?.[pId] || DEFAULT_STATE.players[pId];
    if (p?.scoreOverride && !isNaN(parseInt(p.scoreOverride))) return parseInt(p.scoreOverride);
    return (p?.turns || []).reduce((acc, curr) => acc + (parseInt(curr?.battleplan) || 0) + (parseInt(curr?.battle_tactic) || 0), 0);
  };

  const updatePlayerField = (pId, field, value) => {
    const updated = mergeStateWithDefault(state);
    updated.players[pId] = { ...updated.players[pId], [field]: value };
    updateState(updated);
  };

  const updatePlayerTurn = (pId, turnIdx, field, value) => {
    const updated = mergeStateWithDefault(state);
    updated.players[pId].turns = (updated.players[pId].turns || []).map((t, idx) => 
      idx === turnIdx ? { ...t, [field]: Math.max(0, parseInt(value) || 0) } : t
    );
    updateState(updated);
  };

  const updateArmyField = (pId, field, value) => {
    const updated = mergeStateWithDefault(state);
    updated.players[pId].army = { ...updated.players[pId].army, [field]: value };
    updateState(updated);
  };

  const handleImageUpload = (pId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
        updateArmyField(pId, "imageUrl", compressedBase64);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const addArmyListItem = (pId, key) => {
    const updated = mergeStateWithDefault(state);
    updated.players[pId].army[key] = [...(updated.players[pId].army[key] || []), { name: "", count: "x1" }];
    updateState(updated);
  };

  const updateArmyListItem = (pId, key, idx, field, value) => {
    const updated = mergeStateWithDefault(state);
    updated.players[pId].army[key] = (updated.players[pId].army[key] || []).map((item, i) => 
      i === idx ? { ...item, [field]: value } : item
    );
    updateState(updated);
  };

  const deleteArmyListItem = (pId, key, idx) => {
    const updated = mergeStateWithDefault(state);
    updated.players[pId].army[key] = (updated.players[pId].army[key] || []).filter((_, i) => i !== idx);
    updateState(updated);
  };

  const resetAll = () => {
    if (window.confirm("Möchtest du das Overlay zurücksetzen?")) {
      updateState(DEFAULT_STATE);
    }
  };

  const copyUrl = (key, idx) => {
    const url = `${window.location.origin}${window.location.pathname}?overlay=${key}`;
    navigator.clipboard.writeText(url);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (view === "admin" && !isAuthenticated) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-neutral-950 text-neutral-200 p-4 font-sans">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 rounded-full flex items-center justify-center text-amber-500"><Lock size={20} /></div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-amber-500">Overlay-Steuerung</h2>
            <form onSubmit={handleLogin} className="w-full mt-2 flex flex-col gap-3">
              <input
                type="password"
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-amber-500 text-white font-mono text-center"
              />
              {errorMsg && <div className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/30 rounded px-2 py-1 flex items-center gap-1 justify-center"><ShieldAlert size={12} />{errorMsg}</div>}
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-2 px-3 rounded-xl cursor-pointer text-xs flex justify-center items-center gap-1"><Unlock size={14} /> Entsperren</button>
            </form>
            <span className="text-[9px] text-neutral-500">Standard-Passwort: <code className="text-neutral-300">fumbleforge</code></span>
          </div>
        </div>
      </div>
    );
  }

  if (view === "admin") {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans pb-12">
        <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50 shadow px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 text-neutral-950 rounded-lg flex items-center justify-center font-bold"><Settings size={16} /></div>
            <div>
              <h1 className="text-sm font-black tracking-wider text-white uppercase">Stream-Overlay Admin</h1>
              <p className="text-[9px] text-neutral-400 flex items-center gap-1">{syncStatus === "active_db" ? <><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span><span className="text-green-400 font-semibold">DB Sync aktiv</span></> : <><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span><span className="text-amber-400 font-semibold">Realtime-Only</span></>}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="bg-neutral-800 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-neutral-700/60 transition cursor-pointer flex items-center gap-1"><RotateCcw size={12} /> Zurücksetzen</button>
            <button onClick={() => { setIsAuthenticated(false); localStorage.removeItem("fumble_forge_overlay_admin_auth"); }} className="bg-neutral-800 border border-neutral-700 hover:bg-neutral-750 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer">Abmelden</button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1"><Layers size={12} /> Stream-Anzeige</h3>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: "game", label: "Spiel-Scoreboard (AoS/40k)" },
                  { id: "army-p1", label: `Armee: ${state.players[1].name} (${state.players[1].faction})` },
                  { id: "army-p2", label: `Armee: ${state.players[2].name} (${state.players[2].faction})` }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateState({ ...state, activeOverlayType: t.id })}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold text-left border transition flex justify-between items-center cursor-pointer ${
                      state.activeOverlayType === t.id ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                    }`}
                  >
                    <span>{t.label}</span>
                    {state.activeOverlayType === t.id && <span className="text-[8px] bg-amber-500 text-neutral-950 font-black px-1.5 py-0.5 rounded">LIVE</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1"><Copy size={12} /> OBS-Quellen</h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { name: "Live-Overlay (Dynamisch)", key: "live" },
                  { name: "Spiel-Overlay (Statisch)", key: "game" },
                  { name: "Armee 1 (Statisch)", key: "army-p1" },
                  { name: "Armee 2 (Statisch)", key: "army-p2" }
                ].map((item, idx) => (
                  <div key={item.key} className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-neutral-300">{item.name}</span>
                      <button onClick={() => copyUrl(item.key, idx)} className="text-[9px] text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-0.5 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800 cursor-pointer">
                        {copiedIndex === idx ? <Check size={8} /> : <Copy size={8} />}
                        {copiedIndex === idx ? "Kopiert" : "Copy"}
                      </button>
                    </div>
                    <span className="text-[8px] font-mono text-neutral-500 truncate select-all">{`${window.location.origin}${window.location.pathname}?overlay=${item.key}`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="w-full sm:w-1/2">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Runde (1 - 5)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateState({ ...state, round: Math.max(1, state.round - 1) })} className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 w-8 h-8 rounded-lg flex items-center justify-center text-amber-500 cursor-pointer"><Minus size={14} /></button>
                  <div className="flex-1 text-center font-bold bg-neutral-950 border border-neutral-800 py-1.5 rounded-lg text-xs">Runde {state.round}</div>
                  <button onClick={() => updateState({ ...state, round: Math.min(5, state.round + 1) })} className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 w-8 h-8 rounded-lg flex items-center justify-center text-amber-500 cursor-pointer"><Plus size={14} /></button>
                </div>
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">System (Design)</label>
                <div className="grid grid-cols-2 gap-1.5 h-8">
                  {["AoS", "40k"].map((sys) => (
                    <button key={sys} onClick={() => updateState({ ...state, gameSystem: sys })} className={`font-bold rounded-lg border text-[10px] cursor-pointer transition ${state.gameSystem === sys ? "bg-amber-500 text-neutral-950 border-amber-500" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"}`}>
                      {sys === "AoS" ? "Age of Sigmar" : "Warhammer 40k"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((pId) => {
                const player = state.players[pId];
                return (
                  <div key={pId} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3.5 shadow">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 border-b border-neutral-800 pb-1.5">Spieler {pId} ({pId === 1 ? "Links" : "Rechts"})</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Name</label>
                        <input type="text" value={player.name} onChange={(e) => updatePlayerField(pId, "name", e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Faktion</label>
                        <input type="text" value={player.faction} onChange={(e) => updatePlayerField(pId, "faction", e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-0.5">CP</label>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updatePlayerField(pId, "cp", Math.max(0, player.cp - 1))} className="bg-neutral-950 border border-neutral-800 w-6 h-6 rounded flex justify-center items-center text-amber-500 text-xs"><Minus size={10} /></button>
                          <div className="flex-1 text-center font-mono font-bold bg-neutral-950 border border-neutral-800 py-0.5 rounded text-xs">{player.cp} CP</div>
                          <button onClick={() => updatePlayerField(pId, "cp", player.cp + 1)} className="bg-neutral-950 border border-neutral-800 w-6 h-6 rounded flex justify-center items-center text-amber-500 text-xs"><Plus size={10} /></button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Score Override</label>
                        <input type="number" placeholder="Auto Calc" value={player.scoreOverride} onChange={(e) => updatePlayerField(pId, "scoreOverride", e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-xs text-center font-mono focus:outline-none" />
                      </div>
                    </div>

                    <div className="bg-neutral-950 rounded-lg p-2 border border-neutral-800/55 flex justify-between items-center text-[11px] font-bold"><span className="text-neutral-400 uppercase">Summe VP:</span><span className="text-amber-500 text-sm font-black">{calculateScore(pId)} VP</span></div>

                    <div>
                      <span className="block text-[9px] font-bold text-neutral-400 uppercase mb-1.5 border-b border-neutral-850 pb-0.5">Runden VP</span>
                      <div className="flex flex-col gap-1.5">
                        {player.turns.map((turn, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-1.5 bg-neutral-950 p-1.5 border border-neutral-800/40 rounded justify-between text-[10px]">
                            <span className="font-bold text-neutral-400">R{turn.turn}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] text-neutral-500">PLAN:</span>
                              <input type="number" value={turn.battleplan} onChange={(e) => updatePlayerTurn(pId, tIdx, "battleplan", e.target.value)} className="w-8 bg-neutral-900 border border-neutral-800 rounded py-0.5 text-center text-xs" />
                              <span className="text-[8px] text-neutral-500">TACTIC:</span>
                              <input type="number" value={turn.battle_tactic} onChange={(e) => updatePlayerTurn(pId, tIdx, "battle_tactic", e.target.value)} className="w-8 bg-neutral-900 border border-neutral-800 rounded py-0.5 text-center text-xs" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-neutral-850 pt-3 flex flex-col gap-2.5">
                      <span className="block text-[9px] font-black uppercase text-amber-500 tracking-wider">Armeelist</span>
                      <input type="text" placeholder="ARMEE TITEL" value={player.army.title} onChange={(e) => updateArmyField(pId, "title", e.target.value.toUpperCase())} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white uppercase focus:outline-none" />
                      
                      <div className="flex flex-col gap-1.5 text-left">
                        <label className="block text-[8px] font-bold text-neutral-400 uppercase">Miniatur Bildquelle</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <input 
                            type="text" 
                            placeholder="Bild-URL (extern)" 
                            value={player.army.imageUrl?.startsWith("data:") ? "[Lokales Bild hochgeladen]" : player.army.imageUrl || ""} 
                            onChange={(e) => updateArmyField(pId, "imageUrl", e.target.value)} 
                            className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none truncate" 
                            disabled={player.army.imageUrl?.startsWith("data:")} 
                          />
                          <label className="bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 border-dashed rounded px-2 py-1 text-[10px] text-amber-500 font-bold text-center cursor-pointer flex items-center justify-center gap-1 transition-all">
                            <span>Datei hochladen</span>
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(pId, e)} className="hidden" />
                          </label>
                        </div>
                        {player.army.imageUrl && (
                          <div className="flex justify-between items-center bg-neutral-950 p-1.5 rounded border border-neutral-850/50 text-[8px]">
                            <span className="text-neutral-400 truncate max-w-[180px]">{player.army.imageUrl.startsWith("data:") ? "Lokales Bild (temporär)" : player.army.imageUrl}</span>
                            <button onClick={() => updateArmyField(pId, "imageUrl", "")} className="text-red-400 hover:text-red-300 font-semibold cursor-pointer">Löschen</button>
                          </div>
                        )}
                      </div>

                      {["generalRegiment", "regiment", "terrain"].map((listKey) => (
                        <div key={listKey} className="mt-1">
                          <div className="flex justify-between items-center mb-1"><span className="text-[8px] font-bold text-neutral-400 uppercase">{listKey === "generalRegiment" ? "General's Reg." : listKey === "regiment" ? "Regimenter" : "Gelände"}</span><button onClick={() => addArmyListItem(pId, listKey)} className="text-[8px] bg-neutral-950 border border-neutral-800 text-amber-500 px-1 rounded flex items-center gap-0.5 cursor-pointer hover:border-neutral-700"><Plus size={8} /> Add</button></div>
                          <div className="flex flex-col gap-1">
                            {player.army[listKey].map((item, idx) => (
                              <div key={idx} className="flex gap-0.5">
                                <input type="text" placeholder="Einheit" value={item.name} onChange={(e) => updateArmyListItem(pId, listKey, idx, "name", e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none" />
                                <input type="text" placeholder="x1" value={item.count} onChange={(e) => updateArmyListItem(pId, listKey, idx, "count", e.target.value)} className="w-8 bg-neutral-950 border border-neutral-800 rounded py-0.5 text-[10px] text-center text-amber-500 focus:outline-none font-mono" />
                                <button onClick={() => deleteArmyListItem(pId, listKey, idx)} className="text-red-400 bg-neutral-950 border border-neutral-800 rounded px-1 hover:bg-red-950/30 cursor-pointer"><Trash2 size={8} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeLayout = view === "live" ? state.activeOverlayType : view;

  if (activeLayout === "army-p1") return <ArmyOverlay key="army-p1" player={state.players[1]} />;
  if (activeLayout === "army-p2") return <ArmyOverlay key="army-p2" player={state.players[2]} />;

  return (
    <div className="w-screen h-screen bg-transparent relative overflow-hidden font-sans select-none text-white animate-fade-in">
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
        <div className="w-20 h-20 relative flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full text-neutral-800 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 85 L85 15" strokeLinecap="round" /><path d="M15 85 L20 80 L15 75 L10 80 Z" fill="currentColor" /><path d="M18 82 L22 86 M24 76 L16 68" strokeWidth="2" />
            <path d="M85 85 L15 15" strokeLinecap="round" /><path d="M85 85 L80 80 L85 75 L90 80 Z" fill="currentColor" /><path d="M82 82 L78 86 M76 76 L84 68" strokeWidth="2" />
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
        return (
          <div key={pId} className={`fixed top-0 bottom-0 w-[290px] bg-neutral-950/95 flex flex-col justify-between py-6 px-4 shadow-2xl z-40 border-neutral-800 ${isLeft ? "left-0 border-r" : "right-0 border-l"}`}>
            <div className={`absolute top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-amber-500/10 to-transparent ${isLeft ? "right-0.5" : "left-0.5"}`}></div>
            <div className="flex flex-col gap-4">
              <div className="relative py-2 border-b border-neutral-850 text-center">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[7px] font-black uppercase text-amber-500 tracking-widest">{isLeft ? "PLAYER ONE" : "PLAYER TWO"}</div>
                <h2 className="text-lg font-serif font-black tracking-wider text-white uppercase mt-1 truncate drop-shadow">{player.faction || "Faction"}</h2>
                <p className="text-[9px] font-black uppercase text-neutral-400 truncate tracking-wider mt-0.5">{player.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl py-2.5 text-center shadow-inner">
                  <span className="block text-[8px] font-black text-neutral-400 tracking-wider">SCORE</span>
                  <span className="block text-3xl font-serif font-black text-amber-500 font-mono mt-1 drop-shadow">{totalScore}</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-850 rounded-xl py-2.5 text-center shadow-inner">
                  <span className="block text-[8px] font-black text-neutral-400 tracking-wider">COMMAND P.</span>
                  <span className="block text-3xl font-serif font-black text-blue-400 font-mono mt-1 drop-shadow">{player.cp}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-1">
                {player.turns.map((turn, idx) => {
                  const isCurrent = turn.turn === state.round;
                  return (
                    <div key={idx} className={`border rounded-xl p-2 transition-all ${isCurrent ? "bg-amber-500/5 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.05)]" : "bg-neutral-900/30 border-neutral-850/50"}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[9px] font-black ${isCurrent ? "text-amber-500" : "text-neutral-400"}`}>RUNDE {turn.turn}</span>
                        {isCurrent && <span className="text-[6px] bg-amber-500 text-neutral-950 font-black px-1.5 py-0.5 rounded tracking-widest animate-pulse">AKTIV</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-neutral-950/70 border border-neutral-850 rounded px-1.5 py-0.5 flex justify-between items-center text-[10px]">
                          <span className="text-neutral-500 font-bold">PLAN</span>
                          <span className="font-bold text-neutral-300 font-mono">{turn.battleplan}</span>
                        </div>
                        <div className="bg-neutral-950/70 border border-neutral-850 rounded px-1.5 py-0.5 flex justify-between items-center text-[10px]">
                          <span className="text-neutral-500 font-bold">TACT</span>
                          <span className="font-bold text-neutral-300 font-mono">{turn.battle_tactic}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {player?.army?.imageUrl && (
              <div className="mt-2 mb-2 h-[120px] bg-neutral-900/40 border border-neutral-850/50 rounded-xl overflow-hidden p-1.5 flex items-center justify-center relative shadow-inner">
                <img 
                  src={player.army.imageUrl} 
                  alt="Miniature" 
                  className="w-full h-full object-contain rounded-lg drop-shadow" 
                />
              </div>
            )}

            <div className="border-t border-neutral-850 pt-3 text-center"><div className="inline-flex items-center gap-1 text-[7px] font-black uppercase text-amber-500/60 tracking-wider"><Activity size={8} /> Fumble Forged Battle-HUD</div></div>
          </div>
        );
      })}
    </div>
  );
}

function ArmyOverlay({ player }) {
  const { title, generalRegiment, regiment, terrain, imageUrl } = player.army;
  const renderList = (label, list) => (
    <div className="flex flex-col gap-2 flex-1">
      <div className="border-b border-amber-500/20 pb-0.5"><h4 className="text-[10px] font-serif font-black uppercase text-amber-500">{label}</h4></div>
      <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
        {list?.length > 0 ? list.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center bg-neutral-900/60 border border-neutral-850/60 rounded-lg px-2.5 py-1.5 text-[11px]">
            <span className="font-semibold text-neutral-200 truncate pr-1 text-left">{item.name || "—"}</span>
            <span className="font-mono text-amber-500 font-extrabold bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded shrink-0">{item.count || "x1"}</span>
          </div>
        )) : <span className="text-[9px] text-neutral-500 italic text-left">Keine Einträge</span>}
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-transparent p-12 flex items-center justify-center font-sans animate-fade-in text-white select-none">
      <div className="relative bg-neutral-950/98 border border-neutral-800 rounded-3xl p-8 max-w-4xl w-full min-h-[460px] flex flex-col justify-between shadow-[0_15px_45px_rgba(0,0,0,0.95)]">
        <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-neutral-700 rounded-tl-2xl"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-neutral-700 rounded-tr-2xl"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-neutral-700 rounded-bl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-neutral-700 rounded-br-2xl"></div>

        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 text-center px-8 py-1.5 rounded-xl shadow-xl min-w-[280px] max-w-[90%] truncate">
          <span className="block text-[7px] font-black uppercase tracking-widest text-neutral-400">ARMEELISTE</span>
          <h2 className="text-xl font-serif font-black uppercase tracking-wider text-amber-500 drop-shadow">{title || player.faction || "KRAFT DISPOSITION"}</h2>
        </div>

        <div className="flex justify-between items-center border-b border-neutral-850 pb-2.5 mt-4">
          <div>
            <span className="block text-[9px] font-black uppercase text-amber-500/80">FAKTION</span>
            <span className="text-xs font-bold text-neutral-200 mt-0.5 uppercase">{player.faction || "AoS Faktion"}</span>
          </div>
          <div className="text-right">
            <span className="block text-[9px] font-black uppercase text-neutral-400">SPIELER / GENERAL</span>
            <span className="text-xs font-bold text-neutral-200 mt-0.5 uppercase">{player.name}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 mt-5 items-stretch">
          <div className="md:col-span-4 flex flex-col gap-2.5">{renderList("General's Regiment", generalRegiment)}</div>
          <div className="md:col-span-4 flex flex-col gap-4 justify-between">{renderList("Regimenter", regiment)}{renderList("Gelände", terrain)}</div>
          <div className="md:col-span-4 flex justify-center items-center relative min-h-[220px] bg-neutral-900/20 border border-neutral-900 rounded-xl p-3">
            {imageUrl ? (
              <img src={imageUrl} alt="Miniatur" className="w-full h-full max-h-[220px] object-contain rounded-lg drop-shadow" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-850">
                <svg className="w-20 h-20 text-neutral-800" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="50" cy="50" r="40" strokeDasharray="3 3" /><path d="M30 70 L70 30" /><path d="M70 70 L30 30" /></svg>
                <span className="text-[8px] font-black tracking-widest text-neutral-500">FUMBLE FORGE</span>
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
