import React, { useState, useEffect } from 'react';
import { Swords, Shield, Heart, User, CheckCircle, Dice5 } from 'lucide-react';
import { calculateMod, calculateProficiency, calculateAC, calculateMaxHP } from '../utils/dndEngine';
import { RACES, CLASSES } from '../data/characterOptions';
import { WEAPONS } from '../data/weapons';
import { SUBCLASSES } from '../data/subclasses';

const SKILLS = [
  { id: 'acrobatics', name: 'Acrobatics', stat: 'dex' },
  { id: 'animal_handling', name: 'Animal Handling', stat: 'wis' },
  { id: 'arcana', name: 'Arcana', stat: 'int' },
  { id: 'athletics', name: 'Athletics', stat: 'str' },
  { id: 'deception', name: 'Deception', stat: 'cha' },
  { id: 'history', name: 'History', stat: 'int' },
  { id: 'insight', name: 'Insight', stat: 'wis' },
  { id: 'intimidation', name: 'Intimidation', stat: 'cha' },
  { id: 'investigation', name: 'Investigation', stat: 'int' },
  { id: 'medicine', name: 'Medicine', stat: 'wis' },
  { id: 'nature', name: 'Nature', stat: 'int' },
  { id: 'perception', name: 'Perception', stat: 'wis' },
  { id: 'performance', name: 'Performance', stat: 'cha' },
  { id: 'persuasion', name: 'Persuasion', stat: 'cha' },
  { id: 'religion', name: 'Religion', stat: 'int' },
  { id: 'sleight_of_hand', name: 'Sleight of Hand', stat: 'dex' },
  { id: 'stealth', name: 'Stealth', stat: 'dex' },
  { id: 'survival', name: 'Survival', stat: 'wis' }
];

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
      proficiencies: [], // Tracks which skills they are proficient in
      hpCurrent: 10
    };
  });

  const [pointsRemaining, setPointsRemaining] = useState(27); 

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
      actionName: `Attack: ${activeWeapon.name}`,
      result: roll + hitMod, 
      rawRoll: roll,
      modifier: hitMod
    });
  };

  const rollSkillCheck = (skill) => {
    if (!network) return;
    const statMod = calculateMod(finalStats[skill.stat]);
    const isProficient = character.proficiencies?.includes(skill.id);
    const hitMod = statMod + (isProficient ? profBonus : 0);
    const roll = Math.floor(Math.random() * 20) + 1;
    
    network.sendAction('PLAYER_ROLL', { 
      characterName: character.name,
      actionName: `${skill.name} Check`,
      result: roll + hitMod, 
      rawRoll: roll,
      modifier: hitMod
    });
  };

  const toggleProficiency = (skillId) => {
    const profs = character.proficiencies || [];
    if (profs.includes(skillId)) {
      setCharacter({...character, proficiencies: profs.filter(id => id !== skillId)});
    } else {
      setCharacter({...character, proficiencies: [...profs, skillId]});
    }
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
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.class} onChange={e => setCharacter({...character, class: e.target.value, subclass: ''})}>
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

        <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '16px'}}>
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

        <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px'}}>
          <h4 style={{marginBottom: '12px'}}>Skill Proficiencies</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SKILLS.map(skill => (
              <label key={skill.id} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px'}}>
                <input 
                  type="checkbox" 
                  checked={(character.proficiencies || []).includes(skill.id)} 
                  onChange={() => toggleProficiency(skill.id)} 
                  style={{width: '16px', height: '16px', margin: 0}}
                />
                {skill.name}
              </label>
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
        <h4 style={{marginBottom: '16px'}}>Skills & Saving Throws</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {SKILLS.map(skill => {
            const statMod = calculateMod(finalStats[skill.stat]);
            const isProficient = character.proficiencies?.includes(skill.id);
            const totalMod = statMod + (isProficient ? profBonus : 0);
            return (
              <button key={skill.id} className="btn-outline flex-center" onClick={() => rollSkillCheck(skill)} style={{justifyContent: 'space-between', padding: '10px', fontSize: '12px', border: isProficient ? '1px solid var(--accent)' : '1px solid var(--surface)'}}>
                <span>{skill.name} ({skill.stat.toUpperCase()})</span>
                <span style={{fontWeight: 'bold', color: isProficient ? 'var(--accent)' : 'white'}}>{totalMod >= 0 ? `+${totalMod}` : totalMod}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
