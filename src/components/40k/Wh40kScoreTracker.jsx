import React, { useState } from 'react';
// Importiere eure lokalen JSONs direkt aus dem data/40k Ordner
import forceDispositionsData from '../../data/40k/force-dispositions.json';
import missionsData from '../../data/40k/missions.json';
import missionMatchupsData from '../../data/40k/mission-matchups.json';
import factionsData from '../../data/40k/factions.json';
import terrainLayoutsData from '../../data/40k/terrain-layouts.json';

export default function Wh40kScoreTracker({ currentUser }) {
  // Step-Management: 'setup', 'mission_selection', 'player1_primary', 'player2_primary', 'deployment'
  const [step, setStep] = useState('setup');

  // State für das Match-Setup
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Spieler 1 & 2
  const [player1Name, setPlayer1Name] = useState(currentUser?.username || currentUser?.name || '');
  const [player1List, setPlayer1List] = useState('');
  const [player1Faction, setPlayer1Faction] = useState(factionsData[0]?.name || 'Aeldari');
  const [player1Disposition, setPlayer1Disposition] = useState(forceDispositionsData[0]?.id || 'take-and-hold');
  const [player1BattleReady, setPlayer1BattleReady] = useState(false);
  const [player1Primary, setPlayer1Primary] = useState('');

  const [player2Name, setPlayer2Name] = useState('');
  const [player2List, setPlayer2List] = useState('');
  const [player2Faction, setPlayer2Faction] = useState(factionsData[1]?.name || 'Adeptus Custodes');
  const [player2Disposition, setPlayer2Disposition] = useState(forceDispositionsData[2]?.id || 'purge-the-foe');
  const [player2BattleReady, setPlayer2BattleReady] = useState(false);
  const [player2Primary, setPlayer2Primary] = useState('');

  // Ausgewählte Mission im zweiten Bildschirm
  const [selectedMatchupId, setSelectedMatchupId] = useState('');

  // States für das Deployment
  const [selectedDeploymentMap, setSelectedDeploymentMap] = useState('Dawn of War');
  const [selectedTerrainLayoutId, setSelectedTerrainLayoutId] = useState('');

  // Hilfsfunktion, um den schönen Namen einer Disposition anhand der ID zu bekommen
  const getDispositionName = (id) => {
    const disp = forceDispositionsData.find(d => d.id === id);
    return disp ? disp.name : id;
  };

  // Hilfsfunktion, um die Fraktionen sauber nach Kategorien in optgroups zu gruppieren
  const renderFactionOptions = () => {
    const categories = ["Das Imperium", "Mächte des Chaos", "Xenos"];
    
    return categories.map(category => {
      const categoryFactions = factionsData.filter(f => f.category === category);
      if (categoryFactions.length === 0) return null;

      return (
        <optgroup key={category} label={`--- ${category.toUpperCase()} ---`}>
          {categoryFactions.map(fac => (
            <option key={fac.id} value={fac.name}>
              {fac.name}
            </option>
          ))}
        </optgroup>
      );
    });
  };

  // Reduziere die Matchups auf die 15 einzigartigen Paarungen
  const rawUniqueMatchups = missionMatchupsData.reduce((acc, current) => {
    const exists = acc.find(m => 
      (m.disposition === current.disposition && m.opponent_disposition === current.opponent_disposition) ||
      (m.disposition === current.opponent_disposition && m.opponent_disposition === current.disposition)
    );
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  // Sortiere die einzigartigen Matchups so, dass das empfohlene Paar immer an Position 1 steht
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

    setSelectedMatchupId(uniqueMatchup.id);
    setStep('mission_selection');
  };

  // Ermittle die beiden möglichen Missionen für Spieler 1 basierend auf dem gewählten Matchup
  const getPlayer1AvailableMissions = () => {
    const selectedPair = uniqueMatchups.find(m => m.id === selectedMatchupId);
    if (!selectedPair) return [];

    const match1 = missionMatchupsData.find(m => m.disposition === selectedPair.disposition && m.opponent_disposition === selectedPair.opponent_disposition);
    const match2 = missionMatchupsData.find(m => m.disposition === selectedPair.opponent_disposition && m.opponent_disposition === selectedPair.disposition);

    const missions = [];
    if (match1) {
      const missionObj = missionsData.find(m => m.id === match1.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match1 });
    }
    if (match2 && match2.mission_id !== match1?.mission_id) {
      const missionObj = missionsData.find(m => m.id === match2.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match2 });
    }
    return missions;
  };

  // Ermittle die Missionen für Spieler 2 (Opponent's Primary)
  const getPlayer2AvailableMissions = () => {
    const selectedPair = uniqueMatchups.find(m => m.id === selectedMatchupId);
    if (!selectedPair) return [];

    const match1 = missionMatchupsData.find(m => m.disposition === selectedPair.opponent_disposition && m.opponent_disposition === selectedPair.disposition);
    const match2 = missionMatchupsData.find(m => m.disposition === selectedPair.disposition && m.opponent_disposition === selectedPair.opponent_disposition);

    const missions = [];
    if (match1) {
      const missionObj = missionsData.find(m => m.id === match1.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match1 });
    }
    if (match2 && match2.mission_id !== match1?.mission_id) {
      const missionObj = missionsData.find(m => m.id === match2.mission_id);
      if (missionObj) missions.push({ ...missionObj, matchupRecord: match2 });
    }
    return missions;
  };

  return (
    <div className="max-w-3xl mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 text-neutral-100 font-sans shadow-2xl">
      
      {/* Header im App-Design */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-amber-500 uppercase tracking-wider">
            0-0 You vs Opponent
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {step === 'setup' && 'Game Setup - Players & Force Dispositions'}
            {step === 'mission_selection' && 'Mission Selection'}
            {step === 'player1_primary' && "Your Primary Mission"}
            {step === 'player2_primary' && "Opponent's Primary Mission"}
            {step === 'deployment' && "Deployment Map & Terrain Layout"}
          </p>
        </div>
        <span className="text-xs bg-amber-600/20 text-amber-400 border border-amber-600/40 px-3 py-1 rounded-lg font-bold">
          {step === 'setup' && 'Step 1 / Setup'}
          {step === 'mission_selection' && 'Step 2 / Mission'}
          {step === 'player1_primary' && 'Step 3 / Your Primary'}
          {step === 'player2_primary' && 'Step 4 / Opponent Primary'}
          {step === 'deployment' && 'Step 5 / Deployment'}
        </span>
      </div>

      {/* BILDSCHIRM 1: SETUP */}
      {step === 'setup' && (
        <form onSubmit={handleNextStep} className="space-y-6">
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Game Date</label>
            <input 
              type="date" 
              value={matchDate} 
              onChange={(e) => setMatchDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition"
            />
          </div>

          {/* Spieler 1 */}
          <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Your Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Your Name</label>
                <input 
                  type="text" 
                  placeholder="Your name"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Faction</label>
                <select 
                  value={player1Faction}
                  onChange={(e) => setPlayer1Faction(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer"
                >
                  {renderFactionOptions()}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Add an army list...</label>
              <input 
                type="text" 
                placeholder="Paste army list or details..."
                value={player1List}
                onChange={(e) => setPlayer1List(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Force Disposition</label>
              <select 
                value={player1Disposition}
                onChange={(e) => setPlayer1Disposition(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer"
              >
                {forceDispositionsData.map((disp) => (
                  <option key={disp.id} value={disp.id}>{disp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
              <span className="text-xs text-neutral-300 font-medium">Army is Battle Ready (10pts)</span>
              <input 
                type="checkbox" 
                checked={player1BattleReady}
                onChange={(e) => setPlayer1BattleReady(e.target.checked)}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Spieler 2 */}
          <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Opponent Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Opponent's name</label>
                <input 
                  type="text" 
                  placeholder="Opponent's name"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1 font-medium">Faction</label>
                <select 
                  value={player2Faction}
                  onChange={(e) => setPlayer2Faction(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer"
                >
                  {renderFactionOptions()}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Add an army list...</label>
              <input 
                type="text" 
                placeholder="Paste opponent army list..."
                value={player2List}
                onChange={(e) => setPlayer2List(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 font-medium">Force Disposition</label>
              <select 
                value={player2Disposition}
                onChange={(e) => setPlayer2Disposition(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-100 focus:border-amber-500 outline-none transition cursor-pointer"
              >
                {forceDispositionsData.map((disp) => (
                  <option key={disp.id} value={disp.id}>{disp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
              <span className="text-xs text-neutral-300 font-medium">Army is Battle Ready (10pts)</span>
              <input 
                type="checkbox" 
                checked={player2BattleReady}
                onChange={(e) => setPlayer2BattleReady(e.target.checked)}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3.5 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer"
          >
            Next: Mission Matrix →
          </button>
        </form>
      )}

      {/* BILDSCHIRM 2: MISSION MATRIX */}
      {step === 'mission_selection' && (
        <div className="space-y-4">
          <button 
            onClick={() => {
              const randomIndex = Math.floor(Math.random() * uniqueMatchups.length);
              setSelectedMatchupId(uniqueMatchups[randomIndex]?.id);
            }}
            className="w-full bg-neutral-950 border border-neutral-800 hover:border-amber-500 text-amber-400 font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <span>🎲 Randomize Mission</span>
          </button>

          <div className="space-y-2">
            {uniqueMatchups.map((matchup, index) => {
              const p1DispName = getDispositionName(matchup.disposition);
              const p2DispName = getDispositionName(matchup.opponent_disposition);
              
              const matchForward = missionMatchupsData.find(m => m.disposition === matchup.disposition && m.opponent_disposition === matchup.opponent_disposition);
              const matchBackward = missionMatchupsData.find(m => m.disposition === matchup.opponent_disposition && m.opponent_disposition === matchup.disposition);

              const missionForward = missionsData.find(m => m.id === matchForward?.mission_id);
              const missionBackward = missionsData.find(m => m.id === matchBackward?.mission_id);

              const missionTitle1 = missionForward ? missionForward.name : 'Unknown';
              const missionTitle2 = missionBackward ? missionBackward.name : 'Unknown';

              const isRecommended = (
                (matchup.disposition === player1Disposition && matchup.opponent_disposition === player2Disposition) ||
                (matchup.disposition === player2Disposition && matchup.opponent_disposition === player1Disposition)
              );

              const isSelected = selectedMatchupId === matchup.id;

              return (
                <div 
                  key={matchup.id || index}
                  onClick={() => setSelectedMatchupId(matchup.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                    isSelected 
                      ? 'bg-amber-600/10 border-amber-500 text-amber-400' 
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="missionSelect"
                      checked={isSelected}
                      onChange={() => setSelectedMatchupId(matchup.id)}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-bold flex items-center gap-2">
                        <span>{p1DispName} vs {p2DispName}</span>
                        {isRecommended && <span className="text-amber-400 text-xs" title="Empfohlene Mission">⭐</span>}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {missionTitle1} / {missionTitle2}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs bg-neutral-800 text-neutral-300 font-bold px-2.5 py-1 rounded-md border border-neutral-700">
                    {index + 1}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setStep('setup')}
              className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer"
            >
              ← Back
            </button>
            <button 
              onClick={() => {
                const available = getPlayer1AvailableMissions();
                if (available.length > 0 && !player1Primary) {
                  setPlayer1Primary(available[0].name);
                }
                setStep('player1_primary');
              }}
              className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer"
            >
              Next: Your Primary →
            </button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 3: YOUR PRIMARY (Spieler 1 Primärmission mit Stern & Highlight) */}
      {step === 'player1_primary' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Your Primary</h3>
          
          <div className="space-y-2">
            {getPlayer1AvailableMissions().map((mission, index) => {
              const isSelected = player1Primary === mission.name;
              const isRecommended = index === 0;

              return (
                <div 
                  key={mission.id}
                  onClick={() => setPlayer1Primary(mission.name)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                    isSelected 
                      ? 'bg-amber-600/10 border-amber-500 text-amber-400' 
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="player1PrimaryRadio"
                      checked={isSelected}
                      onChange={() => setPlayer1Primary(mission.name)}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                    />
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span>{mission.name}</span>
                      {isRecommended && <span className="text-amber-400 text-xs" title="Empfohlene Primärmission">⭐</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setStep('mission_selection')}
              className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer"
            >
              ← Back
            </button>
            <button 
              onClick={() => {
                const available = getPlayer2AvailableMissions();
                if (available.length > 0 && !player2Primary) {
                  setPlayer2Primary(available[0].name);
                }
                setStep('player2_primary');
              }}
              className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer"
            >
              Next: Opponent's Primary →
            </button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 4: OPPONENT'S PRIMARY (Spieler 2 Primärmission mit Stern & Highlight) */}
      {step === 'player2_primary' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Opponent's Primary</h3>
          
          <div className="space-y-2">
            {getPlayer2AvailableMissions().map((mission, index) => {
              const isSelected = player2Primary === mission.name;
              const isRecommended = index === 0;

              return (
                <div 
                  key={mission.id}
                  onClick={() => setPlayer2Primary(mission.name)}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                    isSelected 
                      ? 'bg-amber-600/10 border-amber-500 text-amber-400' 
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="player2PrimaryRadio"
                      checked={isSelected}
                      onChange={() => setPlayer2Primary(mission.name)}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                    />
                    <div className="text-sm font-bold flex items-center gap-2">
                      <span>{mission.name}</span>
                      {isRecommended && <span className="text-amber-400 text-xs" title="Empfohlene Primärmission">⭐</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setStep('player1_primary')}
              className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer"
            >
              ← Back
            </button>
            <button 
              onClick={() => setStep('deployment')}
              className="w-2/3 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold py-3 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer"
            >
              Next: Deployment →
            </button>
          </div>
        </div>
      )}

      {/* BILDSCHIRM 5: DEPLOYMENT & TERRAIN LAYOUT */}
      {step === 'deployment' && (
        <div className="space-y-6">
          <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Deployment Map</h3>
            <div className="space-y-2">
              {['Dawn of War', 'Sweeping Engagement', 'Tipping Point', 'Search and Destroy', 'Hammer and Anvil', 'Crucible of Battle'].map((mapName, idx) => (
                <div 
                  key={mapName}
                  onClick={() => setSelectedDeploymentMap(mapName)}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    selectedDeploymentMap === mapName 
                      ? 'bg-amber-600/10 border-amber-500 text-amber-400' 
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="deploymentMapSelect"
                      checked={selectedDeploymentMap === mapName}
                      onChange={() => setSelectedDeploymentMap(mapName)}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                    />
                    <span className="text-sm font-bold">{idx + 1}. {mapName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider">Terrain Layout</h3>
            <p className="text-xs text-neutral-400">Verfügbare Layouts für Matchup-ID: <span className="text-amber-400 font-mono">{selectedMatchupId}</span></p>
            
            <div className="space-y-2">
              {terrainLayoutsData
                .filter(layout => !selectedMatchupId || layout.mission_matchup_id === selectedMatchupId)
                .map((layout) => {
                  const isSelected = selectedTerrainLayoutId === layout.id;
                  return (
                    <div 
                      key={layout.id}
                      onClick={() => setSelectedTerrainLayoutId(layout.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                        isSelected 
                          ? 'bg-amber-600/10 border-amber-500 text-amber-400' 
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="terrainLayoutSelect"
                          checked={isSelected}
                          onChange={() => setSelectedTerrainLayoutId(layout.id)}
                          className="w-4 h-4 accent-amber-600 accent-amber-600 cursor-pointer"
                        />
                        <div>
                          <span className="text-sm font-bold">{layout.name || layout.id}</span>
                          {layout.recommended && (
                            <span className="ml-2 text-xs text-amber-400 italic">This layout is recommended for this mission</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {terrainLayoutsData.filter(layout => !selectedMatchupId || layout.mission_matchup_id === selectedMatchupId).length === 0 && (
                <div className="text-xs text-neutral-500 italic p-3 text-center border border-dashed border-neutral-800 rounded-lg">
                  Keine spezifischen Layouts für diese Matchup-ID gefunden. Zeige Standard-Layouts.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setStep('player2_primary')}
              className="w-1/3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-3 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer"
            >
              ← Back
            </button>
            <button 
              onClick={() => alert(`Match erfolgreich eingerichtet! Gewählte Deployment-Map: ${selectedDeploymentMap}, Layout-ID: ${selectedTerrainLayoutId || 'Keine'}`)}
              className="w-2/3 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition text-sm uppercase tracking-wider shadow-lg cursor-pointer"
            >
              Finish Match Setup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}