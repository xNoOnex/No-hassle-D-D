import React, { useState } from 'react';
import {
  Swords, Shield, User, Backpack, BookOpen,
  Target, RefreshCw, Dices, Play, SkipForward, Users, Lock
} from 'lucide-react';
import {
  calculateMod, calculateProficiency,
  executeCheck, resolveAttack,
  buildInitiativeQueue, advanceTurn, executeAutomatedMonsterTurn
} from '../utils/dndEngine';
import { getAllMonsters, getMonster } from '../data/index';

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

export default function PlayerScreen({ network, gameState, activeCharacter, isHost, dispatchAction, isProcessingAi }) {
  const [activeTab, setActiveTab] = useState('story');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [customActionText, setCustomActionText] = useState('');
  const [spawnMonsterName, setSpawnMonsterName] = useState('Goblin');
  const [playerNoteInput, setPlayerNoteInput] = useState('');

  const allMonsters = getAllMonsters();

  // Pull live synced HP from party state if updated during combat
  const partySelf = (gameState.party || []).find(p => p.id === activeCharacter?.id);
  const hero = partySelf ? { ...activeCharacter, ...partySelf } : (activeCharacter || {
    id: 'fallback',
    name: 'Hero',
    race: 'Human',
    class: 'Fighter 1',
    level: 1,
    baseStats: { str: 14, dex: 12, con: 14, int: 10, wis: 12, cha: 10 },
    weapon: { name: 'Longsword', damageDice: '1d8', stat: 'str' },
    armor: { name: 'Leather Armor', base: 11, type: 'light' },
    proficiencies: [],
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
    const check = executeCheck(statVal, isProf, profBonus, 'normal');

    dispatchAction({
      actionType: 'SKILL_CHECK',
      actorName: hero.name,
      summary: `${hero.name} rolled ${skill.name}: ${check.total} (d20: ${check.keptRoll} + Mod: ${check.totalMod})${check.isCrit ? ' [NATURAL 20!]' : check.isFumble ? ' [NATURAL 1!]' : ''}.`
    });
    setActiveTab('story');
  };

  const handleAttackAction = () => {
    const monsters = gameState.activeMonsters || [];
    const target = monsters.find(m => (m.instanceId || m.id) === selectedTargetId) || monsters[0];
    if (!target) return;

    const statKey = hero.weapon?.stat || 'str';
    const statMod = calculateMod(hero.baseStats?.[statKey] ?? 10);

    const attackRes = resolveAttack({
      attackerName: hero.name,
      defenderName: target.name,
      attackBonus: statMod + profBonus,
      targetAC: target.ac || 10,
      damageDice: hero.weapon?.damageDice || '1d8',
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
      summary: `${attackRes.summary}${killed ? ` ${target.name} is slain!` : ''}`
    });
  };

  const handleSpawnMonster = () => {
    const baseMob = getMonster(spawnMonsterName);
    if (!baseMob) return;
    const newMob = {
      ...baseMob,
      instanceId: `mob_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      hpCurrent: baseMob.hp
    };
    const nextMonsters = [...(gameState.activeMonsters || []), newMob];

    dispatchAction({
      actionType: 'SPAWN_MONSTER',
      actorName: hero.name,
      updatedMonsters: nextMonsters,
      summary: `${newMob.name} (HP: ${newMob.hp}, AC: ${newMob.ac}) enters the encounter!`,
      skipAi: true
    });
  };

  const handleStartCombat = () => {
    const partyList = gameState.party?.length ? gameState.party : [hero];
    const combat = buildInitiativeQueue(partyList, gameState.activeMonsters || []);

    dispatchAction({
      actionType: 'START_COMBAT',
      actorName: 'Combat Engine',
      combatActive: true,
      turnQueue: combat.queue,
      currentTurnIndex: 0,
      round: 1,
      summary: `Initiative Rolled! Round 1 Order: ${combat.queue.map(c => `${c.name} (${c.initiative})`).join(' -> ')}`,
      skipAi: true
    });
  };

  const handleNextTurn = () => {
    if (!gameState.turnQueue?.length) return;
    const nextCombat = advanceTurn({
      queue: gameState.turnQueue,
      currentIndex: gameState.currentTurnIndex || 0,
      round: gameState.round || 1
    });

    const activeUnit = nextCombat.activeCombatant;

    if (activeUnit && activeUnit.type === 'monster') {
      const liveMob = (gameState.activeMonsters || []).find(
        m => (m.instanceId || m.id) === activeUnit.id || m.name === activeUnit.name
      ) || activeUnit;

      const mobTurn = executeAutomatedMonsterTurn(liveMob, gameState.party || [hero]);

      dispatchAction({
        actionType: 'MONSTER_TURN',
        actorName: liveMob.name,
        updatedParty: mobTurn.updatedParty,
        currentTurnIndex: nextCombat.currentIndex,
        round: nextCombat.round,
        summary: `[Round ${nextCombat.round} - ${liveMob.name}'s Turn] ${mobTurn.actionSummary}`
      });
    } else {
      dispatchAction({
        actionType: 'NEXT_TURN',
        actorName: 'Turn Tracker',
        currentTurnIndex: nextCombat.currentIndex,
        round: nextCombat.round,
        summary: `Round ${nextCombat.round}: It is now ${activeUnit?.name || 'the next combatant'}'s turn.`,
        skipAi: true
      });
    }
  };

  const handleCustomAction = (e) => {
    e.preventDefault();
    if (!customActionText.trim()) return;

    dispatchAction({
      actionType: 'FREEFORM_ACTION',
      actorName: hero.name,
      summary: `${hero.name}: "${customActionText.trim()}"`
    });
    setCustomActionText('');
  };

  const handleAddJournalNote = (e) => {
    e.preventDefault();
    if (!playerNoteInput.trim()) return;
    dispatchAction({
      actionType: 'ADD_NOTE',
      actorName: hero.name,
      newJournalEntry: `[${hero.name}] ${playerNoteInput.trim()}`,
      skipAi: true
    });
    setPlayerNoteInput('');
  };

  const activeTurnUnit = gameState.turnQueue?.[gameState.currentTurnIndex || 0];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
      {/* Navigation Tabs */}
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

      {/* TAB 1: STORY FEED */}
      {activeTab === 'story' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(gameState.storyLog || []).map(log => (
              <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                {log.mechanicalSummary && (
                  <div style={{ fontSize: '12px', color: '#fcd34d', fontFamily: 'monospace', background: '#020617', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
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
                <span>AI Director is generating response...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleCustomAction} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={`What does ${hero.name} say or do?`}
              value={customActionText}
              onChange={e => setCustomActionText(e.target.value)}
              style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', color: '#fff' }}
            />
            <button
              type="submit"
              disabled={isProcessingAi || !customActionText.trim()}
              style={{ padding: '12px 20px', background: isProcessingAi || !customActionText.trim() ? '#1e293b' : '#4f46e5', color: '#fff', fontWeight: 'bold', fontSize: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: COMBAT & TURN TRACKER */}
      {activeTab === 'combat' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fb7185', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Swords style={{ width: '16px', height: '16px' }} />
                  <span>Turn Priority & Initiative</span>
                </h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  {gameState.combatActive && activeTurnUnit
                    ? `Round ${gameState.round || 1} — Active Turn: ${activeTurnUnit.name}`
                    : 'Roll initiative to lock turn order.'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleStartCombat}
                  style={{ padding: '8px 12px', background: '#4f46e5', color: '#fff', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Play style={{ width: '12px', height: '12px' }} /> Roll Initiative
                </button>
                {gameState.combatActive && (
                  <button
                    onClick={handleNextTurn}
                    disabled={isProcessingAi}
                    style={{ padding: '8px 12px', background: '#d97706', color: '#fff', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <SkipForward style={{ width: '12px', height: '12px' }} /> Next Turn
                  </button>
                )}
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
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        background: isCurrent ? '#451a03' : '#020617',
                        color: isCurrent ? '#fcd34d' : '#94a3b8',
                        border: isCurrent ? '1px solid #f59e0b' : '1px solid #1e293b'
                      }}
                    >
                      {unit.initiative}: {unit.name}
                    </div>
                  );
                })}
              </div>
            )}

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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
              Active Monsters ({gameState.activeMonsters?.length || 0})
            </h3>
            {(!gameState.activeMonsters || gameState.activeMonsters.length === 0) ? (
              <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                No active monsters. The AI Director will spawn enemies during the story, or you can spawn one below.
              </div>
            ) : (
              gameState.activeMonsters.map(mob => (
                <div key={mob.instanceId || mob.id} style={{ padding: '12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fda4af' }}>{mob.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>AC: {mob.ac} | CR: {mob.cr}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>
                      HP: {mob.hpCurrent ?? mob.hp} / {mob.maxHp ?? mob.hp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
              Spawn from 5e SRD Bestiary ({allMonsters.length} Monsters)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={spawnMonsterName}
                onChange={e => setSpawnMonsterName(e.target.value)}
                style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#fff' }}
              >
                {allMonsters.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} (CR {m.cr} | HP {m.hp} | AC {m.ac})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSpawnMonster}
                style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', color: '#c7d2fe', fontWeight: 'bold', fontSize: '12px', borderRadius: '8px', cursor: 'pointer' }}
              >
                + Spawn
              </button>
            </div>
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
                    <Lock style={{ width: '10px', height: '10px' }} /> Locked to Room
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  {hero.race} • {hero.class} {hero.primarySubclass ? `(${hero.primarySubclass}${hero.secondarySubclass ? ` / ${hero.secondarySubclass}` : ''})` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Level {hero.level}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#818cf8' }}>Proficiency +{profBonus}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Hit Points</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#34d399', marginTop: '2px' }}>
                  {hero.hpCurrent} / {hero.hpMax}
                </div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Armor Class</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#818cf8', marginTop: '2px' }}>
                  {hero.ac}
                </div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Equipped Weapon</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>
                  {hero.weapon?.name || 'Unarmed'} ({hero.weapon?.damageDice || '1d4'})
                </div>
              </div>
            </div>

            {/* Locked Read-Only Ability Scores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
              {Object.entries(hero.baseStats || {}).map(([stat, val]) => {
                const mod = calculateMod(val);
                return (
                  <div key={stat} style={{ padding: '8px 4px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8' }}>{stat}</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: '2px 0' }}>{val}</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#818cf8' }}>{mod >= 0 ? `+${mod}` : mod}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clickable Skill Roll Grid */}
          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
              Tap a Skill to Roll Check
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {SKILLS.map(skill => {
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
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{member.race} • {member.class} | AC: {member.ac || 12}</div>
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

      {/* TAB 5: SHARED JOURNAL & LOOT */}
      {activeTab === 'journal' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#818cf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen style={{ width: '16px', height: '16px' }} />
              <span>Shared Campaign Journal (AI + Party)</span>
            </h3>

            <form onSubmit={handleAddJournalNote} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add a note to the campaign journal..."
                value={playerNoteInput}
                onChange={e => setPlayerNoteInput(e.target.value)}
                style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#fff' }}
              />
              <button
                type="submit"
                style={{ padding: '8px 14px', background: '#4f46e5', color: '#fff', fontSize: '12px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                + Note
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(gameState.journal || []).map((entry, idx) => (
                <div key={idx} style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                  • {entry}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Backpack style={{ width: '16px', height: '16px' }} />
              <span>Party Loot Pool</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(!gameState.lootPool || gameState.lootPool.length === 0) ? (
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>No loot discovered yet.</p>
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
