import React, { useState, useEffect } from 'react';
import { Swords, Shield, Heart, User, CheckCircle } from 'lucide-react';
import { calculateMod, calculateProficiency, calculateAC, calculateMaxHP } from '../utils/dndEngine';
import { RACES, CLASSES } from '../data/characterOptions';
import { WEAPONS } from '../data/weapons';
import { SUBCLASSES } from '../data/subclasses';

export default function PlayerScreen({ network, gameState }) {
  const [view, setView] = useState('sheet'); 
  
  const [character, setCharacter] = useState(() => {
    const saved = localStorage.getItem('dnd_character');
    return saved ? JSON.parse(saved) : {
      id: `player_${Date.now()}`,
      name: '', race: 'human', class: 'fighter', subclass: '', level: 1,
      baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      armor: { name: 'Leather', base: 11, type: 'light' },
      weaponId: 'shortsword',
      hpCurrent: 10
    };
  });

  const [pointsRemaining, setPointsRemaining] = useState(27); 

  // --- DERIVED STATS ENGINE ---
  const raceData = RACES[character.race];
  const classData = CLASSES[character.class];
  const activeWeapon = WEAPONS[character.weaponId] || WEAPONS.shortsword;
  
  const finalStats = { ...character.baseStats };
  if (raceData?.statBonuses) {
    Object.keys(raceData.statBonuses).forEach(stat => {
      finalStats[stat] += raceData.statBonuses[stat];
    });
  }

  const profBonus = calculateProficiency(character.level);
  const ac = calculateAC(character.armor.base, character.armor.type, finalStats.dex);
  const hpMax = calculateMaxHP(classData.hitDie, finalStats.con, character.level);

  useEffect(() => {
    localStorage.setItem('dnd_character', JSON.stringify(character));
  }, [character]);

  const syncToDM = () => {
    if (!network) return;
    network.sendAction('SYNC_CHARACTER', {
      ...character,
      stats: finalStats,
      ac,
      hpMax,
      profBonus,
      class: classData.name,
      weapon: activeWeapon
    });
  };

  const rollAttack = () => {
    if (!network) return;
    const statMod = calculateMod(finalStats[activeWeapon.stat]);
    const hitMod = statMod + profBonus;
    const roll = Math.floor(Math.random() * 20) + 1;
    
    network.sendAction('PLAYER_ROLL', { 
      characterName: character.name,
      actionName: activeWeapon.name,
      result: roll + hitMod, 
      rawRoll: roll,
      modifier: hitMod
    });
  };

  const handlePointBuy = (stat, change) => {
    const currentVal = character.baseStats[stat];
    const newVal = currentVal + change;
    if (newVal < 8 || newVal > 15) return;
    
    const costMap = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    const pointDifference = costMap[newVal] - costMap[currentVal];

    if (pointsRemaining - pointDifference >= 0) {
      setPointsRemaining(prev => prev - pointDifference);
      setCharacter(prev => ({ ...prev, baseStats: { ...prev.baseStats, [stat]: newVal } }));
    }
  };

  // Filter subclasses based on the currently selected class
  const availableSubclasses = Object.keys(SUBCLASSES).filter(k => SUBCLASSES[k].classId === character.class);

  if (view === 'builder') {
    return (
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
          <h3>Character Forge</h3>
          <button className="btn-primary" style={{padding: '6px 12px', width: 'auto'}} onClick={() => setView('sheet')}>Save</button>
        </div>

        <input type="text" placeholder="CHARACTER NAME" value={character.name} onChange={e => setCharacter({...character, name: e.target.value})} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>RACE</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.race} onChange={e => setCharacter({...character, race: e.target.value})}>
              {Object.keys(RACES).map(k => <option key={k} value={k}>{RACES[k].name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>CLASS</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.class} onChange={e => {
              // Reset subclass when class changes
              setCharacter({...character, class: e.target.value, subclass: ''})
            }}>
              {Object.keys(CLASSES).map(k => <option key={k} value={k}>{CLASSES[k].name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>ARCHETYPE (SUBCLASS)</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.subclass} onChange={e => setCharacter({...character, subclass: e.target.value})}>
              <option value="">-- None / Default --</option>
              {availableSubclasses.map(k => <option key={k} value={k}>{SUBCLASSES[k].name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>WEAPON</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.weaponId} onChange={e => setCharacter({...character, weaponId: e.target.value})}>
              {Object.keys(WEAPONS).map(k => <option key={k} value={k}>{WEAPONS[k].name}</option>)}
            </select>
          </div>
        </div>

        <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <h4>Point Buy Stats</h4>
            <span style={{color: 'var(--accent)'}}>{pointsRemaining} Points Left</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {Object.keys(character.baseStats).map(stat => (
              <div key={stat} style={{ textAlign: 'center', background: 'var(--surface)', padding: '8px', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>{character.baseStats[stat]}</div>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button style={{background: 'var(--bg-dark)', padding: '4px 12px', color: 'white'}} onClick={() => handlePointBuy(stat, -1)}>-</button>
                  <button style={{background: 'var(--bg-dark)', padding: '4px 12px', color: 'white'}} onClick={() => handlePointBuy(stat, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-outline flex-center" onClick={() => setView('builder')}><User size={18}/> Edit Character</button>
        <button className="btn-primary flex-center" onClick={syncToDM}><CheckCircle size={18}/> Sync to DM</button>
      </div>

      <div className="card" style={{ borderLeft: '4px solid var(--accent)', padding: '16px' }}>
        <p style={{color: 'var(--text-muted)', fontSize: '12px'}}>CURRENT QUEST</p>
        <p style={{fontWeight: 'bold', fontSize: '18px'}}>{gameState.quest}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div className="card flex-center" style={{flexDirection: 'column', padding: '12px'}}>
          <Shield size={20} color="var(--text-muted)" />
          <strong style={{fontSize: '24px'}}>{ac}</strong>
          <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>ARMOR CLASS</span>
        </div>
        <div className="card flex-center" style={{flexDirection: 'column', padding: '12px', border: '1px solid var(--success)'}}>
          <Heart size={20} color="var(--success)" />
          <strong style={{fontSize: '24px', color: 'var(--success)'}}>{character.hpCurrent}/{hpMax}</strong>
          <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>HIT POINTS</span>
        </div>
        <div className="card flex-center" style={{flexDirection: 'column', padding: '12px'}}>
          <User size={20} color="var(--accent)" />
          <strong style={{fontSize: '24px'}}>+{profBonus}</strong>
          <span style={{fontSize: '10px', color: 'var(--text-muted)'}}>PROFICIENCY</span>
        </div>
      </div>

      <button className="btn-primary flex-center" onClick={rollAttack} style={{padding: '20px', fontSize: '18px'}}>
        <Swords size={24} /> Attack: {activeWeapon.name}
      </button>

      <div className="card">
        <h4 style={{marginBottom: '10px'}}>Active Stats (Racial Bonus Applied)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {Object.keys(finalStats).map(stat => {
            const mod = calculateMod(finalStats[stat]);
            return (
              <div key={stat} style={{ background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{stat}</div>
                <div style={{ fontSize: '18px', color: 'white', fontWeight: 'bold' }}>{finalStats[stat]}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent)' }}>{mod >= 0 ? `+${mod}` : mod}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
