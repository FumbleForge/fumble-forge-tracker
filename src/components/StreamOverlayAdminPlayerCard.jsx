import React from "react";
import { Plus, Trash2, Upload, Image, Clipboard } from "lucide-react";

export default function StreamOverlayAdminPlayerCard({
  pId,
  player,
  setImportModalOpen,
  setRawTextInput,
  updatePlayerField,
  updateArmyField,
  handleImageUpload,
  addParsedUnit,
  updateParsedUnit,
  deleteParsedUnit
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
        <span className="text-xs font-black uppercase text-amber-500 tracking-wider">Spieler {pId} Daten</span>
        <button 
          onClick={() => {
            setImportModalOpen(pId);
            setRawTextInput(player.army?.rawListText || "");
          }}
          className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <Clipboard size={14} /> Liste per Copy & Paste importieren
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase">Spieler Name</label>
          <input type="text" value={player.name || ""} onChange={(e) => updatePlayerField(pId, "name", e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase">Fraktion</label>
          <input type="text" value={player.faction || ""} onChange={(e) => updatePlayerField(pId, "faction", e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-amber-400 focus:outline-none focus:border-amber-500 font-bold uppercase" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase">Kontingent / Detachment</label>
          <input type="text" value={player.army?.detachment || ""} onChange={(e) => updateArmyField(pId, "detachment", e.target.value)} placeholder="z.B. Shield Host" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase">Detachment Rules / Traits (1 pro Zeile)</label>
          <textarea 
            rows={2}
            value={(player.army?.detachmentRules || []).join("\n")} 
            onChange={(e) => updateArmyField(pId, "detachmentRules", e.target.value.split("\n"))} 
            placeholder={"EMPEROR'S CHOSEN 1DP\nLIONS OF THE EMPEROR 1DP"}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-amber-500 resize-none" 
          />
        </div>
      </div>
      <div className="bg-neutral-950 border border-neutral-850 p-3 rounded-xl flex flex-col gap-3">
        <span className="text-[10px] font-black uppercase text-amber-500/80 flex items-center gap-1">
          <Image size={12} /> Bildelemente für Overlay & Kamera
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-neutral-400 uppercase">1. Spieler-Foto / Kamera</label>
            <div className="flex gap-1">
              <input type="text" placeholder="URL zum Bild" value={player.army?.playerPhotoUrl || ""} onChange={(e) => updateArmyField(pId, "playerPhotoUrl", e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none" />
              <label className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 flex items-center gap-1">
                <Upload size={10} />
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(pId, e, "playerPhotoUrl")} className="hidden" />
              </label>
            </div>
            {player.army?.playerPhotoUrl && (
              <div className="h-16 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden relative group">
                <img src={player.army.playerPhotoUrl} alt="Player" className="w-full h-full object-cover" />
                <button onClick={() => updateArmyField(pId, "playerPhotoUrl", "")} className="absolute top-1 right-1 bg-red-950/80 text-red-400 p-1 rounded hover:bg-red-900 cursor-pointer"><Trash2 size={10} /></button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-neutral-400 uppercase">2. Charakter / Fraktions-Art</label>
            <div className="flex gap-1">
              <input type="text" placeholder="URL zum Artwork" value={player.army?.characterArtUrl || ""} onChange={(e) => updateArmyField(pId, "characterArtUrl", e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none" />
              <label className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 flex items-center gap-1">
                <Upload size={10} />
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(pId, e, "characterArtUrl")} className="hidden" />
              </label>
            </div>
            {player.army?.characterArtUrl && (
              <div className="h-16 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden relative group">
                <img src={player.army.characterArtUrl} alt="Character Art" className="w-full h-full object-cover" />
                <button onClick={() => updateArmyField(pId, "characterArtUrl", "")} className="absolute top-1 right-1 bg-red-950/80 text-red-400 p-1 rounded hover:bg-red-900 cursor-pointer"><Trash2 size={10} /></button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-neutral-400 uppercase">3. Miniatur / Armee-Foto</label>
            <div className="flex gap-1">
              <input type="text" placeholder="URL zum Miniatur-Bild" value={player.army?.imageUrl || ""} onChange={(e) => updateArmyField(pId, "imageUrl", e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none" />
              <label className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 flex items-center gap-1">
                <Upload size={10} />
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(pId, e, "imageUrl")} className="hidden" />
              </label>
            </div>
            {player.army?.imageUrl && (
              <div className="h-16 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden relative group">
                <img src={player.army.imageUrl} alt="Miniature" className="w-full h-full object-contain" />
                <button onClick={() => updateArmyField(pId, "imageUrl", "")} className="absolute top-1 right-1 bg-red-950/80 text-red-400 p-1 rounded hover:bg-red-900 cursor-pointer"><Trash2 size={10} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-800 pt-3 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-black uppercase text-amber-500">Einheiten-Liste ({player.army?.parsedUnits?.length || 0})</span>
          <button onClick={() => addParsedUnit(pId)} className="text-[10px] bg-neutral-950 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer font-bold">
            <Plus size={10} /> Einzeleinheit Hinzufügen
          </button>
        </div>

        <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {(player.army?.parsedUnits || []).map((unit, uIdx) => (
            <div key={unit.id || uIdx} className="bg-neutral-950 border border-neutral-850 p-2 rounded-xl flex flex-col gap-1">
              <div className="flex gap-1.5 items-center">
                <input type="text" placeholder="Anzahl" value={unit.count || ""} onChange={(e) => updateParsedUnit(pId, uIdx, "count", e.target.value)} className="w-12 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono text-center focus:outline-none" />
                <input type="text" placeholder="Einheiten-Name" value={unit.name || ""} onChange={(e) => updateParsedUnit(pId, uIdx, "name", e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-xs text-white font-bold focus:outline-none" />
                <input type="text" placeholder="Punkte" value={unit.points || ""} onChange={(e) => updateParsedUnit(pId, uIdx, "points", e.target.value)} className="w-16 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono text-center focus:outline-none" />
                <button onClick={() => deleteParsedUnit(pId, uIdx)} className="text-red-400 bg-neutral-900 border border-neutral-800 p-1 rounded hover:bg-red-950/40 cursor-pointer"><Trash2 size={12} /></button>
              </div>
              <input type="text" placeholder="Wargear / Enhancements / Zusatz-Info" value={unit.note || ""} onChange={(e) => updateParsedUnit(pId, uIdx, "note", e.target.value)} className="w-full bg-neutral-950 border border-neutral-850 rounded px-2 py-0.5 text-[10px] text-cyan-300 italic focus:outline-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
