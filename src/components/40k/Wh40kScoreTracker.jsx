import React, { useState, useEffect, useRef } from 'react';
import { Map, Dice5, Eye, ArrowRight, ArrowLeft, Check, X, Shield, Swords, Target, Plus, Minus, Trophy, Save, Trash2, Download } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import html2canvas from 'html2canvas';

// Daten-Layer
import forceDispositionsData from '../../data/40k/force-dispositions.json';
import missionsData from '../../data/40k/missions.json';
import missionMatchupsData from '../../data/40k/mission-matchups.json';
import factionsData from '../../data/40k/factions.json';
import terrainLayoutsData from '../../data/40k/terrain-layouts.json';
import deploymentPatternsData from '../../data/40k/deployment-patterns.json';
import terrainPiecesData from '../../data/40k/terrain-pieces.json';
import secondaryCardsData from '../../data/40k/secondary-cards.json';

// Engine-Layer
import { resolveLayout, computeKeystoneMeasurements, BOARD_INCHES } from '../../utils/40k/terrainResolver';

// 11th Edition Mission Rules
const MISSION_RULES = [
  { id: 'none', num: 1, name: 'None', desc: 'Standard tournament play without additional environmental rule.' },
  { id: 'nowhere-to-hide', num: 2, name: 'Nowhere to Hide', desc: 'Units do not receive the Benefit of Cover unless wholly within terrain.' },
  { id: 'mirrored-world', num: 3, name: 'Mirrored World', desc: 'Battlefield conditions and secondary parameters are mirrored.' },
  { id: 'scrambled-communications', num: 4, name: 'Scrambled Communications', desc: 'Stratagem CP costs and targeting ranges are restricted.' },
  { id: 'martial-trade', num: 5, name: 'Martial Trade', desc: 'Destroying enemy units yields immediate tactical VP or CP trades.' },
  { id: 'ruinscape', num: 6, name: 'Ruinscape', desc: 'Dense industrial ruins impose difficult ground and movement modifiers.' },
  { id: 'night-fighting', num: 7, name: 'Night Fighting', desc: 'Ranged attacks beyond 18" suffer hit roll penalties in early battle rounds.' }
];

// VOLLSTÄNDIGER TRIGGER-KATALOG ALLER 25 PRIMÄRMISSIONEN
const PRIMARY_MISSIONS_CATALOG = {
  "battlefield-dominance": {
    name: "Battlefield Dominance",
    text: "Take-and-Hold mirror. The first two battle rounds reward holding the objective majority at end of turn. From the second battle round, scoring shifts to per-objective control at the end of your Command phase, with a bonus on non-home while holding home.",
    triggers: [
      { key: "majority_r12", label: "Hold Objective Majority", vp: 2, timing: "End of Your Turn (R1-R2)", roundMin: 1, roundMax: 2 },
      { key: "control_obj", label: "Control 1+ Objectives (3 VP per Obj)", vp: 3, timing: "End of Command Phase", roundMin: 2 },
      { key: "home_and_nonhome", label: "Hold Home & Non-Home Objective (Bonus +2 VP)", vp: 2, timing: "End of Command Phase", roundMin: 2 }
    ]
  },
  "determined-acquisition": {
    name: "Determined Acquisition",
    text: "Take-and-Hold against Disruption. Every turn pays per objective taken this turn that you did not control at start. From round 2, per-objective control pays at Command phase with bonus in enemy territory.",
    triggers: [
      { key: "seized_new", label: "Seized New Objective this turn (2 VP per Obj)", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "control_obj", label: "Control 1+ Objectives (3 VP per Obj)", vp: 3, timing: "End of Command Phase", roundMin: 2 },
      { key: "enemy_terr", label: "Control Objective in Enemy Territory (Bonus +3 VP)", vp: 3, timing: "End of Command Phase", roundMin: 2 }
    ]
  },
  "immovable-object": {
    name: "Immovable Object",
    text: "Take-and-Hold against Purge-the-Foe. Central control pays every turn. Battle rounds 2-4 pay per non-home objective at Command phase; round 5 pays at end of turn.",
    triggers: [
      { key: "central_hold", label: "Control 1+ Central Objectives", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_r24", label: "Control 1+ Non-Home Objectives (5 VP per Obj)", vp: 5, timing: "End of Command Phase", roundMin: 2, roundMax: 4 },
      { key: "non_home_r5", label: "Control 1+ Non-Home Objectives (5 VP per Obj)", vp: 5, timing: "End of Your Turn (BR 5)", roundMin: 5 }
    ]
  },
  "inescapable-dominion": {
    name: "Inescapable Dominion",
    text: "Take-and-Hold against Priority-Assets. Holding 3+ objectives pays at end of turn. From round 2, Command phase pays for holding 2+ and majority. End of battle pays for opponent home.",
    triggers: [
      { key: "hold_3", label: "Control 3+ Objectives", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "hold_2_cmd", label: "Control 2+ Objectives", vp: 5, timing: "End of Command Phase", roundMin: 2 },
      { key: "majority_cmd", label: "Hold Objective Majority", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "opp_home_end", label: "Control Opponent's Home Objective", vp: 5, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "purge-and-secure": {
    name: "Purge and Secure",
    text: "Take-and-Hold against Reconnaissance. End of turn pays when a kill touched objectives. From round 2, non-home control pays at Command phase, and new non-home objectives pay at end of turn.",
    triggers: [
      { key: "kill_on_obj", label: "Destroyed Enemy Unit on/from Objective", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives (4 VP per Obj)", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "new_non_home", label: "Seized New Non-Home Objective this turn", vp: 3, timing: "End of Your Turn", roundMin: 2 }
    ]
  },
  "unstoppable-force": {
    name: "Unstoppable Force",
    text: "Purge-the-Foe against Take-and-Hold. Destroying any enemy unit pays at end of turn. From round 2, non-home control pays at Command phase, new non-home pays at end of turn. End of battle rewards central control.",
    triggers: [
      { key: "kill_1", label: "1+ Enemy Units Destroyed this turn", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives (4 VP per Obj)", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "new_non_home", label: "Seized New Non-Home Objective this turn", vp: 3, timing: "End of Your Turn", roundMin: 2 },
      { key: "central_end", label: "Control 1+ Central Objectives", vp: 5, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "punishment": {
    name: "Punishment",
    text: "Purge-the-Foe against Disruption. Condemn enemy units. Condemned unit destroyed pays on either turn. Command phase pays for non-home and majority. End of battle pays for opponent home.",
    triggers: [
      { key: "condemned_kill", label: "Condemned Enemy Unit Destroyed", vp: 5, timing: "End of Either Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "majority_cmd", label: "Hold Objective Majority", vp: 5, timing: "End of Command Phase", roundMin: 2 },
      { key: "opp_home_end", label: "Control Opponent's Home Objective", vp: 8, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "meatgrinder": {
    name: "Meatgrinder",
    text: "Purge-the-Foe mirror. Destroying enemy unit pays. Command phase pays for non-home. End of turn pays for out-killing opponent and holding opponent home.",
    triggers: [
      { key: "kill_1", label: "1+ Enemy Units Destroyed this turn", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "outkill_opp", label: "Destroyed More Enemy Units than Lost Last Turn", vp: 5, timing: "End of Your Turn", roundMin: 2 },
      { key: "opp_home_turn", label: "Control Opponent's Home Objective", vp: 5, timing: "End of Your Turn", roundMin: 2 }
    ]
  },
  "destroyers-wrath": {
    name: "Destroyer's Wrath",
    text: "Purge-the-Foe against Priority-Assets. Kills pay at end of turn. Command phase pays for non-home and majority. End of turn pays for out-killing opponent.",
    triggers: [
      { key: "kill_1", label: "1+ Enemy Units Destroyed this turn", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "majority_cmd", label: "Hold Objective Majority", vp: 6, timing: "End of Command Phase", roundMin: 2 },
      { key: "outkill_opp", label: "Destroyed More Enemy Units than Lost Last Turn", vp: 4, timing: "End of Your Turn", roundMin: 2 }
    ]
  },
  "consecrate": {
    name: "Consecrate",
    text: "Purge-the-Foe against Reconnaissance. Consecrate non-home objectives after kills. Command phase pays for non-home and majority. End of battle pays for consecrated enemy home.",
    triggers: [
      { key: "consecrate_tier1", label: "1-2 Consecrated Objectives", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "consecrate_tier2", label: "3+ Consecrated Objectives", vp: 6, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "majority_cmd", label: "Hold Objective Majority", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "opp_home_end", label: "Opponent Home Objective Consecrated", vp: 5, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "death-trap": {
    name: "Death Trap",
    text: "Disruption against Take-and-Hold. Booby trap terrain areas. Kills in trapped terrain pay. Command phase pays for non-home.",
    triggers: [
      { key: "trap_area", label: "1+ Terrain Areas Trapped this turn (2 VP per Area)", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "trap_obj", label: "Trapped Terrain is an Objective (Bonus +3 VP)", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "kill_in_trap", label: "Enemy Unit in Trapped Terrain Destroyed", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 }
    ]
  },
  "outmanoeuvre": {
    name: "Outmanoeuvre",
    text: "Disruption mirror. Holding opponent home pays 10 VP. Non-home control escalates from R1 (4 VP) to R2-R3 (5 VP) to R4+ (6 VP).",
    triggers: [
      { key: "opp_home_turn", label: "Control Opponent's Home Objective", vp: 10, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_r1", label: "Control 1+ Non-Home Objectives (4 VP per Obj)", vp: 4, timing: "End of Your Turn (BR 1)", roundMin: 1, roundMax: 1 },
      { key: "non_home_r23", label: "Control 1+ Non-Home Objectives (5 VP per Obj)", vp: 5, timing: "End of Command Phase", roundMin: 2, roundMax: 3 },
      { key: "non_home_r45", label: "Control 1+ Non-Home Objectives (6 VP per Obj)", vp: 6, timing: "End of Your Turn (BR 4-5)", roundMin: 4 }
    ]
  },
  "delaying-action": {
    name: "Delaying Action",
    text: "Disruption against Purge-the-Foe. Enemy kills pay. Command phase pays for non-home. End of turn pays for holding both a central and expansion objective.",
    triggers: [
      { key: "kill_per_unit", label: "Enemy Units Destroyed this turn (2 VP per Unit)", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "central_and_exp", label: "Control 1+ Central AND 1+ Expansion Objective", vp: 3, timing: "End of Your Turn", roundMin: 2 }
    ]
  },
  "locate-and-deny": {
    name: "Locate and Deny",
    text: "Disruption against Priority-Assets. Sweep markers and kill units on objectives. Command phase pays for non-home.",
    triggers: [
      { key: "kill_on_obj", label: "Enemy Unit on Objective Destroyed", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "one_marker_left", label: "Down to 1 Marker (Friendly Unit Alone in Terrain)", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "one_marker_end", label: "Down to 1 Marker (Friendly Unit Alone in Terrain - End)", vp: 5, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "smoke-and-mirrors": {
    name: "Smoke and Mirrors",
    text: "Disruption against Reconnaissance. Decoy objectives. Decoyed objectives pay with bonus in enemy territory. Command phase pays for non-home. End of battle pays for 4+ decoys.",
    triggers: [
      { key: "decoy_obj", label: "1+ Decoyed Objectives (2 VP per Obj)", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "decoy_enemy_terr", label: "Decoyed Objective in Enemy Territory (Bonus +2 VP)", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "decoys_4plus_end", label: "4+ Objectives Decoyed", vp: 10, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "secure-asset": {
    name: "Secure Asset",
    text: "Priority-Assets against Take-and-Hold. Complete Secure Asset action. Kills on central objectives pay. Command phase pays for non-home and 3+ objectives.",
    triggers: [
      { key: "secure_action", label: "Secure Asset Action Completed", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "central_kill", label: "Enemy Unit on Central Objective Destroyed", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "hold_3_cmd", label: "Control 3+ Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 }
    ]
  },
  "extract-relic": {
    name: "Extract Relic",
    text: "Priority-Assets against Disruption. Sweep enemy markers and score kills on objectives. Command phase pays for non-home.",
    triggers: [
      { key: "sweep_action", label: "Sensor Sweep Action Completed", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "kill_on_obj", label: "Enemy Unit on Objective Destroyed", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "opp_one_marker", label: "Opponent down to 1 Marker (Friendly Unit Alone)", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "opp_one_marker_end", label: "Opponent down to 1 Marker (Friendly Unit Alone - End)", vp: 5, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "vital-link": {
    name: "Vital Link",
    text: "Priority-Assets against Purge-the-Foe. Maintain Control on central objectives. Command phase pays for non-home with bonus for central. End of battle pays for opponent home.",
    triggers: [
      { key: "central_hold", label: "Control 1+ Central Objectives", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "marker_on_central", label: "Operation Marker on Controlled Central Objective (+1 VP)", vp: 1, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "central_cmd_bonus", label: "Control 1+ Central Objectives (Bonus +4 VP)", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "opp_home_end", label: "Control Opponent's Home Objective", vp: 10, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "sabotage": {
    name: "Sabotage",
    text: "Priority-Assets mirror. Sabotage non-home objectives with bonus in enemy territory. Command phase pays for non-home.",
    triggers: [
      { key: "sabotage_action", label: "Sabotage Action Completed (3 VP per Unit)", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "sabotage_enemy_terr", label: "Sabotaged Objective in Enemy Territory (Bonus +2 VP)", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 }
    ]
  },
  "vanguard-operation": {
    name: "Vanguard Operation",
    text: "Priority-Assets against Reconnaissance. Complete Vanguard Operation action in enemy territory. Enemy kills pay. Command phase pays for non-home. End of battle pays for opponent home.",
    triggers: [
      { key: "vanguard_action", label: "Vanguard Operation Action Completed", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "kill_1", label: "1+ Enemy Units Destroyed this turn", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "opp_home_end", label: "Control Opponent's Home Objective", vp: 10, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "reconnaissance-sweep": {
    name: "Reconnaissance Sweep",
    text: "Reconnaissance against Take-and-Hold. Spread units across 3 or 4 quarters. Enemy kills pay. Command phase pays for non-home.",
    triggers: [
      { key: "quarters_3", label: "Friendly Units in 3 Table Quarters", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "quarters_4", label: "Friendly Units in 4 Table Quarters", vp: 6, timing: "End of Your Turn", roundMin: 1 },
      { key: "kill_per_unit", label: "Enemy Units Destroyed this turn (1 VP per Unit)", vp: 1, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 3, timing: "End of Command Phase", roundMin: 2 }
    ]
  },
  "surveil-the-foe": {
    name: "Surveil the Foe",
    text: "Reconnaissance against Disruption. Clear enemy markers and surveil units. Command phase pays for non-home and majority. End of turn pays when all enemy markers cleared.",
    triggers: [
      { key: "surveil_unit", label: "1+ Surveilled Enemy Units this turn", vp: 4, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "majority_cmd", label: "Hold Objective Majority", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "markers_cleared", label: "No Opponent Operation Markers on Battlefield", vp: 5, timing: "End of Your Turn", roundMin: 2 }
    ]
  },
  "triangulation": {
    name: "Triangulation",
    text: "Reconnaissance against Purge-the-Foe. Triangulate non-home objectives from round 2. Command phase pays for non-home. End of battle pays for 4+ objectives.",
    triggers: [
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "triangulate_1", label: "1 Triangulated Objective", vp: 3, timing: "End of Your Turn", roundMin: 2 },
      { key: "triangulate_2", label: "2 Triangulated Objectives", vp: 6, timing: "End of Your Turn", roundMin: 2 },
      { key: "triangulate_3plus", label: "3+ Triangulated Objectives", vp: 10, timing: "End of Your Turn", roundMin: 2 },
      { key: "hold_4_end", label: "Control 4+ Objectives", vp: 10, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "search-and-scour": {
    name: "Search and Scour",
    text: "Reconnaissance against Priority-Assets. Central control pays and kills in terrain pay. Command phase pays for non-home. End of battle pays for keeping your territory clear.",
    triggers: [
      { key: "central_hold", label: "Control 1+ Central Objectives", vp: 3, timing: "End of Your Turn", roundMin: 1 },
      { key: "kill_in_terrain", label: "Enemy Unit in Terrain Destroyed", vp: 2, timing: "End of Your Turn", roundMin: 1 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives (4 VP per Obj)", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "clear_territory_end", label: "No Enemy Units within your Territory", vp: 5, timing: "End of the Battle", roundMin: 5 }
    ]
  },
  "gather-intel": {
    name: "Gather Intel",
    text: "Reconnaissance mirror. First round pays for central control. Extract Intelligence actions pay heavily from round 2. Command phase pays for non-home. End of battle pays for markers.",
    triggers: [
      { key: "central_r1", label: "Control 1+ Central Objectives (BR 1)", vp: 6, timing: "End of Your Turn (BR 1)", roundMin: 1, roundMax: 1 },
      { key: "extract_action", label: "Extract Intelligence Action Completed (7 VP per Action)", vp: 7, timing: "End of Your Turn", roundMin: 2 },
      { key: "non_home_cmd", label: "Control 1+ Non-Home Objectives", vp: 4, timing: "End of Command Phase", roundMin: 2 },
      { key: "markers_3plus_end", label: "3+ Operation Markers on Battlefield", vp: 5, timing: "End of the Battle", roundMin: 5 },
      { key: "opp_home_marker_end", label: "Operation Marker on Opponent Home Objective", vp: 5, timing: "End of the Battle", roundMin: 5 }
    ]
  }
};

// VOLLSTÄNDIGER KATALOG DER 18 SECONDARIES
const SECONDARY_RULES_CATALOG = {
  "assassination": {
    name: "Assassination",
    desc: "Hunt enemy leaders. Fixed play scores per CHARACTER model destroyed (+ bonus for 4+ Wounds). Tactical scores flat 5 VP.",
    getTriggers: (isFixed) => isFixed ? [
      { key: "char_kill", label: "1x Enemy Character Model Destroyed", vp: 3 },
      { key: "char_4w_bonus", label: "Destroyed Character had 4+ Wounds (Bonus)", vp: 1 }
    ] : [
      { key: "tactical_kill", label: "1+ Enemy Character Destroyed this turn (or all dead)", vp: 5 }
    ]
  },
  "a-grievous-blow": {
    name: "A Grievous Blow",
    desc: "Shatter the horde. Score per enemy unit with Starting Strength of 13+ destroyed.",
    getTriggers: (isFixed) => isFixed ? [
      { key: "horde_kill", label: "1x Unit with Starting Strength 13+ Destroyed", vp: 4 }
    ] : [
      { key: "horde_kill", label: "1+ Unit with Starting Strength 13+ Destroyed", vp: 5 }
    ]
  },
  "bring-it-down": {
    name: "Bring It Down",
    desc: "Bring down the big targets. Score per enemy Monster or Vehicle model with 10+ Wounds destroyed.",
    getTriggers: (isFixed) => isFixed ? [
      { key: "monster_veh_kill", label: "1x Monster / Vehicle Model (10+ Wounds) Destroyed", vp: 4 }
    ] : [
      { key: "monster_veh_kill", label: "1+ Monster / Vehicle Model (10+ Wounds) Destroyed", vp: 5 }
    ]
  },
  "engage-on-all-fronts": {
    name: "Engage on All Fronts",
    desc: "Spread your presence across the table quarters (excluding 6\" from center).",
    getTriggers: (isFixed) => isFixed ? [
      { key: "quarters_3", label: "Friendly Units wholly in 3 Table Quarters", vp: 2 },
      { key: "quarters_4", label: "Friendly Units wholly in 4 Table Quarters", vp: 4 }
    ] : [
      { key: "quarters_3", label: "Friendly Units wholly in 3 Table Quarters", vp: 3 },
      { key: "quarters_4", label: "Friendly Units wholly in 4 Table Quarters", vp: 5 }
    ]
  },
  "forward-position": {
    name: "Forward Position",
    desc: "Break through and hold forward ground. Control opponent's home or expansion objective.",
    getTriggers: () => [{ key: "forward_hold", label: "Control Opponent Home and/or Expansion Objective", vp: 5 }]
  },
  "burden-of-trust": {
    name: "Burden of Trust",
    desc: "Guard your objectives with designated friendly units.",
    getTriggers: () => [
      { key: "guard_1", label: "1 Objective Guarded at End of Opponent Turn", vp: 2 },
      { key: "guard_2", label: "2+ Objectives Guarded at End of Opponent Turn", vp: 5 }
    ]
  },
  "display-of-might": {
    name: "Display of Might",
    desc: "Dominate No Man's Land with more units than the opponent.",
    getTriggers: () => [
      { key: "might_your_turn", label: "More Units in No Man's Land (End of Your Turn)", vp: 2 },
      { key: "might_opp_turn", label: "More Units in No Man's Land (End of Opponent Turn)", vp: 5 }
    ]
  },
  "centre-ground": {
    name: "Centre Ground",
    desc: "Own the middle. Hold ground within 3\" or 6\" of battlefield center.",
    getTriggers: () => [
      { key: "center_3in", label: "Friendly Units within 3\" of Center (no enemy in 3\")", vp: 3 },
      { key: "center_6in", label: "No Enemy Units within 6\" of Center", vp: 5 }
    ]
  },
  "outflank": {
    name: "Outflank",
    desc: "Sweep the battlefield flanks outside your own territory.",
    getTriggers: () => [
      { key: "flank_1", label: "Units within 6\" of 1 Battlefield Edge (outside territory)", vp: 3 },
      { key: "flank_2", label: "Units near Opposite Battlefield Edges", vp: 5 }
    ]
  },
  "plunder": {
    name: "Plunder",
    desc: "Strip the field of its prizes. Complete the Plunder action in terrain.",
    getTriggers: () => [{ key: "plunder_done", label: "Plunder Action Completed in Terrain Area", vp: 5 }]
  },
  "secure-no-mans-land": {
    name: "Secure No Man's Land",
    desc: "Seize the middle ground. Control two or more objectives in No Man's Land.",
    getTriggers: () => [{ key: "nml_2obj", label: "Control 2+ Objectives in No Man's Land", vp: 5 }]
  },
  "no-prisoners": {
    name: "No Prisoners",
    desc: "Give no quarter. Score per enemy unit destroyed this turn (max 5 VP).",
    getTriggers: () => [
      { key: "kill_1", label: "1 Enemy Unit Destroyed this turn", vp: 2 },
      { key: "kill_2plus", label: "2+ Enemy Units Destroyed this turn (Max 5 VP)", vp: 5 }
    ]
  },
  "overwhelming-force": {
    name: "Overwhelming Force",
    desc: "Clear objectives by destroying enemy units that started on objectives.",
    getTriggers: () => [
      { key: "obj_kill_1", label: "1 Enemy Unit on Objective Destroyed", vp: 3 },
      { key: "obj_kill_2plus", label: "2+ Enemy Units on Objective Destroyed (Max 5 VP)", vp: 5 }
    ]
  },
  "cleanse": {
    name: "Cleanse",
    desc: "Purify tainted ground. Complete the Cleanse action on non-home objectives.",
    getTriggers: () => [
      { key: "cleanse_1", label: "1 Non-Home Objective Cleansed this turn", vp: 2 },
      { key: "cleanse_2", label: "2+ Non-Home Objectives Cleansed this turn", vp: 5 }
    ]
  },
  "behind-enemy-lines": {
    name: "Behind Enemy Lines",
    desc: "Push into the enemy deployment zone with friendly units.",
    getTriggers: () => [
      { key: "behind_1", label: "1 Unit wholly within enemy deployment zone", vp: 3 },
      { key: "behind_2", label: "2+ Units wholly within enemy deployment zone", vp: 5 }
    ]
  },
  "defend-stronghold": {
    name: "Defend Stronghold",
    desc: "Hold your home objective and keep your deployment zone clear.",
    getTriggers: () => [
      { key: "defend_home", label: "Control your Home Objective", vp: 3 },
      { key: "defend_clear_dz", label: "No Enemy Units in your Deployment Zone (Bonus)", vp: 2 }
    ]
  },
  "a-tempting-target": {
    name: "A Tempting Target",
    desc: "Control the tempting target objective selected by your opponent.",
    getTriggers: () => [{ key: "tempting_hold", label: "Control the Tempting Target Objective", vp: 5 }]
  },
  "beacon": {
    name: "Beacon",
    desc: "Send your designated beacon unit forward into enemy territory.",
    getTriggers: () => [
      { key: "beacon_outside_dz", label: "Beacon Unit on battlefield outside own DZ", vp: 3 },
      { key: "beacon_outside_terr", label: "Beacon Unit on battlefield outside own Territory", vp: 5 }
    ]
  }
};

const FIXED_SECONDARY_OPTIONS = [
  { id: 'assassination', ...SECONDARY_RULES_CATALOG['assassination'] },
  { id: 'a-grievous-blow', ...SECONDARY_RULES_CATALOG['a-grievous-blow'] },
  { id: 'bring-it-down', ...SECONDARY_RULES_CATALOG['bring-it-down'] },
  { id: 'engage-on-all-fronts', ...SECONDARY_RULES_CATALOG['engage-on-all-fronts'] }
];

// SVG MAP RENDERER
function BattlefieldMapSvg({ deploymentPattern, terrainLayout, showMeasurements }) {
  if (!deploymentPattern) return null;

  const boardWidth = deploymentPattern?.board?.width || BOARD_INCHES.width;
  const boardHeight = deploymentPattern?.board?.height || BOARD_INCHES.height;

  const resolved = terrainLayout ? resolveLayout(terrainLayout, terrainPiecesData || []) : [];
  const measurements = showMeasurements ? computeKeystoneMeasurements(resolved, boardWidth, boardHeight) : [];

  const layoutObjectives = terrainLayout?.pieces?.filter(p => p?.is_objective) || [];
  const activeObjectives = layoutObjectives.length > 0
    ? layoutObjectives.map(p => ({
        x: p.position.x,
        y: p.position.y,
        role: p.objective_role || 'expansion',
        linkGroup: p.link_group
      }))
    : (deploymentPattern?.objectives || []).map(o => ({
        x: o.x,
        y: o.y,
        role: (Math.abs(o.x - boardWidth / 2) < 2 && Math.abs(o.y - boardHeight / 2) < 2) ? 'center' : (o.x < 15 || o.x > 45) ? 'home' : 'expansion'
      }));

  const centerObjectives = activeObjectives.filter(o => o.role === 'center');

  return (
    <div className="w-full bg-[#161a20] border-2 border-neutral-700 rounded-2xl overflow-hidden shadow-2xl relative select-none">
      <div className="text-[11px] text-neutral-400 bg-neutral-950 px-4 py-2 border-b border-neutral-800 flex justify-between font-mono font-bold tracking-wider">
        <span>BATTLEFIELD: {boardWidth}" × {boardHeight}"</span>
        <span className="text-amber-500 uppercase">{deploymentPattern?.name || 'Map'}</span>
      </div>

      <div className="p-3 bg-[#111418] flex justify-center">
        <svg viewBox={`-2 -2 ${boardWidth + 4} ${boardHeight + 4}`} className="w-full h-auto max-h-[460px] rounded-lg shadow-inner bg-[#262f3c]">
          <defs>
            <pattern id="grid-1inch" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#333f50" strokeWidth="0.04" />
            </pattern>
            <pattern id="grid-6inch" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="url(#grid-1inch)" />
              <path d="M 6 0 L 0 0 0 6" fill="none" stroke="#415065" strokeWidth="0.12" />
            </pattern>
          </defs>

          <rect x="0" y="0" width={boardWidth} height={boardHeight} fill="url(#grid-6inch)" />
          <rect x="0" y="0" width={boardWidth} height={boardHeight} fill="none" stroke="#4b5563" strokeWidth="0.4" />

          {deploymentPattern?.zones?.map((zone, idx) => {
            const isBlue = zone.color === '#3b82f6' || zone.player === 'defender';
            const fill = isBlue ? 'rgba(49, 130, 206, 0.42)' : 'rgba(229, 62, 62, 0.42)';
            const stroke = isBlue ? '#3182ce' : '#e53e3e';
            if (zone.shape?.type === 'rectangle') {
              return <rect key={`zone-${idx}`} x={zone.position.x} y={zone.position.y} width={zone.shape.width} height={zone.shape.height} fill={fill} stroke={stroke} strokeWidth="0.45" strokeDasharray="1.2, 0.8" />;
            }
            if (zone.shape?.type === 'polygon') {
              const pts = zone.shape.points.map(p => `${zone.position.x + p.x},${zone.position.y + p.y}`).join(' ');
              return <polygon key={`zone-${idx}`} points={pts} fill={fill} stroke={stroke} strokeWidth="0.45" strokeDasharray="1.2, 0.8" />;
            }
            return null;
          })}

          <line x1="0" y1={boardHeight / 2} x2={boardWidth} y2={boardHeight / 2} stroke="#60728a" strokeWidth="0.25" strokeDasharray="1, 1" />
          <line x1={boardWidth / 2} y1="0" x2={boardWidth / 2} y2={boardHeight} stroke="#60728a" strokeWidth="0.25" strokeDasharray="1, 1" />

          {resolved.map((p, pIdx) => {
            const pts = p.vertices.map(v => `${v.x},${v.y}`).join(' ');
            if (p.piece_type === 'area') return <polygon key={`area-${pIdx}`} points={pts} fill="#4e6173" fillOpacity="0.75" stroke="#7d98b0" strokeWidth="0.3" />;
            if (p.piece_type === 'feature') return <g key={`feat-${pIdx}`}><polygon points={pts} fill="#d97706" stroke="#fbbf24" strokeWidth="0.35" />{p.vertices[0] && <circle cx={p.vertices[0].x} cy={p.vertices[0].y} r="0.4" fill="#1e293b" stroke="#fbbf24" strokeWidth="0.15" />}</g>;
            return null;
          })}

          {showMeasurements && centerObjectives.length === 2 && (
            <g>
              <line x1={centerObjectives[0].x} y1={centerObjectives[0].y} x2={centerObjectives[1].x} y2={centerObjectives[1].y} stroke="#38bdf8" strokeWidth="0.35" strokeDasharray="0.8, 0.4" />
              <circle cx={(centerObjectives[0].x + centerObjectives[1].x) / 2} cy={(centerObjectives[0].y + centerObjectives[1].y) / 2} r="1.1" fill="#0284c7" stroke="#ffffff" strokeWidth="0.2" />
              <text x={(centerObjectives[0].x + centerObjectives[1].x) / 2} y={(centerObjectives[0].y + centerObjectives[1].y) / 2 + 0.35} fill="#ffffff" fontSize="0.95" fontWeight="black" fontFamily="sans-serif" textAnchor="middle">9"</text>
            </g>
          )}

          {activeObjectives.map((obj, oIdx) => {
            const isCenter = obj.role === 'center';
            const isHome = obj.role === 'home';
            const isDefenderHome = isHome && obj.x < boardWidth / 2;
            return (
              <g key={`obj-${oIdx}`} transform={`translate(${obj.x}, ${obj.y})`}>
                <circle r="3" fill="rgba(236, 201, 75, 0.16)" stroke="#ecc94b" strokeWidth="0.25" strokeDasharray="0.8, 0.8" />
                <circle r="1.3" fill="#1a202c" stroke="#ecc94b" strokeWidth="0.3" />
                <circle r="1.1" fill={isCenter ? "#0d9488" : isHome ? (isDefenderHome ? "#2563eb" : "#dc2626") : "#059669"} />
                {isCenter && <g fill="#ffffff"><circle r="0.45" fill="#ffffff" /><circle r="0.2" fill="#0d9488" /></g>}
                {isHome && <g fill="#ffffff"><rect x="-0.4" y="-0.2" width="0.8" height="0.6" rx="0.1" /><rect x="-0.4" y="-0.5" width="0.2" height="0.3" /><rect x="-0.1" y="-0.5" width="0.2" height="0.3" /><rect x="0.2" y="-0.5" width="0.2" height="0.3" /></g>}
                {!isCenter && !isHome && <g fill="#ffffff"><polygon points="0,-0.6 0.6,0 0,0.6 -0.6,0" /><circle r="0.2" fill="#059669" /></g>}
              </g>
            );
          })}

          {showMeasurements && measurements.map((m, mIdx) => {
            const badgeX = m.axis === 'x' ? (m.from.x + m.target.x) / 2 : m.target.x;
            const badgeY = m.axis === 'y' ? (m.from.y + m.target.y) / 2 : m.target.y;
            return (
              <g key={`meas-${mIdx}`}>
                <line x1={m.from.x} y1={m.from.y} x2={m.target.x} y2={m.target.y} stroke="#ef4444" strokeWidth="0.3" strokeDasharray="0.8, 0.4" />
                <circle cx={badgeX} cy={badgeY} r="1.1" fill="#dc2626" stroke="#ffffff" strokeWidth="0.2" />
                <text x={badgeX} y={badgeY + 0.35} fill="#ffffff" fontSize="0.95" fontWeight="black" fontFamily="sans-serif" textAnchor="middle">{m.distance}</text>
                <circle cx={m.target.x} cy={m.target.y} r="0.3" fill="#ef4444" />
              </g>
            );
          })}

          <text x={boardWidth / 2} y="1.2" fill="#9ca3af" fontSize="1" fontWeight="bold" textAnchor="middle" letterSpacing="0.2">─── BATTLEFIELD EDGE ───</text>
          <text x={boardWidth / 2} y={boardHeight - 0.4} fill="#9ca3af" fontSize="1" fontWeight="bold" textAnchor="middle" letterSpacing="0.2">─── BATTLEFIELD EDGE ───</text>
        </svg>
      </div>
    </div>
  );
}

export default function Wh40kScoreTracker({ currentUser, onClose }) {
  const scorecardRef = useRef(null);

  const handleDownloadGraphic = async () => {
    if (!scorecardRef.current) return;
    try {
      const canvas = await html2canvas(scorecardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        logging: false,
        useCORS: true,
      });
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `scorecard-40k-${player1Name}-vs-${player2Name}.png`, { type: "image/png" });
        
        if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Warhammer 40k Match Scorecard",
              text: `${player1Name} vs ${player2Name}`,
            });
            return;
          } catch (shareErr) {
            console.error("Web Share failed, showing modal instead:", shareErr);
          }
        }
        
        const image = canvas.toDataURL("image/png");
        
        if (isMobile) {
          setShareImageUrl(image);
        } else {
          const link = document.createElement("a");
          link.href = image;
          link.download = `scorecard-40k-${player1Name}-vs-${player2Name}.png`;
          link.click();
        }
      }, "image/png");
    } catch (err) {
      console.error("Fehler beim Herunterladen der Grafik:", err);
    }
  };

  const loadSavedState = (key, fallback) => {
    try {
      const saved = localStorage.getItem(`fumble_forge_40k_${key}`);
      return saved !== null ? JSON.parse(saved) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  // Steps: 'setup' -> 'mission_selection' -> 'player1_primary' -> 'player2_primary' -> 'deployment' -> 'mission_rules' -> 'player1_secondaries' -> 'player2_secondaries' -> 'live_tracker' -> 'summary'
  const [step, setStep] = useState(() => loadSavedState('step', 'setup'));

  const [matchDate, setMatchDate] = useState(() => loadSavedState('matchDate', new Date().toISOString().split('T')[0]));
  
  // Spieler 1
  const [player1Name, setPlayer1Name] = useState(() => loadSavedState('player1Name', currentUser?.username || currentUser?.name || 'You'));
  const [player1List, setPlayer1List] = useState(() => loadSavedState('player1List', ''));
  const [player1Faction, setPlayer1Faction] = useState(() => loadSavedState('player1Faction', factionsData?.[0]?.name || 'Aeldari'));
  const [player1Disposition, setPlayer1Disposition] = useState(() => loadSavedState('player1Disposition', forceDispositionsData?.[0]?.id || 'take-and-hold'));
  const [player1BattleReady, setPlayer1BattleReady] = useState(() => loadSavedState('player1BattleReady', true));
  const [player1Primary, setPlayer1Primary] = useState(() => loadSavedState('player1Primary', 'Unstoppable Force'));
  const [player1SecondaryMode, setPlayer1SecondaryMode] = useState(() => loadSavedState('player1SecondaryMode', 'tactical'));
  const [player1FixedSecondaries, setPlayer1FixedSecondaries] = useState(() => loadSavedState('player1FixedSecondaries', ['assassination', 'engage-on-all-fronts']));

  // Spieler 2
  const [player2Name, setPlayer2Name] = useState(() => loadSavedState('player2Name', 'Opponent'));
  const [player2List, setPlayer2List] = useState(() => loadSavedState('player2List', ''));
  const [player2Faction, setPlayer2Faction] = useState(() => loadSavedState('player2Faction', factionsData?.[1]?.name || 'Adeptus Custodes'));
  const [player2Disposition, setPlayer2Disposition] = useState(() => loadSavedState('player2Disposition', forceDispositionsData?.[2]?.id || 'purge-the-foe'));
  const [player2BattleReady, setPlayer2BattleReady] = useState(() => loadSavedState('player2BattleReady', true));
  const [player2Primary, setPlayer2Primary] = useState(() => loadSavedState('player2Primary', 'Unstoppable Force'));
  const [player2SecondaryMode, setPlayer2SecondaryMode] = useState(() => loadSavedState('player2SecondaryMode', 'tactical'));
  const [player2FixedSecondaries, setPlayer2FixedSecondaries] = useState(() => loadSavedState('player2FixedSecondaries', ['bring-it-down', 'a-grievous-blow']));

  // Mission & Deployment
  const [selectedMatchupId, setSelectedMatchupId] = useState(() => loadSavedState('selectedMatchupId', ''));
  const [selectedDeploymentPatternId, setSelectedDeploymentPatternId] = useState(() => loadSavedState('selectedDeploymentPatternId', 'dawn-of-war'));
  const [selectedTerrainLayoutId, setSelectedTerrainLayoutId] = useState(() => loadSavedState('selectedTerrainLayoutId', ''));
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [selectedMissionRule, setSelectedMissionRule] = useState(() => loadSavedState('selectedMissionRule', 'none'));

  // Live Tracker State
  const [currentRound, setCurrentRound] = useState(() => loadSavedState('currentRound', 1));
  const [showLiveStatsModal, setShowLiveStatsModal] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState(null);

  // CP Counters
  const [p1CpGained, setP1CpGained] = useState(() => loadSavedState('p1CpGained', 0));
  const [p1CpSpent, setP1CpSpent] = useState(() => loadSavedState('p1CpSpent', 0));
  const [p2CpGained, setP2CpGained] = useState(() => loadSavedState('p2CpGained', 0));
  const [p2CpSpent, setP2CpSpent] = useState(() => loadSavedState('p2CpSpent', 0));

  // Scored States
  const [p1ScoredPrimaries, setP1ScoredPrimaries] = useState(() => loadSavedState('p1ScoredPrimaries', {}));
  const [p2ScoredPrimaries, setP2ScoredPrimaries] = useState(() => loadSavedState('p2ScoredPrimaries', {}));
  const [p1ScoredSecondaries, setP1ScoredSecondaries] = useState(() => loadSavedState('p1ScoredSecondaries', {}));
  const [p2ScoredSecondaries, setP2ScoredSecondaries] = useState(() => loadSavedState('p2ScoredSecondaries', {}));

  // Tactical Hand (2 aktive Karten)
  const [p1TacticalHand, setP1TacticalHand] = useState(() => loadSavedState('p1TacticalHand', ['assassination', 'cleanse']));
  const [p2TacticalHand, setP2TacticalHand] = useState(() => loadSavedState('p2TacticalHand', ['bring-it-down', 'engage-on-all-fronts']));

  const [p1WentFirst, setP1WentFirst] = useState(() => loadSavedState('p1WentFirst', true));

  useEffect(() => {
    localStorage.setItem("fumble_forge_40k_p1WentFirst", JSON.stringify(p1WentFirst));
    localStorage.setItem("fumble_forge_40k_step", JSON.stringify(step));
    localStorage.setItem("fumble_forge_40k_matchDate", JSON.stringify(matchDate));
    localStorage.setItem("fumble_forge_40k_player1Name", JSON.stringify(player1Name));
    localStorage.setItem("fumble_forge_40k_player1List", JSON.stringify(player1List));
    localStorage.setItem("fumble_forge_40k_player1Faction", JSON.stringify(player1Faction));
    localStorage.setItem("fumble_forge_40k_player1Disposition", JSON.stringify(player1Disposition));
    localStorage.setItem("fumble_forge_40k_player1BattleReady", JSON.stringify(player1BattleReady));
    localStorage.setItem("fumble_forge_40k_player1Primary", JSON.stringify(player1Primary));
    localStorage.setItem("fumble_forge_40k_player1SecondaryMode", JSON.stringify(player1SecondaryMode));
    localStorage.setItem("fumble_forge_40k_player1FixedSecondaries", JSON.stringify(player1FixedSecondaries));
    localStorage.setItem("fumble_forge_40k_player2Name", JSON.stringify(player2Name));
    localStorage.setItem("fumble_forge_40k_player2List", JSON.stringify(player2List));
    localStorage.setItem("fumble_forge_40k_player2Faction", JSON.stringify(player2Faction));
    localStorage.setItem("fumble_forge_40k_player2Disposition", JSON.stringify(player2Disposition));
    localStorage.setItem("fumble_forge_40k_player2BattleReady", JSON.stringify(player2BattleReady));
    localStorage.setItem("fumble_forge_40k_player2Primary", JSON.stringify(player2Primary));
    localStorage.setItem("fumble_forge_40k_player2SecondaryMode", JSON.stringify(player2SecondaryMode));
    localStorage.setItem("fumble_forge_40k_player2FixedSecondaries", JSON.stringify(player2FixedSecondaries));
    localStorage.setItem("fumble_forge_40k_selectedMatchupId", JSON.stringify(selectedMatchupId));
    localStorage.setItem("fumble_forge_40k_selectedDeploymentPatternId", JSON.stringify(selectedDeploymentPatternId));
    localStorage.setItem("fumble_forge_40k_selectedTerrainLayoutId", JSON.stringify(selectedTerrainLayoutId));
    localStorage.setItem("fumble_forge_40k_selectedMissionRule", JSON.stringify(selectedMissionRule));
    localStorage.setItem("fumble_forge_40k_currentRound", JSON.stringify(currentRound));
    localStorage.setItem("fumble_forge_40k_p1CpGained", JSON.stringify(p1CpGained));
    localStorage.setItem("fumble_forge_40k_p1CpSpent", JSON.stringify(p1CpSpent));
    localStorage.setItem("fumble_forge_40k_p2CpGained", JSON.stringify(p2CpGained));
    localStorage.setItem("fumble_forge_40k_p2CpSpent", JSON.stringify(p2CpSpent));
    localStorage.setItem("fumble_forge_40k_p1ScoredPrimaries", JSON.stringify(p1ScoredPrimaries));
    localStorage.setItem("fumble_forge_40k_p2ScoredPrimaries", JSON.stringify(p2ScoredPrimaries));
    localStorage.setItem("fumble_forge_40k_p1ScoredSecondaries", JSON.stringify(p1ScoredSecondaries));
    localStorage.setItem("fumble_forge_40k_p2ScoredSecondaries", JSON.stringify(p2ScoredSecondaries));
    localStorage.setItem("fumble_forge_40k_p1TacticalHand", JSON.stringify(p1TacticalHand));
    localStorage.setItem("fumble_forge_40k_p2TacticalHand", JSON.stringify(p2TacticalHand));
  }, [
    step, matchDate, player1Name, player1List, player1Faction, player1Disposition, player1BattleReady, player1Primary, player1SecondaryMode, player1FixedSecondaries,
    player2Name, player2List, player2Faction, player2Disposition, player2BattleReady, player2Primary, player2SecondaryMode, player2FixedSecondaries,
    selectedMatchupId, selectedDeploymentPatternId, selectedTerrainLayoutId, selectedMissionRule, currentRound,
    p1CpGained, p1CpSpent, p2CpGained, p2CpSpent, p1ScoredPrimaries, p2ScoredPrimaries, p1ScoredSecondaries, p2ScoredSecondaries, p1TacticalHand, p2TacticalHand
  ]);

  const allSecondaryCards = Object.entries(SECONDARY_RULES_CATALOG).map(([id, item]) => ({
    id,
    name: item.name,
    desc: item.desc
  }));

  // Ermittelt die Primärmission direkt aus dem 25er-Katalog
  const getPrimaryMissionDefinition = (missionNameOrId) => {
    if (!missionNameOrId) return PRIMARY_MISSIONS_CATALOG["unstoppable-force"];
    const direct = PRIMARY_MISSIONS_CATALOG[missionNameOrId];
    if (direct) return direct;
    const match = Object.values(PRIMARY_MISSIONS_CATALOG).find(m => m.name.toLowerCase() === (missionNameOrId || '').toLowerCase());
    return match || PRIMARY_MISSIONS_CATALOG["unstoppable-force"];
  };

  const p1PrimaryRule = getPrimaryMissionDefinition(player1Primary);
  const p2PrimaryRule = getPrimaryMissionDefinition(player2Primary);

  const getDispositionName = (id) => {
    const disp = (forceDispositionsData || []).find(d => d.id === id);
    return disp ? disp.name : id;
  };

  const renderFactionOptions = () => {
    const categories = ["Das Imperium", "Mächte des Chaos", "Xenos"];
    return categories.map(category => {
      const categoryFactions = (factionsData || []).filter(f => f?.category === category);
      if (categoryFactions.length === 0) return null;
      return (
        <optgroup key={category} label={`--- ${category.toUpperCase()} ---`}>
          {categoryFactions.map(fac => (
            <option key={fac.id} value={fac.name}>{fac.name}</option>
          ))}
        </optgroup>
      );
    });
  };

  const rawUniqueMatchups = (missionMatchupsData || []).reduce((acc, current) => {
    if (!current) return acc;
    const exists = acc.find(m => 
      (m.disposition === current.disposition && m.opponent_disposition === current.opponent_disposition) ||
      (m.disposition === current.opponent_disposition && m.opponent_disposition === current.disposition)
    );
    if (!exists) acc.push(current);
    return acc;
  }, []);

  const uniqueMatchups = [...rawUniqueMatchups].sort((a, b) => {
    const isARec = (a.disposition === player1Disposition && a.opponent_disposition === player2Disposition) ||
                   (a.disposition === player2Disposition && a.opponent_disposition === player1Disposition);
    const isBRec = (b.disposition === player1Disposition && b.opponent_disposition === player2Disposition) ||
                   (b.disposition === player2Disposition && b.opponent_disposition === player1Disposition);
    if (isARec) return -1;
    if (isBRec) return 1;
    return 0;
  });

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!player1Name || !player2Name) {
      alert("Bitte trage die Namen beider Spieler ein!");
      return;
    }
    const uniqueMatchup = uniqueMatchups.find(m => 
      (m.disposition === player1Disposition && m.opponent_disposition === player2Disposition) ||
      (m.disposition === player2Disposition && m.opponent_disposition === player1Disposition)
    ) || uniqueMatchups[0];

    setSelectedMatchupId(uniqueMatchup?.id || '');
    setStep('mission_selection');
  };

  const getPlayer1AvailableMissions = () => {
    const selectedPair = uniqueMatchups.find(m => m.id === selectedMatchupId);
    if (!selectedPair) return [];
    const match1 = (missionMatchupsData || []).find(m => m.disposition === selectedPair.disposition && m.opponent_disposition === selectedPair.opponent_disposition);
    const match2 = (missionMatchupsData || []).find(m => m.disposition === selectedPair.opponent_disposition && m.opponent_disposition === selectedPair.disposition);
    const missions = [];
    if (match1) {
      const missionObj = (missionsData || []).find(m => m.id === match1.mission_id) || (secondaryCardsData || []).find(c => c.id === match1.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match1 });
    }
    if (match2 && match2.mission_id !== match1?.mission_id) {
      const missionObj = (missionsData || []).find(m => m.id === match2.mission_id) || (secondaryCardsData || []).find(c => c.id === match2.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match2 });
    }
    return missions;
  };

  const getPlayer2AvailableMissions = () => {
    const selectedPair = uniqueMatchups.find(m => m.id === selectedMatchupId);
    if (!selectedPair) return [];
    const match1 = (missionMatchupsData || []).find(m => m.disposition === selectedPair.opponent_disposition && m.opponent_disposition === selectedPair.disposition);
    const match2 = (missionMatchupsData || []).find(m => m.disposition === selectedPair.disposition && m.opponent_disposition === selectedPair.opponent_disposition);
    const missions = [];
    if (match1) {
      const missionObj = (missionsData || []).find(m => m.id === match1.mission_id) || (secondaryCardsData || []).find(c => c.id === match1.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match1 });
    }
    if (match2 && match2.mission_id !== match1?.mission_id) {
      const missionObj = (missionsData || []).find(m => m.id === match2.mission_id) || (secondaryCardsData || []).find(c => c.id === match2.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match2 });
    }
    return missions;
  };

  const standardDeploymentList = [
    { id: 'dawn-of-war', num: 1, name: 'Dawn of War' },
    { id: 'sweeping-engagement', num: 2, name: 'Sweeping Engagement' },
    { id: 'tipping-point', num: 3, name: 'Tipping Point' },
    { id: 'search-and-destroy', num: 4, name: 'Search and Destroy' },
    { id: 'hammer-and-anvil', num: 5, name: 'Hammer and Anvil' },
    { id: 'crucible-of-battle', num: 6, name: 'Crucible of Battle' },
  ];

  const currentTerrainLayout = (terrainLayoutsData || []).find(l => l.id === selectedTerrainLayoutId) || null;
  const currentDeploymentPattern = (deploymentPatternsData || []).find(p => p.id === selectedDeploymentPatternId) || deploymentPatternsData?.[0] || { name: 'Standard', board: { width: 60, height: 44 } };

  useEffect(() => {
    if (step === 'deployment' && !selectedTerrainLayoutId) {
      const defaultLayout = (terrainLayoutsData || []).find(l => l.mission_matchup_id === selectedMatchupId) || terrainLayoutsData?.[0];
      if (defaultLayout) {
        setSelectedTerrainLayoutId(defaultLayout.id);
        if (defaultLayout.deployment_pattern_id) {
          setSelectedDeploymentPatternId(defaultLayout.deployment_pattern_id);
        }
      }
    }
  }, [step, selectedMatchupId]);

  const handleSelectDeploymentMap = (patternId) => {
    setSelectedDeploymentPatternId(patternId);
    const matchLayout = (terrainLayoutsData || []).find(
      l => l.mission_matchup_id === selectedMatchupId && l.deployment_pattern_id === patternId
    ) || (terrainLayoutsData || []).find(l => l.deployment_pattern_id === patternId);

    if (matchLayout) {
      setSelectedTerrainLayoutId(matchLayout.id);
    }
  };

  const handleSelectLayoutFromModal = (layout) => {
    setSelectedTerrainLayoutId(layout.id);
    if (layout.deployment_pattern_id) {
      setSelectedDeploymentPatternId(layout.deployment_pattern_id);
    }
    setShowLayoutModal(false);
  };

  const handleRandomize = () => {
    const matchupLayouts = (terrainLayoutsData || []).filter(l => l.mission_matchup_id === selectedMatchupId);
    if (matchupLayouts.length > 0) {
      const chosen = matchupLayouts[Math.floor(Math.random() * matchupLayouts.length)];
      handleSelectLayoutFromModal(chosen);
    } else {
      const randomPattern = standardDeploymentList[Math.floor(Math.random() * standardDeploymentList.length)];
      handleSelectDeploymentMap(randomPattern.id);
    }
  };

  const handleRandomizeMissionRule = () => {
    const randomRule = MISSION_RULES[Math.floor(Math.random() * MISSION_RULES.length)];
    setSelectedMissionRule(randomRule.id);
  };

  const toggleFixedSecondary = (playerKey, secondaryId) => {
    if (playerKey === 'player1') {
      if (player1FixedSecondaries.includes(secondaryId)) {
        setPlayer1FixedSecondaries(player1FixedSecondaries.filter(id => id !== secondaryId));
      } else if (player1FixedSecondaries.length < 2) {
        setPlayer1FixedSecondaries([...player1FixedSecondaries, secondaryId]);
      } else {
        setPlayer1FixedSecondaries([player1FixedSecondaries[1], secondaryId]);
      }
    } else {
      if (player2FixedSecondaries.includes(secondaryId)) {
        setPlayer2FixedSecondaries(player2FixedSecondaries.filter(id => id !== secondaryId));
      } else if (player2FixedSecondaries.length < 2) {
        setPlayer2FixedSecondaries([...player2FixedSecondaries, secondaryId]);
      } else {
        setPlayer2FixedSecondaries([player2FixedSecondaries[1], secondaryId]);
      }
    }
  };

  const getSecondaryScoringTriggers = (cardId, isFixed) => {
    const cardRule = SECONDARY_RULES_CATALOG[cardId];
    if (cardRule && cardRule.getTriggers) {
      return cardRule.getTriggers(isFixed);
    }
    return [{ key: 'standard_achieved', label: 'Secondary Objective Achieved', vp: 5 }];
  };

  const getSecondaryCardInfo = (cardId) => {
    return SECONDARY_RULES_CATALOG[cardId] || { name: cardId, desc: '' };
  };

  const togglePrimaryScoring = (playerKey, triggerKey) => {
    const stateMap = playerKey === 'player1' ? p1ScoredPrimaries : p2ScoredPrimaries;
    const roundKey = `r${currentRound}`;
    const currentRoundScores = stateMap[roundKey] || {};

    const updatedRoundScores = {
      ...currentRoundScores,
      [triggerKey]: !currentRoundScores[triggerKey]
    };

    if (playerKey === 'player1') {
      setP1ScoredPrimaries({ ...p1ScoredPrimaries, [roundKey]: updatedRoundScores });
    } else {
      setP2ScoredPrimaries({ ...p2ScoredPrimaries, [roundKey]: updatedRoundScores });
    }
  };

  const toggleSecondaryScoring = (playerKey, cardId, triggerKey) => {
    const stateMap = playerKey === 'player1' ? p1ScoredSecondaries : p2ScoredSecondaries;
    const roundKey = `r${currentRound}`;
    const currentRoundScores = stateMap[roundKey] || {};
    const compositeKey = `${cardId}:::${triggerKey}`;

    const updatedRoundScores = {
      ...currentRoundScores,
      [compositeKey]: !currentRoundScores[compositeKey]
    };

    if (playerKey === 'player1') {
      setP1ScoredSecondaries({ ...p1ScoredSecondaries, [roundKey]: updatedRoundScores });
    } else {
      setP2ScoredSecondaries({ ...p2ScoredSecondaries, [roundKey]: updatedRoundScores });
    }
  };

  // --- LIVE SCORE STATS BERECHNUNG (11TH EDITION: 45 PRI / 45 SEC / 10 BR) ---
  const calculatePlayerStats = (playerKey) => {
    try {
      const pRule = getPrimaryMissionDefinition(playerKey === 'player1' ? player1Primary : player2Primary);
      const scoredPrimMap = playerKey === 'player1' ? p1ScoredPrimaries : p2ScoredPrimaries;
      const scoredSecMap = playerKey === 'player1' ? p1ScoredSecondaries : p2ScoredSecondaries;
      const isFixed = (playerKey === 'player1' ? player1SecondaryMode : player2SecondaryMode) === 'fixed';
      const battleReady = playerKey === 'player1' ? player1BattleReady : player2BattleReady;

      let totalRawPrimaryVp = 0;
      let totalRawSecondaryVp = 0;
      const roundPrimaryVp = {};
      const roundSecondaryVp = {};

      for (let r = 1; r <= 5; r++) {
        const roundPrimScores = scoredPrimMap[`r${r}`] || {};
        let rPrimary = 0;
        (pRule?.triggers || []).forEach(trig => {
          if (roundPrimScores[trig.key]) {
            rPrimary += trig.vp;
          }
        });
        roundPrimaryVp[r] = Math.min(15, rPrimary);
        totalRawPrimaryVp += roundPrimaryVp[r];

        const secScores = scoredSecMap[`r${r}`] || {};
        let rSecondary = 0;
        Object.entries(secScores).forEach(([compositeKey, isChecked]) => {
          if (isChecked) {
            const [cardId, triggerKey] = compositeKey.split(':::');
            const triggers = getSecondaryScoringTriggers(cardId, isFixed);
            const trig = triggers.find(t => t.key === triggerKey);
            if (trig) rSecondary += trig.vp;
          }
        });
        roundSecondaryVp[r] = rSecondary;
        totalRawSecondaryVp += rSecondary;
      }

      const finalPrimaryVp = Math.min(45, totalRawPrimaryVp);
      const finalSecondaryVp = Math.min(45, totalRawSecondaryVp);
      const battleReadyVp = battleReady ? 10 : 0;
      const grandTotalVp = Math.min(100, finalPrimaryVp + finalSecondaryVp + battleReadyVp);

      return {
        finalPrimaryVp,
        finalSecondaryVp,
        battleReadyVp,
        grandTotalVp,
        roundPrimaryVp,
        roundSecondaryVp
      };
    } catch (e) {
      return {
        finalPrimaryVp: 0,
        finalSecondaryVp: 0,
        battleReadyVp: 0,
        grandTotalVp: 0,
        roundPrimaryVp: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        roundSecondaryVp: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
  };

  const p1Stats = calculatePlayerStats('player1');
  const p2Stats = calculatePlayerStats('player2');

  const getScoredSecondariesForPlayer = (playerKey) => {
    const scoredSecMap = playerKey === 'player1' ? p1ScoredSecondaries : p2ScoredSecondaries;
    const isFixed = (playerKey === 'player1' ? player1SecondaryMode : player2SecondaryMode) === 'fixed';
    const fixedCards = playerKey === 'player1' ? player1FixedSecondaries : player2FixedSecondaries;

    if (isFixed) {
      return fixedCards;
    } else {
      const uniqueCards = new Set();
      for (let r = 1; r <= 5; r++) {
        const roundScores = scoredSecMap[`r${r}`] || {};
        Object.entries(roundScores).forEach(([compositeKey, isChecked]) => {
          if (isChecked) {
            const [cardId] = compositeKey.split(':::');
            uniqueCards.add(cardId);
          }
        });
      }
      return Array.from(uniqueCards);
    }
  };

  const getSecondaryCardScoreInRound = (playerKey, cardId, r) => {
    const scoredSecMap = playerKey === 'player1' ? p1ScoredSecondaries : p2ScoredSecondaries;
    const isFixed = (playerKey === 'player1' ? player1SecondaryMode : player2SecondaryMode) === 'fixed';
    const roundScores = scoredSecMap[`r${r}`] || {};
    let roundVp = 0;
    Object.entries(roundScores).forEach(([compositeKey, isChecked]) => {
      if (isChecked) {
        const [cId, triggerKey] = compositeKey.split(':::');
        if (cId === cardId) {
          const triggers = getSecondaryScoringTriggers(cId, isFixed);
          const trig = triggers.find(t => t.key === triggerKey);
          if (trig) roundVp += trig.vp;
        }
      }
    });
    return roundVp;
  };

  const renderTabletopScorecard = () => {
    const isTie = p1Stats.grandTotalVp === p2Stats.grandTotalVp;
    
    return (
      <div ref={scorecardRef} className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 md:p-6 text-left shadow-2xl relative select-none w-full max-w-xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex justify-between text-[11px] text-neutral-500 font-mono font-bold uppercase tracking-wider">
            <span>{matchDate}</span>
            <span>Liga</span>
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            {/* Player 1 Details */}
            <div className="text-left space-y-0.5 min-w-0">
              <h4 className="text-sm sm:text-base md:text-lg font-black text-neutral-100 truncate">{player1Name}</h4>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">{player1Faction}</p>
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
              <h4 className="text-sm sm:text-base md:text-lg font-black text-neutral-100 truncate">{player2Name}</h4>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">{player2Faction}</p>
            </div>
          </div>
        </div>

        {/* Player sections */}
        {['player1', 'player2'].map((pKey) => {
          const isP1 = pKey === 'player1';
          const pName = isP1 ? player1Name : player2Name;
          const pStats = isP1 ? p1Stats : p2Stats;
          const secondaries = getScoredSecondariesForPlayer(pKey);

          return (
            <div key={pKey} className="space-y-3 pt-4 border-t border-neutral-800/80">
              <h3 className="text-base font-black text-amber-500 flex items-center justify-between">
                <span>{pName}</span>
                <span className="text-xs text-neutral-400 font-medium font-mono">Total: {pStats.grandTotalVp} VP</span>
              </h3>

              <div className="space-y-1.5">
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
                      {pStats.finalPrimaryVp}/45
                    </span>
                  </div>
                </div>

                {/* Secondaries row(s) */}
                {secondaries.length === 0 ? (
                  <div className="flex items-center justify-between py-1 border-b border-neutral-900 px-1 text-neutral-500 text-[11px] italic">
                    Keine Secondary Missions erfüllt
                  </div>
                ) : (
                  secondaries.map((cardId) => {
                    const cardInfo = getSecondaryCardInfo(cardId);
                    let totalSec = 0;
                    return (
                      <div key={cardId} className="flex items-center justify-between py-1 border-b border-neutral-900 px-1">
                        <span className="text-xs text-neutral-300 font-medium truncate max-w-[130px]" title={cardInfo.name}>
                          {cardInfo.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((r) => {
                              const score = getSecondaryCardScoreInRound(pKey, cardId, r);
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
                  })
                )}

                {/* Battle Ready row */}
                <div className="flex items-center justify-between py-1 px-1">
                  <span className="text-xs text-neutral-400 font-medium">Army Battle Ready</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((r) => {
                        const isR5 = r === 5;
                        const score = pStats.battleReadyVp;
                        return (
                          <div 
                            key={r} 
                            className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold border ${
                              isR5 && score > 0
                                ? 'bg-amber-500/10 border-amber-500/20 text-neutral-300' 
                                : 'bg-neutral-950 border-neutral-800 text-neutral-600'
                            }`}
                          >
                            {isR5 && score > 0 ? score : '-'}
                          </div>
                        );
                      })}
                    </div>
                    <span className="w-12 text-right text-xs font-mono font-bold text-neutral-500">
                      {pStats.battleReadyVp}/10
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer info */}
        <div className="pt-4 border-t border-neutral-900 flex justify-between items-center text-[10px] text-neutral-500 font-medium">
          <div className="space-y-0.5">
            <div>Warhammer 40k • {currentDeploymentPattern?.name} • {currentTerrainLayout?.name || 'Standard'}</div>
            <div>Mission Rule: {MISSION_RULES.find(r => r.id === selectedMissionRule)?.name || 'None'}</div>
          </div>
          <div className="text-right font-black uppercase text-neutral-600 tracking-wider">
            Fumble Forge App
          </div>
        </div>
      </div>
    );
  };

  const isTriggerAvailableInRound = (trigger, round) => {
    if (trigger?.roundMin && round < trigger.roundMin) return false;
    if (trigger?.roundMax && round > trigger.roundMax) return false;
    return true;
  };

  const handleSaveMatchToSupabase = async () => {
    if (!currentUser?.id) {
      alert("Bitte logge dich ein, um das Spiel zu speichern!");
      return;
    }
    setSavingMatch(true);
    try {
      const winner = p1Stats.grandTotalVp > p2Stats.grandTotalVp ? player1Name : p2Stats.grandTotalVp > p1Stats.grandTotalVp ? player2Name : "Unentschieden";
      const { error } = await supabase.from('matches').insert([{
        user_id: currentUser.id,
        player1_name: player1Name,
        player2_name: player2Name,
        player1_vp: p1Stats.grandTotalVp,
        player2_vp: p2Stats.grandTotalVp,
        rounds_played: 5,
        winner_name: winner,
        details: {
          system: "Warhammer 40k",
          mission_rule: selectedMissionRule,
          p1_faction: player1Faction,
          p2_faction: player2Faction,
          p1_primary: player1Primary,
          p2_primary: player2Primary,
          deployment_pattern: currentDeploymentPattern?.name,
          terrain_layout: currentTerrainLayout?.name
        }
      }]);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        resetMatch();
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      alert(`Fehler beim Speichern: ${err.message}`);
    } finally {
      setSavingMatch(false);
    }
  };

  const resetMatch = () => {
    setStep('setup');
    setCurrentRound(1);
    setP1CpGained(0);
    setP1CpSpent(0);
    setP2CpGained(0);
    setP2CpSpent(0);
    setP1ScoredPrimaries({});
    setP2ScoredPrimaries({});
    setP1ScoredSecondaries({});
    setP2ScoredSecondaries({});
    setSaveSuccess(false);

    setPlayer1Name(currentUser?.username || currentUser?.name || 'You');
    setPlayer1List('');
    setPlayer1Faction(factionsData?.[0]?.name || 'Aeldari');
    setPlayer1Disposition(forceDispositionsData?.[0]?.id || 'take-and-hold');
    setPlayer1BattleReady(true);
    setPlayer1Primary('Unstoppable Force');
    setPlayer1SecondaryMode('tactical');
    setPlayer1FixedSecondaries(['assassination', 'engage-on-all-fronts']);

    setPlayer2Name('Opponent');
    setPlayer2List('');
    setPlayer2Faction(factionsData?.[1]?.name || 'Adeptus Custodes');
    setPlayer2Disposition(forceDispositionsData?.[2]?.id || 'purge-the-foe');
    setPlayer2BattleReady(true);
    setPlayer2Primary('Unstoppable Force');
    setPlayer2SecondaryMode('tactical');
    setPlayer2FixedSecondaries(['bring-it-down', 'a-grievous-blow']);

    setSelectedMatchupId('');
    setSelectedDeploymentPatternId('dawn-of-war');
    setSelectedTerrainLayoutId('');
    setSelectedMissionRule('none');
    setP1TacticalHand(['assassination', 'cleanse']);
    setP2TacticalHand(['bring-it-down', 'engage-on-all-fronts']);

    const keys = [
      'step', 'matchDate', 'player1Name', 'player1List', 'player1Faction', 'player1Disposition', 'player1BattleReady', 'player1Primary', 'player1SecondaryMode', 'player1FixedSecondaries',
      'player2Name', 'player2List', 'player2Faction', 'player2Disposition', 'player2BattleReady', 'player2Primary', 'player2SecondaryMode', 'player2FixedSecondaries',
      'selectedMatchupId', 'selectedDeploymentPatternId', 'selectedTerrainLayoutId', 'selectedMissionRule', 'currentRound',
      'p1CpGained', 'p1CpSpent', 'p2CpGained', 'p2CpSpent', 'p1ScoredPrimaries', 'p2ScoredPrimaries', 'p1ScoredSecondaries', 'p2ScoredSecondaries', 'p1TacticalHand', 'p2TacticalHand', 'p1WentFirst'
    ];
    keys.forEach(k => localStorage.removeItem(`fumble_forge_40k_${k}`));
    setP1WentFirst(true);
  };

  const getSortedLayoutGroups = () => {
    const groups = {};
    (terrainLayoutsData || []).forEach(layout => {
      const mId = layout.mission_matchup_id || 'Other';
      if (!groups[mId]) groups[mId] = [];
      groups[mId].push(layout);
    });

    return Object.entries(groups).sort(([mIdA], [mIdB]) => {
      if (mIdA === selectedMatchupId) return -1;
      if (mIdB === selectedMatchupId) return 1;
      return 0;
    });
  };

  const getVariantLetter = (variant) => {
    if (variant === 1) return 'Layout A';
    if (variant === 2) return 'Layout B';
    if (variant === 3) return 'Layout C';
    return `Layout ${variant}`;
  };

  const getMatchupNiceTitle = (mId) => {
    const matchup = (missionMatchupsData || []).find(m => m.id === mId);
    if (!matchup) return mId;
    return `${getDispositionName(matchup.disposition)} vs ${getDispositionName(matchup.opponent_disposition)}`;
  };

  return (
    <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 text-neutral-100 font-sans shadow-2xl relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-full transition z-50 cursor-pointer shadow-lg"
          title="Zurück zur Commander Zentrale"
        >
          <X size={20} />
        </button>
      )}
      
      {/* Top Header */}
      {step !== 'summary' && (
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            {step === 'live_tracker' && (
              <span className="text-xl font-black text-amber-500 font-mono">
                {p1Stats?.grandTotalVp || 0} - {p2Stats?.grandTotalVp || 0}
              </span>
            )}
            <div>
              <h2 className="text-xl font-black text-neutral-100 uppercase tracking-wider">
                {player1Name} vs {player2Name}
              </h2>
              <p className="text-xs text-neutral-400">
                {step !== 'live_tracker' ? 'Chapter Approved 2026 Setup' : `Battle Round ${currentRound} of 5`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step === 'live_tracker' && (
              <button
                onClick={() => setShowLiveStatsModal(true)}
                className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                title="Live Scoreboard anzeigen"
              >
                <Eye size={20} />
              </button>
            )}

            <span className="text-xs bg-amber-600/20 text-amber-400 border border-amber-600/40 px-3 py-1 rounded-lg font-bold">
              {step === 'setup' && 'Step 1 / Setup'}
              {step === 'mission_selection' && 'Step 2 / Mission'}
              {step === 'player1_primary' && 'Step 3 / Your Primary'}
              {step === 'player2_primary' && 'Step 4 / Opponent Primary'}
              {step === 'deployment' && 'Step 5 / Deployment'}
              {step === 'mission_rules' && 'Step 6 / Rules'}
              {step === 'player1_secondaries' && 'Step 7 / Your Secondaries'}
              {step === 'player2_secondaries' && 'Step 8 / Opponent Secondaries'}
              {step === 'live_tracker' && `Round ${currentRound}`}
            </span>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 1: SETUP */}
      {step === 'setup' && (
        <form onSubmit={handleNextStep} className="space-y-6">
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Game Date</label>
            <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition" />
          </div>

          <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Your Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Your Name</label>
                <input type="text" placeholder="Your name" value={player1Name} onChange={(e) => setPlayer1Name(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Faction</label>
                <select value={player1Faction} onChange={(e) => setPlayer1Faction(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer">
                  {renderFactionOptions()}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Add an army list...</label>
              <input type="text" placeholder="Paste army list..." value={player1List} onChange={(e) => setPlayer1List(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Force Disposition</label>
              <select value={player1Disposition} onChange={(e) => setPlayer1Disposition(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer">
                {(forceDispositionsData || []).map((disp) => (<option key={disp.id} value={disp.id}>{disp.name}</option>))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
              <span className="text-xs text-neutral-300 font-medium">Army is Battle Ready (10pts)</span>
              <input type="checkbox" checked={player1BattleReady} onChange={(e) => setPlayer1BattleReady(e.target.checked)} className="w-5 h-5 accent-amber-600 rounded cursor-pointer" />
            </div>
          </div>

          <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Opponent Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Opponent's name</label>
                <input type="text" placeholder="Opponent's name" value={player2Name} onChange={(e) => setPlayer2Name(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Faction</label>
                <select value={player2Faction} onChange={(e) => setPlayer2Faction(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer">
                  {renderFactionOptions()}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Add an army list...</label>
              <input type="text" placeholder="Paste opponent list..." value={player2List} onChange={(e) => setPlayer2List(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Force Disposition</label>
              <select value={player2Disposition} onChange={(e) => setPlayer2Disposition(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer">
                {(forceDispositionsData || []).map((disp) => (<option key={disp.id} value={disp.id}>{disp.name}</option>))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
              <span className="text-xs text-neutral-300 font-medium">Army is Battle Ready (10pts)</span>
              <input type="checkbox" checked={player2BattleReady} onChange={(e) => setPlayer2BattleReady(e.target.checked)} className="w-5 h-5 accent-amber-600 rounded cursor-pointer" />
            </div>
          </div>

          <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer">
            Next: Mission Matrix →
          </button>
        </form>
      )}

      {/* BILDSCHIRM 2: MISSION MATRIX */}
      {step === 'mission_selection' && (
        <div className="space-y-4">
          <button onClick={() => { const r = Math.floor(Math.random() * uniqueMatchups.length); setSelectedMatchupId(uniqueMatchups[r]?.id); }} className="w-full bg-neutral-950 border border-neutral-800 hover:border-amber-500 text-amber-400 font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md">
            <Dice5 size={18} /> Randomize Mission
          </button>

          <div className="space-y-2">
            {uniqueMatchups.map((matchup, index) => {
              const p1DispName = getDispositionName(matchup.disposition);
              const p2DispName = getDispositionName(matchup.opponent_disposition);
              const matchForward = (missionMatchupsData || []).find(m => m.disposition === matchup.disposition && m.opponent_disposition === matchup.opponent_disposition);
              const matchBackward = (missionMatchupsData || []).find(m => m.disposition === matchup.opponent_disposition && m.opponent_disposition === matchup.disposition);
              const isRecommended = ((matchup.disposition === player1Disposition && matchup.opponent_disposition === player2Disposition) || (matchup.disposition === player2Disposition && matchup.opponent_disposition === player1Disposition));
              const isSelected = selectedMatchupId === matchup.id;

              return (
                <div key={matchup.id || index} onClick={() => setSelectedMatchupId(matchup.id)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${isSelected ? 'bg-amber-600/10 border-amber-500 text-amber-400' : isRecommended ? 'bg-neutral-950 border-amber-600/40 text-neutral-200' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-200'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="missionSelect" checked={isSelected} onChange={() => setSelectedMatchupId(matchup.id)} className="w-4 h-4 accent-amber-600 cursor-pointer" />
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>{p1DispName} vs {p2DispName}</span>
                        {isRecommended && <span className="text-amber-400 text-xs">⭐</span>}
                      </div>
                      <div className="text-xs text-neutral-400">{missionsData.find(m => m.id === matchForward?.mission_id)?.name || 'Unknown'} / {missionsData.find(m => m.id === matchBackward?.mission_id)?.name || 'Unknown'}</div>
                    </div>
                  </div>
                  <span className="text-xs bg-neutral-800 text-neutral-300 font-bold px-2.5 py-1 rounded-md border border-neutral-700">{index + 1}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep('setup')} className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer">← Back</button>
            <button onClick={() => { const av = getPlayer1AvailableMissions(); if (av.length > 0 && !player1Primary) setPlayer1Primary(av[0].name); setStep('player1_primary'); }} className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer">Next: Your Primary →</button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 3: YOUR PRIMARY */}
      {step === 'player1_primary' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Your Primary Mission</h3>
          <div className="space-y-2">
            {getPlayer1AvailableMissions().map((mission, index) => (
              <div key={mission.id} onClick={() => setPlayer1Primary(mission.name)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${player1Primary === mission.name ? 'bg-amber-600/10 border-amber-500 text-amber-400' : index === 0 ? 'bg-neutral-950 border-amber-600/40 text-neutral-200' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="p1Radio" checked={player1Primary === mission.name} onChange={() => setPlayer1Primary(mission.name)} className="w-4 h-4 accent-amber-600 cursor-pointer" />
                  <div className="text-sm font-bold flex items-center gap-2"><span>{mission.name}</span>{index === 0 && <span className="text-amber-400 text-xs">⭐</span>}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep('mission_selection')} className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer">← Back</button>
            <button onClick={() => { const av = getPlayer2AvailableMissions(); if (av.length > 0 && !player2Primary) setPlayer2Primary(av[0].name); setStep('player2_primary'); }} className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer">Next: Opponent's Primary →</button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 4: OPPONENT'S PRIMARY */}
      {step === 'player2_primary' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Opponent's Primary Mission</h3>
          <div className="space-y-2">
            {getPlayer2AvailableMissions().map((mission, index) => (
              <div key={mission.id} onClick={() => setPlayer2Primary(mission.name)} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${player2Primary === mission.name ? 'bg-amber-600/10 border-amber-500 text-amber-400' : index === 0 ? 'bg-neutral-950 border-amber-600/40 text-neutral-200' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-200'}`}>
                <div className="flex items-center gap-3">
                  <input type="radio" name="p2Radio" checked={player2Primary === mission.name} onChange={() => setPlayer2Primary(mission.name)} className="w-4 h-4 accent-amber-600 cursor-pointer" />
                  <div className="text-sm font-bold flex items-center gap-2"><span>{mission.name}</span>{index === 0 && <span className="text-amber-400 text-xs">⭐</span>}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep('player1_primary')} className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer">← Back</button>
            <button onClick={() => setStep('deployment')} className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer">Next: Deployment & Terrain →</button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 5: DEPLOYMENT & TERRAIN */}
      {step === 'deployment' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Deployment Map</h3>
            <button type="button" onClick={handleRandomize} className="w-full bg-[#1e2530] hover:bg-[#252e3d] text-[#60a5fa] border border-[#3b82f6]/40 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md">
              <Dice5 size={16} /> Randomize
            </button>
            <div className="bg-neutral-950 rounded-xl border border-neutral-800 divide-y divide-neutral-800/80 overflow-hidden">
              {standardDeploymentList.map((mapItem) => (
                <div key={mapItem.id} onClick={() => handleSelectDeploymentMap(mapItem.id)} className="flex items-center justify-between p-3.5 hover:bg-neutral-900/60 cursor-pointer transition">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-neutral-500 font-mono w-4">{mapItem.num}</span>
                    <span className="text-sm font-bold text-neutral-200">{mapItem.name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedDeploymentPatternId === mapItem.id ? 'border-amber-500 bg-amber-500' : 'border-neutral-600'}`}>
                    {selectedDeploymentPatternId === mapItem.id && <div className="w-2 h-2 rounded-full bg-neutral-950" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Terrain Layout</h3>
            <div onClick={() => setShowLayoutModal(true)} className="bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 p-4 rounded-xl flex items-center gap-3 cursor-pointer transition group">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-amber-500 shrink-0"><Map size={18} /></div>
              <div className="flex-1">
                <div className="text-sm font-bold text-neutral-200 group-hover:text-amber-400">
                  {currentTerrainLayout ? `${getMatchupNiceTitle(currentTerrainLayout.mission_matchup_id)} ${getVariantLetter(currentTerrainLayout.variant)}` : 'Select a terrain layout...'}
                </div>
                {currentTerrainLayout && <div className="text-[11px] text-neutral-400">{currentTerrainLayout.name} • {currentTerrainLayout.pieces?.length || 0} Terrain Pieces</div>}
              </div>
              <span className="text-xs bg-neutral-800 text-neutral-300 font-bold px-2.5 py-1 rounded-md border border-neutral-700">Wählen ➔</span>
            </div>
          </div>

          <div className="space-y-3">
            <BattlefieldMapSvg deploymentPattern={currentDeploymentPattern} terrainLayout={currentTerrainLayout} showMeasurements={showMeasurements} />
            <button type="button" onClick={() => setShowMeasurements(!showMeasurements)} className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${showMeasurements ? 'bg-neutral-800 border-neutral-700 text-neutral-200' : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}>
              <Eye size={15} /> Terrain Measurements {showMeasurements ? '(An)' : '(Aus)'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep('player2_primary')} className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"><ArrowLeft size={16} /> Back</button>
            <button type="button" onClick={() => setStep('mission_rules')} className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer">Next: Mission Rules →</button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 6: MISSION RULES */}
      {step === 'mission_rules' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Mission Rules</h3>
            <button type="button" onClick={handleRandomizeMissionRule} className="w-full bg-[#1e2530] hover:bg-[#252e3d] text-[#60a5fa] border border-[#3b82f6]/40 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md">
              <Dice5 size={16} /> Randomize
            </button>
            <div className="bg-neutral-950 rounded-xl border border-neutral-800 divide-y divide-neutral-800/80 overflow-hidden">
              {MISSION_RULES.map((rule) => (
                <div key={rule.id} onClick={() => setSelectedMissionRule(rule.id)} className="flex items-center justify-between p-3.5 hover:bg-neutral-900/60 cursor-pointer transition">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${selectedMissionRule === rule.id ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600 bg-neutral-900'}`}>
                      {selectedMissionRule === rule.id && <Check size={14} strokeWidth={3} />}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-neutral-200">{rule.name}</span>
                      {rule.desc && <p className="text-[11px] text-neutral-400 mt-0.5">{rule.desc}</p>}
                    </div>
                  </div>
                  <span className="text-xs bg-neutral-800 text-neutral-400 font-bold font-mono px-2.5 py-1 rounded-md border border-neutral-700">{rule.num}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep('deployment')} className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"><ArrowLeft size={16} /> Back</button>
            <button type="button" onClick={() => setStep('player1_secondaries')} className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer">Next: Your Secondaries →</button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 7: YOUR SECONDARIES */}
      {step === 'player1_secondaries' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Your Secondaries</h3>
            <div className="grid grid-cols-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button type="button" onClick={() => setPlayer1SecondaryMode('tactical')} className={`py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${player1SecondaryMode === 'tactical' ? 'bg-[#93c5fd] text-neutral-950 font-extrabold' : 'text-neutral-400 hover:text-neutral-200'}`}>Tactical Missions</button>
              <button type="button" onClick={() => setPlayer1SecondaryMode('fixed')} className={`py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${player1SecondaryMode === 'fixed' ? 'bg-[#93c5fd] text-neutral-950 font-extrabold' : 'text-neutral-400 hover:text-neutral-200'}`}>Fixed Missions</button>
            </div>

            {player1SecondaryMode === 'tactical' && (
              <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-xl text-center space-y-2">
                <Target size={32} className="mx-auto text-sky-400 opacity-80" />
                <p className="text-sm text-neutral-300 font-medium">You will draw random Secondary Missions as the game progresses.</p>
              </div>
            )}

            {player1SecondaryMode === 'fixed' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase">Select two of the following Secondary Missions:</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{player1FixedSecondaries.length} / 2 gewählt</span>
                </div>
                <div className="bg-neutral-950 rounded-xl border border-neutral-800 divide-y divide-neutral-800/80 overflow-hidden">
                  {FIXED_SECONDARY_OPTIONS.map((item) => (
                    <div key={item.id} onClick={() => toggleFixedSecondary('player1', item.id)} className="flex items-center justify-between p-4 hover:bg-neutral-900/60 cursor-pointer transition">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${player1FixedSecondaries.includes(item.id) ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600 bg-neutral-950'}`}>
                          {player1FixedSecondaries.includes(item.id) && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-neutral-200">{item.name}</span>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep('mission_rules')} className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"><ArrowLeft size={16} /> Back</button>
            <button type="button" onClick={() => { if (player1SecondaryMode === 'fixed' && player1FixedSecondaries.length !== 2) { alert("Bitte wähle genau 2 Fixed Secondary Missions aus!"); return; } setStep('player2_secondaries'); }} className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer">Next: Opponent's Secondaries →</button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 8: OPPONENT'S SECONDARIES */}
      {step === 'player2_secondaries' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Opponent's Secondaries</h3>
            <div className="grid grid-cols-2 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button type="button" onClick={() => setPlayer2SecondaryMode('tactical')} className={`py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${player2SecondaryMode === 'tactical' ? 'bg-[#93c5fd] text-neutral-950 font-extrabold' : 'text-neutral-400 hover:text-neutral-200'}`}>Tactical Missions</button>
              <button type="button" onClick={() => setPlayer2SecondaryMode('fixed')} className={`py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${player2SecondaryMode === 'fixed' ? 'bg-[#93c5fd] text-neutral-950 font-extrabold' : 'text-neutral-400 hover:text-neutral-200'}`}>Fixed Missions</button>
            </div>

            {player2SecondaryMode === 'tactical' && (
              <div className="bg-neutral-950 border border-neutral-800 p-6 rounded-xl text-center space-y-2">
                <Target size={32} className="mx-auto text-sky-400 opacity-80" />
                <p className="text-sm text-neutral-300 font-medium">Your opponent will draw random Secondary Missions as the game progresses.</p>
              </div>
            )}

            {player2SecondaryMode === 'fixed' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-neutral-400 uppercase">Select two of the following Secondary Missions:</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{player2FixedSecondaries.length} / 2 gewählt</span>
                </div>
                <div className="bg-neutral-950 rounded-xl border border-neutral-800 divide-y divide-neutral-800/80 overflow-hidden">
                  {FIXED_SECONDARY_OPTIONS.map((item) => (
                    <div key={item.id} onClick={() => toggleFixedSecondary('player2', item.id)} className="flex items-center justify-between p-4 hover:bg-neutral-900/60 cursor-pointer transition">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${player2FixedSecondaries.includes(item.id) ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600 bg-neutral-900'}`}>
                          {player2FixedSecondaries.includes(item.id) && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-neutral-200">{item.name}</span>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep('player1_secondaries')} className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3.5 rounded-xl transition text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"><ArrowLeft size={16} /> Back</button>
            <button type="button" onClick={() => setStep('live_tracker')} className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer">Start Game →</button>
          </div>
        </div>
      )}

      {/* --- BILDSCHIRM 9: LIVE GAME TRACKER --- */}
      {step === 'live_tracker' && (
        <div className="space-y-8">
          
          {/* SPIELER 1 LIVE BEREICH */}
          <div className="border-2 border-dashed border-neutral-700 bg-neutral-950/70 rounded-2xl p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <div className="font-black text-base text-sky-400 uppercase tracking-wide">{player1Name}</div>
              <div className="text-xs font-mono font-bold text-neutral-400">Total VP: <span className="text-white text-sm font-black">{p1Stats?.grandTotalVp || 0}</span></div>
            </div>

            {/* CP Counter */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider">COMMAND POINTS</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex items-center justify-between">
                  <button onClick={() => setP1CpGained(Math.max(0, p1CpGained - 1))} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Minus size={14} /></button>
                  <div className="text-center"><span className="text-sm font-bold text-white">{p1CpGained}</span><span className="text-[9px] text-neutral-500 block">Gained</span></div>
                  <button onClick={() => setP1CpGained(p1CpGained + 1)} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Plus size={14} /></button>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex items-center justify-between">
                  <button onClick={() => setP1CpSpent(Math.max(0, p1CpSpent - 1))} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Minus size={14} /></button>
                  <div className="text-center"><span className="text-sm font-bold text-white">{p1CpSpent}</span><span className="text-[9px] text-neutral-500 block">Spent</span></div>
                  <button onClick={() => setP1CpSpent(p1CpSpent + 1)} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Plus size={14} /></button>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-amber-400 font-mono">{Math.max(0, p1CpGained - p1CpSpent)}</span>
                  <span className="text-[9px] text-neutral-500 uppercase font-bold">CP</span>
                </div>
              </div>
            </div>

            {/* Primary Mission Scoring Checkboxes */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider">PRIMARY: {p1PrimaryRule?.name || player1Primary} ({p1Stats?.finalPrimaryVp || 0}/45)</span>
                <span className="text-[10px] text-neutral-500 font-bold">Round VP: {p1Stats?.roundPrimaryVp?.[currentRound] || 0}/15</span>
              </div>

              {p1PrimaryRule?.text && (
                <div className="text-[11px] text-neutral-400 bg-neutral-900/80 border border-neutral-800 p-2.5 rounded-lg leading-relaxed">
                  <span className="font-bold text-amber-400 mr-1">Regel:</span>{p1PrimaryRule.text}
                </div>
              )}

              <div className="space-y-2">
                {(p1PrimaryRule?.triggers || []).map((trig) => {
                  const isAvailable = isTriggerAvailableInRound(trig, currentRound);
                  const isScored = !!(p1ScoredPrimaries[`r${currentRound}`] || {})[trig.key];

                  return (
                    <div
                      key={`p1-trig-${trig.key}`}
                      onClick={() => isAvailable && togglePrimaryScoring('player1', trig.key)}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        !isAvailable 
                          ? 'opacity-35 bg-neutral-900/40 border-neutral-800/40 cursor-not-allowed'
                          : isScored
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 cursor-pointer shadow-md'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isScored ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600 bg-neutral-950'}`}>
                          {isScored && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{trig.label}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{trig.vp} VP | {trig.timing}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Secondary Mission Scoring */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider">SECONDARY: {p1Stats?.finalSecondaryVp || 0}/45</span>
                <span className="text-[10px] text-neutral-500 font-bold">Round VP: {p1Stats?.roundSecondaryVp?.[currentRound] || 0}</span>
              </div>

              {/* Tactical Modus Dropdowns */}
              {player1SecondaryMode === 'tactical' && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value && p1TacticalHand.length < 2 && !p1TacticalHand.includes(e.target.value)) {
                        setP1TacticalHand([...p1TacticalHand, e.target.value]);
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs p-2.5 rounded-xl font-bold focus:border-amber-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>+ Mission ziehen ({p1TacticalHand.length}/2)...</option>
                    {allSecondaryCards.filter(c => !p1TacticalHand.includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setP1TacticalHand(p1TacticalHand.filter(id => id !== e.target.value));
                        setP1CpGained(p1CpGained + 1);
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 text-xs p-2.5 rounded-xl font-bold focus:border-red-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Discard (+1 CP)...</option>
                    {p1TacticalHand.map(cardId => {
                      const c = getSecondaryCardInfo(cardId);
                      return <option key={cardId} value={cardId}>{c.name}</option>;
                    })}
                  </select>
                </div>
              )}

              {/* Render aktive Secondaries */}
              <div className="space-y-2">
                {(player1SecondaryMode === 'fixed' ? player1FixedSecondaries : p1TacticalHand).map((cardId) => {
                  const cardInfo = getSecondaryCardInfo(cardId);
                  const triggers = getSecondaryScoringTriggers(cardId, player1SecondaryMode === 'fixed');
                  const currentScores = p1ScoredSecondaries[`r${currentRound}`] || {};

                  return (
                    <div key={cardId} className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                          <Target size={14} className="text-amber-500" /> {cardInfo.name}
                        </span>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                          {player1SecondaryMode === 'fixed' ? 'Fixed' : 'Tactical'}
                        </span>
                      </div>

                      {cardInfo.desc && (
                        <p className="text-[11px] text-neutral-400 italic bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60">
                          {cardInfo.desc}
                        </p>
                      )}

                      <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
                        {triggers.map(trig => {
                          const compositeKey = `${cardId}:::${trig.key}`;
                          const isChecked = !!currentScores[compositeKey];

                          return (
                            <div
                              key={trig.key}
                              onClick={() => toggleSecondaryScoring('player1', cardId, trig.key)}
                              className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                isChecked ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600'}`}>
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span className="text-xs font-medium">{trig.label}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-amber-400">+{trig.vp} VP</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SPIELER 2 LIVE BEREICH */}
          <div className="border-2 border-dashed border-neutral-700 bg-neutral-950/70 rounded-2xl p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <div className="font-black text-base text-red-400 uppercase tracking-wide">{player2Name}</div>
              <div className="text-xs font-mono font-bold text-neutral-400">Total VP: <span className="text-white text-sm font-black">{p2Stats?.grandTotalVp || 0}</span></div>
            </div>

            {/* CP Counter */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider">COMMAND POINTS</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex items-center justify-between">
                  <button onClick={() => setP2CpGained(Math.max(0, p2CpGained - 1))} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Minus size={14} /></button>
                  <div className="text-center"><span className="text-sm font-bold text-white">{p2CpGained}</span><span className="text-[9px] text-neutral-500 block">Gained</span></div>
                  <button onClick={() => setP2CpGained(p2CpGained + 1)} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Plus size={14} /></button>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex items-center justify-between">
                  <button onClick={() => setP2CpSpent(Math.max(0, p2CpSpent - 1))} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Minus size={14} /></button>
                  <div className="text-center"><span className="text-sm font-bold text-white">{p2CpSpent}</span><span className="text-[9px] text-neutral-500 block">Spent</span></div>
                  <button onClick={() => setP2CpSpent(p2CpSpent + 1)} className="p-1 text-neutral-400 hover:text-white cursor-pointer"><Plus size={14} /></button>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-amber-400 font-mono">{Math.max(0, p2CpGained - p2CpSpent)}</span>
                  <span className="text-[9px] text-neutral-500 uppercase font-bold">CP</span>
                </div>
              </div>
            </div>

            {/* Primary Mission Scoring Checkboxes */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider">PRIMARY: {p2PrimaryRule?.name || player2Primary} ({p2Stats?.finalPrimaryVp || 0}/45)</span>
                <span className="text-[10px] text-neutral-500 font-bold">Round VP: {p2Stats?.roundPrimaryVp?.[currentRound] || 0}/15</span>
              </div>

              {p2PrimaryRule?.text && (
                <div className="text-[11px] text-neutral-400 bg-neutral-900/80 border border-neutral-800 p-2.5 rounded-lg leading-relaxed">
                  <span className="font-bold text-amber-400 mr-1">Regel:</span>{p2PrimaryRule.text}
                </div>
              )}

              <div className="space-y-2">
                {(p2PrimaryRule?.triggers || []).map((trig) => {
                  const isAvailable = isTriggerAvailableInRound(trig, currentRound);
                  const isScored = !!(p2ScoredPrimaries[`r${currentRound}`] || {})[trig.key];

                  return (
                    <div
                      key={`p2-trig-${trig.key}`}
                      onClick={() => isAvailable && togglePrimaryScoring('player2', trig.key)}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        !isAvailable 
                          ? 'opacity-35 bg-neutral-900/40 border-neutral-800/40 cursor-not-allowed'
                          : isScored
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 cursor-pointer shadow-md'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isScored ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600 bg-neutral-950'}`}>
                          {isScored && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div>
                          <div className="text-xs font-bold">{trig.label}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{trig.vp} VP | {trig.timing}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Secondary Mission Scoring */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider">SECONDARY: {p2Stats?.finalSecondaryVp || 0}/45</span>
                <span className="text-[10px] text-neutral-500 font-bold">Round VP: {p2Stats?.roundSecondaryVp?.[currentRound] || 0}</span>
              </div>

              {player2SecondaryMode === 'tactical' && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value && p2TacticalHand.length < 2 && !p2TacticalHand.includes(e.target.value)) {
                        setP2TacticalHand([...p2TacticalHand, e.target.value]);
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs p-2.5 rounded-xl font-bold focus:border-amber-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>+ Mission ziehen ({p2TacticalHand.length}/2)...</option>
                    {allSecondaryCards.filter(c => !p2TacticalHand.includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setP2TacticalHand(p2TacticalHand.filter(id => id !== e.target.value));
                        setP2CpGained(p2CpGained + 1);
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 text-xs p-2.5 rounded-xl font-bold focus:border-red-500 outline-none cursor-pointer"
                  >
                    <option value="" disabled>Discard (+1 CP)...</option>
                    {p2TacticalHand.map(cardId => {
                      const c = getSecondaryCardInfo(cardId);
                      return <option key={cardId} value={cardId}>{c.name}</option>;
                    })}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                {(player2SecondaryMode === 'fixed' ? player2FixedSecondaries : p2TacticalHand).map((cardId) => {
                  const cardInfo = getSecondaryCardInfo(cardId);
                  const triggers = getSecondaryScoringTriggers(cardId, player2SecondaryMode === 'fixed');
                  const currentScores = p2ScoredSecondaries[`r${currentRound}`] || {};

                  return (
                    <div key={cardId} className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                          <Target size={14} className="text-amber-500" /> {cardInfo.name}
                        </span>
                        <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                          {player2SecondaryMode === 'fixed' ? 'Fixed' : 'Tactical'}
                        </span>
                      </div>

                      {cardInfo.desc && (
                        <p className="text-[11px] text-neutral-400 italic bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60">
                          {cardInfo.desc}
                        </p>
                      )}

                      <div className="space-y-1.5 pt-1 border-t border-neutral-800/80">
                        {triggers.map(trig => {
                          const compositeKey = `${cardId}:::${trig.key}`;
                          const isChecked = !!currentScores[compositeKey];

                          return (
                            <div
                              key={trig.key}
                              onClick={() => toggleSecondaryScoring('player2', cardId, trig.key)}
                              className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                                isChecked ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'border-amber-500 bg-amber-500 text-neutral-950' : 'border-neutral-600'}`}>
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span className="text-xs font-medium">{trig.label}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-amber-400">+{trig.vp} VP</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RUNDEN NAVIGATION (UNTEN) */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <button
              onClick={() => setCurrentRound(Math.max(1, currentRound - 1))}
              disabled={currentRound === 1}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-xl text-xs font-bold text-neutral-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft size={16} /> Previous Round
            </button>

            <span className="text-sm font-black text-amber-500 uppercase tracking-widest font-mono">
              Round {currentRound} / 5
            </span>

            {currentRound < 5 ? (
              <button
                onClick={() => setCurrentRound(currentRound + 1)}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition shadow-lg cursor-pointer"
              >
                Round {currentRound + 1} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setStep('summary')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition shadow-lg cursor-pointer"
              >
                Finish Game <Trophy size={16} />
              </button>
            )}
          </div>

          {/* SICHERER LÖSCH-BEREICH */}
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-4 text-center mt-6">
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
                    onClick={() => {
                      resetMatch();
                      setShowDeleteConfirm(false);
                    }}
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

        </div>
      )}

      {/* --- BILDSCHIRM 10: SIEGER- & SUMMARY-SCREEN (SCOREBOARD MATRIX & TROPHÄE) --- */}
      {step === 'summary' && (
        <div className="space-y-6">
          {renderTabletopScorecard()}

          <div className="max-w-xl mx-auto w-full">
            <button
              onClick={handleDownloadGraphic}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
            >
              <Download size={18} /> Grafik Herunterladen
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSaveMatchToSupabase}
              disabled={savingMatch || saveSuccess}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg cursor-pointer"
            >
              {saveSuccess ? <Check size={18} /> : <Save size={18} />}
              {savingMatch ? 'Speichert...' : saveSuccess ? 'In Supabase gespeichert!' : 'Match in Club-Datenbank speichern'}
            </button>

            <button
              onClick={resetMatch}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
            >
              Neues Match starten <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

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
            {renderTabletopScorecard()}
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

      {/* MODAL: SELECT A TERRAIN LAYOUT */}
      {showLayoutModal && (
        <div 
          onClick={() => setShowLayoutModal(false)}
          className="fixed inset-0 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden cursor-default"
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <button onClick={() => setShowLayoutModal(false)} className="text-neutral-400 hover:text-neutral-100 p-1 cursor-pointer"><ArrowLeft size={18} /></button>
                <h3 className="text-base font-black text-neutral-100">Select a terrain layout</h3>
              </div>
              <button onClick={() => setShowLayoutModal(false)} className="text-neutral-400 hover:text-neutral-100 p-1 cursor-pointer"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {getSortedLayoutGroups().map(([mId, layouts]) => {
                const isCurrent = mId === selectedMatchupId;
                return (
                  <div key={mId} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isCurrent ? 'text-amber-400 font-extrabold' : 'text-neutral-400'}`}>
                        {isCurrent && <span>⭐</span>}{getMatchupNiceTitle(mId)}
                      </h4>
                      {isCurrent && <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">Empfohlen</span>}
                    </div>
                    <div className={`rounded-xl divide-y overflow-hidden transition ${isCurrent ? 'bg-neutral-950 border-2 border-amber-500/60 shadow-lg shadow-amber-950/20 divide-neutral-800' : 'bg-neutral-950 border border-neutral-800 divide-neutral-800'}`}>
                      {layouts.map((layout) => (
                        <div key={layout.id} onClick={() => handleSelectLayoutFromModal(layout)} className={`p-3.5 flex items-center justify-between cursor-pointer transition ${selectedTerrainLayoutId === layout.id ? 'bg-amber-600/15 text-amber-400' : isCurrent ? 'hover:bg-amber-950/30 text-neutral-200' : 'hover:bg-neutral-900 text-neutral-200'}`}>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 text-neutral-400"><Map size={18} /></div>
                            <div>
                              <div className={`text-sm font-bold flex items-center gap-1.5 ${selectedTerrainLayoutId === layout.id ? 'text-amber-400' : isCurrent ? 'text-neutral-100' : 'text-neutral-300'}`}>
                                <span>{getVariantLetter(layout.variant)}</span>{isCurrent && <span className="text-amber-400 text-xs">⭐</span>}
                              </div>
                              {isCurrent && <div className="text-[11px] text-amber-400 italic mt-0.5">This layout is recommended for this mission</div>}
                            </div>
                          </div>
                          {selectedTerrainLayoutId === layout.id && <Check size={18} className="text-amber-400" />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* POPUP: IMAGE SAVE MODAL FOR MOBILE */}
      {shareImageUrl && (
        <div
          onClick={() => setShareImageUrl(null)}
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
              <button onClick={() => setShareImageUrl(null)} className="text-neutral-400 hover:text-white p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-[11px] text-neutral-300 leading-normal font-medium">
              📱 <strong>Handy / Tablet</strong>: Halte das Bild gedrückt, um es in deinen Fotos zu sichern oder direkt zu teilen.
            </p>
            
            <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950 p-2 max-h-[60vh] overflow-y-auto">
              <img
                src={shareImageUrl}
                alt="Warhammer 40k Match Scorecard"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
            
            <button
              onClick={() => setShareImageUrl(null)}
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
