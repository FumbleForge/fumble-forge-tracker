import React, { useState, useEffect } from "react";
import {
  LayoutGrid,
  Swords,
  Map,
  User,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import LoginView from "./components/LoginView";
import AosScoreTracker from "./components/AosScoreTracker";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("score");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Supabase Session und User-Liste beim Start prüfen
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile && profile.status === "approved") {
          setUser({ ...session.user, ...profile });
        }
      }

      // Alle User-Profile für das Admin-Panel laden
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*");
      
      if (allProfiles) {
        setUsers(allProfiles);
      }

      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleUpdateProfile = (updatedData) => {
    setUser({ ...user, ...updatedData });
  };

  // Handler für das Admin-Panel (Freigeben, Ablehnen, Löschen)
  const handleApproveUser = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", userId)
      .select();

    if (!error && data) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: "approved" } : u));
    } else {
      console.error("Fehler beim Freigeben:", error?.message);
    }
  };

  const handleRejectUser = async (userId) => {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (!error) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleDeleteUser = async (userId) => {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (!error) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-amber-500 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <div className="text-xl font-bold uppercase tracking-widest animate-pulse">
            Fumble Forged
          </div>
          <p className="text-xs text-neutral-500">
            Verbindung zu Supabase wird hergestellt...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={(userData) => setUser(userData)} />;
  }

  // Prüfen ob der Nutzer Admin ist (entweder Rolle oder deine feste Master-E-Mail)
  const isAdmin = user.role === "admin" || user.email === "namebereitsvergeben@gmail.com";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-neutral-900 border-r border-neutral-800 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-black text-amber-500 uppercase tracking-widest">
              Fumble Forged
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Club Portal & Tools</p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                activeTab === "dashboard"
                  ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              <LayoutGrid size={18} /> Dashboard
            </button>

            <button
              onClick={() => setActiveTab("score")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                activeTab === "score"
                  ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              <Swords size={18} /> Score Tracker
            </button>

            <button
              onClick={() => setActiveTab("map")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                activeTab === "map"
                  ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              <Map size={18} /> Gelände-Planer
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                activeTab === "profile"
                  ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              <User size={18} /> Profil
            </button>

            {isAdmin && (
              <button
                onClick={() => setActiveTab("admin")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                  activeTab === "admin"
                    ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                    : "text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                <ShieldCheck size={18} className="text-amber-500" /> Admin-Panel
              </button>
            )}
          </nav>
        </div>

        {/* User Status & Logout */}
        <div className="pt-6 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs">
            <div className="font-bold text-neutral-200">
              {user.username || user.name}
            </div>
            <div className="text-neutral-500">{user.club}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-neutral-500 hover:text-red-400 p-2 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* INHALTSBEREICH */}
      <main className="flex-1 p-4 md:p-8">
        {activeTab === "dashboard" && (
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-4xl space-y-2">
            <h2 className="text-3xl font-bold text-amber-500">
              Club Dashboard
            </h2>
            <p className="text-neutral-300">
              Willkommen zurück,{" "}
              <span className="text-amber-400 font-bold">
                {user.username || user.name}
              </span>
              !
            </p>
          </div>
        )}

        {activeTab === "score" && <AosScoreTracker currentUser={user} />}

        {activeTab === "map" && (
          <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-2xl text-center text-neutral-500 max-w-4xl">
            [ Vorbereitung für Gelände-Planer ]
          </div>
        )}

        {activeTab === "profile" && (
          <UserProfile user={user} onUpdateProfile={handleUpdateProfile} />
        )}

        {activeTab === "admin" && isAdmin && (
          <AdminPanel 
            currentUser={user} 
            users={users} 
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            onDeleteUser={handleDeleteUser}
          />
        )}
      </main>
    </div>
  );
}