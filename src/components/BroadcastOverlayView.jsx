import React from "react";
import { Tv, Sparkles } from "lucide-react";

export default function BroadcastOverlayView({ player, state, pId }) {
  const { 
    title, detachment, detachmentRules, playerPhotoUrl, characterArtUrl, imageUrl, 
    parsedUnits, generalRegiment, regiments 
  } = player?.army || {};

  const factionTitle = player?.faction || title || "ADEPTUS CUSTODES";
  const playerName = player?.name || `SPIELER ${pId}`;

  let displayUnits = [];
  if (parsedUnits && parsedUnits.length > 0) {
    displayUnits = parsedUnits;
  } else {
    const gen = (generalRegiment || []).map((u) => ({
      id: Math.random(), name: u.name, count: u.count,
      points: u.note?.match(/\d+/)?.[0] || "", note: u.note || ""
    }));
    const custom = (regiments || []).flatMap((r) =>
      (r.units || []).map((u) => ({
        id: Math.random(), name: u.name, count: u.count,
        points: u.note?.match(/\d+/)?.[0] || "", note: u.note || ""
      }))
    );
    displayUnits = [...gen, ...custom];
  }

  const activeMission = state?.missionTag || player?.army?.missionTag || "TAKE AND HOLD";

  const groupedUnits = displayUnits.reduce((acc, unit) => {
    const cat = unit.category || "EINHEITEN";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(unit);
    return acc;
  }, {});

  return (
    <div className="w-screen h-screen bg-[#070b12]/80 backdrop-blur-md text-white font-sans select-none overflow-hidden p-6 md:p-8 flex flex-col justify-between relative animate-fade-in">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#070b12]/50 to-[#04060a]/70 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-6 md:gap-8 min-h-0">
        <div className="w-full md:w-[420px] shrink-0 flex flex-col gap-3.5 border-r border-cyan-500/20 pr-0 md:pr-6">
          <div className="bg-neutral-900/70 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-3 shadow-lg flex flex-col">
            <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> SPIELER PROFIL
            </span>
            <h1 className="text-xl md:text-2xl font-serif font-black tracking-wider text-white uppercase mt-0.5 drop-shadow truncate">
              {playerName}
            </h1>
          </div>

          <div className="h-[480px] bg-neutral-950/60 backdrop-blur-sm border-2 border-cyan-500/30 rounded-xl relative overflow-hidden flex items-center justify-center shadow-2xl">
            {playerPhotoUrl || imageUrl ? (
              <img src={playerPhotoUrl || imageUrl} alt="Player" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-600">
                <Tv size={36} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">SPIELER KAMERA / FOTO</span>
              </div>
            )}
            <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400"></div>
          </div>

          <div className="bg-gradient-to-r from-cyan-950/90 via-blue-950/80 to-neutral-950 border-y-2 border-cyan-500/40 py-2.5 px-3 text-center rounded-lg shadow-md">
            <h2 className="text-base font-serif font-black tracking-widest text-amber-400 uppercase drop-shadow truncate">
              {factionTitle}
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            {detachment && (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg px-3 py-1.5 text-center">
                <span className="block text-[9px] font-black uppercase text-neutral-400 tracking-wider">KONTINGENT</span>
                <span className="text-xs font-bold text-cyan-300 uppercase">{detachment}</span>
              </div>
            )}
            {detachmentRules && detachmentRules.length > 0 && (
              <div className="flex flex-col gap-1 mt-0.5">
                {detachmentRules.map((rule, rIdx) => (
                  <div key={rIdx} className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs font-black tracking-wider text-cyan-200 flex justify-between items-center shadow-sm uppercase">
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-[260px] bg-neutral-950/60 border border-cyan-500/20 rounded-xl relative overflow-hidden flex items-center justify-center shadow-inner mt-auto">
            {characterArtUrl || imageUrl ? (
              <img src={characterArtUrl || imageUrl} alt="Character Art" className="w-full h-full object-contain p-1.5" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-700">
                <Sparkles size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">CHARAKTER ARTWORK</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between pl-0 md:pl-2 min-w-0">
          <div className="flex justify-between items-center border-b border-cyan-500/20 pb-3 mb-4">
            <div>
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">ARMY ROSTER OVERLAY</span>
              <h2 className="text-lg font-bold text-neutral-200 uppercase tracking-wider">{factionTitle} - {playerName}</h2>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1 text-right">
              <span className="block text-[8px] font-black uppercase text-neutral-400">GESAMT EINHEITEN</span>
              <span className="text-sm font-mono font-bold text-amber-400">{displayUnits.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[calc(100vh-160px)] flex flex-col gap-6">
            {Object.entries(groupedUnits).map(([categoryName, units]) => (
              <div key={categoryName} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 border-b border-cyan-500/30 pb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                  <h3 className="text-xs font-serif font-black uppercase text-amber-400 tracking-wider">
                    {categoryName}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400 ml-auto font-bold">
                    {units.length} {units.length === 1 ? "Einheit" : "Einheiten"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {units.map((item, idx) => (
                    <div key={item.id || idx} className="bg-neutral-900/70 hover:bg-neutral-850/80 border border-cyan-500/20 rounded-lg p-2.5 transition-all shadow-md flex flex-col justify-between backdrop-blur-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 font-bold text-xs md:text-sm text-neutral-100 uppercase tracking-wide truncate">
                          {item.count && <span className="text-amber-400 font-mono text-xs shrink-0">{item.count}</span>}
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.points && (
                          <span className="font-mono font-black text-amber-400 text-xs md:text-sm shrink-0 ml-1">
                            {item.points}
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <div className="text-[10px] text-cyan-300/80 italic mt-1 pl-2 border-l-2 border-cyan-500/30 font-sans truncate">
                          {item.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-8 z-30 pointer-events-none">
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-400 px-5 py-2 rounded-lg font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{activeMission}</span>
        </div>
      </div>
    </div>
  );
}
