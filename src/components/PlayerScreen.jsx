import React, { useState } from 'react';
import {
  Swords, User, Backpack, BookOpen,
  Target, RefreshCw, Dices, Users, Lock, Sparkles
} from 'lucide-react';
import {
  calculateMod,
  calculateProficiency,
  executeCheckWithTray,
  resolveAttackWithTray,
  detectSkillFromText,
  parseAndRollDice
} from '../utils/dndEngine';
import { SKILLS_5E } from '../data/rules5e.js';
import { getAllSpells } from '../data/index';

// Visual Dice Tray Component: Renders every die rolled by Players or AI/Monsters
function DiceTrayView({ trays = [] }) {
  if (!trays || trays.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
      {trays.map((t, idx) => {
        const isCrit = Boolean(t.isCrit);
        const isFumble = Boolean(t.isFumble);
        const borderColor = isCrit ? '#10b981' : isFumble ? '#ef4444' : '#4f46e5';
        const bgColor = isCrit ? '#064e3b' : isFumble ? '#450a0a' : '#020617';
        const rollsList = Array.isArray(t.rolls) ? t.rolls.join(', ') : (t.kept ?? t.total);

        return (
          <div
            key={idx}
            style={{
              padding: '6px 10px',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#818cf8' }}>
              🎲 {t.diceLabel || t.diceNotation || 'Roll'}
            </span>
            <span style={{ color: '#f8fafc', background: '#0f172a', padding: '2px 6px', borderRadius: '4px', border: '1px solid #334155' }}>
              Die: [{rollsList}]
            </span>
            {t.modifier !== undefined && t.modifier !== 0 && (
              <span style={{ color: '#94a3b8' }}>
                {t.modifier > 0 ? `+${t.modifier}` : t.modifier}
              </span>
            )}
            <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#fcd34d' }}>
              = {t.total}
            </span>
            {t.targetLabel && (
              <span style={{ color: '#94a3b8' }}>vs {t.targetLabel}</span>
            )}
            {t.outcome && (
              <span style={{
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '10px',
                background: t.isSuccess === false ? '#7f1d1d' : '#1e1b4b',
                color: t.isSuccess === false ? '#fca5a5' : '#6ee7b7'
              }}>
                {t.outcome}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PlayerScreen({ gameState, activeCharacter, dispatchAction, isProcessingAi }) {
  const [activeTab, setActiveTab] = useState('story');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedSpellName, setSelectedSpellName] = useState('Fire Bolt');
  const [customActionText, setCustomActionText] = useState('');
  const [playerNoteInput, setPlayerNoteInput] = useState('');

  const allSpells = getAllSpells();

  const partySelf = (gameState.party || []).find(p => p.id === activeCharacter?.id);
  const hero = partySelf ? { ...activeCharacter, ...partySelf } : (activeCharacter || {
    id: 'fallback',
    name: 'Hero',
    race: 'Human',
    background: 'Soldier',
    class: 'Fighter 1',
    level: 1,
    baseStats: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 10 },
    savingThrows: ['str', 'con'],
    weapon: { name: 'Longsword', damageDice: '1d8', stat: 'str' },
    armor: { name: 'Leather Armor', base: 11, type: 'light' },
    proficiencies: ['athletics', 'intimidation'],
    hpCurrent: 12,
    hpMax: 12,
    ac: 12,
    inventory: [],
    gold: 25
  });

  const profBonus = calculateProficiency(hero.level || 1);

  const handleSkillRoll = (skill) => {
    const isProf = (hero.proficiencies || []).includes(skill.id);
    const statVal = hero.baseStats?.[skill.stat] ?? 10;
    const check = executeCheckWithTray(statVal, isProf, profBonus, 'normal', 12, `${hero.name} ${skill.name}`);

    dispatchAction({
      actionType: 'SKILL_CHECK',
      actorName: hero.name,
      diceTrays: check.diceTrays,
      summary: check.summary
    });
    setActiveTab('story');
  };

  const handleSaveRoll = (statKey) => {
    const isProf = (hero.savingThrows || []).includes(statKey);
    const statVal = hero.baseStats?.[statKey] ?? 10;
    const check = executeCheckWithTray(statVal, isProf, profBonus, 'normal', 12, `${hero.name} ${statKey.toUpperCase()} Save`);

    dispatchAction({
      actionType: 'SAVE_CHECK',
      actorName: hero.name,
      diceTrays: check.diceTrays,
      summary: check.summary
    });
    setActiveTab('story');
  };

  const handleAttackAction = () => {
    const monsters = gameState.activeMonsters || [];
    const target = monsters.find(m => (m.instanceId || m.id) === selectedTargetId) || monsters[0];
    if (!target) return;

    const strMod = calculateMod(hero.baseStats?.str ?? 10);
    const dexMod = calculateMod(hero.baseStats?.dex ?? 10);
    const wep = hero.weapon || { name: 'Longsword', damageDice: '1d8', stat: 'str' };
    const statMod = wep.finesse ? Math.max(strMod, dexMod) : (wep.ranged ? dexMod : strMod);

    const attackRes = resolveAttackWithTray({
      attackerName: hero.name,
      defenderName: target.name,
      weaponName: wep.name,
      attackBonus: statMod + profBonus,
      targetAC: target.ac || 12,
      damageDice: wep.damageDice || '1d8',
      damageBonus: statMod
    });

    const targetId = target.instanceId || target.id;
    const updatedMonsters = monsters.map(m => {
      if ((m.instanceId || m.id) !== targetId) return m;
      const nextHp = attackRes.isHit ? Math.max(0, (m.hpCurrent ?? m.hp) - attackRes.damageTotal) : (m.hpCurrent ?? m.hp);
      return { ...m, hpCurrent: nextHp };
    });

    const killed = attackRes.isHit && (target.hpCurrent ?? target.hp) - attackRes.damageTotal <= 0;

    dispatchAction({
      actionType: 'ATTACK',
      actorName: hero.name,
      updatedMonsters,
      diceTrays: attackRes.diceTrays,
      summary: `${attackRes.summary}${killed ? ` ${target.name} is slain!` : ''}`
    });
  };

  const handleCastSpell = () => {
    const spell = allSpells.find(s => s.name === selectedSpellName) || allSpells[0];
    if (!spell) return;

    const intMod = calculateMod(hero.baseStats?.int ?? 10);
    const wisMod = calculateMod(hero.baseStats?.wis ?? 10);
    const chaMod = calculateMod(hero.baseStats?.cha ?? 10);
    const spellMod = Math.max(intMod, wisMod, chaMod);

    if (spell.isHeal) {
      const healTray = parseAndRollDice(spell.damageDice || '1d8', `${spell.name} Healing`);
      const healTotal = Math.max(1, healTray.total + spellMod);
      const updatedParty = (gameState.party || [hero]).map(p =>
        p.id === hero.id ? { ...p, hpCurrent: Math.min(p.hpMax, p.hpCurrent + healTotal) } : p
      );

      dispatchAction({
        actionType: 'CAST_SPELL',
        actorName: hero.name,
        updatedParty,
        diceTrays: [{ ...healTray, modifier: spellMod, total: healTotal, outcome: `+${healTotal} HP`, isSuccess: true }],
        summary: `${hero.name} casts ${spell.name} and restores ${healTotal} HP!`
      });
      return;
    }

    const monsters = gameState.activeMonsters || [];
    const target = monsters.find(m => (m.instanceId || m.id) === selectedTargetId) || monsters[0];

    if (!target) {
      const spellCheck = executeCheckWithTray(10 + spellMod * 2, true, profBonus, 'normal', 12, `Cast ${spell.name}`);
      dispatchAction({
        actionType: 'CAST_SPELL',
        actorName: hero.name,
        diceTrays: spellCheck.diceTrays,
        summary: `${hero.name} casts ${spell.name} (${spell.school})! ${spellCheck.summary}`
      });
      return;
    }

    const spellAtk = resolveAttackWithTray({
      attackerName: hero.name,
      defenderName: target.name,
      weaponName: spell.name,
      attackBonus: spellMod + profBonus,
      targetAC: target.ac || 12,
      damageDice: spell.damageDice || '1d8',
      damageBonus: spellMod
    });

    const targetId = target.instanceId || target.id;
    const updatedMonsters = monsters.map(m => {
      if ((m.instanceId || m.id) !== targetId) return m;
      const nextHp = spellAtk.isHit ? Math.max(0, (m.hpCurrent ?? m.hp) - spellAtk.damageTotal) : (m.hpCurrent ?? m.hp);
      return { ...m, hpCurrent: nextHp };
    });

    const killed = spellAtk.isHit && (target.hpCurrent ?? target.hp) - spellAtk.damageTotal <= 0;

    dispatchAction({
      actionType: 'CAST_SPELL',
      actorName: hero.name,
      updatedMonsters,
      diceTrays: spellAtk.diceTrays,
      summary: `${spellAtk.summary}${killed ? ` ${target.name} is obliterated!` : ''}`
    });
  };

  // Every freeform player action automatically rolls a visible d20 check
  const handleCustomAction = (e) => {
    e.preventDefault();
    if (!customActionText.trim()) return;

    const detected = detectSkillFromText(customActionText);
    const isProf = (hero.proficiencies || []).includes(detected.id);
    const statScore = hero.baseStats?.[detected.stat] ?? 10;
    const check = executeCheckWithTray(
      statScore,
      isProf,
      profBonus,
      'normal',
      detected.dc,
      `${hero.name} ${detected.name}`
    );

    dispatchAction({
      actionType: 'FREEFORM_ACTION',
      actorName: hero.name,
      diceTrays: check.diceTrays,
      summary: `${hero.name}: "${customActionText.trim()}" -> [${check.summary}]`
    });
    setCustomActionText('');
  };

  const handleAddJournalNote = (e) => {
    e.preventDefault();
    if (!playerNoteInput.trim()) return;
    dispatchAction({
      actionType: 'ADD_NOTE',
      actorName: hero.name,
      newJournalEntry: `[Manual Note — ${hero.name}] ${playerNoteInput.trim()}`,
      skipAi: true
    });
    setPlayerNoteInput('');
  };

  const activeTurnUnit = gameState.turnQueue?.[gameState.currentTurnIndex || 0];
  const latestLogWithDice = [...(gameState.storyLog || [])].reverse().find(l => l.diceTrays?.length > 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', background: '#0f172a', padding: '6px', borderRadius: '12px', border: '1px solid #1e293b' }}>
        {[
          { id: 'story', label: 'Story', icon: BookOpen },
          { id: 'combat', label: 'Combat', icon: Swords },
          { id: 'character', label: 'Hero', icon: User },
          { id: 'party', label: 'Party', icon: Users },
          { id: 'journal', label: 'Journal', icon: Backpack }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '9px 4px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#4f46e5' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8'
              }}
            >
              <Icon style={{ width: '14px', height: '14px' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STORY FEED WITH VISIBLE DICE TRAYS */}
      {activeTab === 'story' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(gameState.storyLog || []).map(log => (
              <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '12px', borderBottom: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: log.actor === 'Director' ? '#3b0764' : '#1e1b4b',
                    color: log.actor === 'Director' ? '#e9d5ff' : '#c7d2fe',
                    border: log.actor === 'Director' ? '1px solid #6b21a8' : '1px solid #3730a3'
                  }}>
                    {log.actor}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <DiceTrayView trays={log.diceTrays} />

                {log.mechanicalSummary && (
                  <div style={{ fontSize: '11px', color: '#fcd34d', fontFamily: 'monospace', background: '#020617', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b', whiteSpace: 'pre-wrap' }}>
                    {log.mechanicalSummary}
                  </div>
                )}

                <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {log.text}
                </p>
              </div>
            ))}
            {isProcessingAi && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '12px', fontStyle: 'italic' }}>
                <RefreshCw style={{ width: '14px', height: '14px' }} />
                <span>AI Director & Engine resolving turn...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleCustomAction} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={`What does ${hero.name} do? (Auto-rolls d20 check + AI narration)`}
              value={customActionText}
              onChange={e => setCustomActionText(e.target.value)}
              style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff' }}
            />
            <button
              type="submit"
              disabled={isProcessingAi || !customActionText.trim()}
              style={{ padding: '12px 20px', background: isProcessingAi || !customActionText.trim() ? '#1e293b' : '#4f46e5', color: '#fff', fontWeight: 'bold', fontSize: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            >
              Roll & Act
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: 100% AUTOMATED COMBAT & INITIATIVE TRACKER */}
      {activeTab === 'combat' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fb7185', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Swords style={{ width: '16px', height: '16px' }} />
                  <span>Automated Initiative & Combat Engine</span>
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  {gameState.combatActive && activeTurnUnit
                    ? `Round ${gameState.round || 1} — Active Priority: ${activeTurnUnit.name}`
                    : 'Exploration Mode — The AI Director automatically spawns 5e SRD monsters and rolls initiative when combat begins.'}
                </p>
              </div>
            </div>

            {gameState.turnQueue?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {gameState.turnQueue.map((unit, idx) => {
                  const isCurrent = idx === (gameState.currentTurnIndex || 0);
                  return (
                    <div
                      key={`${unit.id}_${idx}`}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        background: isCurrent ? '#451a03' : '#020617',
                        color: isCurrent ? '#fcd34d' : '#94a3b8',
                        border: isCurrent ? '1px solid #f59e0b' : '1px solid #1e293b'
                      }}
                    >
                      Init {unit.initiative}: {unit.name}
                    </div>
                  );
                })}
              </div>
            )}

            {latestLogWithDice && (
              <div style={{ padding: '10px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Latest Turn Dice Rolls
                </div>
                <DiceTrayView trays={latestLogWithDice.diceTrays} />
              </div>
            )}

            {/* Weapon Attack Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
              <select
                value={selectedTargetId}
                onChange={e => setSelectedTargetId(e.target.value)}
                style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#fff' }}
              >
                <option value="">Target Monster...</option>
                {(gameState.activeMonsters || []).map(m => (
                  <option key={m.instanceId || m.id} value={m.instanceId || m.id}>
                    {m.name} (HP: {m.hpCurrent ?? m.hp}/{m.maxHp ?? m.hp} | AC: {m.ac})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAttackAction}
                disabled={isProcessingAi || !gameState.activeMonsters?.length}
                style={{ padding: '10px 16px', background: !gameState.activeMonsters?.length ? '#1e293b' : '#e11d48', color: '#fff', fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Target style={{ width: '15px', height: '15px' }} /> Attack ({hero.weapon?.name || 'Strike'})
              </button>
            </div>

            {/* 5e SRD Spellcasting Bar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedSpellName}
                onChange={e => setSelectedSpellName(e.target.value)}
                style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#fff' }}
              >
                {allSpells.map(sp => (
                  <option key={sp.id} value={sp.name}>
                    {sp.name} (Lvl {sp.level} {sp.school} • {sp.damageDice})
                  </option>
                ))}
              </select>
              <button
                onClick={handleCastSpell}
                disabled={isProcessingAi}
                style={{ padding: '10px 16px', background: '#4f46e5', color: '#fff', fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Sparkles style={{ width: '15px', height: '15px' }} /> Cast Spell
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
              Active AI-Spawned Hostiles ({gameState.activeMonsters?.length || 0})
            </h3>
            {(!gameState.activeMonsters || gameState.activeMonsters.length === 0) ? (
              <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                No active hostiles. The AI Director automatically pulls monsters from the 330+ 5e SRD Bestiary when combat starts.
              </div>
            ) : (
              gameState.activeMonsters.map(mob => (
                <div key={mob.instanceId || mob.id} style={{ padding: '12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fda4af' }}>{mob.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      AC: {mob.ac} | CR: {mob.cr} | Attack: {mob.actions?.[0]?.name || 'Strike'} ({mob.actions?.[0]?.damageDice || '1d6'})
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#e2e8f0' }}>
                      HP: {mob.hpCurrent ?? mob.hp} / {mob.maxHp ?? mob.hp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LOCKED VIEW-ONLY HERO SHEET */}
      {activeTab === 'character' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#fff' }}>{hero.name}</h2>
                  <span style={{ fontSize: '10px', padding: '2px 6px', background: '#1e1b4b', border: '1px solid #3730a3', color: '#c7d2fe', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock style={{ width: '10px', height: '10px' }} /> View-Only
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {hero.race} • {hero.background || 'Adventurer'} • {hero.class} {hero.primarySubclass ? `(${hero.primarySubclass}${hero.secondarySubclass ? ` / ${hero.secondarySubclass}` : ''})` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Level {hero.level}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#818cf8' }}>Proficiency +{profBonus}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>HP</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#34d399', marginTop: '2px' }}>{hero.hpCurrent}/{hero.hpMax}</div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>AC</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#818cf8', marginTop: '2px' }}>{hero.ac}</div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Weapon</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>{hero.weapon?.name} ({hero.weapon?.damageDice})</div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Gold</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fbbf24', marginTop: '2px' }}>{hero.gold || 0} GP</div>
              </div>
            </div>

            {/* Ability Scores & Saving Throw Buttons */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Ability Scores & Saving Throws (Tap to Roll Save)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {Object.entries(hero.baseStats || {}).map(([stat, val]) => {
                  const isSaveProf = (hero.savingThrows || []).includes(stat);
                  const mod = calculateMod(val);
                  const saveMod = mod + (isSaveProf ? profBonus : 0);
                  return (
                    <button
                      key={stat}
                      onClick={() => handleSaveRoll(stat)}
                      style={{
                        padding: '10px',
                        background: isSaveProf ? '#1e1b4b' : '#020617',
                        border: isSaveProf ? '1px solid #4f46e5' : '1px solid #1e293b',
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        color: '#fff'
                      }}
                    >
                      <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8' }}>
                        {stat} {isSaveProf ? '★' : ''}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', margin: '2px 0' }}>{val}</div>
                      <div style={{ fontSize: '10px', color: '#818cf8' }}>
                        Mod {mod >= 0 ? `+${mod}` : mod} | Save {saveMod >= 0 ? `+${saveMod}` : saveMod}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
              5e Skills (★ = Locked Class/Background Proficiency)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {SKILLS_5E.map(skill => {
                const isProf = (hero.proficiencies || []).includes(skill.id);
                const mod = calculateMod(hero.baseStats?.[skill.stat] ?? 10) + (isProf ? profBonus : 0);
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleSkillRoll(skill)}
                    style={{
                      padding: '10px 12px',
                      background: isProf ? '#1e1b4b' : '#020617',
                      border: isProf ? '1px solid #4f46e5' : '1px solid #1e293b',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#f8fafc',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{skill.name} {isProf ? '★' : ''}</span>
                    <span style={{ color: '#818cf8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {mod >= 0 ? `+${mod}` : mod} <Dices style={{ width: '13px', height: '13px' }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONNECTED PARTY */}
      {activeTab === 'party' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#34d399', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users style={{ width: '16px', height: '16px' }} />
              <span>Connected Party ({gameState.party?.length || 0})</span>
            </h3>
            {(!gameState.party || gameState.party.length === 0) ? (
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Waiting for party members to sync...</p>
            ) : (
              gameState.party.map(member => (
                <div key={member.id} style={{ padding: '12px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{member.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {member.race} • {member.class} | AC: {member.ac || 12} | Gold: {member.gold || 0} GP
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#34d399' }}>
                    HP: {member.hpCurrent} / {member.hpMax}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AUTO-UPDATING + MANUAL JOURNAL & LOOT */}
      {activeTab === 'journal' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#818cf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen style={{ width: '16px', height: '16px' }} />
              <span>Campaign Journal (Auto-Tracked + Manual Notes)</span>
            </h3>

            <form onSubmit={handleAddJournalNote} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Write a manual note to add to the auto-journal..."
                value={playerNoteInput}
                onChange={e => setPlayerNoteInput(e.target.value)}
                style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#fff' }}
              />
              <button
                type="submit"
                style={{ padding: '8px 14px', background: '#4f46e5', color: '#fff', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                + Add Note
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto' }}>
              {[...(gameState.journal || [])].reverse().map((entry, idx) => (
                <div key={idx} style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
                  • {entry}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Backpack style={{ width: '16px', height: '16px' }} />
              <span>Party Loot Vault (Auto d100 SRD Drops)</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(!gameState.lootPool || gameState.lootPool.length === 0) ? (
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>No loot discovered yet. Defeat monsters or explore to roll loot.</p>
              ) : (
                gameState.lootPool.map((item, idx) => (
                  <div key={idx} style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{item.name}</span>
                    <span style={{ color: '#94a3b8' }}>x{item.qty} ({item.type})</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
