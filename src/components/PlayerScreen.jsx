import React, { useState, useEffect } from 'react';
import { Swords, Shield, Heart, User, Zap, Footprints, Backpack, BookOpen, Mic, MicOff, BookText, Play, Plus, ArrowLeft, Tent } from 'lucide-react';
import { calculateMod, calculateProficiency, calculateAC, calculateMaxHP } from '../utils/dndEngine';
import { RACES, CLASSES } from '../data/characterOptions';
import { WEAPONS } from '../data/weapons';
import { SUBCLASSES } from '../data/subclasses';

const SKILLS = [
  { id: 'acrobatics', name: 'Acrobatics', stat: 'dex' }, { id: 'animal_handling', name: 'Animal Handling', stat: 'wis' },
  { id: 'arcana', name: 'Arcana', stat: 'int' }, { id: 'athletics', name: 'Athletics', stat: 'str' },
  { id: 'deception', name: 'Deception', stat: 'cha' }, { id: 'history', name: 'History', stat: 'int' },
  { id: 'insight', name: 'Insight', stat: 'wis' }, { id: 'intimidation', name: 'Intimidation', stat: 'cha' },
  { id: 'investigation', name: 'Investigation', stat: 'int' }, { id: 'medicine', name: 'Medicine', stat: 'wis' },
  { id: 'nature', name: 'Nature', stat: 'int' }, { id: 'perception', name: 'Perception', stat: 'wis' },
  { id: 'performance', name: 'Performance', stat: 'cha' }, { id: 'persuasion', name: 'Persuasion', stat: 'cha' },
  { id: 'religion', name: 'Religion', stat: 'int' }, { id: 'sleight_of_hand', name: 'Sleight of Hand', stat: 'dex' },
  { id: 'stealth', name: 'Stealth', stat: 'dex' }, { id: 'survival', name: 'Survival', stat: 'wis' }
];

const createBlankChar = () => ({
  id: `char_${Date.now()}_${Math.floor(Math.random()*1000)}`, name: '', race: 'human', class: 'fighter', subclass: '', level: 1,
  baseStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  armor: { name: 'Leather', base: 11, type: 'light' }, weaponId: 'shortsword',
  proficiencies: [], saveProficiencies: [], hpCurrent: 10,
  deathSaves: { successes: 0, failures: 0 }, inventoryText: '', bio: { traits: '', ideals: '', bonds: '', flaws: '', backstory: '' }
});

export default function PlayerScreen({ network, gameState }) {
  const [characters, setCharacters] = useState(() => {
    const savedVault = localStorage.getItem('dnd_characters');
    if (savedVault) {
      const parsed = JSON.parse(savedVault);
      if (parsed.length > 0) return parsed;
    }
    const oldSingle = localStorage.getItem('dnd_character');
    if (oldSingle) {
      const parsed = JSON.parse(oldSingle);
      localStorage.setItem('dnd_characters', JSON.stringify([parsed]));
      return [parsed];
    }
    const starter = createBlankChar();
    localStorage.setItem('dnd_characters', JSON.stringify([starter]));
    return [starter];
  });

  const [activeCharId, setActiveCharId] = useState(() => {
    const vault = JSON.parse(localStorage.getItem('dnd_characters') || '[]');
    if (vault.length > 0 && vault[0].name) return null;
    if (vault.length > 0) return vault[0].id;
    return null;
  });

  const [view, setView] = useState(() => {
    const vault = JSON.parse(localStorage.getItem('dnd_characters') || '[]');
    return (vault.length > 0 && vault[0].name) ? 'select' : 'builder';
  });

  const [isRecording, setIsRecording] = useState(false);
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  const character = characters.find(c => c.id === activeCharId) || null;
  const availableSubclasses = character ? Object.keys(SUBCLASSES).filter(k => SUBCLASSES[k].classId === character.class) : [];

  const raceData = character ? RACES[character.race] : null;
  const classData = character ? CLASSES[character.class] : null;
  const activeWeapon = character ? (WEAPONS[character.weaponId] || WEAPONS.shortsword) : null;
  
  const finalStats = character ? { ...character.baseStats } : {};
  if (raceData?.statBonuses) {
    Object.keys(raceData.statBonuses).forEach(stat => { finalStats[stat] += raceData.statBonuses[stat]; });
  }

  const profBonus = character ? calculateProficiency(character.level) : 2;
  const ac = character ? calculateAC(character.armor.base, character.armor.type, finalStats.dex) : 10;
  const hpMax = character ? calculateMaxHP(classData.hitDie, finalStats.con, character.level) : 10;
  const initiative = calculateMod(finalStats.dex || 10);
  const speed = raceData?.speed || 30;

  // --- DYNAMIC SKILL LIMITS ---
  const maxSkills = character?.class === 'rogue' ? 6 : ['bard', 'ranger'].includes(character?.class) ? 5 : 4;
  const currentSkills = character?.proficiencies || [];

  const syncToDM = (targetChar = character) => {
    if (!network || !targetChar) return;
    network.sendAction('SYNC_CHARACTER', {
      ...targetChar, stats: finalStats, ac, hpMax, profBonus, initiative, class: classData?.name || 'Unknown', weapon: activeWeapon
    });
  };

  const updateCharacter = (updates, shouldSync = false) => {
    setCharacters(prev => {
      const newChars = prev.map(c => c.id === activeCharId ? { ...c, ...updates } : c);
      localStorage.setItem('dnd_characters', JSON.stringify(newChars));
      if (shouldSync) {
        const updatedChar = newChars.find(c => c.id === activeCharId);
        syncToDM(updatedChar);
      }
      return newChars;
    });
  };

  const selectCharacter = (id) => {
    setActiveCharId(id);
    setView('combat');
    setTimeout(() => {
      const targetChar = characters.find(c => c.id === id) || JSON.parse(localStorage.getItem('dnd_characters')).find(c => c.id === id);
      syncToDM(targetChar);
    }, 100);
  };

  const createNewCharacter = () => {
    const newChar = createBlankChar();
    setCharacters(prev => {
      const updated = [...prev, newChar];
      localStorage.setItem('dnd_characters', JSON.stringify(updated));
      return updated;
    });
    setActiveCharId(newChar.id);
    setView('builder');
  };

  const getPointsRemaining = () => {
    if (!character) return 27;
    const costMap = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    let spent = 0;
    Object.values(character.baseStats).forEach(val => { spent += costMap[val] || 0; });
    return 27 - spent;
  };
  const pointsRemaining = getPointsRemaining();

  const handlePointBuy = (stat, change) => {
    const currentVal = character.baseStats[stat];
    const newVal = currentVal + change;
    if (newVal < 8 || newVal > 15) return;
    const costMap = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    const currentSpent = 27 - pointsRemaining;
    const newSpent = currentSpent - costMap[currentVal] + costMap[newVal];
    if (newSpent <= 27) updateCharacter({ baseStats: { ...character.baseStats, [stat]: newVal } });
  };

  const rollAction = (name, statId, isProficient, dmgConfig = null) => {
    if (!network || !character) return;
    const statMod = calculateMod(finalStats[statId]);
    const totalMod = statMod + (isProficient ? profBonus : 0);
    const hitRoll = Math.floor(Math.random() * 20) + 1;
    
    let payload = { characterName: character.name || 'Unknown', actionName: name, result: hitRoll + totalMod, rawRoll: hitRoll, modifier: totalMod };
    
    if (dmgConfig) {
      let dmgSum = 0;
      for(let i=0; i < (dmgConfig.dmgCount || 1); i++) dmgSum += Math.floor(Math.random() * (dmgConfig.dmgSides || 6)) + 1;
      payload.damage = dmgSum + statMod;
      payload.rawDmg = dmgSum;
      payload.dmgMod = statMod;
    }
    network.sendAction('PLAYER_ROLL', payload);
  };

  if (view === 'select') {
    return (
      <div className="card">
        <h3 style={{marginBottom: '16px'}}>Character Vault</h3>
        {characters.length === 0 ? (
          <p style={{color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px'}}>No characters forged yet.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px'}}>
            {characters.map(c => (
              <button key={c.id} className="btn-outline" style={{padding: '16px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}} onClick={() => selectCharacter(c.id)}>
                <div>
                  <div style={{fontWeight: 'bold', fontSize: '18px', color: 'white'}}>{c.name || 'Unnamed Character'}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-muted)'}}>Level {c.level} {RACES[c.race]?.name} {CLASSES[c.class]?.name}</div>
                </div>
                <Play size={24} color="var(--accent)" />
              </button>
            ))}
          </div>
        )}
        <button className="btn-primary flex-center" onClick={createNewCharacter}>
          <Plus size={18} /> Forge New Character
        </button>
      </div>
    );
  }

  if (!character) return null;

  if (view === 'builder') {
    return (
      <div className="card" style={{paddingBottom: '80px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
          <h3 style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <button className="btn-outline" style={{padding: '4px', border: 'none'}} onClick={() => setView('select')}><ArrowLeft size={20}/></button>
            Forge
          </h3>
          <button className="btn-primary" style={{padding: '6px 12px', width: 'auto'}} onClick={() => { syncToDM(character); setView('combat'); }}>Save & Play</button>
        </div>

        <input type="text" placeholder="CHARACTER NAME" value={character.name} onChange={e => updateCharacter({name: e.target.value})} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>RACE</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.race} onChange={e => updateCharacter({race: e.target.value})}>
              {Object.keys(RACES).map(k => <option key={k} value={k}>{RACES[k].name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>CLASS</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.class} onChange={e => updateCharacter({class: e.target.value, subclass: ''})}>
              {Object.keys(CLASSES).map(k => <option key={k} value={k}>{CLASSES[k].name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>ARCHETYPE</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.subclass} onChange={e => updateCharacter({subclass: e.target.value})}>
              <option value="">-- None --</option>
              {availableSubclasses.map(k => <option key={k} value={k}>{SUBCLASSES[k].name}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize: '12px', color: 'var(--text-muted)'}}>WEAPON</label>
            <select style={{width: '100%', padding: '12px', background: 'var(--bg-dark)', color: 'white', border: 'none', borderRadius: '8px'}} value={character.weaponId} onChange={e => updateCharacter({weaponId: e.target.value})}>
              {Object.keys(WEAPONS).map(k => <option key={k} value={k}>{WEAPONS[k].name}</option>)}
            </select>
          </div>
        </div>

        <div style={{background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', marginBottom: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <h4>Point Buy Stats</h4>
            <span style={{color: pointsRemaining === 0 ? 'var(--text-muted)' : 'var(--accent)'}}>{pointsRemaining} Points Left</span>
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
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
            <h4>Skill Proficiencies</h4>
            <span style={{color: currentSkills.length === maxSkills ? 'var(--success)' : 'var(--accent)'}}>
              {currentSkills.length} / {maxSkills} Selected
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {SKILLS.map(skill => {
              const isChecked = currentSkills.includes(skill.id);
              const isDisabled = !isChecked && currentSkills.length >= maxSkills;
              
              return (
                <label key={skill.id} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', opacity: isDisabled ? 0.4 : 1}}>
                  <input 
                    type="checkbox" 
                    disabled={isDisabled}
                    checked={isChecked} 
                    onChange={() => {
                      if (isChecked) {
                        updateCharacter({ proficiencies: currentSkills.filter(id => id !== skill.id) });
                      } else if (currentSkills.length < maxSkills) {
                        updateCharacter({ proficiencies: [...currentSkills, skill.id] });
                      }
                    }} 
                    style={{width: '16px', height: '16px', margin: 0}}
                  />
                  {skill.name}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '80px' }}>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn-outline flex-center" onClick={() => setView('select')}><ArrowLeft size={18}/> Vault</button>
        <button className="btn-outline flex-center" onClick={() => setView('builder')}><User size={18}/> Edit</button>
        <button className="btn-primary flex-center" style={{background: 'var(--success)', borderColor: 'var(--success)'}} onClick={() => updateCharacter({hpCurrent: hpMax}, true)}><Tent size={18}/> Rest</button>
      </div>

      <div className="card" style={{ borderLeft: '4px solid var(--accent)', padding: '16px' }}>
        <p style={{color: 'var(--text-muted)', fontSize: '12px'}}>CURRENT QUEST</p>
        <p style={{fontWeight: 'bold', fontSize: '18px'}}>{gameState.quest}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <div className="card flex-center" style={{flexDirection: 'column', padding: '10px'}}>
          <Shield size={16} color="var(--text-muted)" />
          <strong style={{fontSize: '20px'}}>{ac}</strong>
          <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>AC</span>
        </div>
        <div className="card flex-center" style={{flexDirection: 'column', padding: '10px'}}>
          <Zap size={16} color="var(--accent)" />
          <strong style={{fontSize: '20px'}}>{initiative >= 0 ? `+${initiative}` : initiative}</strong>
          <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>INIT</span>
        </div>
        <div className="card flex-center" style={{flexDirection: 'column', padding: '10px'}}>
          <Footprints size={16} color="var(--text-muted)" />
          <strong style={{fontSize: '20px'}}>{speed}</strong>
          <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>SPD</span>
        </div>
        <div className="card flex-center" style={{flexDirection: 'column', padding: '10px'}}>
          <User size={16} color="var(--accent)" />
          <strong style={{fontSize: '20px'}}>+{profBonus}</strong>
          <span style={{fontSize: '9px', color: 'var(--text-muted)'}}>PROF</span>
        </div>
      </div>

      <div className="card" style={{ border: character.hpCurrent === 0 ? '1px solid var(--danger)' : '1px solid var(--surface)' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <button className="btn-outline" style={{width: '40px', padding: '8px'}} onClick={() => updateCharacter({hpCurrent: Math.max(0, character.hpCurrent - 1)}, true)}>-</button>
          <div style={{textAlign: 'center'}}>
            <Heart size={20} color={character.hpCurrent > 0 ? "var(--success)" : "var(--danger)"} style={{margin: '0 auto'}}/>
            <strong style={{fontSize: '24px', color: character.hpCurrent > 0 ? 'var(--success)' : 'var(--danger)'}}>{character.hpCurrent} / {hpMax}</strong>
            <div style={{fontSize: '10px', color: 'var(--text-muted)'}}>HIT POINTS</div>
          </div>
          <button className="btn-outline" style={{width: '40px', padding: '8px'}} onClick={() => updateCharacter({hpCurrent: Math.min(hpMax, character.hpCurrent + 1)}, true)}>+</button>
        </div>

        {character.hpCurrent === 0 && (
          <div style={{marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bg-dark)'}}>
            <h4 style={{textAlign: 'center', color: 'var(--danger)', marginBottom: '10px'}}>Death Saves</h4>
            <div style={{display: 'flex', justifyContent: 'space-around'}}>
              <div>
                <span style={{fontSize: '12px', marginRight: '8px'}}>Successes</span>
                {[1,2,3].map(i => <input key={`s${i}`} type="checkbox" checked={character.deathSaves.successes >= i} onChange={e => updateCharacter({deathSaves: {...character.deathSaves, successes: e.target.checked ? i : i-1}}, true)} style={{width: '16px', display: 'inline-block'}} />)}
              </div>
              <div>
                <span style={{fontSize: '12px', marginRight: '8px'}}>Failures</span>
                {[1,2,3].map(i => <input key={`f${i}`} type="checkbox" checked={character.deathSaves.failures >= i} onChange={e => updateCharacter({deathSaves: {...character.deathSaves, failures: e.target.checked ? i : i-1}}, true)} style={{width: '16px', display: 'inline-block'}} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {view === 'combat' && (
        <>
          <button className="btn-primary flex-center" onClick={() => rollAction(`Attack: ${activeWeapon.name}`, activeWeapon.stat, true, activeWeapon)} style={{padding: '20px', fontSize: '18px'}}>
            <Swords size={24} /> Attack: {activeWeapon.name}
          </button>
          <div className="card">
            <h4 style={{marginBottom: '10px'}}>Saving Throws</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {Object.keys(character.baseStats).map(stat => {
                const isProf = character.saveProficiencies?.includes(stat);
                const mod = calculateMod(finalStats[stat]) + (isProf ? profBonus : 0);
                return (
                  <button key={`save_${stat}`} className="btn-outline flex-center" onClick={() => rollAction(`${stat.toUpperCase()} Save`, stat, isProf)} style={{flexDirection: 'column', padding: '8px', border: isProf ? '1px solid var(--accent)' : '1px solid var(--surface)'}}>
                    <span style={{fontSize: '10px'}}>{stat.toUpperCase()}</span>
                    <span style={{fontWeight: 'bold', color: isProf ? 'var(--accent)' : 'white'}}>{mod >= 0 ? `+${mod}` : mod}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h4 style={{marginBottom: '10px'}}>Skills</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {SKILLS.map(skill => {
                const isProf = character.proficiencies?.includes(skill.id);
                const mod = calculateMod(finalStats[skill.stat]) + (isProf ? profBonus : 0);
                return (
                  <button key={skill.id} className="btn-outline flex-center" onClick={() => rollAction(`${skill.name}`, skill.stat, isProf)} style={{justifyContent: 'space-between', padding: '10px', fontSize: '12px', border: isProf ? '1px solid var(--accent)' : '1px solid var(--surface)'}}>
                    <span>{skill.name}</span>
                    <span style={{fontWeight: 'bold', color: isProf ? 'var(--accent)' : 'white'}}>{mod >= 0 ? `+${mod}` : mod}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {view === 'inventory' && (
        <div className="card">
          <h3>Backpack & Equipment</h3>
          <textarea value={character.inventoryText || ''} onChange={e => updateCharacter({inventoryText: e.target.value})} style={{width: '100%', minHeight: '200px', background: 'var(--bg-dark)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', marginTop: '10px'}} placeholder="- 50 Gold Pieces&#10;- Bedroll" />
        </div>
      )}

      {view === 'bio' && (
        <div className="card" style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          <h3>Character Details</h3>
          <textarea placeholder="Personality Traits" value={character.bio.traits} onChange={e => updateCharacter({bio: {...character.bio, traits: e.target.value}})} style={{width: '100%', background: 'var(--bg-dark)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px'}} />
          <textarea placeholder="Backstory & Notes" value={character.bio.backstory} onChange={e => updateCharacter({bio: {...character.bio, backstory: e.target.value}})} style={{width: '100%', minHeight: '150px', background: 'var(--bg-dark)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px'}} />
        </div>
      )}

      {view === 'journal' && (
        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3>Party Journal</h3>
            <button className={isRecording ? 'btn-primary' : 'btn-outline'} style={{width: 'auto', padding: '8px', background: isRecording ? 'var(--danger)' : 'transparent'}} onClick={() => {
              if (!recognition) return alert("Browser does not support voice dictation.");
              if (isRecording) { recognition.stop(); setIsRecording(false); } 
              else {
                recognition.continuous = true; recognition.interimResults = true;
                recognition.onresult = (e) => {
                  let finalT = '';
                  for (let i = e.resultIndex; i < e.results.length; ++i) if (e.results[i].isFinal) finalT += e.results[i][0].transcript + ' ';
                  if (finalT && network) network.sendAction('UPDATE_JOURNAL', { text: (gameState.journal || '') + '\n' + finalT });
                };
                recognition.onend = () => setIsRecording(false);
                recognition.start(); setIsRecording(true);
              }
            }}>
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          </div>
          <textarea value={gameState.journal || ''} onChange={(e) => network && network.sendAction('UPDATE_JOURNAL', { text: e.target.value })} style={{width: '100%', minHeight: '300px', background: 'var(--bg-dark)', color: 'white', border: '1px solid var(--surface)', padding: '12px', borderRadius: '8px'}} />
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', padding: '12px', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #334155', maxWidth: '600px', margin: '0 auto' }}>
        <button style={{background: 'transparent', color: view === 'combat' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('combat')}><Swords size={20} /><div style={{fontSize: '10px'}}>Combat</div></button>
        <button style={{background: 'transparent', color: view === 'inventory' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('inventory')}><Backpack size={20} /><div style={{fontSize: '10px'}}>Bag</div></button>
        <button style={{background: 'transparent', color: view === 'bio' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('bio')}><BookOpen size={20} /><div style={{fontSize: '10px'}}>Bio</div></button>
        <button style={{background: 'transparent', color: view === 'journal' ? 'var(--accent)' : 'var(--text-muted)'}} onClick={() => setView('journal')}><BookText size={20} /><div style={{fontSize: '10px'}}>Notes</div></button>
      </div>
    </div>
  );
}
