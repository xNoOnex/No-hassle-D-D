import React, { useState, useEffect } from 'react';
import { Users, Swords, Map, Gem, Skull, Plus, Save, Target, ArrowRight } from 'lucide-react';
import { executeAttack } from '../utils/dndEngine';

export default function DMDashboard({ network, gameState, setGameState }) {
  const [activeTab, setActiveTab] = useState('campaign');

  // --- LOCAL PERSISTENCE FOR DM ASSETS ---
  const [bestiary, setBestiary] = useState(() => JSON.parse(localStorage.getItem('dnd_bestiary') || '[]'));
  const [lootPool, setLootPool] = useState(() => JSON.parse(localStorage.getItem('dnd_loot') || '[]'));
  
  useEffect(() => localStorage.setItem('dnd_bestiary', JSON.stringify(bestiary)), [bestiary]);
  useEffect(() => localStorage.setItem('dnd_loot', JSON.stringify(lootPool)), [lootPool]);

  // --- STATE ---
  const [activeMonsters, setActiveMonsters] = useState([]);
  const [generatedLoot, setGeneratedLoot] = useState(null);

  // Forms
  const [newMonster, setNewMonster] = useState({ name: '', ac: 10, hp: 20, str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, actions: [] });
  const [newLoot, setNewLoot] = useState({ name: '', type: 'Weapon', rarity: 'Common', weight: 50, stats: '', description: '' });
  const [newTimelineEvent, setNewTimelineEvent] = useState({ title: '', details: '' });

  // --- LOOT LOGIC ---
  const saveLoot = () => {
    if (!newLoot.name) return;
    setLootPool([...lootPool, { ...newLoot, id: `loot_${Date.now()}`, weight: Number(newLoot.weight) }]);
    setNewLoot({ name: '', type: 'Weapon', rarity: 'Common', weight: 50, stats: '', description: '' });
  };

  const generateRandomLoot = () => {
    if (lootPool.length === 0) return;
    const totalWeight = lootPool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.floor(Math.random() * totalWeight);
    
    for (const item of lootPool) {
      if (random < item.weight) {
        setGeneratedLoot(item);
        return;
      }
      random -= item.weight;
    }
  };

  // --- TIMELINE LOGIC ---
  const pushToPast = () => {
    if (!gameState.timeline.active) return;
    setGameState({
      ...gameState,
      timeline: {
        ...gameState.timeline,
        past: [gameState.timeline.active, ...gameState.timeline.past],
        active: gameState.timeline.upcoming.length > 0 ? gameState.timeline.upcoming[0] : null,
        upcoming: gameState.timeline.upcoming.slice(1)
      }
    });
  };

  const addUpcomingEvent = () => {
    if (!newTimelineEvent.title) return;
    setGameState({
      ...gameState,
      timeline: {
        ...gameState.timeline,
        upcoming: [...gameState.timeline.upcoming, newTimelineEvent]
      }
    });
    setNewTimelineEvent({ title: '', details: '' });
  };

  // --- RENDERERS ---

  const renderPartyTab = () => (
    <div className="card">
      <h3 style={{marginBottom: '16px'}}>Connected Party</h3>
      {Object.keys(gameState.party).length === 0 ? (
        <p style={{color: 'var(--text-muted)'}}>No players have synced their character sheets yet.</p>
      ) : (
        Object.values(gameState.party).map((player, i) => (
          <div key={i} style={{background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '10px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
              <span>{player.name} ({player.class})</span>
              <span style={{color: 'var(--success)'}}>HP: {player.hpCurrent}/{player.hpMax}</span>
            </div>
            <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px'}}>
              AC: {player.ac} | STR {player.stats.str} | DEX {player.stats.dex} | INT {player.stats.int}
            </div>
            <div style={{fontSize: '12px', color: 'var(--accent)', marginTop: '4px'}}>
              Weapon: {player.weapon?.name || 'Unarmed'}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCampaignTab = () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
      <div className="card" style={{borderLeft: '4px solid var(--accent)'}}>
        <h3 style={{color: 'var(--accent)', marginBottom: '8px'}}>Active Scenario</h3>
        {gameState.timeline.active ? (
          <>
            <h4>{gameState.timeline.active.title}</h4>
            <p style={{color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px'}}>{gameState.timeline.active.details}</p>
            <button className="btn-outline flex-center" style={{marginTop: '12px', padding: '8px'}} onClick={pushToPast}>
              Complete & Advance <ArrowRight size={16}/>
            </button>
          </>
        ) : <p style={{color: 'var(--text-muted)'}}>No active scenario.</p>}
      </div>

      <div className="card">
        <h3 style={{marginBottom: '16px'}}>Upcoming Queued</h3>
        {gameState.timeline.upcoming.map((ev, i) => (
          <div key={i} style={{background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '8px'}}>
            <strong>{ev.title}</strong>
            <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>{ev.details}</div>
          </div>
        ))}
        <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
          <input type="text" placeholder="Title" value={newTimelineEvent.title} onChange={e => setNewTimelineEvent({...newTimelineEvent, title: e.target.value})} style={{marginBottom: 0}} />
          <button className="btn-primary" onClick={addUpcomingEvent}><Plus size={20}/></button>
        </div>
      </div>

      <div className="card" style={{opacity: 0.7}}>
        <h3 style={{marginBottom: '16px'}}>Past Events</h3>
        {gameState.timeline.past.map((ev, i) => (
          <div key={i} style={{padding: '8px 0', borderBottom: '1px solid var(--surface)'}}>
            <strong style={{fontSize: '14px'}}>{ev.title}</strong>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLootTab = () => (
    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
      <div className="card flex-center" style={{flexDirection: 'column', textAlign: 'center'}}>
        <button className="btn-primary flex-center" style={{padding: '20px', fontSize: '18px'}} onClick={generateRandomLoot}>
          <Gem size={24} /> Roll Random Loot
        </button>
        {generatedLoot && (
          <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginTop: '16px', width: '100%', border: '1px solid var(--accent)'}}>
            <h3 style={{color: 'var(--accent)'}}>{generatedLoot.name}</h3>
            <div style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px'}}>{generatedLoot.rarity} {generatedLoot.type}</div>
            <p style={{fontSize: '14px', marginBottom: '8px'}}>{generatedLoot.description}</p>
            <div style={{fontSize: '12px', fontWeight: 'bold'}}>Stats: {generatedLoot.stats}</div>
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
        <button className="btn-outline flex-center" onClick={saveLoot}><Save size={18}/> Add to Pool</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid var(--surface)' }}>
        {[ 
          { id: 'campaign', icon: Map, label: 'Campaign' },
          { id: 'party', icon: Users, label: 'Party' },
          { id: 'combat', icon: Swords, label: 'Combat' },
          { id: 'loot', icon: Gem, label: 'Loot' },
          { id: 'bestiary', icon: Skull, label: 'Bestiary' }
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

      {activeTab === 'party' && renderPartyTab()}
      {activeTab === 'campaign' && renderCampaignTab()}
      {activeTab === 'loot' && renderLootTab()}
      
      {activeTab === 'combat' && (
        <div className="card">
          <h3 style={{marginBottom: '16px'}}>Active Encounter</h3>
          {activeMonsters.length === 0 ? <p style={{color: 'var(--text-muted)'}}>Encounter is clear.</p> : (
            activeMonsters.map(mob => (
              <div key={mob.instanceId} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                  <strong>{mob.name}</strong>
                  <span style={{color: 'var(--danger)'}}>HP: {mob.hpCurrent}/{mob.hp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'bestiary' && (
        <div className="card">
          <h3 style={{marginBottom: '16px'}}>Bestiary / Spawner</h3>
          <p style={{color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px'}}>
            Monsters created here will appear as buttons. Clicking them spawns them into the Combat tab.
          </p>
          {bestiary.map(mob => (
            <button key={mob.id} className="btn-outline" style={{width: '100%', marginBottom: '8px'}} onClick={() => setActiveMonsters([...activeMonsters, { ...mob, instanceId: Date.now(), hpCurrent: mob.hp }])}>
              Spawn {mob.name}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}
