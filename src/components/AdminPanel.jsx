import React from "react";
import { ShieldCheck, Check, X, Trash2, UserCheck, Clock } from "lucide-react";

export default function AdminPanel({
  users = [],
  currentUser,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
}) {
  // Absolute Sicherheit: Nur du (anhand der E-Mail oder UID) bist der Admin
  const isMasterAdmin = 
    currentUser?.email === 'namebereitsvergeben@gmail.com' || 
    currentUser?.id === 'eceb801d-9bb4-492d-5ec7a6b98bb1';

  if (!isMasterAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-red-400 bg-neutral-900 rounded-xl border border-red-900/50">
        <h3 className="text-lg font-bold mb-2">Zugriff verweigert</h3>
        <p className="text-xs text-neutral-400">Dieser Bereich ist exklusiv für LordFumbledoom reserviert.</p>
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.status === "pending");
  const approvedUsers = users.filter((u) => u.status === "approved");

  // Hilfsfunktion zur Namensanzeige (greift auf Name, Username oder E-Mail-Präfix zurück)
  const getUserDisplayName = (u) => {
    return u.name || u.username || u.full_name || u.email?.split('@')[0] || "Unbekannter Nutzer";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      <header className="border-b border-amber-600/30 pb-4">
        <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="text-amber-500" /> Admin-Verwaltung
        </h2>
        <p className="text-xs text-neutral-400">
          Exklusiver Bereich für LordFumbledoom zur Mitgliederfreigabe und
          Nutzerverwaltung
        </p>
      </header>

      {/* Sektion 1: Ausstehende Registrierungen */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Clock size={16} className="text-amber-500" /> Offene
          Registrierungs-Anfragen ({pendingUsers.length})
        </h3>

        {pendingUsers.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl text-xs text-neutral-500 italic">
            Aktuell liegen keine neuen Anfragen vor.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="bg-neutral-900 border border-amber-600/30 p-4 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-neutral-100">{getUserDisplayName(u)}</div>
                  <div className="text-xs text-neutral-400">
                    {u.email} {u.club ? `• ${u.club}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApproveUser(u.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Check size={14} /> Freigeben
                  </button>
                  <button
                    onClick={() => onRejectUser(u.id)}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <X size={14} /> Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sektion 2: Aktive Mitglieder verwalten */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <UserCheck size={16} className="text-emerald-500" /> Aktive Mitglieder
          ({approvedUsers.length})
        </h3>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-neutral-800">
            {approvedUsers.map((u) => (
              <div
                key={u.id}
                className="p-4 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-neutral-200 flex items-center gap-2">
                    {getUserDisplayName(u)}
                    {u.role === "admin" && (
                      <span className="bg-amber-600/20 border border-amber-600/40 text-amber-500 text-[10px] px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-neutral-500">
                    {u.email} {u.club ? `• ${u.club}` : ""}
                  </div>
                </div>

                {/* Admins dürfen sich nicht selbst löschen */}
                {u.role !== "admin" && (
                  <button
                    onClick={() => onDeleteUser(u.id)}
                    className="text-neutral-500 hover:text-red-400 p-2 transition"
                    title="Mitglied löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}