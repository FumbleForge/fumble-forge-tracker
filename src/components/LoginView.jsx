import React, { useState } from "react";
import { Lock, UserPlus, LogIn, Mail, AlertCircle } from "lucide-react";
import { supabase } from "../supabaseClient";

export default function LoginView({ onLogin }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [club, setClub] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // LOGIN via Supabase
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      // Profil-Informationen & Status abrufen
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.status === "pending") {
        await supabase.auth.signOut();
        setMessage({
          type: "warning",
          text: "Dein Account wurde noch nicht von LordFumbledoom freigeschaltet.",
        });
        setLoading(false);
        return;
      }

      if (profile.status === "rejected") {
        await supabase.auth.signOut();
        setMessage({
          type: "error",
          text: "Deine Registrierung wurde abgelehnt.",
        });
        setLoading(false);
        return;
      }

      onLogin({ ...data.user, ...profile });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.message || "Login fehlgeschlagen. Überprüfe deine Zugangsdaten.",
      });
    } finally {
      setLoading(false);
    }
  };

  // REGISTRIERUNG via Supabase
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!username.trim() || !email.trim() || !password.trim()) {
      setMessage({
        type: "error",
        text: "Bitte alle Pflichtfelder ausfüllen.",
      });
      setLoading(false);
      return;
    }

    try {
      // Ist der Admin der erste User? (LordFumbledoom erhält automatisch die Admin-Rolle)
      const isAdmin =
        username.toLowerCase() === "lordfumbledoom" ||
        email.toLowerCase() === "admin@fumbleforge.de";

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            username: username.trim(),
            full_name: username.trim(),
            club: club.trim() || "Fumble Forge Club",
            role: isAdmin ? "admin" : "user",
            status: isAdmin ? "approved" : "pending",
          },
        },
      });

      if (error) throw error;

      if (isAdmin) {
        setMessage({
          type: "success",
          text: "Admin-Account registriert! Du kannst dich jetzt direkt einloggen.",
        });
      } else {
        setMessage({
          type: "success",
          text: "Registrierung erfolgreich! Dein Account wartet auf die Freigabe durch LordFumbledoom.",
        });
      }

      setMode("login");
      setPassword("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Registrierung fehlgeschlagen.",
      });
    } finally {
      setLoading(false);
    }
  };

  // PASSWORT VERGESSEN via Supabase E-Mail Versand
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: window.location.origin,
        }
      );

      if (error) throw error;

      setMessage({
        type: "success",
        text: `Eine E-Mail zum Zurücksetzen des Passworts wurde an ${email} gesendet.`,
      });
      setEmail("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Fehler beim Versenden der E-Mail.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-amber-600/30 p-8 rounded-2xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-amber-500 uppercase tracking-widest">
            Fumble Forged
          </h1>
          <p className="text-xs text-neutral-400">
            Mitglieder-Portal & Match Tracker
          </p>
        </div>

        {/* Navigation Tabs */}
        {mode !== "forgot" && (
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-bold">
            <button
              onClick={() => {
                setMode("login");
                setMessage(null);
              }}
              className={`flex-1 py-2 rounded-md transition flex items-center justify-center gap-1 ${
                mode === "login"
                  ? "bg-amber-600 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <LogIn size={14} /> Login
            </button>
            <button
              onClick={() => {
                setMode("register");
                setMessage(null);
              }}
              className={`flex-1 py-2 rounded-md transition flex items-center justify-center gap-1 ${
                mode === "register"
                  ? "bg-amber-600 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <UserPlus size={14} /> Registrieren
            </button>
          </div>
        )}

        {/* Rückmeldungs-Banner */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-medium border flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-950/50 border-emerald-600/50 text-emerald-300"
                : message.type === "warning"
                ? "bg-amber-950/50 border-amber-600/50 text-amber-300"
                : "bg-red-950/50 border-red-600/50 text-red-300"
            }`}
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs uppercase font-bold text-neutral-400">
                  Passwort *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setMessage(null);
                  }}
                  className="text-[11px] text-amber-500 hover:underline"
                >
                  Passwort vergessen?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-lg uppercase text-sm disabled:opacity-50"
            >
              {loading ? "Lädt..." : "Anmelden"}
            </button>
          </form>
        )}

        {/* MODE: REGISTRIEREN */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                Spielername / Nickname *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="z.B. LordFumbledoom"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                Passwort wählen *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                Club / Hauptfraktion
              </label>
              <input
                type="text"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="z.B. Fumble Forge / Daughters of Khaine"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-lg uppercase text-sm disabled:opacity-50"
            >
              {loading ? "Lädt..." : "Registrierung Anfragen"}
            </button>
          </form>
        )}

        {/* MODE: PASSWORT VERGESSEN */}
        {mode === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-xs text-neutral-400">
              Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, um ein
              neues Passwort zu vergeben.
            </div>
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-lg uppercase text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Mail size={16} /> {loading ? "Sendet..." : "Link Senden"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage(null);
              }}
              className="w-full text-xs text-neutral-500 hover:text-neutral-300 py-1"
            >
              Zurück zum Login
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-neutral-600 flex items-center justify-center gap-1 pt-2 border-t border-neutral-800/50">
          <Lock size={12} /> Geschützter Mitglieder-Bereich
        </div>
      </div>
    </div>
  );
}
