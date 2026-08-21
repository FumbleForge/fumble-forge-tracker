Fumble Forged – Technische Dokumentation & Architektur-Übersicht

Diese Dokumentation fasst die vollständige Architektur, Datenflüsse,
Berechnungslogiken und Sonderregeln des Projekts Fumble Forged zusammen, damit
neue Entwickler das System sofort verstehen und sicher weiterentwickeln können.

1. Tech-Stack & Infrastruktur

  - Frontend: React 19, Vite 5, Tailwind CSS v4 (über @tailwindcss/postcss),
    Lucide-React Icons.
  - Backend / DB / Auth: Supabase (@supabase/supabase-js) mit
    PostgreSQL-Datenbank, Auth-Service und Storage-Bucket (avatars).
  - Hosting & Routing: Vercel. In vercel.json sind SPA-Rewrites (/* ->
    /index.html) sowie No-Cache-Header für version.json hinterlegt.
  - PWA & Auto-Update: Vollständige PWA (manifest.json, Service Worker,
    Install-Prompt). Ein Prebuild-Script generiert bei jedem Build eine neue
    public/version.json. Die App pollt diese Datei und zeigt Nutzern bei neuen
    Deployments ein Update-Banner zur Cache-Aktualisierung.

2. Datenmodell & Systemtrennung (Supabase)

Die App verwaltet zwei unterschiedliche Spielsysteme (Age of Sigmar &
Warhammer 40.000), die strikt getrennt voneinander ausgewertet werden.

Tabellen-Übersicht:

1.  profiles:

      - id (UUID, verknüpft mit Supabase Auth User)
      - username, club, avatar_url
      - status ("pending" | "approved" | "rejected"): Neue User müssen vom Admin
        freigeschaltet werden.
      - role ("user" | "admin")
      - aos_armies / wh40k_armies: Getrennte Armeelisten der Mitglieder.
      - unlocked_badges & custom_badges: JSON-Arrays für freigeschaltete
        Trophäen.
      - login_days: Array mit ISO-Datumsstrings für Treue-Badges.

2.  matches:

      - id, user_id, created_at
      - player1_name, player2_name, player1_vp, player2_vp, winner_name
      - details (JSONB): Enthält das Match-Setup, Runden, Fraktionen und das
        Spielsystem:
          - game_system: "Age of Sigmar" oder "Warhammer 40k"
          - match_mode: "single" oder "tournament_complete" (mit
            tournament_rounds)

3.  event_attendees:

      - Verwaltet Event-Zusagen (event_id, user_id, created_at).

3. Die Tracker-Engines im Detail

A. Age of Sigmar Tracker (GHB 3.0)

  - Battle Tactics: 6 GHB-Taktikkarten mit sequenzieller Stufen-Logik (Affray
    (+5 VP) \rightarrow Strike (+5 VP) \rightarrow Domination (+5 VP)).
  - Battleplans: 12 offizielle Szenarien mit dynamischen Primär-Scoring-Regeln
    (max. 1x pro Regel und Runde punktbar).
  - Ressourcen: Tracking von VP, Command Points (CP), Fury Level (max. 7) und
    Rage Dice.
  - Underdog & Priorität: Automatische Zuteilung von 5 CP an den Underdog bei
    Rundenstart. Erkennt Doppelzüge (Double Turn / Seizing Initiative).
  - Persistence: Der gesamte Spielstand wird kontinuierlich im localStorage
    gesichert, um Datenverlust bei Verbindungsabbrüchen zu verhindern.

B. Warhammer 40k Tracker (11th Edition / Chapter Approved)

  - Force Dispositions & Matchup Matrix:
      - 5 Grundeinstellungen (Take and Hold, Disruption, Purge the Foe, Priority
        Assets, Reconnaissance).
      - 15 einzigartige Matchup-Kombinationen. Das jeweils gewählte Matchup wird
        in allen Auswahllisten mit ⭐ markiert und an oberster Stelle sortiert.
  - Primary & Secondary Missions:
      - Unterstützung für Tactical (Deck ziehen/abwerfen) und Fixed Missions.
      - Automatische Einhaltung der 11th-Edition-Punktegrenzen:
          - Primary VP Cap: max. 15 VP pro Runde / max. 45 VP pro Spiel.
          - Secondary VP Cap: max. 45 VP pro Spiel.
          - Battle Ready Bonus: 10 VP.

4. 40k Geometrie- & 2D-Karten-Resolver

Ein Kernstück des 40k-Trackers ist die visuelle 2D-Schlachtfeldanzeige (60"
× 44" SVG), die ohne externes Backend nativ im Browser berechnet wird:

terrain-layouts.json (Layout Positionen & Rotationen)
         +
terrain-pieces.json / Geometrie-Katalog (Bodenplatten & Wände)
         ↓
Mathematischer Centroid-Resolver (v - Centroid)
         ↓
SVG Canvas: Aufstellungszonen + Acryl-Bodenplatten + L-Ruinenwände + Objectives + Keystones

Die Resolver-Logik (nach resolve.py / resolve.ts):

1.  Centroid-Transformation: Geländebasen (Area Footprints) werden über ihren
    Polygon-Schwerpunkt zentriert:
    \text{Centroid}_x = \frac{1}{6A} \sum (x_i + x_{i+1})(x_i y_{i+1} - x_{i+1} y_i)
2.  Composite-Features: Die physischen Ruinenwände (features) liegen relativ zu
    diesem Schwerpunkt und werden inklusive Drehwinkel (rotation_degrees) und
    Spiegelung (mirror: "horizontal"|"vertical") auf der Acryl-Bodenplatte
    positioniert.
3.  Keystones & Measurements:
      - Rote Pfeile: Messen senkrecht von den 4 Tischkanten (Top, Bottom, Left,
        Right) zu den Schlüsselecken der Ruinen.
      - Blaue Pfeile: Messen die Abstände zwischen Missionszielen (z. B. 9"
        No-Man's-Land Distanzen).

5. ClubMeta & Auswertungs-Logik

Die Komponente ClubMeta.jsx aggregiert die Spieldaten nach Systemen:

  - System-Filter: Trennt AoS- und 40k-Spiele über isMatchForSystem().
  - Matchup-Matrix: Berechnet dynamisch die Win-Rates für jede
    Fraktion-gegen-Fraktion-Paarung ((\text{Wins} / \text{Games}) \times 100).
  - Szenario-Statistik: Zählt gespielte AoS-Battleplans
    bzw. 40k-Missionskombinationen.

6. Gamification & Trophäen-System (Badge Engine)

Das Badge-System (BADGE_DEFINITIONS) arbeitet mit einer dynamischen
Evaluierungsfunktion. Bei jedem Laden der Mitgliederliste oder des Profils
werden folgende Kriterien geprüft:

  - Match-Meilensteine: 1. Spiel (Blut & Ehre), 5 Spiele (Veteran des Clubs).
  - Siegesserien: 3 Siege in Folge (Aufstieg der Legende).
  - Turniersiege: Sieg in einem Multi-Match-Turniermodus (Der Hausmeister).
  - Community & Logins: 5 verschiedene Login-Tage (Stammtisch), Event-Teilnahmen
    (On Tour), Profilbild hochgeladen (Gesicht des Clubs).
  - Admin-Badges: Manuell durch Administratoren vergebene Auszeichnungen (Der
    Maschinist, Master of Magnets).

7. Entwickler-Leitlinien & Coding-Grundsätze

1.  Nicht-destruktive Weiterentwicklung: Funktionierender Code und bestehende
    Schnittstellen (insbesondere Datenbankstrukturen und State-Hooks) dürfen bei
    Bugfixes oder Erweiterungen nicht verändert oder gelöscht werden.
2.  Saubere Trennung:
      - AoS-spezifischer Code bleibt in src/components/AosScoreTracker.jsx.
      - 40k-spezifischer Code bleibt in src/components/40k/ und src/data/40k/.
      - Übergreifende Features (Meta, Hall of Fame, UserProfile) müssen beide
        Systeme über strikte Filter unterstützen.
3.  PWA-Kompatibilität: Alle Daten und Berechnungen müssen clientseitig
    offlinefähig bleiben.
