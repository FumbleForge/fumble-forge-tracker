// src/components/PWAInstallNotice.jsx
import React from "react";
import { Download } from "lucide-react";

export default function PWAInstallNotice({ installPrompt, handleInstallClick }) {
  return (
    <div className="mt-6 space-y-3">
      {installPrompt && (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-bold bg-amber-600 text-neutral-950 hover:bg-amber-500 transition shadow-lg animate-pulse"
        >
          <Download size={18} /> App auf Startbildschirm installieren
        </button>
      )}

      <div className="text-xs text-neutral-500 space-y-1 bg-neutral-900/50 p-3 rounded-lg border border-neutral-800">
        <p className="font-bold text-neutral-400">📱 Als App nutzen:</p>
        <p>• <strong>Android:</strong> 3 Punkte ➔ &quot;App installieren&quot;</p>
        <p>• <strong>iPhone:</strong> Teilen-Button ➔ &quot;Zum Home-Bildschirm&quot;</p>
      </div>
    </div>
  );
}