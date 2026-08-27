import React, { useState, useEffect, useRef } from "react";
import {
  Swords,
  Plus,
  Minus,
  Shield,
  Flame,
  Save,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Trophy,
  RotateCcw,
  Trash2,
  X,
  Eye,
  Download,
  Share2,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import html2canvas from "html2canvas";

// DIE 6 BATTLE TACTIC CARDS (GHB 3.0)
const GHB_30_CARDS = [
  {
    id: "blazing_onslaught",
    name: "Blazing Onslaught",
    steps: [
      { id: "affray", type: "Affray", label: "1. Affray Tactic" },
      { id: "strike", type: "Strike", label: "2. Strike Tactic" },
      { id: "domination", type: "Domination", label: "3. Domination Tactic" },
    ],
  },
  {
    id: "siege_of_ashes",
    name: "Siege of Ashes",
    steps: [
      { id: "affray", type: "Affray", label: "1. Affray Tactic" },
      { id: "strike", type: "Strike", label: "2. Strike Tactic" },
      { id: "domination", type: "Domination", label: "3. Domination Tactic" },
    ],
  },
  {
    id: "flanking_firestorm",
    name: "Flanking Firestorm",
    steps: [
      { id: "affray", type: "Affray", label: "1. Affray Tactic" },
      { id: "strike", type: "Strike", label: "2. Strike Tactic" },
      { id: "domination", type: "Domination", label: "3. Domination Tactic" },
    ],
  },
  {
    id: "smokescreen",
    name: "Smokescreen",
    steps: [
      { id: "affray", type: "Affray", label: "1. Affray Tactic" },
      { id: "strike", type: "Strike", label: "2. Strike Tactic" },
      { id: "domination", type: "Domination", label: "3. Domination Tactic" },
    ],
  },
  {
    id: "burning_for_vengeance",
    name: "Burning for Vengeance",
    steps: [
      { id: "affray", type: "Affray", label: "1. Affray Tactic" },
      { id: "strike", type: "Strike", label: "2. Strike Tactic" },
      { id: "domination", type: "Domination", label: "3. Domination Tactic" },
    ],
  },
  {
    id: "legend_of_the_parch",
    name: "Legend of The Parch",
    steps: [
      { id: "affray", type: "Affray", label: "1. Affray Tactic" },
      { id: "strike", type: "Strike", label: "2. Strike Tactic" },
      { id: "domination", type: "Domination", label: "3. Domination Tactic" },
    ],
  },
];

// DIE EXAKTEN 12 BATTLEPLANS
const TERRAIN_BATTLEPLANS = [
  {
    id: "bp_1_into_the_fire",
    name: "1. Into the Fire",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Control 2 or more objectives", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
  {
    id: "bp_2_bloodstained_coasts",
    name: "2. Bloodstained Coasts",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Control 2 or more objectives", vp: 3 },
      {
        id: "s3",
        label:
          "BR 1: Control more objectives / BR 2+: Control objective enemy controlled at start of turn",
        vp: 4,
      },
    ],
  },
  {
    id: "bp_3_avalanche_of_ash",
    name: "3. Avalanche of Ash",
    scoringRules: [
      { id: "s1", label: "Control 1+ objective", vp: 3 },
      { id: "s2", label: "Control 2+ objectives", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
      { id: "s4", label: "Max 1 obj left & control enemy terrain", vp: 3 },
      {
        id: "s5",
        label: "No obj left & control more terrain than opponent",
        vp: 7,
      },
    ],
  },
  {
    id: "bp_4_caverns_of_slaughter",
    name: "4. Caverns of Slaughter",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Control 2 or more objectives", vp: 3 },
      { id: "s3", label: "Control any pairs of objectives", vp: 4 },
    ],
  },
  {
    id: "bp_5_whats_yours_is_ours",
    name: "5. What's Yours Is Ours",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Control the coveted pair of objectives", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
  {
    id: "bp_6_hidden_under_ash_clouds",
    name: "6. Hidden Under Ash-Clouds",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Control 2 or more objectives", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
  {
    id: "bp_7_warped_ruins",
    name: "7. Warped Ruins",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Control any pairs of objectives", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
  {
    id: "bp_8_curse_of_the_gnaw",
    name: "8. Curse of the Gnaw",
    scoringRules: [
      { id: "s1", label: "Control Golden Lions objective", vp: 3 },
      { id: "s2", label: "Control Sun Seekers objective", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
  {
    id: "bp_9_seize_the_embers",
    name: "9. Seize the Embers",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Round 1: Control 2+ objectives", vp: 3 },
      {
        id: "s3",
        label: "Round 2+: Used 'Back to Base Camp' ability this turn",
        vp: 3,
      },
      { id: "s4", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
  {
    id: "bp_10_treacherous_ground",
    name: "10. Treacherous Ground",
    scoringRules: [
      { id: "s1", label: "Control at least 1 stable objective", vp: 3 },
      { id: "s2", label: "Control 2+ stable objectives", vp: 3 },
      {
        id: "s3",
        label: "Control more stable objectives than opponent",
        vp: 4,
      },
    ],
  },
  {
    id: "bp_11_escape_from_the_coast",
    name: "11. Escape from the Coast",
    scoringRules: [
      { id: "s1", label: "Control at least 1 objective", vp: 3 },
      { id: "s2", label: "Control 2 or more objectives", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
  {
    id: "bp_12_power_of_the_realms",
    name: "12. Power of the Realms",
    scoringRules: [
      { id: "s1", label: "Control the primary objective", vp: 3 },
      { id: "s2", label: "Control 2+ secondary objectives", vp: 3 },
      { id: "s3", label: "Control more objectives than opponent", vp: 4 },
    ],
  },
];

// FRAKTIONEN GRUPPIERT NACH GRAND ALLIANCE
const FACTION_GROUPS = {
  Order: {
    "Cities of Sigmar": [
      "Collegiate Exemplars",
      "Stalwart Guardians",
      "Swift Reinforcements",
      "Zealous Hordes",
      "Allies of the Free Cities",
      "The Iron March",
    ],
    "Daughters of Khaine": [
      "Cold-Hearted Murderers",
      "Coven of Blood",
      "Fervent Ritualists",
      "Frenzied Devotees",
      "Champions of the Arena",
      "The Croneseer's Pariahs",
      "Zainthar Kai",
    ],
    "Fyreslayers": [
      "Forge Brethren",
      "Lords of the Lodge",
      "Scales of Vulcatrix",
      "Warrior Kinband",
      "Lofnir Drothkeepers",
    ],
    "Idoneth Deepkin": [
      "Akhelian Beastmasters",
      "Isharann Council",
      "Namarti Corps",
      "Soul-raid Ambushers",
      "The First Phalanx of Ionrach",
      "Wardens of the Chorrileum",
    ],
    "Kharadron Overlords": [
      "Endrineers Guild Expeditionary Force", 
      "Pioneers and Scavengers",
      "Rapid Redeployment Squadron",
      "Veteran Ground Troops",
      "Grundstok Expeditionary Force",
      "Pioneers Outpost",
      "The Magnate's Crew",
    ],
    "Lumineth Realm-lords": [
      "Aelementor Guardians", 
      "Pilgrims of Haixiah",
      "Scinari Council",
      "Warhost of Duality",
      "Aelementari Conclave",
      "Vanari Paragons",
    ],
    "Seraphon": [
      "Eternal Starhost", 
      "Shadowstrike Starhost",
      "Sunclaw Starhost",
      "Thunderquake Starhost",
    ],
    "Stormcast Eternals": [
      "Sacrosant Convocation",
      "Lightning Echelon",
      "Sentinels of the Black Citadels",
      "Thunderhead Host",
      "Vanguard Wing",
      "Draconith Skywing",
      "Heroes of the First-Forge",
      "Ruination Brotherhood",
    ],
    "Sylvaneth": [
      "Outcast",
      "Lords of the Clan",
      "Glade Defenders",
      "Followers of Kurnoth",
      "AoR Lords of the Clan",
      "Soulpod Guardians",
      "The Evergreen Hunt",
    ],
  },
  Chaos: {
    "Blades of Khorne": [
      "Bloodbound Warhorde", 
      "Brass Stampede",
      "Khornate Legion",
      "Murderhost",
      "Gorechosen Champions",
      "The Baleful Lords",
    ],
    "Disciples of Tzeentch": [
      "Denizens of the Silver Tower", 
      "Fated Blades",
      "Malevolent Schemers",
      "Mutants and Mad Things",
      "Change-Cult Uprising",
      "The Oracles of Fate",
    ],
    "Hedonites of Slaanesh": [
      "Artisans of Torment", 
      "Depraved Carnival",
      "Godseeker Cavalcade",
      "Lurid Dreamers",
      "Court of the Godlings",
      "The Decadent Host",
    ],
    "Helmsmiths of Hashut": [
      "Castigation Battery", 
      "Deamonsmith Cabal",
      "Hashutite Host",
      "The Bullfather's Horns",
      "Taar's Grand Forgehost",
      "Ziggurat Stampede",
    ],
    "Maggotkin of Nurgle": [
      "Affliction Cyst", 
      "Nurgle's Menagerie",
      "Plague Cyst",
      "Tallyband of Nurgle",
      "Cycle of Corruption",
      "The Gardeners of Nurgle",
    ],
    "Skaven": [
      "Kill-Pack",
      "Fleshmeld Menagerie",
      "Claw-horde",
      "Virulent Procession",
      "Warpcog Convocation",
      "Thanquol's Mutated Menagerie",
      "The Great-Grand Gnawhorde",
    ],
    "Slaves to Darkness": [
      "Darkoath Horde",
      "Despoilers",
      "Godswrath Warband",
      "Legion of Chaos",
      "Legion of the First Prince",
      "The Swords of Chaos",
      "Tribes of the Snow Peaks",
    ],
  },
  Death: {
    "Flesh-eater Courts": [
      "Knightly Echelon", 
      "Lords of the Manor",
      "Royal Menagerie",
      "The Royal Hunt",
      "The Equinox Feast",
      "The Knights of New Summercourt",
    ],
    "Nighthaunt": [
      "Death Stalkers", 
      "Quicksilver Gheists",
      "Royal Procession",
      "Shrieker Host",
      "The Clattering Procession",
      "The Eternal Nightmare",
    ],
    "Ossiarch Bonereapers": [
      "Border Guards", 
      "Remorseless Conquerors",
      "Ruthless Legion",
      "The Inevitable Empire",
      "The Lance of Ossia",
      "The Null Myriad",
    ],
    "Soulblight Gravelords": [
      "Legions of Ulfenkarn", 
      "Bacchanal of Blood",
      "Deathmarch",
      "Deathstench Drove",
      "Legion of Shyish",
    ],
  },
  Destruction: {
    "Gloomspite Gitz": [
      "Gitmob Pack", 
      "Gloomspite Horde",
      "Squigalanche",
      "Troggherd",
      "Da King's Gitz",
      "Droggz's Gitmob",
      "Trugg's Troggherd",
    ],
    "Ironjawz": [
      "Grunta Stampede", 
      "Ironfist",
      "Ironjawz Brawl",
      "Weirdfist",
      "Big Waaagh!",
      "Krazogg's Grunta Stampede",
      "Murkvast Menagerie",
      "Zoggrok's Ironmongerz",
    ],
    "Kruleboyz": [
      "Kruleboyz Klaw", 
      "Light Finga",
      "Middul Finga",
      "Trophy Finga",
      "Big Waaagh!",
      "Krazogg's Grunta Stampede",
      "Murkvast Menagerie",
      "Zoggrok's Ironmongerz",
    ],
    "Ogor Mawtribes": [
      "Hunger-Filled Tribe", 
      "Vanguard of the Mawpath",
      "Hinterland Hunters",
      "Maw-Cult Fanatics",
    ],
    "Sons of Behemat": [
      "Boss Tribe", 
      "Breaker Tribe",
      "Stomper Tribe",
      "Taker Tribe",
      "King Brodd's Stomp",
    ],
  },
  Other: {
    "Andere Fraktion": ["Standard Formation 1", "Standard Formation 2"],
  }
};

const FACTION_CATALOG = Object.values(FACTION_GROUPS).reduce(
  (acc, group) => ({ ...acc, ...group }),
  {}
);

export default function AosScoreTracker({ currentUser, onClose }) {
  const defaultPlayer1Name = currentUser?.username || currentUser?.name || "Dein Name";
  const defaultPlayer2Name = "Gegner";
  const scorecardRef = useRef(null);

  const handleDownloadGraphic = async () => {
    if (!scorecardRef.current || isGeneratingGraphic) return;
    setIsGeneratingGraphic(true);
    try {
      const isMobileOrTablet = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                               window.innerWidth <= 1024;
      
      // Use scale 1.5 on mobile/tablet to avoid high memory/crash issues on iOS
      const renderScale = isMobileOrTablet ? 1.5 : 2;

      const canvas = await html2canvas(scorecardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: renderScale,
        logging: false,
        useCORS: true,
      });
      
      canvas.toBlob((blob) => {
        if (!blob) {
          setIsGeneratingGraphic(false);
          return;
        }
        
        const filename = `scorecard-aos-${players.player1.name}-vs-${players.player2.name}.png`;
        const file = new File([blob], filename, { type: "image/png" });
        const image = canvas.toDataURL("image/png");
        
        setShareFile(file);
        setShareImageUrl(image);

        if (!isMobileOrTablet) {
          const link = document.createElement("a");
          link.href = image;
          link.download = filename;
          link.click();
          // Reset states so we don't open the modal on desktop
          setShareImageUrl(null);
          setShareFile(null);
        }
        setIsGeneratingGraphic(false);
      }, "image/png");
    } catch (err) {
      console.error("Fehler beim Herunterladen der Grafik:", err);
      setIsGeneratingGraphic(false);
    }
  };

  const loadSavedState = (key, fallback) => {
    try {
      const saved = localStorage.getItem(`fumble_forge_aos_${key}`);
      return saved !== null ? JSON.parse(saved) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const [setupStep, setSetupStep] = useState(() => loadSavedState("setupStep", "mode_select"));
  const [matchMode, setMatchMode] = useState(() => loadSavedState("matchMode", "single"));
  const [matchTitle, setMatchTitle] = useState(() => loadSavedState("matchTitle", "Freies Spiel"));
  const [totalTournamentRounds, setTotalTournamentRounds] = useState(() => loadSavedState("totalRounds", 5));
  const [currentTournamentMatchIndex, setCurrentTournamentMatchIndex] = useState(() => loadSavedState("matchIndex", 1));
  const [tournamentResultsSummary, setTournamentResultsSummary] = useState(() => loadSavedState("tournamentSummary", []));

  const [selectedBattleplanId, setSelectedBattleplanId] = useState(() => {
    const saved = loadSavedState("battleplanId", TERRAIN_BATTLEPLANS[0].id);
    const exists = TERRAIN_BATTLEPLANS.some((b) => b.id === saved);
    return exists ? saved : TERRAIN_BATTLEPLANS[0].id;
  });

  const [currentRound, setCurrentRound] = useState(() => loadSavedState("currentRound", 1));
  const [activeTurnPlayer, setActiveTurnPlayer] = useState(() => loadSavedState("activeTurnPlayer", "player1"));
  const [lastTurnPlayerInPrevRound, setLastTurnPlayerInPrevRound] = useState(() => loadSavedState("lastTurnPlayer", "player2"));
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [showFirstTurnModal, setShowFirstTurnModal] = useState(false);
  const [turnHistory, setTurnHistory] = useState(() => loadSavedState("turnHistory", []));
  const [roundHistory, setRoundHistory] = useState(() => loadSavedState("roundHistory", []));

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // State für die Sicherheitsabfrage zum Abbrechen/Löschen des Spiels
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLiveStatsModal, setShowLiveStatsModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [isGeneratingGraphic, setIsGeneratingGraphic] = useState(false);

  const [players, setPlayers] = useState(() => {
    const raw = loadSavedState("players", null);
    if (!raw) {
      return {
        player1: {
          name: defaultPlayer1Name,
          faction: "Daughters of Khaine",
          formation: "Slaughter Troupe",
          chosenCardIds: ["blazing_onslaught", "burning_for_vengeance"],
          vp: 0,
          cp: 4,
          furyLevel: 1,
          rageDice: 0,
          completedStepKeys: [],
          currentSelectedStepKey: "",
          isUnderdog: false,
          scoredRulesByRound: {},
        },
        player2: {
          name: defaultPlayer2Name,
          faction: "Skaven",
          formation: "Warpcog Enginecluster",
          chosenCardIds: ["siege_of_ashes", "legend_of_the_parch"],
          vp: 0,
          cp: 4,
          furyLevel: 1,
          rageDice: 0,
          completedStepKeys: [],
          currentSelectedStepKey: "",
          isUnderdog: false,
          scoredRulesByRound: {},
        },
      };
    }
    const ensurePlayerFields = (p, defaultName, defaultFaction, defaultFormation, defaultCards) => ({
      name: p.name || defaultName,
      faction: p.faction || defaultFaction,
      formation: p.formation || defaultFormation,
      chosenCardIds: Array.isArray(p.chosenCardIds) ? p.chosenCardIds : defaultCards,
      vp: typeof p.vp === "number" ? p.vp : 0,
      cp: typeof p.cp === "number" ? p.cp : 4,
      furyLevel: typeof p.furyLevel === "number" ? p.furyLevel : 1,
      rageDice: typeof p.rageDice === "number" ? p.rageDice : 0,
      completedStepKeys: Array.isArray(p.completedStepKeys) ? p.completedStepKeys : [],
      currentSelectedStepKey: p.currentSelectedStepKey || "",
      isUnderdog: !!p.isUnderdog,
      scoredRulesByRound: p.scoredRulesByRound || {},
    });
    return {
      player1: ensurePlayerFields(raw.player1 || {}, defaultPlayer1Name, "Daughters of Khaine", "Slaughter Troupe", ["blazing_onslaught", "burning_for_vengeance"]),
      player2: ensurePlayerFields(raw.player2 || {}, defaultPlayer2Name, "Skaven", "Warpcog Enginecluster", ["siege_of_ashes", "legend_of_the_parch"]),
    };
  });

  useEffect(() => {
    localStorage.setItem("fumble_forge_aos_setupStep", JSON.stringify(setupStep));
    localStorage.setItem("fumble_forge_aos_matchMode", JSON.stringify(matchMode));
    localStorage.setItem("fumble_forge_aos_matchTitle", JSON.stringify(matchTitle));
    localStorage.setItem("fumble_forge_aos_totalRounds", JSON.stringify(totalTournamentRounds));
    localStorage.setItem("fumble_forge_aos_matchIndex", JSON.stringify(currentTournamentMatchIndex));
    localStorage.setItem("fumble_forge_aos_tournamentSummary", JSON.stringify(tournamentResultsSummary));
    localStorage.setItem("fumble_forge_aos_battleplanId", JSON.stringify(selectedBattleplanId));
    localStorage.setItem("fumble_forge_aos_currentRound", JSON.stringify(currentRound));
    localStorage.setItem("fumble_forge_aos_activeTurnPlayer", JSON.stringify(activeTurnPlayer));
    localStorage.setItem("fumble_forge_aos_lastTurnPlayer", JSON.stringify(lastTurnPlayerInPrevRound));
    localStorage.setItem("fumble_forge_aos_turnHistory", JSON.stringify(turnHistory));
    localStorage.setItem("fumble_forge_aos_players", JSON.stringify(players));
    localStorage.setItem("fumble_forge_aos_roundHistory", JSON.stringify(roundHistory));
  }, [
    setupStep,
    matchMode,
    matchTitle,
    totalTournamentRounds,
    currentTournamentMatchIndex,
    tournamentResultsSummary,
    selectedBattleplanId,
    currentRound,
    activeTurnPlayer,
    lastTurnPlayerInPrevRound,
    turnHistory,
    players,
    roundHistory,
  ]);

  const handleFactionChange = (pKey, newFaction) => {
    const formations =
      FACTION_CATALOG[newFaction] || FACTION_CATALOG["Andere Fraktion"];
    setPlayers((prev) => ({
      ...prev,
      [pKey]: {
        ...prev[pKey],
        faction: newFaction,
        formation: formations[0],
      },
    }));
  };

  const updatePlayerField = (pKey, field, value) => {
    setPlayers((prev) => ({
      ...prev,
      [pKey]: { ...prev[pKey], [field]: value },
    }));
  };

  const updateChosenCard = (pKey, cardIndex, newCardId) => {
    setPlayers((prev) => {
      const updated = [...prev[pKey].chosenCardIds];
      updated[cardIndex] = newCardId;
      return {
        ...prev,
        [pKey]: { ...prev[pKey], chosenCardIds: updated },
      };
    });
  };

  const updateResource = (playerKey, resource, delta) => {
    setPlayers((prev) => ({
      ...prev,
      [playerKey]: {
        ...prev[playerKey],
        [resource]: Math.max(
          0,
          resource === "furyLevel"
            ? Math.min(7, prev[playerKey][resource] + delta)
            : prev[playerKey][resource] + delta
        ),
      },
    }));
  };

  const togglePrimaryRulePoints = (playerKey, ruleId, vp, label) => {
    const p = players[playerKey];
    const currentRoundRules = p.scoredRulesByRound[currentRound] || [];
    const isAlreadyScored = currentRoundRules.includes(ruleId);

    if (isAlreadyScored) {
      const updatedRoundRules = currentRoundRules.filter((id) => id !== ruleId);
      setPlayers((prev) => ({
        ...prev,
        [playerKey]: {
          ...prev[playerKey],
          vp: Math.max(0, prev[playerKey].vp - vp),
          scoredRulesByRound: {
            ...prev[playerKey].scoredRulesByRound,
            [currentRound]: updatedRoundRules,
          },
        },
      }));

      setTurnHistory((prev) => [
        ...prev,
        {
          round: currentRound,
          player: p.name,
          playerKey: playerKey,
          action: `Rückgängig: Battleplan Objective (${label}) -${vp} VP`,
        },
      ]);
    } else {
      const updatedRoundRules = [...currentRoundRules, ruleId];
      setPlayers((prev) => ({
        ...prev,
        [playerKey]: {
          ...prev[playerKey],
          vp: prev[playerKey].vp + vp,
          scoredRulesByRound: {
            ...prev[playerKey].scoredRulesByRound,
            [currentRound]: updatedRoundRules,
          },
        },
      }));

      setTurnHistory((prev) => [
        ...prev,
        {
          round: currentRound,
          player: p.name,
          playerKey: playerKey,
          action: `Battleplan Objective (${label}): +${vp} VP`,
        },
      ]);
    }
  };

  const completeStep = (playerKey) => {
    const p = players[playerKey];
    if (!p.currentSelectedStepKey) return;

    const [cardId, stepType] = p.currentSelectedStepKey.split(":::");
    const cardObj = GHB_30_CARDS.find((c) => c.id === cardId);
    const stepLabel = `${cardObj.name} - ${stepType.toUpperCase()}`;

    setPlayers((prev) => ({
      ...prev,
      [playerKey]: {
        ...prev[playerKey],
        vp: prev[playerKey].vp + 5,
        completedStepKeys: [
          ...prev[playerKey].completedStepKeys,
          p.currentSelectedStepKey,
        ],
        currentSelectedStepKey: "",
      },
    }));

    setTurnHistory((prev) => [
      ...prev,
      {
        round: currentRound,
        player: p.name,
        playerKey: playerKey,
        action: `Battle Tactic erfüllt: ${stepLabel} (+5 VP)`,
      },
    ]);
  };

  const confirmNextRound = (chosenFirstPlayer) => {
    if (currentRound >= 5) {
      setSetupStep("summary");
      setShowRoundModal(false);
      return;
    }

    // Save snapshot of current round before transition
    const snapshot = {
      round: currentRound,
      players: JSON.parse(JSON.stringify(players)),
      activeTurnPlayer: activeTurnPlayer,
      lastTurnPlayerInPrevRound: lastTurnPlayerInPrevRound,
      turnHistory: JSON.parse(JSON.stringify(turnHistory)),
    };
    setRoundHistory((prev) => [...prev, snapshot]);

    const nextR = currentRound + 1;
    const secondPlayer =
      chosenFirstPlayer === "player1" ? "player2" : "player1";

    const isDoubleTurn = chosenFirstPlayer === lastTurnPlayerInPrevRound;

    let p1Underdog = false;
    let p2Underdog = false;

    if (isDoubleTurn) {
      if (chosenFirstPlayer === "player1") p2Underdog = true;
      if (chosenFirstPlayer === "player2") p1Underdog = true;
    } else {
      if (players.player1.vp < players.player2.vp) p1Underdog = true;
      if (players.player2.vp < players.player1.vp) p2Underdog = true;
    }

    setPlayers((prev) => ({
      player1: {
        ...prev.player1,
        cp: p1Underdog ? 5 : 4,
        isUnderdog: p1Underdog,
        rageDice: 0,
        currentSelectedStepKey: "",
      },
      player2: {
        ...prev.player2,
        cp: p2Underdog ? 5 : 4,
        isUnderdog: p2Underdog,
        rageDice: 0,
        currentSelectedStepKey: "",
      },
    }));

    setTurnHistory((prev) => [
      ...prev,
      {
        round: currentRound,
        player: players[chosenFirstPlayer].name,
        playerKey: chosenFirstPlayer,
        action: `Wählt Zug 1 in Runde ${nextR}${
          isDoubleTurn ? " (⚡ Doppelzug genommen)" : ""
        }`,
      },
    ]);

    setCurrentRound(nextR);
    setActiveTurnPlayer(chosenFirstPlayer);
    setLastTurnPlayerInPrevRound(secondPlayer);
    setShowRoundModal(false);
  };

  const handlePreviousRound = () => {
    if (currentRound <= 1) return;

    if (roundHistory.length > 0) {
      const updatedHistory = [...roundHistory];
      const previousState = updatedHistory.pop();

      setCurrentRound(previousState.round);
      setPlayers(previousState.players);
      setActiveTurnPlayer(previousState.activeTurnPlayer);
      setLastTurnPlayerInPrevRound(previousState.lastTurnPlayerInPrevRound);
      setTurnHistory(previousState.turnHistory);
      setRoundHistory(updatedHistory);
    } else {
      setCurrentRound((prev) => Math.max(1, prev - 1));
    }
  };

  const handleSaveMatch = async () => {
    if (!currentUser?.id) {
      setErrorMsg("Bitte logge dich ein, um das Match zu speichern.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const activeBp = TERRAIN_BATTLEPLANS.find(
      (b) => b.id === selectedBattleplanId
    );

    const winner =
      players.player1.vp > players.player2.vp
        ? players.player1.name
        : players.player2.vp > players.player1.vp
        ? players.player2.name
        : "Unentschieden";

    try {
      const plannedMatchId = localStorage.getItem("fumble_forge_aos_plannedMatchId");
      const isOpponent = JSON.parse(localStorage.getItem("fumble_forge_aos_plannedMatchIsOpponent") || "false");
      const opponentIdFromLocal = localStorage.getItem("fumble_forge_aos_opponentId") || null;

      let finalOpponentId = opponentIdFromLocal;
      if (!plannedMatchId && players.player2.name && players.player2.name !== "Opponent" && players.player2.name !== "Gegner") {
        try {
          const { data: oppProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", players.player2.name)
            .maybeSingle();
          if (oppProfile) {
            finalOpponentId = oppProfile.id;
          }
        } catch (err) {
          console.error("Error fetching opponent profile:", err);
        }
      }

      const matchData = {
        user_id: currentUser.id,
        opponent_id: finalOpponentId,
        player1_name: isOpponent ? players.player2.name : players.player1.name,
        player2_name: isOpponent ? players.player1.name : players.player2.name,
        player1_vp: isOpponent ? players.player2.vp : players.player1.vp,
        player2_vp: isOpponent ? players.player1.vp : players.player2.vp,
        rounds_played: currentRound,
        winner_name: winner,
        system: "aos",
        details: {
          match_title: matchTitle,
          match_mode: matchMode,
          player1_faction: isOpponent ? players.player2.faction : players.player1.faction,
          player2_faction: isOpponent ? players.player1.faction : players.player2.faction,
          player1_formation: isOpponent ? players.player2.formation : players.player1.formation,
          player2_formation: isOpponent ? players.player1.formation : players.player2.formation,
          battleplan: activeBp?.name,
          history: turnHistory,
        },
      };

      let error;

      if (plannedMatchId) {
        // Double-check if the planned match has already been completed in the DB
        const { data: latestMatch, error: checkErr } = await supabase
          .from("matches")
          .select("status")
          .eq("id", plannedMatchId)
          .single();

        if (!checkErr && latestMatch && latestMatch.status === "completed") {
          alert("Dieses geplante Spiel wurde bereits in der Zwischenzeit von deinem Gegner eingetragen und abgeschlossen! Das erneute Speichern wurde verhindert, um Duplikate zu vermeiden.");
          resetMatch();
          if (onClose) onClose();
          return;
        }

        const { error: updateErr } = await supabase
          .from("matches")
          .update({
            player1_name: matchData.player1_name,
            player2_name: matchData.player2_name,
            player1_vp: matchData.player1_vp,
            player2_vp: matchData.player2_vp,
            rounds_played: currentRound,
            winner_name: winner,
            status: "completed",
            details: {
              ...matchData.details,
              is_challenge: true
            }
          })
          .eq("id", plannedMatchId);
        error = updateErr;

        const plannedChallengeId = localStorage.getItem("fumble_forge_aos_plannedChallengeId");
        if (plannedChallengeId) {
          await supabase
            .from("challenges")
            .update({ status: "completed" })
            .eq("id", plannedChallengeId);
        }
      } else {
        const { error: insertErr } = await supabase.from("matches").insert([matchData]);
        error = insertErr;
      }

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        resetMatch();
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || "Fehler beim Speichern des Matches.");
    } finally {
      setSaving(false);
    }
  };

  const handleProceedAfterSummary = () => {
    const activeBp = TERRAIN_BATTLEPLANS.find((b) => b.id === selectedBattleplanId);
    const roundResult = {
      matchIndex: currentTournamentMatchIndex,
      battleplan: activeBp?.name,
      p1Name: players.player1.name,
      p1Faction: players.player1.faction,
      p1Vp: players.player1.vp,
      p2Name: players.player2.name,
      p2Faction: players.player2.faction,
      p2Vp: players.player2.vp,
      winner: players.player1.vp > players.player2.vp ? players.player1.name : players.player2.vp > players.player1.vp ? players.player2.name : "Unentschieden"
    };

    const updatedSummary = [...tournamentResultsSummary, roundResult];
    setTournamentResultsSummary(updatedSummary);

    if (matchMode === "tournament" && currentTournamentMatchIndex < totalTournamentRounds) {
      setCurrentTournamentMatchIndex((prev) => prev + 1);
      setCurrentRound(1);
      setActiveTurnPlayer("player1");
      setLastTurnPlayerInPrevRound("player2");
      setTurnHistory([]);
      setRoundHistory([]);
      setSaveSuccess(false);
      setPlayers((prev) => ({
        player1: { ...prev.player1, vp: 0, cp: 4, completedStepKeys: [], currentSelectedStepKey: "", isUnderdog: false, scoredRulesByRound: {} },
        player2: { ...prev.player2, vp: 0, cp: 4, completedStepKeys: [], currentSelectedStepKey: "", isUnderdog: false, scoredRulesByRound: {} },
      }));
      setSetupStep("terrain");
    } else if (matchMode === "tournament" && currentTournamentMatchIndex >= totalTournamentRounds) {
      saveCompleteTournamentToSupabase(updatedSummary);
    } else {
      resetMatch();
    }
  };

  const saveCompleteTournamentToSupabase = async (allMatches) => {
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      const totalP1Wins = allMatches.filter(m => m.winner === players.player1.name).length;
      const totalP2Wins = allMatches.filter(m => m.winner === players.player2.name).length;
      const tournamentWinner = totalP1Wins > totalP2Wins ? players.player1.name : totalP2Wins > totalP1Wins ? players.player2.name : "Turnier-Unentschieden";

      const tournamentData = {
        user_id: currentUser.id,
        player1_name: `Turnier: ${matchTitle}`,
        player2_name: `Sieger: ${tournamentWinner}`,
        player1_vp: allMatches.reduce((acc, m) => acc + m.p1Vp, 0),
        player2_vp: allMatches.reduce((acc, m) => acc + m.p2Vp, 0),
        rounds_played: totalTournamentRounds,
        winner_name: tournamentWinner,
        details: {
          match_title: matchTitle,
          match_mode: "tournament_complete",
          player1_actual_name: players.player1.name,
          player2_actual_name: players.player2.name,
          player1_faction: players.player1.faction,
          player2_faction: players.player2.faction,
          tournament_rounds: allMatches,
        },
      };

      const { error } = await supabase.from("matches").insert([tournamentData]);
      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => {
        resetMatch();
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      console.error("Fehler beim Speichern des Turniers:", err);
      setSaving(false);
    }
  };

  const calculateAosPlayerStats = (playerKey) => {
    const p = players[playerKey];
    const activeBp = TERRAIN_BATTLEPLANS.find((b) => b.id === selectedBattleplanId);

    let finalPrimaryVp = 0;
    const roundPrimaryVp = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let r = 1; r <= 5; r++) {
      const scoredRuleIds = p.scoredRulesByRound[r] || [];
      let roundPri = 0;
      scoredRuleIds.forEach((ruleId) => {
        const rule = activeBp?.scoringRules?.find((sr) => sr.id === ruleId);
        if (rule) {
          roundPri += rule.vp;
        }
      });
      roundPrimaryVp[r] = roundPri;
      finalPrimaryVp += roundPri;
    }

    let finalSecondaryVp = p.completedStepKeys.length * 5;

    const roundSecondaryVp = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    turnHistory.forEach((h) => {
      if (h.playerKey === playerKey && h.action && h.action.includes("Battle Tactic erfüllt")) {
        roundSecondaryVp[h.round] = (roundSecondaryVp[h.round] || 0) + 5;
      }
    });

    return {
      finalPrimaryVp,
      finalSecondaryVp,
      grandTotalVp: p.vp,
      roundPrimaryVp,
      roundSecondaryVp,
    };
  };

  const getAosCardScoreInRound = (playerKey, cardId, r) => {
    const cardObj = GHB_30_CARDS.find((c) => c.id === cardId);
    if (!cardObj) return 0;
    
    const entry = turnHistory.find(h => 
      h.round === r && 
      h.playerKey === playerKey && 
      h.action && 
      h.action.includes("Battle Tactic erfüllt:") && 
      h.action.includes(cardObj.name)
    );
    
    return entry ? 5 : 0;
  };

  const getFirstPlayerOfRound = (r) => {
    if (r === 1) {
      const firstAction = turnHistory.find(h => h.round === 1);
      if (firstAction) return firstAction.playerKey || 'player1';
      return 'player1';
    }
    
    const choiceLog = turnHistory.find(h => h.action && h.action.includes(`Wählt Zug 1 in Runde ${r}`));
    if (choiceLog) {
      return choiceLog.playerKey;
    }
    
    const histSnap = roundHistory.find(h => h.round === r);
    if (histSnap) return histSnap.activeTurnPlayer;
    
    return r === currentRound ? activeTurnPlayer : '';
  };

  const renderAosTabletopScorecard = () => {
    const isTie = p1Stats.grandTotalVp === p2Stats.grandTotalVp;
    const activeBp = TERRAIN_BATTLEPLANS.find((b) => b.id === selectedBattleplanId);

    return (
      <div ref={scorecardRef} className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 md:p-6 text-left shadow-2xl relative select-none w-full max-w-xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex justify-between text-[11px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
            <span>AoS 4. Edition</span>
            <span>Liga</span>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            {/* Player 1 Details */}
            <div className="text-left space-y-0.5 min-w-0">
              <h4 className="text-sm sm:text-base md:text-lg font-black text-neutral-100 truncate">{players.player1.name}</h4>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">{players.player1.faction}</p>
            </div>

            {/* Score */}
            <div className="text-center space-y-1 min-w-0">
              <div className="text-xl sm:text-3xl md:text-5xl font-black text-neutral-100 tracking-wider font-mono">
                {p1Stats.grandTotalVp} - {p2Stats.grandTotalVp}
              </div>
              <div className={`text-[9px] sm:text-[11px] font-black tracking-widest uppercase truncate ${
                isTie ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {isTie ? 'Unentschieden' : 'VICTORY'}
              </div>
            </div>

            {/* Player 2 Details */}
            <div className="text-right space-y-0.5 min-w-0">
              <h4 className="text-sm sm:text-base md:text-lg font-black text-neutral-100 truncate">{players.player2.name}</h4>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">{players.player2.faction}</p>
            </div>
          </div>
        </div>

        {/* Player sections */}
        {['player1', 'player2'].map((pKey) => {
          const p = players[pKey];
          const pStats = pKey === 'player1' ? p1Stats : p2Stats;
          const secondaries = p.chosenCardIds;

          return (
            <div key={pKey} className="space-y-3 pt-4 border-t border-neutral-800/80">
              <h3 className="text-base font-black text-amber-500 flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-xs text-neutral-400 font-medium font-mono">Total: {pStats.grandTotalVp} VP</span>
              </h3>

              <div className="space-y-1.5">
                {/* Went first row */}
                <div className="flex items-center justify-between py-1 border-b border-neutral-900 px-1">
                  <span className="text-xs font-bold text-neutral-300">Went first</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((r) => {
                        const isWentFirst = getFirstPlayerOfRound(r) === pKey;
                        return (
                          <div 
                            key={r} 
                            className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition border ${
                              isWentFirst 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                                : 'bg-neutral-950 border-neutral-800 text-neutral-600'
                            }`}
                          >
                            {isWentFirst && <Check size={14} strokeWidth={3} />}
                          </div>
                        );
                      })}
                    </div>
                    <span className="w-12 text-right text-xs font-mono font-bold text-neutral-500">
                      -
                    </span>
                  </div>
                </div>

                {/* Primary (Objective Control) row */}
                <div className="flex items-center justify-between py-1 border-b border-neutral-900 px-1">
                  <span className="text-xs font-bold text-neutral-300">Objective Control</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((r) => {
                        const score = pStats.roundPrimaryVp[r];
                        return (
                          <div 
                            key={r} 
                            className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold border ${
                              score > 0 
                                ? 'bg-amber-500/15 border-amber-500/30 text-neutral-200' 
                                : 'bg-neutral-950 border-neutral-800 text-neutral-600'
                            }`}
                          >
                            {score > 0 ? score : '-'}
                          </div>
                        );
                      })}
                    </div>
                    <span className="w-12 text-right text-xs font-mono font-bold text-neutral-400">
                      {pStats.finalPrimaryVp}/∞
                    </span>
                  </div>
                </div>

                {/* Secondaries row(s) */}
                {secondaries.map((cardId) => {
                  const cardInfo = GHB_30_CARDS.find((c) => c.id === cardId);
                  if (!cardInfo) return null;
                  let totalSec = 0;
                  return (
                    <div key={cardId} className="flex items-center justify-between py-1 px-1 border-b border-neutral-900/40 last:border-0">
                      <span className="text-xs text-neutral-300 font-medium truncate max-w-[130px]" title={cardInfo.name}>
                        {cardInfo.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((r) => {
                            const score = getAosCardScoreInRound(pKey, cardId, r);
                            totalSec += score;
                            return (
                              <div 
                                key={r} 
                                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold border ${
                                  score > 0 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-neutral-300' 
                                    : 'bg-neutral-950 border-neutral-800 text-neutral-600'
                                }`}
                              >
                                {score > 0 ? score : '-'}
                              </div>
                            );
                          })}
                        </div>
                        <span className="w-12 text-right text-xs font-mono font-bold text-neutral-400">
                          {totalSec}/15
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer info */}
        <div className="pt-4 border-t border-neutral-900 flex justify-between items-center text-[10px] text-neutral-500 font-medium">
          <div className="space-y-0.5">
            <div>Age of Sigmar • Battleplan: {activeBp?.name}</div>
            <div>Gespielte Runden: {currentRound} / 5</div>
          </div>
          <div className="text-right font-black uppercase text-neutral-600 tracking-wider">
            Fumble Forge App
          </div>
        </div>
      </div>
    );
  };

  const p1Stats = calculateAosPlayerStats("player1");
  const p2Stats = calculateAosPlayerStats("player2");

  const resetMatch = () => {
    localStorage.removeItem("fumble_forge_aos_setupStep");
    localStorage.removeItem("fumble_forge_aos_matchMode");
    localStorage.removeItem("fumble_forge_aos_matchTitle");
    localStorage.removeItem("fumble_forge_aos_totalRounds");
    localStorage.removeItem("fumble_forge_aos_matchIndex");
    localStorage.removeItem("fumble_forge_aos_tournamentSummary");
    localStorage.removeItem("fumble_forge_aos_battleplanId");
    localStorage.removeItem("fumble_forge_aos_currentRound");
    localStorage.removeItem("fumble_forge_aos_activeTurnPlayer");
    localStorage.removeItem("fumble_forge_aos_lastTurnPlayer");
    localStorage.removeItem("fumble_forge_aos_turnHistory");
    localStorage.removeItem("fumble_forge_aos_players");
    localStorage.removeItem("fumble_forge_aos_roundHistory");
    localStorage.removeItem("fumble_forge_aos_plannedMatchId");
    localStorage.removeItem("fumble_forge_aos_plannedChallengeId");
    localStorage.removeItem("fumble_forge_aos_plannedMatchIsOpponent");
    localStorage.removeItem("fumble_forge_aos_opponentId");

    setSetupStep("mode_select");
    setCurrentRound(1);
    setCurrentTournamentMatchIndex(1);
    setTournamentResultsSummary([]);
    setActiveTurnPlayer("player1");
    setLastTurnPlayerInPrevRound("player2");
    setTurnHistory([]);
    setRoundHistory([]);
    setShowDeleteConfirm(false);
    setPlayers((prev) => ({
      player1: {
        ...prev.player1,
        name: defaultPlayer1Name,
        vp: 0,
        cp: 4,
        completedStepKeys: [],
        currentSelectedStepKey: "",
        isUnderdog: false,
        scoredRulesByRound: {},
      },
      player2: {
        ...prev.player2,
        name: defaultPlayer2Name,
        vp: 0,
        cp: 4,
        completedStepKeys: [],
        currentSelectedStepKey: "",
        isUnderdog: false,
        scoredRulesByRound: {},
      },
    }));
  };

  // SCHRITT 0: MODUS & SETUP AUSWAHL
  if (setupStep === "mode_select") {
    return (
      <div className="max-w-xl mx-auto space-y-6 font-sans py-12 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition z-50 cursor-pointer shadow-lg"
            title="Zurück zur Commander Zentrale"
          >
            <X size={20} />
          </button>
        )}
        <div className="bg-neutral-900 border border-amber-600/40 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <Swords className="mx-auto text-amber-500" size={36} />
            <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest">
              Spiel / Turnier Starten
            </h2>
            <p className="text-xs text-neutral-400">
              Wähle zwischen einem Einzelspiel oder einem Turnier-Template mit mehreren Runden.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-neutral-300 mb-1">
                Name des Spiels / Turniers
              </label>
              <input
                type="text"
                value={matchTitle}
                onChange={(e) => setMatchTitle(e.target.value)}
                placeholder="z.B. Freies Clubspiel oder Raccoon Rumble 2026"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setMatchMode("single")}
                className={`p-4 rounded-xl border text-left transition space-y-1 ${
                  matchMode === "single"
                    ? "bg-amber-600/20 border-amber-500 text-amber-400"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <Swords size={16} /> Einzelnes Spiel
                </div>
                <div className="text-[11px] opacity-80">
                  Klassisches 1v1 Scharmützel
                </div>
              </button>

              <button
                onClick={() => setMatchMode("tournament")}
                className={`p-4 rounded-xl border text-left transition space-y-1 ${
                  matchMode === "tournament"
                    ? "bg-amber-600/20 border-amber-500 text-amber-400"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
              >
                <div className="font-bold text-sm flex items-center gap-1.5">
                  <Trophy size={16} /> Turnier Template
                </div>
                <div className="text-[11px] opacity-80">
                  Mehrere Spiele am Stück
                </div>
              </button>
            </div>

            {matchMode === "tournament" && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <label className="block text-xs uppercase font-bold text-amber-400">
                  Anzahl Spiele im Turnier:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 8].map((numRounds) => (
                    <button
                      key={numRounds}
                      onClick={() => setTotalTournamentRounds(numRounds)}
                      className={`py-2.5 rounded-lg border text-xs font-bold transition ${
                        totalTournamentRounds === numRounds
                          ? "bg-amber-600 text-neutral-950 border-amber-500"
                          : "bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
                      }`}
                    >
                      {numRounds} Spiele
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSetupStep("roster")}
            className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-extrabold py-3.5 rounded-xl uppercase text-sm tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/30"
          >
            Weiter zum Roster Setup <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (setupStep === "roster") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition z-50 cursor-pointer shadow-lg"
            title="Zurück zur Commander Zentrale"
          >
            <X size={20} />
          </button>
        )}
        <header className="border-b border-amber-600/30 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Swords className="text-amber-500" /> Roster & Taktiken:{" "}
              <span className="text-neutral-200 text-lg font-normal">
                {matchMode === "tournament" ? `${matchTitle} (Spiel ${currentTournamentMatchIndex}/${totalTournamentRounds})` : matchTitle}
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Wähle Fraktion, Formation und 2 Battle Tactics pro Spieler
            </p>
          </div>
          <button
            onClick={() => setSetupStep("mode_select")}
            className="text-xs text-neutral-400 hover:text-amber-400 underline"
          >
            Ändern
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {["player1", "player2"].map((pKey, idx) => {
            const p = players[pKey];
            const formations =
              FACTION_CATALOG[p.faction] || FACTION_CATALOG["Andere Fraktion"];

            return (
              <div
                key={pKey}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4"
              >
                <div className="text-sm font-black text-amber-500 uppercase tracking-wider">
                  {idx === 0 ? "Dein Profil / Spieler 1" : "Gegner / Spieler 2"}
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                    {idx === 0 ? "Dein Name (Spieler 1)" : "Gegner (Spieler 2)"}
                  </label>
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) =>
                      updatePlayerField(pKey, "name", e.target.value)
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                    Fraktion / Armee
                  </label>
                  <select
                    value={p.faction}
                    onChange={(e) => handleFactionChange(pKey, e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm"
                  >
                    {Object.entries(FACTION_GROUPS).map(([groupName, factions]) => (
                      <optgroup key={groupName} label={`--- ${groupName} ---`}>
                        {Object.keys(factions).map((factionName) => (
                          <option key={factionName} value={factionName}>
                            {factionName}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                    Battle Formation
                  </label>
                  <select
                    value={p.formation}
                    onChange={(e) =>
                      updatePlayerField(pKey, "formation", e.target.value)
                    }
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm"
                  >
                    {formations.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <label className="block text-xs uppercase font-bold text-neutral-400">
                    Wähle 2 Taktikkarten aus Punkt 3.0
                  </label>

                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">
                      Karte 1
                    </label>
                    <select
                      value={p.chosenCardIds[0]}
                      onChange={(e) =>
                        updateChosenCard(pKey, 0, e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:border-amber-500 focus:outline-none text-xs"
                    >
                      {GHB_30_CARDS.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={p.chosenCardIds[1] === c.id}
                        >
                          {c.name}{" "}
                          {p.chosenCardIds[1] === c.id
                            ? "(Bereits gewählt)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">
                      Karte 2
                    </label>
                    <select
                      value={p.chosenCardIds[1]}
                      onChange={(e) =>
                        updateChosenCard(pKey, 1, e.target.value)
                      }
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:border-amber-500 focus:outline-none text-xs"
                    >
                      {GHB_30_CARDS.map((c) => (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={p.chosenCardIds[0] === c.id}
                        >
                          {c.name}{" "}
                          {p.chosenCardIds[0] === c.id
                            ? "(Bereits gewählt)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setSetupStep("terrain")}
          className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl uppercase text-sm tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/20"
        >
          <Swords size={18} /> Weiter zur Terrain Selection
        </button>
      </div>
    );
  }

  if (setupStep === "terrain") {
    const activeBp = TERRAIN_BATTLEPLANS.find(
      (b) => b.id === selectedBattleplanId
    );

    return (
      <div className="max-w-xl mx-auto space-y-6 font-sans py-8 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition z-50 cursor-pointer shadow-lg"
            title="Zurück zur Commander Zentrale"
          >
            <X size={20} />
          </button>
        )}
        <div className="bg-neutral-900 border border-amber-600/40 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <MapPin className="mx-auto text-amber-500" size={32} />
            <h2 className="text-xl font-extrabold text-amber-500 uppercase tracking-widest">
              Terrain Location / Battleplan
            </h2>
            <p className="text-xs text-neutral-400">
              {matchMode === "tournament" ? `Turnierspiel ${currentTournamentMatchIndex} von ${totalTournamentRounds}` : "Freies Spiel"} • Wähle das Szenario
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs uppercase font-bold text-neutral-300">
              Battleplan Dropdown
            </label>
            <select
              value={selectedBattleplanId}
              onChange={(e) => setSelectedBattleplanId(e.target.value)}
              className="w-full bg-neutral-950 border border-amber-600/50 rounded-xl p-3 text-neutral-100 focus:border-amber-500 focus:outline-none text-sm font-bold"
            >
              {TERRAIN_BATTLEPLANS.map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.name}
                </option>
              ))}
            </select>

            {activeBp && (
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase">
                  Primary Scoring Regeln für diesen Plan:
                </span>
                <ul className="space-y-1">
                  {activeBp?.scoringRules?.map((rule) => (
                    <li
                      key={rule.id}
                      className="text-xs text-neutral-300 flex justify-between border-b border-neutral-900 pb-1"
                    >
                      <span>• {rule.label}</span>
                      <span className="font-bold text-amber-500">
                        +{rule.vp} VP
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFirstTurnModal(true)}
            className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-extrabold py-3.5 rounded-xl uppercase text-sm tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/30"
          >
            <Swords size={18} /> Schlacht Jetzt Starten!
          </button>
        </div>

        {showFirstTurnModal && (
          <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-neutral-900 border border-amber-600/50 rounded-2xl p-6 max-w-md w-full space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <Swords className="mx-auto text-amber-500 animate-bounce" size={40} />
                <h3 className="text-xl font-black text-amber-500 uppercase tracking-widest">
                  Wer beginnt die Schlacht?
                </h3>
                <p className="text-xs text-neutral-400">
                  Wähle den Spieler aus, der den ersten Zug in Runde 1 hat.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    setActiveTurnPlayer("player1");
                    setLastTurnPlayerInPrevRound("player2");
                    setShowFirstTurnModal(false);
                    setSetupStep("playing");
                  }}
                  className="w-full p-4 bg-neutral-950 hover:bg-amber-600 hover:text-neutral-950 border border-neutral-800 hover:border-amber-500 rounded-xl font-black text-neutral-200 transition text-center uppercase tracking-wider text-sm cursor-pointer"
                >
                  {players.player1.name || "Spieler 1"}
                </button>
                
                <button
                  onClick={() => {
                    setActiveTurnPlayer("player2");
                    setLastTurnPlayerInPrevRound("player1");
                    setShowFirstTurnModal(false);
                    setSetupStep("playing");
                  }}
                  className="w-full p-4 bg-neutral-950 hover:bg-amber-600 hover:text-neutral-950 border border-neutral-800 hover:border-amber-500 rounded-xl font-black text-neutral-200 transition text-center uppercase tracking-wider text-sm cursor-pointer"
                >
                  {players.player2.name || "Spieler 2"}
                </button>
              </div>

              <button
                onClick={() => setShowFirstTurnModal(false)}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-400 underline uppercase tracking-widest font-bold transition cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SCHRITT 4: ERGEBNIS & MATCH SUMMARY SCREEN (NACH JEDEM SPIEL)
  if (setupStep === "summary") {
    const isLastTournamentMatch = matchMode === "tournament" && currentTournamentMatchIndex >= totalTournamentRounds;

    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans py-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition z-50 cursor-pointer shadow-lg"
            title="Zurück zur Commander Zentrale"
          >
            <X size={20} />
          </button>
        )}
        {renderAosTabletopScorecard()}

        <div className="max-w-xl mx-auto">
          <button
            onClick={handleDownloadGraphic}
            disabled={isGeneratingGraphic}
            className={`w-full ${isGeneratingGraphic ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-800 hover:bg-neutral-700 text-white'} font-bold py-3 px-4 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer`}
          >
            {isGeneratingGraphic ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-1"></span>
                Generiere Grafik...
              </>
            ) : (
              <>
                <Download size={18} /> Grafik Herunterladen
              </>
            )}
          </button>
        </div>

        {matchMode === "tournament" && tournamentResultsSummary.length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
              <Trophy size={18} /> Bisherige Turnierspiele ({tournamentResultsSummary.length}/{totalTournamentRounds})
            </h3>
            <div className="space-y-2">
              {tournamentResultsSummary.map((res, idx) => (
                <div key={idx} className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-amber-400 mr-2">Spiel {res.matchIndex}:</span>
                    <span className="text-neutral-300">{res.battleplan}</span>
                  </div>
                  <div className="text-neutral-400">
                    {res.p1Name} ({res.p1Vp}) vs {res.p2Name} ({res.p2Vp}) ➔ <strong className="text-amber-500">{res.winner}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSaveMatch}
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg cursor-pointer"
          >
            {saveSuccess ? <Check size={18} /> : <Save size={18} />}
            {saving
              ? "Speichert..."
              : saveSuccess
              ? "Spiel Erfolgreich Gespeichert!"
              : "Dieses Spiel Speichern"}
          </button>

          <button
            onClick={handleProceedAfterSummary}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
          >
            {matchMode === "tournament" ? (isLastTournamentMatch ? "Turnier Abschließen & Sichern" : `Nächstes Spiel (${currentTournamentMatchIndex + 1}/${totalTournamentRounds})`) : "Neues Match Starten"} <ArrowRight size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/50 border border-red-600/50 text-red-300 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
      </div>
    );
  }

  // SCHRITT 3: PLAYING / SCORING
  const currentBpObj = TERRAIN_BATTLEPLANS.find(
    (b) => b.id === selectedBattleplanId
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition z-50 cursor-pointer shadow-lg"
          title="Zurück zur Commander Zentrale"
        >
          <X size={20} />
        </button>
      )}
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-amber-600/30 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <Swords className="text-amber-500" /> AoS Score Tracker
          </h2>
          <p className="text-xs text-neutral-400">
            <span className="text-amber-400 font-bold">
              {matchMode === "tournament" ? `${matchTitle} (Turnier-Spiel ${currentTournamentMatchIndex}/${totalTournamentRounds})` : matchTitle}
            </span>{" "}
            • {players.player1.faction} vs. {players.player2.faction} •{" "}
            <span className="text-neutral-300">{currentBpObj?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-amber-500 font-mono">
            {p1Stats.grandTotalVp} - {p2Stats.grandTotalVp}
          </span>
          <button
            onClick={() => setShowLiveStatsModal(true)}
            className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 hover:text-amber-300 transition cursor-pointer"
            title="Live Scoreboard anzeigen"
          >
            <Eye size={20} />
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-600/50 text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      )}

      {/* PRIORITÄTS-MODAL */}
      {showRoundModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-amber-600/40 p-6 rounded-2xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-amber-500 uppercase tracking-wider">
                Start von Runde {currentRound + 1}
              </h3>
              <p className="text-xs text-neutral-400">
                Wer gewinnt den Prioritätswurf und wählt Zug 1?
              </p>
            </div>

            <div className="space-y-3">
              {["player1", "player2"].map((pKey) => {
                const p = players[pKey];
                const isDoubleTurn = pKey === lastTurnPlayerInPrevRound;

                return (
                  <button
                    key={pKey}
                    onClick={() => confirmNextRound(pKey)}
                    className="w-full bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 p-4 rounded-xl text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-neutral-200 group-hover:text-amber-400">
                        {p.name} ({p.faction})
                      </div>
                      <div className="text-xs text-neutral-500">
                        {isDoubleTurn
                          ? "⚡ Doppelzug! (Seizing Initiative - Keine Battle Tactics)"
                          : "Normaler Zug-Wechsel"}
                      </div>
                    </div>
                    <span className="text-xs bg-amber-600/20 text-amber-500 border border-amber-600/30 px-3 py-1 rounded font-bold">
                      Geht 1.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SPIELERKARTEN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {["player1", "player2"].map((pKey) => {
          const p = players[pKey];
          const isCurrentTurn = activeTurnPlayer === pKey;
          const currentRoundScoredRules =
            p.scoredRulesByRound[currentRound] || [];

          const availableStepOptions = [];
          p.chosenCardIds.forEach((cardId) => {
            const cardObj = GHB_30_CARDS.find((c) => c.id === cardId);
            if (!cardObj) return;

            const affrayKey = `${cardId}:::affray`;
            const strikeKey = `${cardId}:::strike`;
            const domKey = `${cardId}:::domination`;

            const hasAffray = p.completedStepKeys.includes(affrayKey);
            const hasStrike = p.completedStepKeys.includes(strikeKey);
            const hasDom = p.completedStepKeys.includes(domKey);

            if (!hasAffray) {
              availableStepOptions.push({
                key: affrayKey,
                cardName: cardObj.name,
                label: "1. Affray Tactic",
              });
            } else if (!hasStrike) {
              availableStepOptions.push({
                key: strikeKey,
                cardName: cardObj.name,
                label: "2. Strike Tactic",
              });
            } else if (!hasDom) {
              availableStepOptions.push({
                key: domKey,
                cardName: cardObj.name,
                label: "3. Domination Tactic",
              });
            }
          });

          return (
            <div
              key={pKey}
              className={`bg-neutral-900 border ${
                isCurrentTurn
                  ? "border-amber-500 shadow-lg shadow-amber-950/30"
                  : "border-neutral-800"
              } rounded-2xl p-6 space-y-6 relative`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xl font-bold text-amber-400">
                    {p.name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {p.faction} • {p.formation}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.isUnderdog && (
                    <span className="bg-amber-600/20 border border-amber-600/50 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      Außenseiter (5 CP)
                    </span>
                  )}
                  <button
                    onClick={() => setActiveTurnPlayer(pKey)}
                    className={`text-xs px-3 py-1 rounded font-bold transition cursor-pointer ${
                      isCurrentTurn
                        ? "bg-amber-500 text-neutral-950"
                        : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {isCurrentTurn ? "Am Zug" : "Wählen"}
                  </button>
                </div>
              </div>

              {/* VICTORY POINTS DISPLAY */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold uppercase text-neutral-400">
                    Victory Points
                  </div>
                  <div className="text-4xl font-extrabold text-amber-500">
                    {p.vp}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateResource(pKey, "vp", -1)}
                    className="bg-neutral-800 p-2 rounded cursor-pointer hover:bg-neutral-700 transition"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    onClick={() => updateResource(pKey, "vp", 1)}
                    className="bg-amber-600 text-neutral-950 p-2 rounded cursor-pointer hover:bg-amber-500 transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* DYNAMISCHE SCORING BUTTONS */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <label className="block text-xs uppercase font-bold text-neutral-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-amber-500" /> Objectives
                    (Runde {currentRound})
                  </span>
                  <span className="text-[10px] text-neutral-500 font-normal">
                    Max. 1x pro Regel/Runde
                  </span>
                </label>
                <div className="space-y-1.5">
                  {currentBpObj?.scoringRules?.map((rule) => {
                    const isDone = currentRoundScoredRules.includes(rule.id);

                    return (
                      <button
                        key={rule.id}
                        onClick={() =>
                          togglePrimaryRulePoints(
                            pKey,
                            rule.id,
                            rule.vp,
                            rule.label
                          )
                        }
                        className={`w-full p-2 rounded text-xs flex justify-between items-center transition border cursor-pointer ${
                          isDone
                            ? "bg-emerald-950/40 border-emerald-600/60 text-emerald-300"
                            : "bg-neutral-950 hover:bg-neutral-800 border-neutral-800 hover:border-amber-500/50 text-neutral-200"
                        }`}
                      >
                        <span className="truncate pr-2 text-left flex items-center gap-1.5">
                          {isDone ? (
                            <Check
                              size={14}
                              className="text-emerald-400 shrink-0"
                            />
                          ) : (
                            "•"
                          )}
                          <span
                            className={isDone ? "line-through opacity-80" : ""}
                          >
                            {rule.label}
                          </span>
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded shrink-0 ${
                            isDone
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isDone ? "Erfüllt ✓" : `+${rule.vp} VP`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RESSOURCEN */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-center gap-1">
                    <Shield size={10} /> CP
                  </div>
                  <div className="text-lg font-bold text-amber-400 my-1">
                    {p.cp}
                  </div>
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => updateResource(pKey, "cp", -1)}
                      className="bg-neutral-800 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-neutral-700"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateResource(pKey, "cp", 1)}
                      className="bg-amber-600 text-neutral-950 px-2 py-0.5 rounded text-xs font-bold cursor-pointer hover:bg-amber-500"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-center gap-1">
                    <Flame size={10} className="text-red-500" /> Fury
                  </div>
                  <div className="text-lg font-bold text-red-500 my-1">
                    {p.furyLevel}
                  </div>
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => updateResource(pKey, "furyLevel", -1)}
                      className="bg-neutral-800 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-neutral-700"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateResource(pKey, "furyLevel", 1)}
                      className="bg-amber-600 text-neutral-950 px-2 py-0.5 rounded text-xs font-bold cursor-pointer hover:bg-amber-500"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 text-center">
                  <div className="text-[10px] uppercase font-bold text-neutral-400">
                    Rage Dice
                  </div>
                  <div className="text-lg font-bold text-amber-500 my-1">
                    {p.rageDice}
                  </div>
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => updateResource(pKey, "rageDice", -1)}
                      className="bg-neutral-800 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-neutral-700"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateResource(pKey, "rageDice", 1)}
                      className="bg-amber-600 text-neutral-950 px-2 py-0.5 rounded text-xs font-bold cursor-pointer hover:bg-amber-500"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* SEQUENZIELLE STUFEN-AUSWAHL */}
              <div className="space-y-2">
                <label className="block text-xs uppercase font-bold text-neutral-400">
                  Battle Tactic Stufe Wählen (+5 VP)
                </label>
                <select
                  value={p.currentSelectedStepKey}
                  onChange={(e) =>
                    setPlayers({
                      ...players,
                      [pKey]: { ...p, currentSelectedStepKey: e.target.value },
                    })
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs rounded-lg p-2.5 text-neutral-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Freigeschaltete Taktik wählen --</option>
                  {availableStepOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      [{opt.cardName}] {opt.label}
                    </option>
                  ))}
                </select>

                {p.currentSelectedStepKey && (
                  <button
                    onClick={() => completeStep(pKey)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded uppercase text-xs transition cursor-pointer"
                  >
                    Erfüllt (+5 VP)
                  </button>
                )}
              </div>

              {/* ERFÜLLTE STUFEN */}
              <div className="border-t border-neutral-800 pt-4">
                <div className="text-[11px] font-bold uppercase text-neutral-500 mb-2">
                  Abgeschlossene Taktiken ({p.completedStepKeys.length}/6)
                </div>
                <div className="space-y-1">
                  {p.completedStepKeys.length === 0 ? (
                    <span className="text-xs text-neutral-600 italic">
                      Noch keine absolviert
                    </span>
                  ) : (
                    p.completedStepKeys.map((stepKey, idx) => {
                      const [cId, sType] = stepKey.split(":::");
                      const cObj = GHB_30_CARDS.find((c) => c.id === cId);
                      return (
                        <div
                          key={idx}
                          className="bg-neutral-950 border border-amber-600/30 text-amber-400 text-xs px-3 py-1 rounded flex justify-between"
                        >
                          <span>
                            {cObj?.name} - {sType.toUpperCase()}
                          </span>
                          <span className="font-bold text-emerald-400">
                            +5 VP
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RUNDEN NAVIGATION (UNTEN) */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-800 mt-6 gap-2">
        <button
          onClick={handlePreviousRound}
          disabled={currentRound === 1}
          className="px-3 sm:px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-xl text-xs font-bold text-neutral-300 flex items-center gap-1 sm:gap-1.5 transition cursor-pointer border border-neutral-700 shrink-0"
        >
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Vorherige Runde</span><span className="sm:hidden">Vorherige</span>
        </button>

        <span className="text-xs sm:text-sm font-black text-amber-500 uppercase tracking-wider sm:tracking-widest font-mono text-center">
          Runde {currentRound} / 5
        </span>

        {currentRound < 5 ? (
          <button
            onClick={() => setShowRoundModal(true)}
            className="px-3.5 sm:px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 rounded-xl text-xs font-black uppercase flex items-center gap-1 sm:gap-1.5 transition shadow-lg cursor-pointer shrink-0"
          >
            <span className="hidden sm:inline">Nächste Runde</span><span className="sm:hidden">Nächste</span> <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => setSetupStep("summary")}
            className="px-3.5 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 sm:gap-1.5 transition shadow-lg cursor-pointer shrink-0"
          >
            <span className="hidden sm:inline">Spiel Beenden</span><span className="sm:hidden">Beenden</span> <Trophy size={16} />
          </button>
        )}
      </div>

      {/* SICHERER LÖSCH-BEREICH */}
      <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-4 text-center">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-neutral-500 hover:text-red-400 text-xs font-bold transition flex items-center gap-1.5 mx-auto cursor-pointer"
          >
            <Trash2 size={14} /> Aktuelles Spiel/Turnier abbrechen & verwerfen
          </button>
        ) : (
          <div className="space-y-3 max-w-sm mx-auto bg-neutral-950 border border-red-900/50 p-4 rounded-xl shadow-xl">
            <p className="text-red-400 text-xs font-extrabold uppercase tracking-wide">
              Möchtest du dieses Spiel wirklich verwerfen? Alle aktuellen Punkte gehen verloren!
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={resetMatch}
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition shadow-md cursor-pointer"
              >
                Ja, verwerfen
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POPUP: LIVE SCORE STATS (AUGE-ICON 👁️) */}
      {showLiveStatsModal && (
        <div
          onClick={() => setShowLiveStatsModal(false)}
          className="fixed inset-0 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-2 space-y-4 shadow-2xl cursor-default"
          >
            {renderAosTabletopScorecard()}
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowLiveStatsModal(false)}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-2.5 rounded-xl text-xs uppercase transition cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: IMAGE SAVE MODAL FOR MOBILE */}
      {shareImageUrl && (
        <div
          onClick={() => {
            setShareImageUrl(null);
            setShareFile(null);
          }}
          className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-55 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl cursor-default text-center"
          >
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">
                Bild speichern / teilen
              </h3>
              <button onClick={() => {
                setShareImageUrl(null);
                setShareFile(null);
              }} className="text-neutral-400 hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-[11px] text-neutral-300 leading-normal font-medium">
              📱 <strong>Handy / Tablet</strong>: Halte das Bild gedrückt, um es in deinen Fotos zu sichern oder direkt zu teilen.
            </p>
            
            <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 p-2 max-h-[60vh] overflow-y-auto">
              <img
                src={shareImageUrl}
                alt="AoS Match Scorecard"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>

            {navigator.share && shareFile && (
              <button
                onClick={async () => {
                  try {
                    await navigator.share({
                      files: [shareFile],
                      title: "AoS Match Scorecard",
                      text: `${players.player1.name} vs ${players.player2.name}`,
                    });
                  } catch (shareErr) {
                    console.error("Sharing failed:", shareErr);
                  }
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-2.5 rounded-xl text-xs uppercase transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <Share2 size={16} /> Grafik Teilen
              </button>
            )}
            
            <button
              onClick={() => {
                setShareImageUrl(null);
                setShareFile(null);
              }}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-2.5 rounded-xl text-xs uppercase transition cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
