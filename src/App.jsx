import React, { useState, useEffect } from "react";
import {
  LayoutGrid,
  Swords,
  Map,
  User,
  ShieldCheck,
  LogOut,
  Download,
  Users,
  Trophy,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import LoginView from "./components/LoginView";
import AosScoreTracker from "./components/AosScoreTracker";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";
import MemberList from "./components/MemberList";
import HallOfFame from "./components/HallOfFame";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  // PWA Installations-State für Android/Chrome
  const [installPrompt, setInstallPrompt] = useState(null);

  // Automatischer Update-Check (Erzwingt echten Server-Fetch ohne Cache)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch("/version.json?t=" + Date.now() + "_" + Math.random(), {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });

        if (response.ok) {
          const data = await response.json();
          const serverVersion = data.version;
          const storedVersion = localStorage.getItem("app_version");

          if (storedVersion && storedVersion !== serverVersion) {
            localStorage.setItem("app_version", serverVersion);
            window.location.reload();
          } else if (!storedVersion) {
            localStorage.setItem("app_version", serverVersion);
          }
        }
      } catch (err) {
        // Ignorieren, falls offline
      }
    };

    // 1. Direkt beim Start prüfen
    checkForUpdates();

    // 2. Prüfen beim Tab-Wechsel oder App-Fokus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Zusätzlich alle 5 Minuten im Hintergrund prüfen
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  // Funktion zum sauberen Laden aller Profile für das Admin-Panel
  const fetchAllProfiles = async () => {
    const { data: allProfiles, error } = await supabase
      .from("profiles")
      .select("*");
    
    if (allProfiles) {
      setUsers(allProfiles);
    } else if (error) {
      console.error("Fehler beim Laden der Profile:", error.message);
    }
  };

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
          await fetchAllProfiles();
        }
      }

      setLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setUsers([]);
        } else if (event === "SIGNED_IN" && session?.user) {
          checkSession();
        }
      }
    );

    // Listener für das automatische PWA-Installations-Event (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUsers([]);
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
      <div className="min-h-screen bg-neutral-950 text-amber-500 flex flex-col items-center justify-center font-sans p-4">
        <div className="text-center space-y-4 max-w-xs">
          {/* Splash Screen mit eurem Club-Logo */}
          <img 
            src="/logo.png" 
            alt="Fumble Forged Logo" 
            className="w-32 h-32 mx-auto object-contain rounded-2xl shadow-2xl animate-pulse border border-amber-600/30" 
          />
          <div className="text-xl font-bold uppercase tracking-widest text-amber-500">
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
    return (
      <LoginView 
        onLogin={(userData) => { 
          setUser(userData); 
          fetchAllProfiles(); 
          setActiveTab("dashboard"); 
        }} 
      />
    );
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

            {/* NEU: Hall of Fame Tab in der Navigation */}
            <button
              onClick={() => setActiveTab("hof")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                activeTab === "hof"
                  ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              <Trophy size={18} /> Hall of Fame
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

            {/* Mitglieder-Tab */}
            <button
              onClick={() => setActiveTab("members")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                activeTab === "members"
                  ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                  : "text-neutral-400 hover:bg-neutral-800"
              }`}
            >
              <Users size={18} /> Mitglieder
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

        {/* PWA INSTALLATIONS-BEREICH & USER FOOTER */}
        <div className="space-y-4 pt-6 border-t border-neutral-800">
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold bg-amber-600 text-neutral-950 hover:bg-amber-500 transition shadow-lg animate-pulse"
            >
              <Download size={16} /> App auf Startbildschirm
            </button>
          )}

          <div className="text-[11px] text-neutral-500 space-y-1 bg-neutral-950/40 p-2.5 rounded-lg border border-neutral-800">
            <p className="font-bold text-neutral-400">📱 Als App installieren:</p>
            <p>• <strong>Android:</strong> 3 Punkte ➔ &quot;App installieren&quot;</p>
            <p>• <strong>iPhone:</strong> Teilen-Button ➔ &quot;Zum Home-Bildschirm&quot;</p>
          </div>

          <div className="flex items-center justify-between pt-2">
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

        {/* NEU: Hall of Fame Ansicht */}
        {activeTab === "hof" && <HallOfFame />}

        {activeTab === "map" && (
          <div className="bg-neutral-900 border border-neutral-800 p-12 rounded-2xl text-center text-neutral-500 max-w-4xl">
            [ Vorbereitung für Gelände-Planer ]
          </div>
        )}

        {activeTab === "members" && <MemberList />}

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