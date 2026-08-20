import React, { useState, useEffect } from "react";
import {
  LayoutGrid,
  Swords,
  BarChart3,
  User,
  ShieldCheck,
  LogOut,
  Download,
  Users,
  Trophy,
  RefreshCw,
  Globe,
  Instagram,
  MessageSquare,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import LoginView from "./components/LoginView";
import AosScoreTracker from "./components/AosScoreTracker";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";
import MemberList from "./components/MemberList";
import HallOfFame from "./components/HallOfFame";
import DashboardView from "./components/DashboardView";
import ClubMeta from "./components/ClubMeta"; // Das neue Meta-Dashboard

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  
  // State für den dezenten Update-Banner
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // PWA Installations-State für Android/Chrome
  const [installPrompt, setInstallPrompt] = useState(null);

  // Automatischer Update-Check (Mit starkem Cache-Busting gegen PWA-Caching)
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}_${Math.random()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });

        if (response.ok) {
          const data = await response.json();
          const serverVersion = data.version;
          const storedVersion = localStorage.getItem("app_version");

          if (storedVersion && storedVersion !== serverVersion) {
            setUpdateAvailable(true);
          } else if (!storedVersion) {
            localStorage.setItem("app_version", serverVersion);
          }
        }
      } catch (err) {
        // Ignorieren, falls offline
      }
    };

    checkForUpdates();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    const handleFocus = () => {
      checkForUpdates();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    const interval = setInterval(checkForUpdates, 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleApplyUpdate = () => {
    fetch("/version.json?t=" + Date.now(), { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem("app_version", data.version);
        window.location.reload(true);
      })
      .catch(() => {
        window.location.reload(true);
      });
  };

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

  const handleApproveUser = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", userId)
      .select();

    if (!error && data) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: "approved" } : u));
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

  const isAdmin = user.role === "admin" || user.email === "namebereitsvergeben@gmail.com";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row font-sans relative">
      
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-neutral-950 px-4 py-3 shadow-2xl flex items-center justify-between border-b border-amber-400 font-sans">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <RefreshCw size={18} className="animate-spin shrink-0" />
            <span>Ein neues Fumble-Forged-Update ist verfügbar!</span>
          </div>
          <button
            onClick={handleApplyUpdate}
            className="bg-neutral-950 hover:bg-neutral-900 text-amber-400 font-bold px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider transition shadow-md shrink-0"
          >
            Jetzt aktualisieren
          </button>
        </div>
      )}

      <div className={`flex-1 flex flex-col md:flex-row min-h-screen w-full ${updateAvailable ? 'pt-12 md:pt-12' : ''}`}>
        
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
                onClick={() => setActiveTab("hof")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                  activeTab === "hof"
                    ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                    : "text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                <Trophy size={18} /> Hall of Fame
              </button>

              {/* Neuer Tab: Club-Meta statt Gelände-Planer */}
              <button
                onClick={() => setActiveTab("meta")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-bold transition ${
                  activeTab === "meta"
                    ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                    : "text-neutral-400 hover:bg-neutral-800"
                }`}
              >
                <BarChart3 size={18} /> Club-Meta
              </button>

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

          <div className="space-y-4 pt-6 border-t border-neutral-800">
            {installPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-bold bg-amber-600 text-neutral-950 hover:bg-amber-500 transition shadow-lg animate-pulse"
              >
                <Download size={16} /> App auf Startbildschirm
              </button>
            )}

            {/* NETZWERK & COMMUNITY LINKS (ERSETZT DIE PWA BOX NACH LOGIN) */}
            <div className="bg-neutral-950/60 border border-neutral-800 p-3 rounded-xl space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block text-center">
                Fumble Forged Netzwerk
              </span>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href="https://fumbleforge.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-900 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-lg transition text-[11px] font-bold group"
                  title="Homepage"
                >
                  <Globe size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Web</span>
                </a>

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-900 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-lg transition text-[11px] font-bold group"
                  title="Instagram"
                >
                  <Instagram size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Insta</span>
                </a>

                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-900 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-lg transition text-[11px] font-bold group"
                  title="Discord"
                >
                  <MessageSquare size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Discord</span>
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
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
            <DashboardView user={user} setActiveTab={setActiveTab} />
          )}

          {activeTab === "score" && <AosScoreTracker currentUser={user} />}

          {activeTab === "hof" && <HallOfFame />}

          {activeTab === "meta" && <ClubMeta />}

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
    </div>
  );
}