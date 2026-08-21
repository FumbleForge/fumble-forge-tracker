import React from "react";
import { LayoutGrid } from "lucide-react";

export default function WelcomeView({ user, onEnter }) {
  const displayName = user?.username || user?.name || "Mitglied";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background glow effect to make it look premium */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-neutral-900 border border-amber-600/30 p-8 rounded-2xl shadow-2xl text-center space-y-8 relative z-10 animate-fade-in">
        {/* App Title in the famous design */}
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-amber-500 uppercase tracking-widest filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]">
            Fumble Forged
          </h1>
          <p className="text-xs uppercase font-semibold tracking-widest text-neutral-400">
            the App
          </p>
        </div>

        {/* The attached Image */}
        <div className="relative group cursor-pointer" onClick={onEnter}>
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <img
            src="/logo.png"
            alt="Fumble Forged Logo"
            className="relative w-56 h-56 mx-auto object-contain rounded-2xl shadow-2xl border border-amber-600/20 bg-neutral-950/50 p-2 transform transition hover:scale-105 duration-300"
          />
        </div>

        {/* Welcome Message */}
        <div className="space-y-2">
          <p className="text-lg text-neutral-400">
            Wilkommen zurück
          </p>
          <h2 className="text-2xl font-extrabold text-amber-500 tracking-wide">
            {displayName}
          </h2>
        </div>

        {/* Navigation Button */}
        <button
          onClick={onEnter}
          className="w-full flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-black py-4 px-6 rounded-xl uppercase text-sm tracking-wider transition-all duration-300 shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          <LayoutGrid size={18} className="stroke-[2.5]" />
          <span>Commander Zentrale</span>
        </button>
      </div>
    </div>
  );
}
