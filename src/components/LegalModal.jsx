import React, { useState } from "react";
import { X, Shield, FileText } from "lucide-react";

export default function LegalModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("impressum");

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-neutral-900 border border-amber-600/40 p-6 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl text-neutral-100">
        
        {/* Header & Tabs */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("impressum")}
              className={`px-4 py-2 rounded-md transition flex items-center gap-1.5 ${
                activeTab === "impressum"
                  ? "bg-amber-600 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <FileText size={14} /> Impressum
            </button>
            <button
              onClick={() => setActiveTab("datenschutz")}
              className={`px-4 py-2 rounded-md transition flex items-center gap-1.5 ${
                activeTab === "datenschutz"
                  ? "bg-amber-600 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Shield size={14} /> Datenschutz
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 transition p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Inhalt */}
        <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
          {activeTab === "impressum" ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-500 uppercase">Angaben gemäß § 5 DDG</h3>
              <p>
                <strong>Fumble Forged</strong><br />
                Tabletop-Club & Community-Projekt<br />
                [In dem Hagen 3]<br />
                [53604 Bad Honnef]
              </p>
              <h4 className="font-bold text-neutral-200 pt-2">Vertreten durch:</h4>
              <p>[Christopher Heil]</p>
              <h4 className="font-bold text-neutral-200 pt-2">Kontakt:</h4>
              <p>
                E-Mail: [Deine E-Mail-Adresse]<br />
                Web: <a href="https://fumble-forged.de" target="_blank" rel="noreferrer" className="text-amber-400 underline">fumbleforge.de</a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-500 uppercase">Datenschutzerklärung</h3>
              
              <div className="space-y-2">
                <h4 className="font-bold text-neutral-200">1. Datenschutz auf einen Blick</h4>
                <p>
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie das Fumble Forged Portal nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-neutral-200">2. Hosting & Datenerfassung (Supabase & Vercel)</h4>
                <p>
                  Diese App wird extern gehostet. Die Hosting-Dienste und Server-Logfiles werden über <strong>Vercel Inc.</strong> bereitgestellt. Die Benutzerverwaltung, Authentifizierung und Datenbank (für Match-Tracker, Profile, Armeen) läuft über den Cloud-Dienst <strong>Supabase Inc.</strong>
                </p>
                <p>
                  Beim Registrieren und Nutzen der App werden Daten wie E-Mail-Adresse, Spielername, Club-Zugehörigkeit, Profilbilder und eingetragene Spielpartien verarbeitet. Dies erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Durchführung von Nutzerinteraktionen und Club-Verwaltung).
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-neutral-200">3. Ihre Rechte</h4>
                <p>
                  Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung oder Löschung dieser Daten.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
}