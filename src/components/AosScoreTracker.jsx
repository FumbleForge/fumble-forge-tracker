import React, { useState } from "react";
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
  Layers,
  MapPin,
  Trophy,
  RotateCcw,
  Award,
} from "lucide-react";
import { supabase } from "../supabaseClient";

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

const FACTION_CATALOG = {
  // Order
  "Cities of Sigmar": ["Standard Formation 1", "Standard Formation 2"],
  "Daughters of Khaine": [
    "Slaughter Troupe",
    "Shadow Patrol",
    "Scathcoven",
    "Cauldron Guard",
  ],
  "Fyreslayers": ["Standard Formation 1", "Standard Formation 2"],
  "Idoneth Deepkin": ["Standard Formation 1", "Standard Formation 2"],
  "Kharadron Overlords": ["Standard Formation 1", "Standard Formation 2"],
  "Lumineth Realm-lords": ["Standard Formation 1", "Standard Formation 2"],
  "Seraphon": ["Standard Formation 1", "Standard Formation 2"],
  "Stormcast Eternals": [
    "Lightning Echelon",
    "Thunderhead Host",
    "Vanguard Wing",
    "Hammerhand Vanguard",
  ],
  "Sylvaneth": [
    "Outcast Stem",
    "Lords of the Clan",
    "Free Spirits",
    "Forest Folk",
  ],

  // Chaos
  "Beasts of Chaos": ["Standard Formation 1", "Standard Formation 2"],
  "Blades of Khorne": ["Standard Formation 1", "Standard Formation 2"],
  "Disciples of Tzeentch": ["Standard Formation 1", "Standard Formation 2"],
  "Hedonites of Slaanesh": ["Standard Formation 1", "Standard Formation 2"],
  "Helmsmiths of Hashut": ["Standard Formation 1", "Standard Formation 2"],
  "Maggotkin of Nurgle": ["Standard Formation 1", "Standard Formation 2"],
  "Skaven": [
    "Warpcog Enginecluster",
    "Fleshmeld Menagerie",
    "Claw-horde",
    "Noxious Brotherhood",
  ],
  "Slaves to Darkness": [
    "God-sworn Champions",
    "Despoilers",
    "Ruinous Cabal",
    "Legion of Chaos",
  ],

  // Death
  "Flesh-eater Courts": ["Standard Formation 1", "Standard Formation 2"],
  "Nighthaunt": ["Standard Formation 1", "Standard Formation 2"],
  "Ossiarch Bonereapers": ["Standard Formation 1", "Standard Formation 2"],
  "Soulblight Gravelords": ["Standard Formation 1", "Standard Formation 2"],

  // Destruction
  "Bonesplitterz": ["Standard Formation 1", "Standard Formation 2"],
  "Gloomspite Gitz": ["Standard Formation 1", "Standard Formation 2"],
  "Ironjawz": ["Standard Formation 1", "Standard Formation 2"],
  "Kruleboyz": ["Standard Formation 1", "Standard Formation 2"],
  "Ogor Mawtribes": ["Standard Formation 1", "Standard Formation 2"],
  "Sons of Behemat": ["Standard Formation 1", "Standard Formation 2"],
  "Orruk Warclans": [
    "Ironfist",
    "Kruleboyz Fasta",
    "Big Waaagh! Tribe",
    "Bonesplitterz Stampede",
  ],

  // Other
  "Endless Spells": ["Standard Formation 1", "Standard Formation 2"],
  
  "Andere Fraktion": ["Standard Formation 1", "Standard Formation 2"],
};

export default function AosScoreTracker({ currentUser }) {
  const [setupStep, setSetupStep] = useState("roster"); // 'roster' -> 'terrain' -> 'playing' -> 'summary'
  const [selectedBattleplanId, setSelectedBattleplanId] = useState(
    TERRAIN_BATTLEPLANS[0].id
  );

  const [currentRound, setCurrentRound] = useState(1);
  const [activeTurnPlayer, setActiveTurnPlayer] = useState("player1");
  const [lastTurnPlayerInPrevRound, setLastTurnPlayerInPrevRound] =
    useState("player2");
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [turnHistory, setTurnHistory] = useState([]);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [players, setPlayers] = useState({
    player1: {
      name: "Spieler 1",
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
      name: "Spieler 2",
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
  });

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
      const matchData = {
        user_id: currentUser.id,
        player1_name: `${players.player1.name} (${players.player1.faction})`,
        player2_name: `${players.player2.name} (${players.player2.faction})`,
        player1_vp: players.player1.vp,
        player2_vp: players.player2.vp,
        rounds_played: currentRound,
        winner_name: winner,
        details: {
          battleplan: activeBp?.name,
          player1_formation: players.player1.formation,
          player2_formation: players.player2.formation,
          player1_cards: players.player1.chosenCardIds,
          player2_cards: players.player2.chosenCardIds,
          history: turnHistory,
        },
      };

      const { error } = await supabase.from("matches").insert([matchData]);

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Fehler beim Speichern des Matches.");
    } finally {
      setSaving(false);
    }
  };

  const resetMatch = () => {
    setSetupStep("roster");
    setCurrentRound(1);
    setActiveTurnPlayer("player1");
    setLastTurnPlayerInPrevRound("player2");
    setTurnHistory([]);
    setPlayers((prev) => ({
      player1: {
        ...prev.player1,
        vp: 0,
        cp: 4,
        completedStepKeys: [],
        currentSelectedStepKey: "",
        isUnderdog: false,
        scoredRulesByRound: {},
      },
      player2: {
        ...prev.player2,
        vp: 0,
        cp: 4,
        completedStepKeys: [],
        currentSelectedStepKey: "",
        isUnderdog: false,
        scoredRulesByRound: {},
      },
    }));
  };

  if (setupStep === "roster") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans">
        <header className="border-b border-amber-600/30 pb-4">
          <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <Swords className="text-amber-500" /> Match Setup (Roster &
            Taktiken)
          </h2>
          <p className="text-xs text-neutral-400">
            Wähle Fraktion, Formation und 2 Battle Tactics pro Spieler
          </p>
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
                  Spieler {idx + 1} Konfiguration
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-neutral-400 mb-1">
                    Spielername
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
                    {Object.keys(FACTION_CATALOG).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
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
      <div className="max-w-xl mx-auto space-y-6 font-sans py-8">
        <div className="bg-neutral-900 border border-amber-600/40 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <MapPin className="mx-auto text-amber-500" size={32} />
            <h2 className="text-xl font-extrabold text-amber-500 uppercase tracking-widest">
              Terrain Location / Battleplan
            </h2>
            <p className="text-xs text-neutral-400">
              Wähle das Szenario aus den 12 offiziellen GHB Terrain Locations
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
                  {activeBp.scoringRules.map((rule) => (
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
            onClick={() => setSetupStep("playing")}
            className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-extrabold py-3.5 rounded-xl uppercase text-sm tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/30"
          >
            <Swords size={18} /> Schlacht Jetzt Starten!
          </button>
        </div>
      </div>
    );
  }

  // SCHRITT 4: ERGEBNIS & MATCH SUMMARY SCREEN
  if (setupStep === "summary") {
    const activeBp = TERRAIN_BATTLEPLANS.find(
      (b) => b.id === selectedBattleplanId
    );

    const p1 = players.player1;
    const p2 = players.player2;

    const isTie = p1.vp === p2.vp;
    const winnerName = p1.vp > p2.vp ? p1.name : p2.name;
    const winnerFaction = p1.vp > p2.vp ? p1.faction : p2.faction;

    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans py-6">
        <div className="bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-amber-500/50 rounded-2xl p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-amber-500 shadow-[0_0_15px_#f59e0b]"></div>

          <Trophy size={48} className="mx-auto text-amber-400 animate-bounce" />

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Match Ergebnis
            </span>
            <h1 className="text-3xl font-black text-amber-400 uppercase tracking-wider">
              {isTie ? "Unentschieden!" : `${winnerName} Siegt!`}
            </h1>
            {!isTie && (
              <p className="text-xs font-bold text-amber-500/80">
                {winnerFaction}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto bg-neutral-950/80 border border-neutral-800 p-4 rounded-xl">
            <div className="border-r border-neutral-800 pr-2">
              <div className="text-sm font-bold text-neutral-200">
                {p1.name}
              </div>
              <div className="text-xs text-neutral-500">{p1.faction}</div>
              <div className="text-4xl font-black text-amber-500 mt-1">
                {p1.vp}{" "}
                <span className="text-xs text-neutral-500 font-normal">VP</span>
              </div>
            </div>
            <div className="pl-2">
              <div className="text-sm font-bold text-neutral-200">
                {p2.name}
              </div>
              <div className="text-xs text-neutral-500">{p2.faction}</div>
              <div className="text-4xl font-black text-amber-500 mt-1">
                {p2.vp}{" "}
                <span className="text-xs text-neutral-500 font-normal">VP</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-neutral-400 flex justify-center gap-4">
            <span>
              Battleplan:{" "}
              <strong className="text-amber-400">{activeBp?.name}</strong>
            </span>
            <span>•</span>
            <span>
              Gespielte Runden:{" "}
              <strong className="text-amber-400">{currentRound} / 5</strong>
            </span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <Award size={18} /> Runden-Protokoll & Verlauf
          </h3>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((rNum) => {
              const roundLogs = turnHistory.filter((l) => l.round === rNum);
              if (roundLogs.length === 0) return null;

              return (
                <div
                  key={rNum}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3"
                >
                  <div className="text-xs font-black text-amber-400 uppercase tracking-wider border-b border-neutral-800 pb-1 flex justify-between">
                    <span>Runde {rNum}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[p1, p2].map((pObj) => {
                      const pLogs = roundLogs.filter(
                        (l) => l.player === pObj.name
                      );

                      return (
                        <div
                          key={pObj.name}
                          className="bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/80 space-y-1.5"
                        >
                          <div className="text-xs font-bold text-neutral-200">
                            {pObj.name}
                          </div>
                          {pLogs.length === 0 ? (
                            <div className="text-[11px] text-neutral-600 italic">
                              Keine VP erzielt
                            </div>
                          ) : (
                            pLogs.map((l, lIdx) => (
                              <div
                                key={lIdx}
                                className="text-[11px] text-neutral-300 flex justify-between"
                              >
                                <span>• {l.action}</span>
                              </div>
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSaveMatch}
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg"
          >
            {saveSuccess ? <Check size={18} /> : <Save size={18} />}
            {saving
              ? "Speichert..."
              : saveSuccess
              ? "Erfolgreich Gespeichert!"
              : "Match Speichern"}
          </button>

          <button
            onClick={resetMatch}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-3.5 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition border border-neutral-700"
          >
            <RotateCcw size={18} /> Neues Match Starten
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

  // SCHRITT 3: PLAYING / SCORING (OHNE ABSCHLUSS-SCREEN BUTTON)
  const currentBpObj = TERRAIN_BATTLEPLANS.find(
    (b) => b.id === selectedBattleplanId
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-center border-b border-amber-600/30 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <Swords className="text-amber-500" /> AoS GHB Score Tracker
          </h2>
          <p className="text-xs text-neutral-400">
            {players.player1.faction} vs. {players.player2.faction} •{" "}
            <span className="text-amber-400 font-bold">
              {currentBpObj?.name}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-5 py-2 rounded-xl">
            <span className="text-xs uppercase font-bold text-neutral-400">
              Runde
            </span>
            <span className="text-2xl font-black text-amber-500">
              {currentRound} / 5
            </span>
            <button
              onClick={() => {
                if (currentRound >= 5) {
                  setSetupStep("summary");
                } else {
                  setShowRoundModal(true);
                }
              }}
              className="bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold px-3 py-1 rounded text-xs transition flex items-center gap-1"
            >
              {currentRound >= 5 ? "Match Beenden" : "Nächste Runde"}{" "}
              <ArrowRight size={14} />
            </button>
          </div>
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
                    className="w-full bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 p-4 rounded-xl text-left transition flex items-center justify-between group"
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
                    className={`text-xs px-3 py-1 rounded font-bold transition ${
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
                    className="bg-neutral-800 p-2 rounded"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    onClick={() => updateResource(pKey, "vp", 1)}
                    className="bg-amber-600 text-neutral-950 p-2 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* DYNAMISCHE SCORING BUTTONS FÜR DEN GEWÄHLTEN BATTLEPLAN */}
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
                  {currentBpObj?.scoringRules.map((rule) => {
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
                        className={`w-full p-2 rounded text-xs flex justify-between items-center transition border ${
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
                      className="bg-neutral-800 px-2 py-0.5 rounded text-xs"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateResource(pKey, "cp", 1)}
                      className="bg-amber-600 text-neutral-950 px-2 py-0.5 rounded text-xs font-bold"
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
                      className="bg-neutral-800 px-2 py-0.5 rounded text-xs"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateResource(pKey, "furyLevel", 1)}
                      className="bg-amber-600 text-neutral-950 px-2 py-0.5 rounded text-xs font-bold"
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
                      className="bg-neutral-800 px-2 py-0.5 rounded text-xs"
                    >
                      -
                    </button>
                    <button
                      onClick={() => updateResource(pKey, "rageDice", 1)}
                      className="bg-amber-600 text-neutral-950 px-2 py-0.5 rounded text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* SEQUENZIELLE STUFEN-AUSWAHL DROPDOWN */}
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
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded uppercase text-xs transition"
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

      {/* TURN HISTORIE */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
          <Layers size={16} className="text-amber-500" /> Turn Protokoll &
          Historie
        </h3>

        {turnHistory.length === 0 ? (
          <div className="text-xs text-neutral-500 italic">
            Noch keine Ereignisse in dieser Schlacht aufgezeichnet.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {turnHistory.map((log, idx) => (
              <div
                key={idx}
                className="bg-neutral-950 border border-neutral-800/80 p-2.5 rounded-lg text-xs flex justify-between items-center"
              >
                <span className="text-amber-500 font-bold">
                  Runde {log.round}
                </span>
                <span className="text-neutral-300 font-medium">
                  {log.player}
                </span>
                <span className="text-neutral-400">{log.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}