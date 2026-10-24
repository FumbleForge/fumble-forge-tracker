import React, { useState } from "react";
import { 
  Lock, Settings, Minus, Plus, RotateCcw, Copy, ExternalLink, 
  Check, Tv, Clipboard, X 
} from "lucide-react";
import { parseArmyListText } from "../utils/armyListParser";
import StreamOverlayAdminPlayerCard from "./StreamOverlayAdminPlayerCard";

export default function StreamOverlayAdmin({
  state,
  updateState,
  isAuthenticated,
  handleLogin,
  handleLogout,
  password,
  setPassword,
  errorMsg,
  syncStatus,
  DEFAULT_STATE
}) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(null);
  const [rawTextInput, setRawTextInput] = useState("");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="font-serif font-black text-lg text-amber-500 uppercase tracking-wider">Stream Overlay Admin</h2>
              <p className="text-xs text-neutral-400">Passwort erforderlich</p>
            </div>
          </div>
          {errorMsg && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 p-2 rounded">{errorMsg}</p>}
          <input 
            type="password" 
            placeholder="Passwort" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 text-white" 
          />
          <button type="submit" className="bg-amber-500 text-neutral-950 font-black py-3 rounded-xl hover:bg-amber-400 transition cursor-pointer text-sm">
            Anmelden
          </button>
        </form>
      </div>
    );
  }

  const baseUrl = window.location.origin + window.location.pathname;
  const obsLinks = [
    { label: "🎮 Active Game HUD", url: `${baseUrl}?overlay=game` },
    { label: "⚔️ Army Card Spieler 1 (AoS)", url: `${baseUrl}?overlay=army-p1` },
    { label: "⚔️ Army Card Spieler 2 (AoS)", url: `${baseUrl}?overlay=army-p2` },
    { label: "📊 Broadcast List Spieler 1 (Art of War Style)", url: `${baseUrl}?overlay=broadcast-p1` },
    { label: "📊 Broadcast List Spieler 2 (Art of War Style)", url: `${baseUrl}?overlay=broadcast-p2` }
  ];

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const updatePlayerField = (pId, field, value) => {
    const updated = { ...state };
    updated.players = {
      ...updated.players,
      [pId]: { ...updated.players[pId], [field]: value }
    };
    updateState(updated);
  };

  const updateArmyField = (pId, field, value) => {
    const updated = { ...state };
    const pArmy = updated.players[pId].army || {};
    updated.players = {
      ...updated.players,
      [pId]: {
        ...updated.players[pId],
        army: { ...pArmy, [field]: value }
      }
    };
    updateState(updated);
  };
  const handleImageUpload = (pId, e, field = "imageUrl") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1000;
        const MAX_HEIGHT = 1000;
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

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        updateArmyField(pId, field, compressedBase64);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImportArmyList = (pId) => {
    if (!rawTextInput.trim()) return;
    const parsed = parseArmyListText(rawTextInput);
    if (!parsed) return;

    const updated = { ...state };
    const pArmy = updated.players[pId].army || {};

    if (parsed.faction) {
      updated.players[pId].faction = parsed.faction;
      pArmy.title = parsed.faction;
    }
    if (parsed.detachment) {
      pArmy.detachment = parsed.detachment;
    }
    if (parsed.detachmentRules && parsed.detachmentRules.length > 0) {
      pArmy.detachmentRules = parsed.detachmentRules;
    }

    if (parsed.parsedUnits && parsed.parsedUnits.length > 0) {
      pArmy.parsedUnits = parsed.parsedUnits;
      pArmy.rawListText = rawTextInput;

      pArmy.generalRegiment = parsed.parsedUnits.slice(0, 2).map((u) => ({
        name: u.name,
        count: u.count,
        note: u.note || (u.points ? `${u.points} pts` : "")
      }));

      const remaining = parsed.parsedUnits.slice(2);
      if (remaining.length > 0) {
        pArmy.regiments = [
          {
            id: `reg-${Date.now()}`,
            title: parsed.detachment || "Einheiten",
            units: remaining.map((u) => ({
              name: u.name,
              count: u.count,
              note: u.note || (u.points ? `${u.points} pts` : "")
            }))
          }
        ];
      }
    }

    updated.players[pId].army = pArmy;
    updateState(updated);
    setImportModalOpen(null);
    setRawTextInput("");
  };

  const addParsedUnit = (pId) => {
    const updated = { ...state };
    const pArmy = updated.players[pId].army || {};
    const currentUnits = pArmy.parsedUnits || [];
    pArmy.parsedUnits = [
      ...currentUnits,
      { id: `unit-${Date.now()}`, name: "", count: "1x", points: "", note: "", category: "UNITS" }
    ];
    updated.players[pId].army = pArmy;
    updateState(updated);
  };

  const updateParsedUnit = (pId, uIdx, field, value) => {
    const updated = { ...state };
    const pArmy = updated.players[pId].army || {};
    const currentUnits = [...(pArmy.parsedUnits || [])];
    if (currentUnits[uIdx]) {
      currentUnits[uIdx] = { ...currentUnits[uIdx], [field]: value };
      pArmy.parsedUnits = currentUnits;
      updated.players[pId].army = pArmy;
      updateState(updated);
    }
  };

  const deleteParsedUnit = (pId, uIdx) => {
    const updated = { ...state };
    const pArmy = updated.players[pId].army || {};
    const currentUnits = (pArmy.parsedUnits || []).filter((_, idx) => idx !== uIdx);
    pArmy.parsedUnits = currentUnits;
    updated.players[pId].army = pArmy;
    updateState(updated);
  };
  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans p-4 md:p-8 pb-20">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* HEADER */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="font-serif font-black text-xl text-amber-500 uppercase tracking-wider">Stream Overlay Control Center</h1>
              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                <span className={`inline-block w-2 h-2 rounded-full ${syncStatus === "connected" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
                <span>Sync Status: {syncStatus === "connected" ? "Online & Synchronisiert" : "Verbinde..."}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button onClick={() => updateState(DEFAULT_STATE)} className="flex-1 md:flex-none text-xs bg-neutral-800 border border-neutral-700 hover:border-red-500 text-neutral-300 hover:text-red-400 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer">
              <RotateCcw size={14} /> Reset Data
            </button>
            <button onClick={handleLogout} className="text-xs bg-neutral-800 border border-neutral-700 hover:border-amber-500 text-neutral-300 px-3 py-2 rounded-xl transition cursor-pointer">
              Abmelden
            </button>
          </div>
        </div>

        {/* OVERLAY SELECTOR */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-2">
            <Tv size={16} /> Aktives Haupt-Overlay Wählen
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { id: "game", label: "🎮 Game HUD" },
              { id: "army-p1", label: "⚔️ Army P1 (AoS)" },
              { id: "army-p2", label: "⚔️ Army P2 (AoS)" },
              { id: "broadcast-p1", label: "📊 Broadcast P1" },
              { id: "broadcast-p2", label: "📊 Broadcast P2" }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => updateState({ ...state, activeOverlayType: opt.id })}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer text-center ${
                  state.activeOverlayType === opt.id
                    ? "bg-amber-500 text-neutral-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* OBS LINKS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-3">
          <h2 className="text-xs font-black uppercase text-amber-500 tracking-wider">OBS Browser-Source Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {obsLinks.map((link, idx) => (
              <div key={idx} className="flex items-center justify-between bg-neutral-950 border border-neutral-850 p-2.5 rounded-xl text-xs gap-2">
                <div className="truncate flex-1">
                  <span className="block text-[10px] text-amber-500 font-bold">{link.label}</span>
                  <span className="text-neutral-400 font-mono text-[10px] truncate block">{link.url}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copyToClipboard(link.url, idx)} className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 hover:text-amber-500 cursor-pointer">
                    {copiedIndex === idx ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <a href={link.url} target="_blank" rel="noreferrer" className="p-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 hover:text-amber-500 cursor-pointer">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GLOBAL MATCH SETTINGS */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-4">
          <h2 className="text-xs font-black uppercase text-amber-500 tracking-wider">Globale Match-Einstellungen</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase">Szenario / Mission Status</label>
              <input 
                type="text" 
                value={state.missionTag || ""} 
                onChange={(e) => updateState({ ...state, missionTag: e.target.value })} 
                placeholder="z.B. TAKE AND HOLD"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-amber-400 font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase">Spiel-Runde</label>
              <div className="flex items-center gap-2">
                <button onClick={() => updateState({ ...state, round: Math.max(1, state.round - 1) })} className="p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-300 hover:text-amber-500 cursor-pointer"><Minus size={14} /></button>
                <span className="flex-1 text-center font-mono font-bold text-lg text-amber-500 bg-neutral-950 border border-neutral-800 py-1.5 rounded-xl">{state.round}</span>
                <button onClick={() => updateState({ ...state, round: Math.min(5, state.round + 1) })} className="p-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-300 hover:text-amber-500 cursor-pointer"><Plus size={14} /></button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase">Underdog Bonus</label>
              <div className="grid grid-cols-3 gap-1">
                <button onClick={() => updateState({ ...state, underdogPlayer: null })} className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${state.underdogPlayer === null ? "bg-amber-500 text-neutral-950 border-amber-400" : "bg-neutral-950 border-neutral-800 text-neutral-400"}`}>Keiner</button>
                <button onClick={() => updateState({ ...state, underdogPlayer: 1 })} className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${state.underdogPlayer === 1 ? "bg-amber-500 text-neutral-950 border-amber-400" : "bg-neutral-950 border-neutral-800 text-neutral-400"}`}>Spieler 1</button>
                <button onClick={() => updateState({ ...state, underdogPlayer: 2 })} className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${state.underdogPlayer === 2 ? "bg-amber-500 text-neutral-950 border-amber-400" : "bg-neutral-950 border-neutral-800 text-neutral-400"}`}>Spieler 2</button>
              </div>
            </div>
          </div>
        </div>
        {/* PLAYERS CARDS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((pId) => (
            <StreamOverlayAdminPlayerCard
              key={pId}
              pId={pId}
              player={state.players[pId]}
              setImportModalOpen={setImportModalOpen}
              setRawTextInput={setRawTextInput}
              updatePlayerField={updatePlayerField}
              updateArmyField={updateArmyField}
              handleImageUpload={handleImageUpload}
              addParsedUnit={addParsedUnit}
              updateParsedUnit={updateParsedUnit}
              deleteParsedUnit={deleteParsedUnit}
            />
          ))}
        </div>
      </div>

      {/* IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl flex flex-col gap-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Clipboard size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-black text-amber-500 text-lg uppercase">Armeeliste Importieren (Spieler {importModalOpen})</h3>
                  <p className="text-xs text-neutral-400">Füge deine Liste von Warhammer App, Battlescribe, New Recruit oder als Text ein.</p>
                </div>
              </div>
              <button onClick={() => setImportModalOpen(null)} className="text-neutral-400 hover:text-white cursor-pointer"><X size={20} /></button>
            </div>

            <textarea
              rows={10}
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              placeholder={"Füge hier deine Armeeliste ein, z.B.:\n\nAdeptus Custodes\nShield Host\n\nTRAJANN VALORIS (265 pts)\n3x ALLARUS CUSTODIANS (270 pts)\nCALADIUS GRAV-TANK (250 pts)\n  • Twin Iliastus Accelerator Cannon"}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-200 font-mono focus:outline-none focus:border-amber-500 resize-none"
            />

            {rawTextInput.trim() && (() => {
              const parsed = parseArmyListText(rawTextInput);
              return (
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center text-amber-400 font-bold border-b border-neutral-800 pb-1">
                    <span>Erkannte Fraktion: {parsed?.faction || "Standard"}</span>
                    <span>Kontingent: {parsed?.detachment || "Standard"}</span>
                    <span>Einheiten: {parsed?.parsedUnits?.length || 0}</span>
                  </div>
                  {parsed?.parsedUnits && parsed.parsedUnits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-y-auto">
                      {parsed.parsedUnits.slice(0, 8).map((u, i) => (
                        <span key={i} className="bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded text-[10px] text-neutral-300">
                          <strong className="text-amber-400">{u.count}</strong> {u.name} {u.points ? " (" + u.points + "p)" : ""}
                        </span>
                      ))}
                      {parsed.parsedUnits.length > 8 && <span className="text-[10px] text-neutral-500 self-center">+{parsed.parsedUnits.length - 8} weitere</span>}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button onClick={() => setImportModalOpen(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition cursor-pointer">Abbrechen</button>
              <button onClick={() => handleImportArmyList(importModalOpen)} className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5">
                <Check size={16} /> Liste übernehmen & Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

