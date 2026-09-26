import React, { useState, useEffect } from 'react';
import { Users, Swords, Map, Gem, Skull, Save, Target, Mic, MicOff, BookOpen, BookText, Trash2, Play, SkipForward, Info } from 'lucide-react';
import { calculateMod } from '../utils/dndEngine';

const DEFAULT_BESTIARY = [
  { id: 'm_goblin', name: 'Goblin Scout', ac: 13, hp: 7, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, actions: [{ name: 'Shortbow', stat: 'dex', dmgSides: 6, dmgCount: 1 }] },
  { id: 'm_snarl', name: 'Snarl (Wolf)', ac: 13, hp: 11, str: 12, dex: 15, con: 11, int: 3, wis: 12, cha: 6, actions: [{ name: 'Bite', stat: 'dex', dmgSides: 4, dmgCount: 1 }] },
  { id: 'm_kargg', name: 'Kargg (Boss)', ac: 15, hp: 21, str: 14, dex: 14, con: 12, int: 10, wis: 8, cha: 10, actions: [{ name: 'Scimitar', stat: 'str', dmgSides: 6, dmgCount: 1 }] }
];

const DEFAULT_LOOT = [
  { id: 'l_1', name: 'Elara’s Fortune Token', type: 'Artifact', rarity: 'Rare', weight: 30, stats: '+1 to Saves', description: 'A smooth wooden tile depicting a golden sun.' },
  { id: 'l_2', name: 'Jace’s Spark-Blade', type: 'Weapon', rarity: 'Uncommon', weight: 15, stats: '1d6 Slash + 1d4 Lightning', description: 'A modified shortsword with copper wiring.' },
  { id: 'l_3', name: 'Potion of Healing', type: 'Consumable', rarity: 'Common', weight: 100, stats: '2d4+2 HP', description: 'A classic red vial.' }
];

export default function DMDashboard({ network, gameState, setGameState }) {
  const [activeTab, setActiveTab] = useState('loot');
  const [showRules, setShowRules] = useState(false);
  
  const [bestiary, setBestiary] = useState(() => {
    const saved = localStorage.getItem('dnd_bestiary');
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : DEFAULT_BESTIARY;
  });
  
  const [lootPool, setLootPool] = useState(() => {
    const saved = localStorage.getItem('dnd_loot');
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : DEFAULT_LOOT;
  });
  
  const [activeMonsters, setActiveMonsters] = useState([]);
  const [generatedLoot, setGeneratedLoot] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const [newMonster, setNewMonster] = useState({ name: '', ac: 10, hp: 20, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, actionName: 'Strike', dmgSides: 6 });
  const [newLoot, setNewLoot] = useState({ name: '', type: 'Weapon', rarity: 'Common', weight: 50, stats: '', description: '' });
  
  const [goldAmount, setGoldAmount] = useState('');
  const [lootTarget, setLootTarget] = useState('');
  const [goldTarget, setGoldTarget] = useState('');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  useEffect(() => localStorage.setItem('dnd_bestiary', JSON.stringify(bestiary)), [bestiary]);
  useEffect(() => localStorage.setItem('dnd_loot', JSON.stringify(lootPool)), [lootPool]);

  // --- ACTIONS ---
  const spawnMonster = (mob) => setActiveMonsters([...activeMonsters, { ...mob, instanceId: Date.now(), hpCurrent: mob.hp }]);
  const removeMonster = (id) => setActiveMonsters(activeMonsters.filter(m => m.instanceId !== id));
  
  const adjustMobHP = (id, amount) => {
    setActiveMonsters(activeMonsters.map(m => m.instanceId === id ? { ...m, hpCurrent: Math.max(0, m.hpCurrent + amount) } : m));
  };

  const handleSaveMonster = () => {
    if (!newMonster.name) return;
    const customMob = {
      id: `m_${Date.now()}`, name: newMonster.name, ac: newMonster.ac, hp: newMonster.hp,
      str: newMonster.str, dex: newMonster.dex, con: newMonster.con, int: newMonster.int, wis: newMonster.wis, cha: newMonster.cha,
      actions: [{ name: newMonster.actionName, stat: 'str', dmgSides: newMonster.dmgSides, dmgCount: 1 }]
    };
    setBestiary([...bestiary, customMob]);
    setNewMonster({ name: '', ac: 10, hp: 20, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, actionName: 'Strike', dmgSides: 6 });
  };

  const handleSaveLoot = () => {
    if (!newLoot.name) return;
    setLootPool([...lootPool, { ...newLoot, id: `l_${Date.now()}`, weight: Number(newLoot.weight) }]);
    setNewLoot({ name: '', type: 'Weapon', rarity: 'Common', weight: 50, stats: '', description: '' });
  };

  const rollMonsterAttack = (monster, action) => {
    const statMod = calculateMod(monster[action.stat] || 10);
    const hitRoll = Math.floor(Math.random() * 20) + 1;
    const totalHit = hitRoll + statMod + 2; 
    let dmgSum = 0;
    for(let i=0; i < (action.dmgCount || 1); i++) dmgSum += Math.floor(Math.random() * (action.dmgSides || 6)) + 1;
    
    const logMsg = `🦇 ${monster.name} used ${action.name}\n🎲 Hit: ${totalHit} (Base ${hitRoll} + ${statMod + 2})\n💥 Dmg: ${dmgSum + statMod} (Base ${dmgSum} + ${statMod})`;
    const autoNote = `\n> ${monster.name} attacked with ${action.name} (Hit: ${totalHit})`;
    const updatedState = { ...gameState, combatLog: [logMsg, ...(gameState.combatLog || [])].slice(0, 50), journal: (gameState.journal || "") + autoNote };
    setGameState(updatedState);
    if (network) network.broadcastState(updatedState);
  };

  const generateRandomLoot = () => {
    if (lootPool.length === 0) return;
    const totalWeight = lootPool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.floor(Math.random() * totalWeight);
    for (const item of lootPool) {
      if (random < item.weight) return setGeneratedLoot(item);
      random -= item.weight;
    }
  };

  // --- LOOT DISTRIBUTION ENGINE ---
  const giveLoot = () => {
    if (!lootTarget || !generatedLoot) return alert('Select a player to give the item to.');
    const targetName = gameState.party[lootTarget].name;
    const action = { type: 'GIVE_LOOT', playerId: lootTarget, item: generatedLoot, timestamp: Date.now() };
    const logMsg = `🎁 ${targetName} received ${generatedLoot.name}!`;
    const autoNote = `\n> ${targetName} received ${generatedLoot.name}`;
    const updatedState = { ...gameState, lastAction: action, combatLog: [logMsg, ...(gameState.combatLog || [])].slice(0, 50), journal: (gameState.journal || '') + autoNote };
    setGameState(updatedState);
    if (network) network.broadcastState(updatedState);
    setGeneratedLoot(null);
  };

  const giveGold = () => {
    if (!goldTarget || !goldAmount) return alert('Enter an amount and select a player.');
    const targetName = gameState.party[goldTarget].name;
    const action = { type: 'GIVE_GOLD', playerId: goldTarget, amount: Number(goldAmount), timestamp: Date.now() };
    const logMsg = `💰 ${targetName} received ${goldAmount} Gold!`;
    const autoNote = `\n> ${targetName} received ${goldAmount} GP`;
    const updatedState = { ...gameState, lastAction: action, combatLog: [logMsg, ...(gameState.combatLog || [])].slice(0, 50), journal: (gameState.journal || '') + autoNote };
    setGameState(updatedState);
    if (network) network.broadcastState(updatedState);
    setGoldAmount('');
  };

  const startEncounter = () => {
    let order = [];
    Object.values(gameState.party || {}).forEach(p => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const mod = p.initiative || 0;
      order.push({ id: p.id, name: p.name, type: "player", init: roll + mod, roll, mod });
    });
    activeMonsters.forEach(m => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const mod = calculateMod(m.dex || 10);
      order.push({ id: m.instanceId, name: m.name, type: "monster", init: roll + mod, roll, mod });
    });
    order.sort((a, b) => b.init - a.init);

    const monsterNames = activeMonsters.map(m => m.name).join(", ");
    const autoNote = `\n\n--- COMBAT ENGAGED ---\n> Enemies: ${monsterNames}\n`;
    const logMsg = `⚔️ Encounter Started! Initiative rolled for ${order.length} combatants.`;
    
    const updatedState = { ...gameState, initiativeOrder: order, activeTurnIndex: 0, combatLog: [logMsg, ...(gameState.combatLog || [])].slice(0, 50), journal: (gameState.journal || "") + autoNote };
    setGameState(updatedState);
    if (network) network.broadcastState(updatedState);
  };

  const nextTurn = () => {
    const nextIndex = (gameState.activeTurnIndex + 1) % gameState.initiativeOrder.length;
    const activeChar = gameState.initiativeOrder[nextIndex];
    const logMsg = `🔔 Top of the turn: It is now ${activeChar.name}'s turn.`;
    const updatedState = { ...gameState, activeTurnIndex: nextIndex, combatLog: [logMsg, ...(gameState.combatLog || [])].slice(0, 50) };
    setGameState(updatedState);
    if (network) network.broadcastState(updatedState);
  };

  const endEncounter = () => {
    setActiveMonsters([]);
    const updatedState = { ...gameState, initiativeOrder: [], activeTurnIndex: 0, combatLog: [`🛡️ Encounter Ended.`, ...(gameState.combatLog || [])].slice(0, 50) };
    setGameState(updatedState);
    if (network) network.broadcastState(updatedState);
  };

  const toggleDictation = () => {
    if (!recognition) return alert("Your browser doesn't support voice dictation.");
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        }
        if (finalTranscript) {
          const newText = (gameState.journal || '') + '\n' + finalTranscript;
          setGameState({ ...gameState, journal: newText });
          if (network) network.broadcastState({ ...gameState, journal: newText });
        }
      };
      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
    }
  };

  // --- RENDERERS ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--surface)' }}>
        {[ 
          { id: 'story', icon: BookOpen, label: 'Story' },
          { id: 'journal', icon: BookText, label: 'Journal' },
          { id: 'party', icon: Users, label: 'Party' },
          { id: 'combat', icon: Swords, label: 'Combat' },
          { id: 'bestiary', icon: Skull, label: 'Bestiary' },
          { id: 'loot', icon: Gem, label: 'Loot' }
        ].map(tab => (
          <button 
            key={tab.id}
            className={activeTab === tab.id ? 'btn-primary' : 'btn-outline'} 
            style={{ padding: '8px 12px', minWidth: 'max-content', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'story' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3 style={{color: 'var(--accent)', marginBottom: '8px'}}>Module: The Stolen Core of Oakhaven</h3>
            <p style={{fontSize: '14px', color: 'var(--text-muted)'}}>Read the bold italic text aloud to your players.</p>
          </div>
          <div className="card">
            <h4 style={{marginBottom: '8px'}}>Act 1: The Velvet Table</h4>
            <p style={{fontSize: '14px', fontStyle: 'italic', marginBottom: '8px'}}>
              "You sit in the dimly lit parlor of Madame Elara. The air smells of pine and old parchment. The town's power crystal was stolen last night, but Elara called you here for a different reason: destiny."
            </p>
            <div style={{background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', fontSize: '12px'}}>
              <strong>NPC: Madame Elara (Neutral Ally)</strong>
              <ul style={{marginLeft: '16px', marginTop: '4px', color: 'var(--text-muted)'}}>
                <li>Warm, mysterious. Uses a deck of illustrated cards to divine the future.</li>
                <li><strong>Goal:</strong> Force the players to agree on a "Party Name" before leaving the tent.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="card" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3>Campaign Journal</h3>
            <button className={isRecording ? 'btn-primary' : 'btn-outline'} style={{width: 'auto', padding: '8px', background: isRecording ? 'var(--danger)' : 'transparent'}} onClick={toggleDictation}>
              {isRecording ? <MicOff size={18} color="white"/> : <Mic size={18} />}
            </button>
          </div>
          <textarea 
            value={gameState.journal || ''} 
            onChange={(e) => setGameState({...gameState, journal: e.target.value})}
            style={{width: '100%', minHeight: '300px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--surface)', padding: '12px', borderRadius: '8px'}}
          />
        </div>
      )}

      {activeTab === 'party' && (
        <div className="card">
          <h3 style={{marginBottom: '16px'}}>Connected Party</h3>
          {Object.keys(gameState.party || {}).length === 0 ? <p style={{color: 'var(--text-muted)'}}>No players connected.</p> : (
            Object.values(gameState.party).map((player, i) => (
              <div key={i} style={{background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '10px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                  <span>{player.name} ({player.class})</span>
                  <span style={{color: 'var(--success)'}}>HP: {player.hpCurrent}/{player.hpMax}</span>
                </div>
                <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>
                  AC: {player.ac} | STR {player.stats?.str} | DEX {player.stats?.dex} | INT {player.stats?.int}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'combat' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div className="card" style={{border: '1px solid var(--accent)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h3 style={{color: 'var(--accent)'}}>Turn Tracker</h3>
              {(!gameState.initiativeOrder || gameState.initiativeOrder.length === 0) ? (
                <button className="btn-primary flex-center" style={{padding: '8px 12px', width: 'auto', fontSize: '14px'}} onClick={startEncounter} disabled={activeMonsters.length === 0}>
                  <Play size={16} /> Engage
                </button>
              ) : (
                <div style={{display: 'flex', gap: '8px'}}>
                  <button className="btn-primary flex-center" style={{padding: '8px 12px', width: 'auto', fontSize: '14px'}} onClick={nextTurn}>
                    <SkipForward size={16} /> Next
                  </button>
                  <button className="btn-outline flex-center" style={{padding: '8px 12px', width: 'auto', fontSize: '14px', borderColor: 'var(--danger)', color: 'var(--danger)'}} onClick={endEncounter}>
                    End
                  </button>
                </div>
              )}
            </div>

            {gameState.initiativeOrder && gameState.initiativeOrder.length > 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                {gameState.initiativeOrder.map((char, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px', borderRadius: '6px',
                    background: idx === gameState.activeTurnIndex ? 'var(--accent)' : 'var(--bg-dark)',
                    color: idx === gameState.activeTurnIndex ? 'white' : (char.type === 'monster' ? 'var(--danger)' : 'var(--text-main)')
                  }}>
                    <span style={{fontWeight: 'bold'}}>{idx === gameState.activeTurnIndex ? '▶ ' : ''}{char.name}</span>
                    <span>Init: {char.init}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>Spawn monsters from the Bestiary, then click Engage to roll initiative.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Active Monsters</h3>
            {activeMonsters.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Encounter is clear.</p> : (
              activeMonsters.map(mob => (
                <div key={mob.instanceId} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                    <strong>{mob.name}</strong>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <button onClick={() => adjustMobHP(mob.instanceId, -1)} style={{padding: '4px 8px', background: 'var(--surface)', color: 'white'}}>-</button>
                      <span style={{color: 'var(--danger)'}}>{mob.hpCurrent}/{mob.hp}</span>
                      <button onClick={() => adjustMobHP(mob.instanceId, 1)} style={{padding: '4px 8px', background: 'var(--surface)', color: 'white'}}>+</button>
                      <button onClick={() => removeMonster(mob.instanceId)} style={{padding: '4px', background: 'transparent', color: 'var(--danger)'}}><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '8px', overflowX: 'auto'}}>
                    {mob.actions?.map((act, idx) => (
                      <button key={idx} className="btn-primary flex-center" style={{padding: '8px', fontSize: '12px', minWidth: 'max-content'}} onClick={() => rollMonsterAttack(mob, act)}>
                        <Target size={14} /> {act.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Combat Log</h3>
            <div style={{ fontSize: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {gameState.combatLog?.length === 0 ? <span style={{color: "var(--text-muted)"}}>Awaiting action...</span> : gameState.combatLog?.map((log, i) => (
                <div key={i} style={{background: "var(--bg-dark)", padding: "12px", borderRadius: "8px", whiteSpace: "pre-wrap", borderLeft: "2px solid var(--accent)"}}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bestiary' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Bestiary / Spawner</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
              {bestiary.map(mob => (
                <button key={mob.id} className="btn-outline" style={{padding: '10px', fontSize: '12px'}} onClick={() => spawnMonster(mob)}>
                  + Spawn {mob.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'loot' && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          
          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Distribute Gold</h3>
            <div style={{display: 'flex', gap: '8px'}}>
              <input type="number" placeholder="Amount" value={goldAmount} onChange={e => setGoldAmount(e.target.value)} style={{flex: 1, marginBottom: 0}} />
              <select value={goldTarget} onChange={e => setGoldTarget(e.target.value)} style={{flex: 2, padding: '12px', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: 'none'}}>
                <option value="">-- Player --</option>
                {Object.values(gameState.party || {}).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button className="btn-primary" style={{width: 'auto', padding: '0 16px'}} onClick={giveGold}>Give</button>
            </div>
          </div>

          <div className="card flex-center" style={{flexDirection: 'column', textAlign: 'center'}}>
            <button className="btn-primary flex-center" style={{padding: '20px', fontSize: '18px'}} onClick={generateRandomLoot}>
              <Gem size={24} /> Roll Random Loot
            </button>
            {generatedLoot && (
              <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginTop: '16px', width: '100%', border: '1px solid var(--accent)'}}>
                <h3 style={{color: 'var(--accent)'}}>{generatedLoot.name}</h3>
                <div style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px'}}>{generatedLoot.rarity} {generatedLoot.type}</div>
                <p style={{fontSize: '14px', marginBottom: '16px'}}>{generatedLoot.description}</p>
                
                <div style={{display: 'flex', gap: '8px'}}>
                  <select value={lootTarget} onChange={e => setLootTarget(e.target.value)} style={{flex: 1, padding: '12px', borderRadius: '8px', background: 'var(--surface)', color: 'white', border: 'none'}}>
                    <option value="">-- Player --</option>
                    {Object.values(gameState.party || {}).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button className="btn-primary" style={{width: 'auto', padding: '0 16px'}} onClick={giveLoot}>Give</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Loot Forge</h3>
            <input type="text" placeholder="ITEM NAME" value={newLoot.name} onChange={e => setNewLoot({...newLoot, name: e.target.value})} />
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px'}}>
              <select value={newLoot.type} onChange={e => setNewLoot({...newLoot, type: e.target.value})} style={{padding: '14px', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--surface)'}}>
                <option>Weapon</option><option>Armor</option><option>Consumable</option><option>Artifact</option>
              </select>
              <input type="number" placeholder="Drop Weight (e.g. 50)" value={newLoot.weight} onChange={e => setNewLoot({...newLoot, weight: e.target.value})} />
            </div>
            <input type="text" placeholder="STATS (e.g. +2 STR, 1d8 Fire)" value={newLoot.stats} onChange={e => setNewLoot({...newLoot, stats: e.target.value})} />
            <input type="text" placeholder="LORE / DESCRIPTION" value={newLoot.description} onChange={e => setNewLoot({...newLoot, description: e.target.value})} />
            <button className="btn-outline flex-center" onClick={handleSaveLoot}><Save size={18}/> Add to Pool</button>
          </div>
        </div>
      )}
    </div>
  );
}
