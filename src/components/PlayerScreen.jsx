import React, { useState, useRef, useEffect } from 'react';
import {
  Swords, User, Backpack, BookOpen,
  Target, RefreshCw, Dices, Users, Sparkles, Heart, HelpCircle, X
} from 'lucide-react';
import {
  calculateMod,
  calculateProficiency,
  executeCheckWithTray,
  resolveAttackWithTray,
  detectSkillFromText,
  parseAndRollDice,
  getMaxUnlockedSpellLevel,
  getMaxSpellSlots,
  getUnlockedSpellsForHero,
  getItemCategory,
  isItemEquipped
} from '../utils/dndEngine';
import { ALIGNMENTS_5E, SKILLS_5E, XP_THRESHOLDS } from '../data/rules5e.js';
import { getAllSpells } from '../data/index';

const RP_MODES = [
  { prefix: '"', suffix: '"', label: '" " Talk', desc: 'Spoken out loud in-character to NPCs & Party' },
  { prefix: "'", suffix: "'", label: "' ' Whisper", desc: 'Whispered quietly under your breath' },
  { prefix: '*', suffix: '*', label: '* * Act', desc: 'Physical action or movement performed' },
  { prefix: '(', suffix: ')', label: '( ) Think', desc: 'Surface thought (NPCs cannot hear unless telepathic)' },
  { prefix: '((', suffix: '))', label: '(( )) Inner', desc: 'Deep internal monologue, feelings, or memories' },
  { prefix: '[', suffix: ']', label: '[ ] Party OOC', desc: 'Out-of-character chat to party only (skips AI & dice)' },
  { prefix: '[[', suffix: ']]', label: '[[ ]] AI DM', desc: 'Direct OOC instruction or question to the AI Director' }
];

const GENDERS = ['Male', 'Female', 'Non-Binary', 'Construct / Genderless', 'Other'];

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
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '0.8rem',
              fontFamily: 'monospace'
            }}
          >
            <span style={{ fontWeight: 'bold', color: '#818cf8' }}>
              🎲 {t.diceLabel || t.diceNotation || 'Roll'}
            </span>
            <span style={{ color: '#f8fafc', background: '#0f172a', padding: '1px 6px', borderRadius: '4px', border: '1px solid #334155' }}>
              Die: [{rollsList}]
            </span>
            {t.modifier !== undefined && t.modifier !== 0 && (
              <span style={{ color: '#94a3b8' }}>
                {t.modifier > 0 ? `+${t.modifier}` : t.modifier}
              </span>
            )}
            <span style={{ fontWeight: 'bold', color: '#fcd34d' }}>
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
                fontSize: '0.75rem',
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
  const [selectedSpellName, setSelectedSpellName] = useState('');
  const [customActionText, setCustomActionText] = useState('');
  const [queuedCheck, setQueuedCheck] = useState(null);
  const [showKeyTable, setShowKeyTable] = useState(false);

  const [playerNoteInput, setPlayerNoteInput] = useState('');
  const [manualLootName, setManualLootName] = useState('');
  const [manualLootType, setManualLootType] = useState('Gear');

  const storyFeedRef = useRef(null);
  const actionInputRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'story' && storyFeedRef.current) {
      storyFeedRef.current.scrollTop = storyFeedRef.current.scrollHeight;
    }
  }, [gameState.storyLog?.length, activeTab, isProcessingAi]);

  const partySelf = (gameState.party || []).find(p => p.id === activeCharacter?.id);
  const hero = partySelf ? { ...activeCharacter, ...partySelf } : (activeCharacter || {
    id: 'fallback',
    name: 'Hero',
    gender: 'Male',
    alignment: 'True Neutral',
    race: 'Human',
    background: 'Soldier',
    class: 'Fighter 1',
    primaryClass: 'Fighter',
    primaryLevel: 1,
    secondaryClass: 'None',
    secondaryLevel: 0,
    level: 1,
    xp: 0,
    baseStats: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 10 },
    savingThrows: ['str', 'con'],
    weapon: { name: 'Longsword', damageDice: '1d8', stat: 'str' },
    armor: { name: 'Leather Armor', base: 11, type: 'light' },
    proficiencies: ['athletics', 'intimidation'],
    hpCurrent: 12,
    hpMax: 12,
    ac: 12,
    spellSlotsCurrent: 0,
    spellSlotsMax: 0,
    inventory: ['Potion of Healing', 'Longsword', 'Leather Armor'],
    gold: 25
  });

  const profBonus = calculateProficiency(hero.level || 1);
  const maxSpellLevel = getMaxUnlockedSpellLevel(hero);
  const maxSpellSlots = hero.spellSlotsMax ?? getMaxSpellSlots(hero);
  const currentSpellSlots = hero.spellSlotsCurrent ?? maxSpellSlots;

  const allSpells = getAllSpells();
  const unlockedSpells = getUnlockedSpellsForHero(hero, allSpells);

  const activeCombatUnit = gameState.combatActive && gameState.turnQueue?.length
    ? gameState.turnQueue[gameState.currentTurnIndex || 0]
    : null;
  const activeExplorationUnit = !gameState.combatActive && gameState.party?.length
    ? gameState.party[gameState.explorationTurnIndex || 0]
    : hero;
  const currentTurnName = activeCombatUnit ? activeCombatUnit.name : (activeExplorationUnit?.name || hero.name);
  const isMyTurn = currentTurnName === hero.name;

  const handleQueueSkillRoll = (skill) => {
    const isProf = (hero.proficiencies || []).includes(skill.id);
    const mod = calculateMod(hero.baseStats?.[skill.stat] ?? 10) + (isProf ? profBonus : 0);
    setQueuedCheck({
      type: 'skill',
      id: skill.id,
      name: skill.name,
      stat: skill.stat,
      isProf,
      mod,
      dc: 12
    });
    setActiveTab('story');
    setTimeout(() => actionInputRef.current?.focus(), 60);
  };

  const handleQueueSaveRoll = (statKey) => {
    const isProf = (hero.savingThrows || []).includes(statKey);
    const mod = calculateMod(hero.baseStats?.[statKey] ?? 10) + (isProf ? profBonus : 0);
    setQueuedCheck({
      type: 'save',
      id: statKey,
      name: `${statKey.toUpperCase()} Save`,
      stat: statKey,
      isProf,
      mod,
      dc: 12
    });
    setActiveTab('story');
    setTimeout(() => actionInputRef.current?.focus(), 60);
  };

  const applyRpTag = (prefix, suffix) => {
    const trimmed = customActionText.trim();
    if (!trimmed) {
      setCustomActionText(`${prefix}${suffix}`);
    } else {
      setCustomActionText(`${prefix}${trimmed}${suffix}`);
    }
    setTimeout(() => actionInputRef.current?.focus(), 40);
  };

  const handleCustomAction = (e) => {
    if (e) e.preventDefault();
    const rawText = customActionText.trim();
    if (!rawText && !queuedCheck) return;

    if (rawText.startsWith('[') && !rawText.startsWith('[[') && rawText.endsWith(']')) {
      dispatchAction({
        actionType: 'OOC_CHAT',
        actorId: hero.id,
        actorName: hero.name,
        summary: rawText,
        skipAi: true
      });
      setCustomActionText('');
      return;
    }

    const chosenCheck = queuedCheck || detectSkillFromText(rawText);
    const isProf = chosenCheck.isProf !== undefined
      ? chosenCheck.isProf
      : (hero.proficiencies || []).includes(chosenCheck.id);
    const statScore = hero.baseStats?.[chosenCheck.stat] ?? 10;

    const check = executeCheckWithTray(
      statScore,
      isProf,
      profBonus,
      'normal',
      chosenCheck.dc || 12,
      `${hero.name} ${chosenCheck.name}`
    );

    const actionDescription = rawText
      ? `${hero.name}: ${rawText} -> [${check.summary}]`
      : `[${check.summary}]`;

    dispatchAction({
      actionType: 'FREEFORM_ACTION',
      actorId: hero.id,
      actorName: hero.name,
      rollFailed: !check.isSuccess,
      diceTrays: check.diceTrays,
      summary: actionDescription
    });

    setCustomActionText('');
    setQueuedCheck(null);
  };

  const handleAttackAction = () => {
    const monsters = gameState.activeMonsters || [];
    const target = monsters.find(m => (m.instanceId || m.id) === selectedTargetId) || monsters[0];
    if (!target) return;

    const strMod = calculateMod(hero.baseStats?.str ?? 10);
    const dexMod = calculateMod(hero.baseStats?.dex ?? 10);
    const wep = hero.weapon || { name: 'Longsword', damageDice: '1d8', stat: 'str' };
    const magicBonus = Number(wep.magicBonus || 0);
    const statMod = (wep.finesse ? Math.max(strMod, dexMod) : (wep.ranged ? dexMod : strMod)) + magicBonus;

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
      actorId: hero.id,
      actorName: hero.name,
      rollFailed: !attackRes.isHit,
      updatedMonsters,
      diceTrays: attackRes.diceTrays,
      summary: `${attackRes.summary}${killed ? ` ${target.name} is slain!` : ''}`
    });
    setActiveTab('story');
  };

  const handleCastSpell = () => {
    const spell = unlockedSpells.find(s => s.name === selectedSpellName) || unlockedSpells[0];
    if (!spell) return;

    const isLeveledSpell = (spell.level || 0) > 0;
    if (isLeveledSpell && currentSpellSlots <= 0) return;

    const intMod = calculateMod(hero.baseStats?.int ?? 10);
    const wisMod = calculateMod(hero.baseStats?.wis ?? 10);
    const chaMod = calculateMod(hero.baseStats?.cha ?? 10);
    const spellMod = Math.max(intMod, wisMod, chaMod);
    const nextSlots = isLeveledSpell ? Math.max(0, currentSpellSlots - 1) : currentSpellSlots;

    if (spell.isHeal) {
      const healTray = parseAndRollDice(spell.damageDice || '1d8', `${spell.name} Healing`);
      const healTotal = Math.max(1, healTray.total + spellMod);
      const updatedParty = (gameState.party || [hero]).map(p =>
        p.id === hero.id
          ? { ...p, hpCurrent: Math.min(p.hpMax, p.hpCurrent + healTotal), spellSlotsCurrent: nextSlots }
          : p
      );

      dispatchAction({
        actionType: 'CAST_SPELL',
        actorId: hero.id,
        actorName: hero.name,
        rollFailed: false,
        updatedParty,
        diceTrays: [{ ...healTray, modifier: spellMod, total: healTotal, outcome: `+${healTotal} HP`, isSuccess: true }],
        summary: `${hero.name} casts ${spell.name} and restores ${healTotal} HP!`
      });
      setActiveTab('story');
      return;
    }

    const updatedPartyWithSlot = (gameState.party || [hero]).map(p =>
      p.id === hero.id ? { ...p, spellSlotsCurrent: nextSlots } : p
    );

    const monsters = gameState.activeMonsters || [];
    const target = monsters.find(m => (m.instanceId || m.id) === selectedTargetId) || monsters[0];

    if (spell.isUtility || !target) {
      const spellCheck = executeCheckWithTray(10 + spellMod * 2, true, profBonus, 'normal', 12, `Cast ${spell.name}`);
      dispatchAction({
        actionType: 'CAST_SPELL',
        actorId: hero.id,
        actorName: hero.name,
        rollFailed: !spellCheck.isSuccess,
        updatedParty: updatedPartyWithSlot,
        diceTrays: spellCheck.diceTrays,
        summary: `${hero.name} casts ${spell.name} (${spell.school} Utility/Effect)! ${spellCheck.summary}`
      });
      setActiveTab('story');
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
      actorId: hero.id,
      actorName: hero.name,
      rollFailed: !spellAtk.isHit,
      updatedParty: updatedPartyWithSlot,
      updatedMonsters,
      diceTrays: spellAtk.diceTrays,
      summary: `${spellAtk.summary}${killed ? ` ${target.name} is obliterated!` : ''}`
    });
    setActiveTab('story');
  };

  const handleEquipItem = (itemObj, lootIndex = null) => {
    dispatchAction({
      actionType: 'EQUIP_ITEM',
      actorId: hero.id,
      actorName: hero.name,
      equipItem: itemObj,
      lootIndex,
      skipAi: true
    });
  };

  const handleUnequipItem = (itemName) => {
    dispatchAction({
      actionType: 'UNEQUIP_ITEM',
      actorId: hero.id,
      actorName: hero.name,
      equipItem: itemName,
      skipAi: true
    });
  };

  const handleUsePotion = (itemName) => {
    dispatchAction({
      actionType: 'USE_POTION',
      actorId: hero.id,
      actorName: hero.name,
      equipItem: itemName,
      skipAi: true
    });
  };

  const handleTakeLootToBag = (lootIndex) => {
    dispatchAction({
      actionType: 'TAKE_PARTY_LOOT',
      actorId: hero.id,
      actorName: hero.name,
      lootIndex,
      skipAi: true
    });
  };

  const handleSendToPartyLoot = (itemName) => {
    dispatchAction({
      actionType: 'SEND_TO_PARTY_LOOT',
      actorId: hero.id,
      actorName: hero.name,
      equipItem: itemName,
      skipAi: true
    });
  };

  const handleAddManualLoot = (e) => {
    e.preventDefault();
    if (!manualLootName.trim()) return;
    dispatchAction({
      actionType: 'ADD_MANUAL_LOOT',
      actorId: hero.id,
      actorName: hero.name,
      newLootItem: { name: manualLootName.trim(), qty: 1, type: manualLootType },
      skipAi: true
    });
    setManualLootName('');
  };

  const handleGenderChange = (newGender) => {
    dispatchAction({
      actionType: 'UPDATE_GENDER',
      actorId: hero.id,
      actorName: hero.name,
      newGender,
      skipAi: true
    });
  };

  const handleAlignmentChange = (newAlignment) => {
    dispatchAction({
      actionType: 'UPDATE_ALIGNMENT',
      actorId: hero.id,
      actorName: hero.name,
      newAlignment,
      skipAi: true
    });
  };

  const handleRest = (restType) => {
    dispatchAction({
      actionType: 'REST',
      actorId: hero.id,
      actorName: hero.name,
      restType,
      skipAi: true
    });
  };

  const handleAddJournalNote = (e) => {
    e.preventDefault();
    if (!playerNoteInput.trim()) return;
    dispatchAction({
      actionType: 'ADD_NOTE',
      actorId: hero.id,
      actorName: hero.name,
      newJournalEntry: `[Manual Note — ${hero.name}] ${playerNoteInput.trim()}`,
      skipAi: true
    });
    setPlayerNoteInput('');
  };

  const latestLogWithDice = [...(gameState.storyLog || [])].reverse().find(l => l.diceTrays?.length > 0);
  const nextLevelXp = XP_THRESHOLDS[hero.level || 1] || 300;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
      {/* PINNED LIVE TURN TRACKER BANNER */}
      <div style={{
        flexShrink: 0,
        padding: '8px 12px',
        borderRadius: '10px',
        background: gameState.combatActive ? '#450a0a' : (isMyTurn ? '#1e1b4b' : '#0f172a'),
        border: gameState.combatActive ? '1px solid #dc2626' : (isMyTurn ? '1px solid #6366f1' : '1px solid #334155'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 'bold',
            padding: '3px 7px',
            borderRadius: '5px',
            background: gameState.combatActive ? '#dc2626' : '#4f46e5',
            color: '#fff',
            textTransform: 'uppercase'
          }}>
            {gameState.combatActive ? `⚔️ Rd ${gameState.round || 1}` : '🧭 Turn'}
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isMyTurn ? '#6ee7b7' : '#fcd34d' }}>
            {isMyTurn ? `👉 YOUR TURN (${hero.name})` : `Waiting: ${currentTurnName}`}
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
          HP:{hero.hpCurrent}/{hero.hpMax} | AC:{hero.ac} | Lvl {hero.level} ({hero.xp || 0}/{nextLevelXp}XP)
        </div>
      </div>

      {/* PINNED 5 NAVIGATION TABS */}
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '4px', background: '#0f172a', padding: '5px', borderRadius: '10px', border: '1px solid #1e293b' }}>
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
                gap: '4px',
                padding: '8px 2px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#4f46e5' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: INDEPENDENTLY SCROLLABLE STORY FEED + PINNED RP BAR */}
      {activeTab === 'story' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          <div
            ref={storyFeedRef}
            style={{
              flex: 1,
              minHeight: 0,
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {(gameState.storyLog || []).map(log => (
              <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '12px', borderBottom: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: log.actor === 'Director' ? '#3b0764' : '#1e1b4b',
                    color: log.actor === 'Director' ? '#e9d5ff' : '#c7d2fe',
                    border: log.actor === 'Director' ? '1px solid #6b21a8' : '1px solid #3730a3'
                  }}>
                    {log.actor}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <DiceTrayView trays={log.diceTrays} />

                {log.mechanicalSummary && (
                  <div style={{ fontSize: '0.8rem', color: '#fcd34d', fontFamily: 'monospace', background: '#020617', padding: '6px 10px', borderRadius: '6px', border: '1px solid #1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {log.mechanicalSummary}
                  </div>
                )}

                <p style={{ fontSize: '0.98rem', color: '#f1f5f9', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {log.text}
                </p>
              </div>
            ))}
            {isProcessingAi && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.88rem', fontStyle: 'italic' }}>
                <RefreshCw style={{ width: '15px', height: '15px' }} />
                <span>AI Director & Engine resolving turn...</span>
              </div>
            )}
          </div>

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px', background: '#0f172a', padding: '10px', borderRadius: '12px', border: '1px solid #1e293b' }}>
            {queuedCheck && (
              <div style={{ padding: '6px 10px', background: '#1e1b4b', border: '1px solid #6366f1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#c7d2fe' }}>
                  🎲 Queued {queuedCheck.name} ({queuedCheck.mod >= 0 ? `+${queuedCheck.mod}` : queuedCheck.mod}) — Type how you use it below!
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCustomAction(null)}
                    style={{ padding: '3px 8px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Roll Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueuedCheck(null)}
                    style={{ padding: '3px 6px', background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: '5px', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflowX: 'auto', paddingBottom: '2px' }}>
              {RP_MODES.map(mode => (
                <button
                  type="button"
                  key={mode.label}
                  onClick={() => applyRpTag(mode.prefix, mode.suffix)}
                  style={{
                    padding: '4px 8px',
                    background: '#020617',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  {mode.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowKeyTable(prev => !prev)}
                style={{
                  padding: '4px 8px',
                  background: showKeyTable ? '#4f46e5' : '#1e1b4b',
                  border: '1px solid #6366f1',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <HelpCircle style={{ width: '12px', height: '12px' }} /> Key Table
              </button>
            </div>

            {showKeyTable && (
              <div style={{ padding: '8px 10px', background: '#020617', border: '1px solid #334155', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#818cf8', fontWeight: 'bold', marginBottom: '2px' }}>
                  <span>RP Expression Key Table (Tap any button above to wrap text)</span>
                  <button type="button" onClick={() => setShowKeyTable(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
                {RP_MODES.map(m => (
                  <div key={m.label} style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '8px', borderTop: '1px solid #0f172a', paddingTop: '3px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fcd34d' }}>{m.label}</span>
                    <span style={{ color: '#cbd5e1' }}>{m.desc}</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleCustomAction} style={{ display: 'flex', gap: '6px' }}>
              <input
                ref={actionInputRef}
                type="text"
                placeholder={queuedCheck ? `Describe your ${queuedCheck.name} action...` : `[${currentTurnName}'s Turn] Talk, act, think, or ask AI...`}
                value={customActionText}
                onChange={e => setCustomActionText(e.target.value)}
                style={{ flex: 1, minWidth: 0, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
              />
              <button
                type="submit"
                disabled={isProcessingAi || (!customActionText.trim() && !queuedCheck)}
                style={{ flexShrink: 0, padding: '10px 16px', background: isProcessingAi || (!customActionText.trim() && !queuedCheck) ? '#1e293b' : '#4f46e5', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                Roll & Act
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED COMBAT */}
      {activeTab === 'combat' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
          <div style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fb7185', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Swords style={{ width: '18px', height: '18px' }} />
                <span>Automated Initiative & Turn Order</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                {gameState.combatActive && activeCombatUnit
                  ? `Round ${gameState.round || 1} — Active Turn: ${activeCombatUnit.name}`
                  : 'No active combat. The AI spawns 5e SRD monsters and rolls initiative automatically when combat begins.'}
              </p>
            </div>

            {gameState.turnQueue?.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {gameState.turnQueue.map((unit, idx) => {
                  const isCurrent = idx === (gameState.currentTurnIndex || 0);
                  return (
                    <div
                      key={`${unit.id}_${idx}`}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        background: isCurrent ? '#451a03' : '#020617',
                        color: isCurrent ? '#fcd34d' : '#94a3b8',
                        border: isCurrent ? '2px solid #f59e0b' : '1px solid #1e293b'
                      }}
                    >
                      {isCurrent ? '👉 ' : ''}Init {unit.initiative}: {unit.name}
                    </div>
                  );
                })}
              </div>
            )}

            {latestLogWithDice && (
              <div style={{ padding: '10px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Latest Turn Dice Rolls
                </div>
                <DiceTrayView trays={latestLogWithDice.diceTrays} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
              <select
                value={selectedTargetId}
                onChange={e => setSelectedTargetId(e.target.value)}
                style={{ flex: '1 1 180px', minWidth: 0, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: '#fff' }}
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
                style={{ flexShrink: 0, padding: '10px 16px', background: !gameState.activeMonsters?.length ? '#1e293b' : '#e11d48', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Target style={{ width: '16px', height: '16px' }} /> Attack ({hero.weapon?.name || 'Strike'})
              </button>
            </div>

            {unlockedSpells.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', fontSize: '0.82rem', color: '#818cf8', fontWeight: 'bold' }}>
                  <span>{hero.primaryClass} Spells ({unlockedSpells.length} Unlocked)</span>
                  <span>Spell Slots: {currentSpellSlots} / {maxSpellSlots}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={selectedSpellName}
                    onChange={e => setSelectedSpellName(e.target.value)}
                    style={{ flex: '1 1 180px', minWidth: 0, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: '#fff' }}
                  >
                    {unlockedSpells.map(sp => (
                      <option key={sp.id} value={sp.name}>
                        {sp.name} ({sp.level === 0 ? 'Cantrip' : `Lvl ${sp.level}`} • {sp.isHeal ? `Heal ${sp.damageDice}` : sp.isUtility ? 'Utility' : sp.damageDice})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleCastSpell}
                    disabled={isProcessingAi}
                    style={{ flexShrink: 0, padding: '10px 18px', background: '#4f46e5', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Sparkles style={{ width: '16px', height: '16px' }} /> Cast Spell
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', padding: '8px 10px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b' }}>
                🔒 No Spells Unlocked Yet ({hero.class}) — Rangers & Paladins unlock Spells at Level 2; Arcane Tricksters & Eldritch Knights at Level 3.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
              Active Hostiles ({gameState.activeMonsters?.length || 0})
            </h3>
            {(!gameState.activeMonsters || gameState.activeMonsters.length === 0) ? (
              <div style={{ padding: '16px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', textAlign: 'center', fontSize: '0.88rem', color: '#64748b' }}>
                No active monsters. The AI Director spawns 5e SRD monsters automatically when combat begins.
              </div>
            ) : (
              gameState.activeMonsters.map(mob => (
                <div key={mob.instanceId || mob.id} style={{ padding: '12px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fda4af' }}>{mob.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      AC: {mob.ac} | CR: {mob.cr} | Attack: {mob.actions?.[0]?.name || 'Strike'} ({mob.actions?.[0]?.damageDice || '1d6'})
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
                    HP: {mob.hpCurrent ?? mob.hp} / {mob.maxHp ?? mob.hp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LIVE HERO SHEET (Gender, 5e Alignment, Equip/Unequip & Queued Skills) */}
      {activeTab === 'character' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
          <div style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#fff' }}>{hero.name}</h2>
                  <select
                    value={hero.gender || 'Male'}
                    onChange={e => handleGenderChange(e.target.value)}
                    style={{ background: '#020617', border: '1px solid #334155', color: '#c7d2fe', borderRadius: '6px', padding: '3px 6px', fontSize: '0.78rem' }}
                  >
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select
                    value={hero.alignment || 'True Neutral'}
                    onChange={e => handleAlignmentChange(e.target.value)}
                    style={{ background: '#020617', border: '1px solid #4f46e5', color: '#fcd34d', borderRadius: '6px', padding: '3px 6px', fontSize: '0.78rem', fontWeight: 'bold' }}
                  >
                    {ALIGNMENTS_5E.map(al => <option key={al} value={al}>{al}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                  {hero.race} • {hero.background || 'Adventurer'} • {hero.class} ({hero.primarySubclass})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: '#6ee7b7' }}>Level {hero.level}</div>
                <div style={{ fontSize: '0.8rem', color: '#818cf8' }}>XP: {hero.xp || 0} / {nextLevelXp} (Prof +{profBonus})</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Hit Points</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#34d399', marginTop: '2px' }}>{hero.hpCurrent} / {hero.hpMax}</div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>AC ({hero.armor?.name || 'Unarmored'}{hero.hasShield ? ' + Shield' : ''})</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#818cf8', marginTop: '2px' }}>{hero.ac}</div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Equipped Weapon</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#f8fafc', marginTop: '2px' }}>{hero.weapon?.name || 'Unarmed'} ({hero.weapon?.damageDice || '1d4'})</div>
              </div>
              <div style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Gold Pouch</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fbbf24', marginTop: '2px' }}>{hero.gold || 0} GP</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Spells Unlocked: <strong style={{ color: '#c7d2fe' }}>{unlockedSpells.length}</strong> | Slots: <strong style={{ color: '#c7d2fe' }}>{currentSpellSlots}/{maxSpellSlots}</strong>
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleRest('short')}
                  disabled={gameState.combatActive}
                  style={{ padding: '6px 10px', background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Heart style={{ width: '13px', height: '13px' }} /> Short Rest
                </button>
                <button
                  onClick={() => handleRest('long')}
                  disabled={gameState.combatActive}
                  style={{ padding: '6px 10px', background: '#1e1b4b', border: '1px solid #4f46e5', color: '#c7d2fe', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Long Rest
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Hero Bag ({hero.inventory?.length || 0} Items — Equip Gear or Send to Party Loot)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(hero.inventory || []).map((item, idx) => {
                  const cat = getItemCategory(item);
                  const equipped = isItemEquipped(hero, item);
                  return (
                    <div key={`${item}_${idx}`} style={{ padding: '8px 10px', background: '#020617', border: equipped ? '1px solid #4f46e5' : '1px solid #1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '0.88rem' }}>{item}</span>
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#0f172a', color: '#94a3b8', textTransform: 'uppercase' }}>
                          {cat}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['weapon', 'armor', 'shield'].includes(cat) && (
                          equipped ? (
                            <button
                              onClick={() => handleUnequipItem(item)}
                              style={{ padding: '4px 8px', background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Equipped ✓ (Unequip)
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEquipItem(item)}
                              style={{ padding: '4px 8px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Equip
                            </button>
                          )
                        )}
                        {cat === 'potion' && (
                          <button
                            onClick={() => handleUsePotion(item)}
                            style={{ padding: '4px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Drink (2d4+2 HP)
                          </button>
                        )}
                        <button
                          onClick={() => handleSendToPartyLoot(item)}
                          style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', color: '#fcd34d', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          To Party Loot
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                Ability Scores & Saving Throws (Tap to Queue Save Roll on Story Bar)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {Object.entries(hero.baseStats || {}).map(([stat, val]) => {
                  const isSaveProf = (hero.savingThrows || []).includes(stat);
                  const mod = calculateMod(val);
                  const saveMod = mod + (isSaveProf ? profBonus : 0);
                  return (
                    <button
                      key={stat}
                      onClick={() => handleQueueSaveRoll(stat)}
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
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8' }}>
                        {stat} {isSaveProf ? '★' : ''}
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '2px 0' }}>{val}</div>
                      <div style={{ fontSize: '0.75rem', color: '#818cf8' }}>
                        Mod {mod >= 0 ? `+${mod}` : mod} | Save {saveMod >= 0 ? `+${saveMod}` : saveMod}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', margin: 0 }}>
              5e Skills (Tap Any Skill to Queue It on the Story Input Bar)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {SKILLS_5E.map(skill => {
                const isProf = (hero.proficiencies || []).includes(skill.id);
                const mod = calculateMod(hero.baseStats?.[skill.stat] ?? 10) + (isProf ? profBonus : 0);
                return (
                  <button
                    key={skill.id}
                    onClick={() => handleQueueSkillRoll(skill)}
                    style={{
                      padding: '10px',
                      background: isProf ? '#1e1b4b' : '#020617',
                      border: isProf ? '1px solid #4f46e5' : '1px solid #1e293b',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{skill.name} {isProf ? '★' : ''}</span>
                    <span style={{ color: '#818cf8', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {mod >= 0 ? `+${mod}` : mod} <Dices style={{ width: '14px', height: '14px' }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONNECTED PARTY (Shows Gender & Alignment) */}
      {activeTab === 'party' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
          <div style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#34d399', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users style={{ width: '18px', height: '18px' }} />
              <span>Connected Party ({gameState.party?.length || 0})</span>
            </h3>
            {(!gameState.party || gameState.party.length === 0) ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Waiting for party members to sync...</p>
            ) : (
              gameState.party.map(member => (
                <div key={member.id} style={{ padding: '12px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>
                      {member.name} ({member.gender || 'Hero'} • {member.alignment || 'True Neutral'}) {currentTurnName === member.name ? '👉 (Active Turn)' : ''}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Lvl {member.level} {member.race} • {member.class} | AC: {member.ac || 12} | Gold: {member.gold || 0} GP
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#34d399' }}>
                    HP: {member.hpCurrent} / {member.hpMax}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TWO-WAY PARTY LOOT VAULT & JOURNAL */}
      {activeTab === 'journal' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
          <div style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Backpack style={{ width: '18px', height: '18px' }} />
              <span>Shared Party Loot Vault (Add or Take Items)</span>
            </h3>

            <form onSubmit={handleAddManualLoot} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Add item to party loot (e.g. +1 Longsword)..."
                value={manualLootName}
                onChange={e => setManualLootName(e.target.value)}
                style={{ flex: '1 1 160px', minWidth: 0, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '8px 10px', color: '#fff', fontSize: '0.85rem' }}
              />
              <select
                value={manualLootType}
                onChange={e => setManualLootType(e.target.value)}
                style={{ background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '0.85rem' }}
              >
                <option value="Weapon">Weapon</option>
                <option value="Armor">Armor</option>
                <option value="Shield">Shield</option>
                <option value="Potion">Potion</option>
                <option value="Gear">Gear</option>
              </select>
              <button
                type="submit"
                style={{ flexShrink: 0, padding: '8px 12px', background: '#d97706', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                + Add Loot
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(!gameState.lootPool || gameState.lootPool.length === 0) ? (
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>No unclaimed loot in the party pool.</p>
              ) : (
                gameState.lootPool.map((item, idx) => {
                  const cat = getItemCategory(item);
                  return (
                    <div key={idx} style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{item.name}</span>
                        <span style={{ color: '#94a3b8', marginLeft: '6px', fontSize: '0.8rem' }}>x{item.qty || 1} ({item.type || cat})</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleTakeLootToBag(idx)}
                          style={{ padding: '5px 10px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Take to Bag
                        </button>
                        {['weapon', 'armor', 'shield'].includes(cat) && (
                          <button
                            onClick={() => handleEquipItem(item, idx)}
                            style={{ padding: '5px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Take & Equip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ padding: '14px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#818cf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen style={{ width: '18px', height: '18px' }} />
              <span>Campaign Journal (Auto-Tracked + Manual Notes)</span>
            </h3>

            <form onSubmit={handleAddJournalNote} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Write a manual note..."
                value={playerNoteInput}
                onChange={e => setPlayerNoteInput(e.target.value)}
                style={{ flex: '1 1 160px', minWidth: 0, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px', color: '#fff' }}
              />
              <button
                type="submit"
                style={{ flexShrink: 0, padding: '10px 14px', background: '#4f46e5', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                + Add Note
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...(gameState.journal || [])].reverse().map((entry, idx) => (
                <div key={idx} style={{ padding: '10px', background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.45', wordBreak: 'break-word' }}>
                  • {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
