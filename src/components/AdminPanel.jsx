import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, Check, X, Trash2, UserCheck, Clock, AlertTriangle, 
  RefreshCw, Edit, Search, Filter, ArrowLeftRight, Calendar, Award 
} from "lucide-react";
import { supabase } from "../supabaseClient";

export default function AdminPanel({
  users = [],
  currentUser,
  onApproveUser,
  onRejectUser,
  onDeleteUser,
}) {
  const [activeTab, setActiveTab] = useState("members"); // "members" | "matches"
  const [userToDelete, setUserToDelete] = useState(null);

  // Match-Verwaltung State
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [systemFilter, setSystemFilter] = useState("all"); // "all" | "aos" | "wh40k"
  
  // Bearbeiten-Modal State
  const [editingMatch, setEditingMatch] = useState(null);
  const [editForm, setEditForm] = useState({
    player1_name: "",
    player2_name: "",
    player1_vp: 0,
    player2_vp: 0,
    winner_name: "",
  });
  useEffect(() => {
    if (activeTab === "matches") {
      fetchMatches();
    }
  }, [activeTab]);

  const fetchMatches = async () => {
    setLoadingMatches(true);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) {
        setMatches(data || []);
      } else {
        console.error("Fehler beim Laden der Matches:", error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (window.confirm("Bist du sicher, dass du dieses Match unwiderruflich löschen möchtest? Dies kann nicht rückgängig gemacht werden!")) {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);
      if (!error) {
        alert("Match erfolgreich gelöscht!");
        fetchMatches();
      } else {
        alert("Fehler beim Löschen des Matches: " + error.message);
      }
    }
  };

  const handleSwapScores = async (match) => {
    if (window.confirm(`Möchtest du die Punkte von "${match.player1_name}" und "${match.player2_name}" vertauschen?`)) {
      const p1Vp = Number(match.player1_vp) || 0;
      const p2Vp = Number(match.player2_vp) || 0;
      const newP1Vp = p2Vp;
      const newP2Vp = p1Vp;
      const newWinner = newP1Vp > newP2Vp 
        ? match.player1_name 
        : newP2Vp > newP1Vp 
        ? match.player2_name 
        : "Unentschieden";

      const details = match.details || {};
      const newDetails = {
        ...details,
        p1_faction: details.p2_faction || details.player2_faction || null,
        p2_faction: details.p1_faction || details.player1_faction || null,
        player1_faction: details.player2_faction || details.p2_faction || null,
        player2_faction: details.player1_faction || details.p1_faction || null,
        p1_primary: details.p2_primary || null,
        p2_primary: details.p1_primary || null,
        player1_formation: details.player2_formation || null,
        player2_formation: details.player1_formation || null,
      };

      const { error } = await supabase
        .from("matches")
        .update({
          player1_vp: newP1Vp,
          player2_vp: newP2Vp,
          winner_name: newWinner,
          details: newDetails
        })
        .eq("id", match.id);

      if (!error) {
        alert("Punkte erfolgreich getauscht!");
        fetchMatches();
      } else {
        alert("Fehler beim Tauschen: " + error.message);
      }
    }
  };

  const startEditing = (match) => {
    setEditingMatch(match);
    setEditForm({
      player1_name: match.player1_name || "",
      player2_name: match.player2_name || "",
      player1_vp: match.player1_vp ?? 0,
      player2_vp: match.player2_vp ?? 0,
      winner_name: match.winner_name || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMatch) return;
    
    let calculatedWinner = editForm.winner_name;
    if (!calculatedWinner || calculatedWinner.trim() === "" || calculatedWinner === "Auto") {
      const p1Vp = Number(editForm.player1_vp) || 0;
      const p2Vp = Number(editForm.player2_vp) || 0;
      calculatedWinner = p1Vp > p2Vp 
        ? editForm.player1_name 
        : p2Vp > p1Vp 
        ? editForm.player2_name 
        : "Unentschieden";
    }

    const { error } = await supabase
      .from("matches")
      .update({
        player1_name: editForm.player1_name,
        player2_name: editForm.player2_name,
        player1_vp: Number(editForm.player1_vp) || 0,
        player2_vp: Number(editForm.player2_vp) || 0,
        winner_name: calculatedWinner,
      })
      .eq("id", editingMatch.id);

    if (!error) {
      alert("Match erfolgreich aktualisiert!");
      setEditingMatch(null);
      fetchMatches();
    } else {
      alert("Fehler beim Aktualisieren des Matches: " + error.message);
    }
  };

  // Flexibler gemacht: Prüft E-Mail ODER Admin-Rolle aus der Datenbank
  const isMasterAdmin = 
    currentUser?.email === 'namebereitsvergeben@gmail.com' || 
    currentUser?.role === 'admin' ||
    currentUser?.id === 'eceb801d-9bb4-492d-5ec7a6b98bb1';

  if (!isMasterAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-red-400 bg-neutral-900 rounded-xl border border-red-900/50">
        <h3 className="text-lg font-bold mb-2">Zugriff verweigert</h3>
        <p className="text-xs text-neutral-400">Dieser Bereich ist exklusiv für Admins reserviert.</p>
      </div>
    );
  }

  // Fallback, falls users undefined ist
  const safeUsers = Array.isArray(users) ? users : [];

  const pendingUsers = safeUsers.filter((u) => u.status === "pending");
  const approvedUsers = safeUsers.filter((u) => u.status === "approved" || !u.status); // Fallback falls Status fehlt

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
          Exklusiver Bereich zur Mitgliederfreigabe und Nutzerverwaltung
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
          {approvedUsers.length === 0 ? (
            <div className="p-6 text-xs text-neutral-500 italic">
              Keine aktiven Mitglieder gefunden (oder Liste wird noch geladen).
            </div>
          ) : (
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
                  {u.role !== "admin" && currentUser?.id !== u.id && (
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="text-neutral-500 hover:text-red-400 p-2 transition"
                      title="Mitglied löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bestätigungs-Modal für das Löschen eines Mitglieds */}
      {userToDelete && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-neutral-900 border border-red-600/40 p-6 rounded-2xl max-w-md w-full space-y-6 shadow-2xl text-neutral-100">
            <div className="flex items-start gap-3">
              <div className="bg-red-500/20 border border-red-500/40 p-2 rounded-lg text-red-500 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-neutral-100">Mitglied unwiderruflich löschen?</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Bist du sicher, dass du das Mitglied <strong className="text-neutral-200">{getUserDisplayName(userToDelete)}</strong> ({userToDelete.email}) löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  onDeleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Löschen bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
