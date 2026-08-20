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
} from "lucide-react";
import { supabase } from "./supabaseClient";
import LoginView from "./components/LoginView";
import AosScoreTracker from "./components/AosScoreTracker";
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";
import MemberList from "./components/MemberList";
import HallOfFame from "./components/HallOfFame";
import DashboardView from "./components/DashboardView";
import ClubMeta from "./components/ClubMeta";

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

            {/* NETZWERK & COMMUNITY LINKS */}
            <div className="bg-neutral-950/60 border border-neutral-800 p-3 rounded-xl space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block text-center">
                Fumble Forged Netzwerk
              </span>
              <div className="grid grid-cols-3 gap-2">
                {/* Homepage / Web */}
                <a
                  href="https://www.fumble-forged.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-900 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-lg transition text-[11px] font-bold group"
                  title="Fumble Forged Website"
                >
                  <Globe size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>Web</span>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-900 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-lg transition text-[11px] font-bold group"
                  title="Instagram"
                >
                  <svg
                    className="w-4 h-4 fill-current text-amber-500 group-hover:scale-110 transition-transform"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Insta</span>
                </a>

                {/* Discord */}
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1 p-2 bg-neutral-900 hover:bg-amber-600/20 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-600/40 rounded-lg transition text-[11px] font-bold group"
                  title="Discord Server"
                >
                  <svg
                    className="w-4 h-4 fill-current text-amber-500 group-hover:scale-110 transition-transform"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.011c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
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