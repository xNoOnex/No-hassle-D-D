import React, { useState, useEffect } from 'react';
import { 
  Swords, Shield, User, Backpack, BookOpen, 
  Target, RefreshCw, Dices, Plus, Minus, Play, SkipForward, Users
} from 'lucide-react';
import { 
  calculateMod, calculateProficiency, calculateAC, calculateMaxHP,
  executeCheck, resolveAttack,
  buildInitiativeQueue, advanceTurn, executeAutomatedMonsterTurn 
} from '../utils/dndEngine';
import { getAllMonsters, getAllSpells, getMonster } from '../data/index';

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

const createBlankChar = () => ({
  id: `char_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  name: 'Wanderer',
  race: 'Human',
  class: 'Fighter',
  level: 1,
  baseStats: { str: 14, dex: 12, con: 14, int: 10, wis: 12, cha: 10 },
  armor: { name: 'Leather Armor', base: 11, type: 'light' },
  weapon: { name: 'Longsword', damageDice: '1d8', stat: 'str' },
  proficiencies: ['athletics', 'perception'],
  hpCurrent: 12,
  hpMax: 12,
  ac: 12,
  inventory: ['Adventurer Pack', 'Torch', 'Rations'],
  gold: 25
});

export default function PlayerScreen({ network, gameState, isHost, dispatchAction, isProcessingAi }) {
  const [activeTab, setActiveTab] = useState('story');
  const [activeChar, setActiveChar] = useState(() => {
    const saved = localStorage.getItem('dnd_active_character');
    return saved ? JSON.parse(saved) : createBlankChar();
  });

  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [customActionText, setCustomActionText] = useState('');
  const [spawnMonsterName, setSpawnMonsterName] = useState('Goblin');
  const [playerNoteInput, setPlayerNoteInput] = useState('');

  const allMonsters = getAllMonsters();
  const allSpells = getAllSpells();

  useEffect(() => {
    const remoteSelf = (gameState.party || []).find(p => p.id === activeChar.id);
    if (remoteSelf && remoteSelf.hpCurrent !== undefined && remoteSelf.hpCurrent !== activeChar.hpCurrent) {
      setActiveChar(prev => {
        const updated = { ...prev, hpCurrent: remoteSelf.hpCurrent };
        localStorage.setItem('dnd_active_character', JSON.stringify(updated));
        return updated;
      });
    }
  }, [gameState.party]);

  const syncCharWithRoom = (charObj) => {
    const computedAc = calculateAC(charObj.armor, calculateMod(charObj.baseStats.dex));
    const readyChar = { ...charObj, ac: computedAc };
    localStorage.setItem('dnd_active_character', JSON.stringify(readyChar));

    if (isHost) {
      dispatchAction({
        actionType: 'SYNC_CHARACTER',
        character: readyChar,
        skipAi: true
      });
    } else if (network) {
      network.sendAction('SYNC_CHARACTER', readyChar);
    }
  };

  useEffect(() => {
    syncCharWithRoom(activeChar);
  }, [activeChar.name, activeChar.level, activeChar.class]);

  const adjustCharacterHp = (delta) => {
    const nextHp = Math.max(0, Math.min(activeChar.hpMax, activeChar.hpCurrent + delta));
    const updated = { ...activeChar, hpCurrent: nextHp };
    setActiveChar(updated);
    syncCharWithRoom(updated);
  };

  const handleStatChange = (stat, val) => {
    const num = Math.max(1, Math.min(30, parseInt(val, 10) || 10));
    const nextStats = { ...activeChar.baseStats, [stat]: num };
    const conMod = calculateMod(stat === 'con' ? num : activeChar.baseStats.con);
    const maxHp = calculateMaxHP(conMod, 10, activeChar.level);
    const updated = {
      ...activeChar,
      baseStats: nextStats,
      hpMax: maxHp,
      hpCurrent: Math.min(activeChar.hpCurrent, maxHp)
    };
    setActiveChar(updated);
    syncCharWithRoom(updated);
  };

  const handleSkillRoll = (skill) => {
    const isProf = activeChar.proficiencies.includes(skill.id);
    const profBonus = calculateProficiency(activeChar.level);
    const statVal = activeChar.baseStats[skill.stat];
    const check = executeCheck(statVal, isProf, profBonus, 'normal');

    dispatchAction({
      actionType: 'SKILL_CHECK',
      actorName: activeChar.name,
      summary: `${activeChar.name} rolled ${skill.name}: ${check.total} (d20: ${check.keptRoll} + Mod: ${check.totalMod})${check.isCrit ? ' [NATURAL 20!]' : check.isFumble ? ' [NATURAL 1!]' : ''}.`
    });
    setActiveTab('story');
  };

  const handleAttackAction = () => {
    const monsters = gameState.activeMonsters || [];
    const target = monsters.find(m => (m.instanceId || m.id) === selectedTargetId) || monsters[0];
    if (!target) return;

    const statKey = activeChar.weapon?.stat || 'str';
    const statMod = calculateMod(activeChar.baseStats[statKey]);
    const profBonus = calculateProficiency(activeChar.level);

    const attackRes = resolveAttack({
      attackerName: activeChar.name,
      defenderName: target.name,
      attackBonus: statMod + profBonus,
      targetAC: target.ac || 10,
      damageDice: activeChar.weapon?.damageDice || '1d8',
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
      actorName: activeChar.name,
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
      actorName: activeChar.name,
      updatedMonsters: nextMonsters,
      summary: `${newMob.name} (HP: ${newMob.hp}, AC: ${newMob.ac}) enters the area!`,
      skipAi: true
    });
  };

  const handleStartCombat = () => {
    const partyList = gameState.party?.length ? gameState.party : [activeChar];
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

      const mobTurn = executeAutomatedMonsterTurn(liveMob, gameState.party || [activeChar]);

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
      actorName: activeChar.name,
      summary: `${activeChar.name}: "${customActionText.trim()}"`
    });
    setCustomActionText('');
  };

  const handleAddJournalNote = (e) => {
    e.preventDefault();
    if (!playerNoteInput.trim()) return;
    dispatchAction({
      actionType: 'ADD_NOTE',
      actorName: activeChar.name,
      newJournalEntry: `[${activeChar.name}] ${playerNoteInput.trim()}`,
      skipAi: true
    });
    setPlayerNoteInput('');
  };

  const activeTurnUnit = gameState.turnQueue?.[gameState.currentTurnIndex || 0];

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
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
              className={`flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-lg transition ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'story' && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto space-y-4">
            {(gameState.storyLog || []).map(log => (
              <div key={log.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    log.actor === 'Director'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                  }`}>
                    {log.actor}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {log.mechanicalSummary && (
                  <div className="text-xs text-amber-300/90 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                    {log.mechanicalSummary}
                  </div>
                )}
                <p className="text-sm text-slate-200 leading-relaxed pl-1 whitespace-pre-wrap">
                  {log.text}
                </p>
              </div>
            ))}
            {isProcessingAi && (
              <div className="flex items-center gap-2 text-indigo-400 text-xs italic animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI Director is generating response...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleCustomAction} className="flex gap-2">
            <input
              type="text"
              placeholder={`What does ${activeChar.name} say or do?`}
              value={customActionText}
              onChange={e => setCustomActionText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isProcessingAi || !customActionText.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm rounded-xl transition"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {activeTab === 'combat' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                  <Swords className="w-4 h-4" />
                  <span>Turn Priority & Initiative</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {gameState.combatActive && activeTurnUnit
                    ? `Round ${gameState.round || 1} — Active Turn: ${activeTurnUnit.name}`
                    : 'Roll initiative to lock turn order.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleStartCombat}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" /> Roll Initiative
                </button>
                {gameState.combatActive && (
                  <button
                    onClick={handleNextTurn}
                    disabled={isProcessingAi}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Next Turn
                  </button>
                )}
              </div>
            </div>

            {gameState.turnQueue?.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {gameState.turnQueue.map((unit, idx) => {
                  const isCurrent = idx === (gameState.currentTurnIndex || 0);
                  return (
                    <div
                      key={`${unit.id}_${idx}`}
                      className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap border ${
                        isCurrent
                          ? 'bg-amber-950 text-amber-300 border-amber-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {unit.initiative}: {unit.name}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2 items-center pt-2 border-t border-slate-800">
              <select
                value={selectedTargetId}
                onChange={e => setSelectedTargetId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none"
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm rounded-lg flex items-center gap-1.5"
              >
                <Target className="w-4 h-4" /> Attack
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-slate-400">Active Monsters ({gameState.activeMonsters?.length || 0})</h3>
            {(!gameState.activeMonsters || gameState.activeMonsters.length === 0) ? (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No active monsters. The AI Director will spawn enemies during the story, or you can spawn one below.
              </div>
            ) : (
              gameState.activeMonsters.map(mob => (
                <div key={mob.instanceId || mob.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-rose-300">{mob.name}</div>
                    <div className="text-xs text-slate-400">AC: {mob.ac} | CR: {mob.cr}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-200">
                      HP: {mob.hpCurrent ?? mob.hp} / {mob.maxHp ?? mob.hp}
                    </div>
                    <div className="w-28 bg-slate-950 h-2 rounded-full overflow-hidden mt-1 border border-slate-800">
                      <div 
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, ((mob.hpCurrent ?? mob.hp) / (mob.maxHp ?? mob.hp)) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <h3 className="text-xs font-bold uppercase text-slate-400">Spawn from 5e SRD Bestiary ({allMonsters.length} Monsters)</h3>
            <div className="flex gap-2">
              <select
                value={spawnMonsterName}
                onChange={e => setSpawnMonsterName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white"
              >
                {allMonsters.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} (CR {m.cr} | HP {m.hp} | AC {m.ac})
                  </option>
                ))}
              </select>
              <button
                onClick={handleSpawnMonster}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs rounded-lg border border-slate-700"
              >
                + Spawn
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'character' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                placeholder="Character Name"
                value={activeChar.name}
                onChange={e => setActiveChar(prev => ({ ...prev, name: e.target.value }))}
                className="bg-slate-950 px-3 py-1.5 rounded border border-slate-700 text-base font-bold text-white focus:border-indigo-500 focus:outline-none flex-1"
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">Lvl</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={activeChar.level}
                  onChange={e => setActiveChar(prev => ({ ...prev, level: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  className="w-12 bg-slate-950 border border-slate-700 rounded p-1 text-center text-sm font-bold text-indigo-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Hit Points</div>
                  <div className="text-lg font-black text-emerald-400">
                    {activeChar.hpCurrent} / {activeChar.hpMax}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => adjustCharacterHp(-1)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-rose-400"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => adjustCharacterHp(1)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-emerald-400"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Armor Class</div>
                  <div className="text-lg font-black text-indigo-400">
                    {calculateAC(activeChar.armor, calculateMod(activeChar.baseStats.dex))}
                  </div>
                </div>
                <Shield className="w-5 h-5 text-indigo-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {Object.entries(activeChar.baseStats).map(([stat, val]) => {
              const mod = calculateMod(val);
              return (
                <div key={stat} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">{stat}</div>
                  <input
                    type="number"
                    value={val}
                    onChange={e => handleStatChange(stat, e.target.value)}
                    className="w-full text-center bg-transparent font-bold text-white text-base focus:outline-none"
                  />
                  <div className="text-xs font-semibold text-indigo-400">
                    {mod >= 0 ? `+${mod}` : mod}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-slate-400">Roll Skill Check ({allSpells.length} SRD Spells Loaded)</h3>
            <div className="grid grid-cols-2 gap-2">
              {SKILLS.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => handleSkillRoll(skill)}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-between text-left transition"
                >
                  <span className="text-xs text-slate-200">{skill.name}</span>
                  <Dices className="w-4 h-4 text-indigo-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'party' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Connected Party ({gameState.party?.length || 0})</span>
            </h3>
            {(!gameState.party || gameState.party.length === 0) ? (
              <p className="text-xs text-slate-500">Waiting for party members to sync...</p>
            ) : (
              gameState.party.map(member => (
                <div key={member.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">{member.name}</div>
                    <div className="text-xs text-slate-400">Lvl {member.level} {member.class} | AC: {member.ac || 12}</div>
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    HP: {member.hpCurrent} / {member.hpMax}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Shared Campaign Journal (AI + Party)</span>
            </h3>

            <form onSubmit={handleAddJournalNote} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note to the campaign journal..."
                value={playerNoteInput}
                onChange={e => setPlayerNoteInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
              >
                + Note
              </button>
            </form>

            <div className="space-y-2">
              {(gameState.journal || []).map((entry, idx) => (
                <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300">
                  • {entry}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
              <Backpack className="w-4 h-4" />
              <span>Party Loot Pool</span>
            </h3>
            <div className="space-y-2">
              {(!gameState.lootPool || gameState.lootPool.length === 0) ? (
                <p className="text-xs text-slate-500">No loot discovered yet.</p>
              ) : (
                gameState.lootPool.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="text-slate-400">x{item.qty} ({item.type})</span>
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
