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
  Crosshair, // Icon für 40k (optional, passt perfekt)
  Calendar,
  Menu,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import LoginView from "./components/LoginView";
import WelcomeView from "./components/WelcomeView";
import AosScoreTracker from "./components/AosScoreTracker";
import Wh40kScoreTracker from "./components/40k/Wh40kScoreTracker"; // Neu: 40k Tracker Komponente
import UserProfile from "./components/UserProfile";
import AdminPanel from "./components/AdminPanel";
import MemberList from "./components/MemberList";
import HallOfFame from "./components/HallOfFame";
import DashboardView from "./components/DashboardView";
import EventsView from "./components/EventsView";
import ClubMeta from "./components/ClubMeta";
import LegalModal from "./components/LegalModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".menu-dropdown-container")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpen]);

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
      } catch (err) {}
    };

    checkForUpdates();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdates();
    };
    const handleFocus = () => checkForUpdates();

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
          setShowWelcome(true);
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
    setShowWelcome(true);
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
          setShowWelcome(true);
        }} 
      />
    );
  }

  if (showWelcome) {
    return (
      <WelcomeView 
        user={user} 
        onEnter={() => setShowWelcome(false)} 
      />
    );
  }

  const isAdmin = user.role === "admin" || user.email === "namebereitsvergeben@gmail.com";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans relative">
      
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

      {/* TOP HEADER BAR */}
      <header className={`sticky w-full bg-neutral-900 border-b border-neutral-800 px-4 py-3 md:px-8 md:py-4 flex items-center justify-between z-30 shadow-md ${updateAvailable ? 'top-12' : 'top-0'}`}>
        <div 
          onClick={() => setActiveTab("dashboard")} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img 
            src="/logo.png" 
            alt="Fumble Forged Logo" 
            className="w-10 h-10 object-contain rounded-lg border border-amber-600/30 group-hover:scale-105 transition duration-200"
          />
          <div>
            <h1 className="text-xl md:text-2xl font-black text-amber-500 uppercase tracking-widest leading-none">
              Fumble Forged
            </h1>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Club Portal & Tools</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-neutral-950 hover:bg-amber-500 transition shadow-lg animate-pulse"
            >
              <Download size={14} /> Installieren
            </button>
          )}

          <div className="flex items-center gap-3 border-l border-neutral-800 pl-4">
            {/* Quick Access Menu Dropdown */}
            <div className="relative menu-dropdown-container">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-2 transition rounded-lg hover:bg-neutral-800 flex items-center justify-center ${
                  menuOpen ? "text-amber-500 bg-neutral-850" : "text-neutral-400 hover:text-neutral-200"
                }`}
                title="Schnellzugriff"
              >
                <Menu size={20} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 pb-2 mb-2 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                    Schnellzugriff
                  </div>
                  
                  <button
                    onClick={() => {
                      setActiveTab("events");
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center gap-2 hover:bg-neutral-800 ${
                      activeTab === "events" ? "text-amber-500" : "text-neutral-300 hover:text-neutral-100"
                    }`}
                  >
                    <Calendar size={14} className="text-amber-500" />
                    <span>Turniere und Events</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("hof");
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center gap-2 hover:bg-neutral-800 ${
                      activeTab === "hof" ? "text-amber-500" : "text-neutral-300 hover:text-neutral-100"
                    }`}
                  >
                    <Trophy size={14} className="text-amber-500" />
                    <span>Hall of Fame</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("meta");
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center gap-2 hover:bg-neutral-800 ${
                      activeTab === "meta" ? "text-amber-500" : "text-neutral-300 hover:text-neutral-100"
                    }`}
                  >
                    <BarChart3 size={14} className="text-amber-500" />
                    <span>Club-Meta</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("members");
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center gap-2 hover:bg-neutral-800 ${
                      activeTab === "members" ? "text-amber-500" : "text-neutral-300 hover:text-neutral-100"
                    }`}
                  >
                    <Users size={14} className="text-amber-500" />
                    <span>Club-Mitglieder</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("profile");
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center gap-2 hover:bg-neutral-800 ${
                      activeTab === "profile" ? "text-amber-500" : "text-neutral-300 hover:text-neutral-100"
                    }`}
                  >
                    <User size={14} className="text-amber-500" />
                    <span>Profil</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActiveTab("admin");
                        setMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center gap-2 hover:bg-neutral-800 border-t border-neutral-800/50 mt-1 pt-2 ${
                        activeTab === "admin" ? "text-amber-500" : "text-neutral-300 hover:text-neutral-100"
                      }`}
                    >
                      <ShieldCheck size={14} className="text-amber-500" />
                      <span>Admin-Panel</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-2 text-xs md:text-sm font-bold transition ${
                activeTab === "profile" ? "text-amber-500" : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <span className="hidden xs:inline-block truncate max-w-[120px]">
                {user.username || user.name}
              </span>
              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700 overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={16} className="text-neutral-400" />
                )}
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="text-neutral-500 hover:text-red-400 p-2 transition rounded-lg hover:bg-neutral-800"
              title="Abmelden"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* INHALTSBEREICH */}
      <main className="flex-1 p-4 md:p-8">
        {activeTab === "dashboard" && (
          <DashboardView user={user} setActiveTab={setActiveTab} onOpenLegal={() => setShowLegalModal(true)} />
        )}

        {activeTab === "events" && (
          <EventsView user={user} />
        )}

        {activeTab === "score" && <AosScoreTracker currentUser={user} onClose={() => setActiveTab("dashboard")} />}

        {/* NEU: Rendert den 40k Tracker, wenn aktiv */}
        {activeTab === "score_40k" && <Wh40kScoreTracker currentUser={user} onClose={() => setActiveTab("dashboard")} />}

        {activeTab === "hof" && <HallOfFame />}

        {activeTab === "meta" && <ClubMeta />}

        {activeTab === "members" && <MemberList />}

        {activeTab === "profile" && (
          <UserProfile user={user} onUpdateProfile={handleUpdateProfile} onOpenLegal={() => setShowLegalModal(true)} />
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

      {showLegalModal && (
        <LegalModal onClose={() => setShowLegalModal(false)} />
      )}
    </div>
  );
}