import React, { useState, useEffect } from 'react';
import { executeAttack, calculateMod, rollPhysical } from '../utils/dndEngine';
import { Plus, Swords, Save, MapPin, Skull, Target } from 'lucide-react';
import { WEAPON_TEMPLATES } from '../data/srd';

export default function DMDashboard({ network, gameState, setGameState }) {
  const [view, setView] = useState('combat'); // 'combat' | 'creator'
  
  // Persist custom monsters locally so they aren't lost on refresh
  const [bestiary, setBestiary] = useState(() => {
    const saved = localStorage.getItem('dnd_bestiary');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeMonsters, setActiveMonsters] = useState([]);
  const [combatLog, setCombatLog] = useState([]);

  // Form State for New Monster
  const [newMonster, setNewMonster] = useState({
    name: '', ac: 10, hp: 20, 
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
    location: 'Any', spawnRate: 'Common',
    actions: [{ name: 'Claw', dmgSides: 6, dmgCount: 1, stat: 'str' }]
  });

  useEffect(() => {
    localStorage.setItem('dnd_bestiary', JSON.stringify(bestiary));
  }, [bestiary]);

  const handleSaveMonster = () => {
    if (!newMonster.name) return alert('Monster needs a name');
    const monsterData = {
      ...newMonster,
      id: `m_${Date.now()}`,
    };
    setBestiary([...bestiary, monsterData]);
    setView('combat');
  };

  const spawnMonster = (monster) => {
    const instance = { ...monster, instanceId: Date.now(), hpCurrent: monster.hp };
    setActiveMonsters([...activeMonsters, instance]);
  };

  const logEvent = (msg) => setCombatLog(prev => [msg, ...prev].slice(0, 5));

  const rollMonsterAttack = (monster, action) => {
    // In a full game, targetAc comes from the specific player selected. Using 15 as placeholder.
    const targetAc = 15; 
    const statScore = monster[action.stat]; // e.g., monster.str
    const isProficient = true; 
    const profBonus = 2; // Assuming CR 1-4 baseline

    const result = executeAttack(statScore, isProficient, profBonus, targetAc, action);
    
    let logMsg = `${monster.name} attacks with ${action.name}: Rolled ${result.hitCheck.total} vs AC ${targetAc}. `;
    if (result.isHit) {
      logMsg += `HIT for ${result.damageResult.total} damage!`;
    } else {
      logMsg += `MISS.`;
    }
    
    logEvent(logMsg);
    // Here you would also broadcast the damage to the targeted player's device
    // network.sendAction('DAMAGE_PLAYER', { amount: result.damageResult.total, targetId: 'player_1' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          className={view === 'combat' ? 'btn-primary' : 'btn-outline'} 
          onClick={() => setView('combat')}
        >
          <Swords size={18} style={{marginRight: '8px'}} /> Encounter
        </button>
        <button 
          className={view === 'creator' ? 'btn-primary' : 'btn-outline'} 
          onClick={() => setView('creator')}
        >
          <Plus size={18} style={{marginRight: '8px'}} /> Create
        </button>
      </div>

      {view === 'creator' && (
        <div className="card">
          <h3 style={{marginBottom: '16px'}}>Monster Forge</h3>
          <input type="text" placeholder="MONSTER NAME" value={newMonster.name} onChange={e => setNewMonster({...newMonster, name: e.target.value})} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>ARMOR CLASS (AC)</label>
              <input type="number" value={newMonster.ac} onChange={e => setNewMonster({...newMonster, ac: Number(e.target.value)})} />
            </div>
            <div>
              <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>HIT POINTS (HP)</label>
              <input type="number" value={newMonster.hp} onChange={e => setNewMonster({...newMonster, hp: Number(e.target.value)})} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <div>
              <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>SPAWN LOCATION</label>
              <input type="text" placeholder="e.g. Dark Forest" value={newMonster.location} onChange={e => setNewMonster({...newMonster, location: e.target.value})} />
            </div>
            <div>
              <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>SPAWN RATE</label>
              <select 
                style={{ width: '100%', padding: '14px', borderRadius: '8px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--surface)' }}
                value={newMonster.spawnRate} 
                onChange={e => setNewMonster({...newMonster, spawnRate: e.target.value})}
              >
                <option>Common</option>
                <option>Uncommon</option>
                <option>Rare</option>
                <option>Boss</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginBottom: '16px' }}>
            {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
              <div key={stat}>
                <label style={{fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase'}}>{stat}</label>
                <input type="number" value={newMonster[stat]} onChange={e => setNewMonster({...newMonster, [stat]: Number(e.target.value)})} />
              </div>
            ))}
          </div>

          <button className="btn-primary flex-center" onClick={handleSaveMonster}>
            <Save size={20} /> Save to Bestiary
          </button>
        </div>
      )}

      {view === 'combat' && (
        <>
          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Bestiary / Spawner</h3>
            {bestiary.length === 0 ? <p style={{color: 'var(--text-muted)'}}>No monsters created yet.</p> : null}
            <div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px'}}>
              {bestiary.map(mob => (
                <button key={mob.id} className="btn-outline" style={{minWidth: '140px', padding: '8px'}} onClick={() => spawnMonster(mob)}>
                  {mob.name} <br/><small style={{color: 'var(--text-muted)'}}>{mob.location} • {mob.spawnRate}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Active Encounter</h3>
            {activeMonsters.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Encounter is clear.</p> : null}
            
            {activeMonsters.map(mob => (
              <div key={mob.instanceId} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                  <strong>{mob.name}</strong>
                  <span style={{color: 'var(--danger)'}}>HP: {mob.hpCurrent}/{mob.hp}</span>
                </div>
                
                {mob.actions.map((act, idx) => (
                  <button key={idx} className="btn-primary flex-center" style={{padding: '8px', fontSize: '14px', marginBottom: '5px'}} onClick={() => rollMonsterAttack(mob, act)}>
                    <Target size={16} /> Use {act.name} (1d{act.dmgSides})
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{marginBottom: '16px'}}>Combat Log</h3>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {combatLog.length === 0 ? "Awaiting action..." : combatLog.map((log, i) => <div key={i}>• {log}</div>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
