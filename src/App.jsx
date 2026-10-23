import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, Play, ArrowLeft, Settings, Key, X, Check, Trash2, UserPlus, Lock } from 'lucide-react';
import { GameNetwork } from './utils/peerSync';
import {
  getSessions,
  saveSession,
  deleteSession,
  getCharacters,
  saveCharacter,
  deleteCharacter
} from './utils/storage';
import {
  UNCENSORED_MODELS,
  getApiKey,
  setApiKey,
  getSelectedModel,
  setSelectedModel
} from './utils/aiConfig';
import { generateCampaignIntro, generateNarrativeTurn } from './utils/aiEngine';
import {
  calculateMod,
  calculateAC,
  calculateMulticlassMaxHP,
  rollStat4d6DropLowest,
  buildInitiativeQueue,
  executeAutomatedMonsterTurn,
  rollD100LootTable,
  awardXpAndCheckLevelUp,
  equipItemToHero,
  getMaxSpellSlots,
  rollPhysical
} from './utils/dndEngine';
import { RACES, BACKGROUNDS, CLASSES, SUBCLASSES, WEAPONS_LIST, ARMOR_LIST, SKILLS_5E } from './data/rules5e.js';
import { getMonster } from './data/index';
import PlayerScreen from './components/PlayerScreen';

const generateRoomCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const ROLL_COUNTS_KEY = 'dnd_forge_roll_counts';
const ROLL_STATS_KEY = 'dnd_forge_rolled_stats';

const normalizeGameState = (raw = {}, fallbackName = 'Campaign') => ({
  campaignName: raw.campaignName || fallbackName,
  combatActive: Boolean(raw.combatActive),
  party: Array.isArray(raw.party) ? raw.party : Object.values(raw.party || {}),
  activeMonsters: Array.isArray(raw.activeMonsters) ? raw.activeMonsters : [],
  turnQueue: Array.isArray(raw.turnQueue) ? raw.turnQueue : [],
  currentTurnIndex: typeof raw.currentTurnIndex === 'number' ? raw.currentTurnIndex : 0,
  explorationTurnIndex: typeof raw.explorationTurnIndex === 'number' ? raw.explorationTurnIndex : 0,
  round: typeof raw.round === 'number' ? raw.round : 1,
  storyLog: Array.isArray(raw.storyLog) ? raw.storyLog : [],
  journal: Array.isArray(raw.journal)
    ? raw.journal
    : (typeof raw.journal === 'string' && raw.journal.trim() ? [raw.journal.trim()] : []),
  lootPool: Array.isArray(raw.lootPool) ? raw.lootPool : []
});

export default function App() {
  const [homeTab, setHomeTab] = useState('lobby');
  const [sessions, setSessions] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedCharId, setSelectedCharId] = useState('');
  const [activeCharacter, setActiveCharacter] = useState(null);

  const [activeSession, setActiveSession] = useState(null);
  const [network, setNetwork] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lobbyError, setLobbyError] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [modelInput, setModelInput] = useState(getSelectedModel());
  const [customModelMode, setCustomModelMode] = useState(
    !UNCENSORED_MODELS.some(m => m.id === getSelectedModel())
  );
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  const [charName, setCharName] = useState('');
  const [charRace, setCharRace] = useState('Human');
  const [charBackground, setCharBackground] = useState('Soldier');
  const [charClass1, setCharClass1] = useState('Fighter');
  const [charSub1, setCharSub1] = useState('Champion');
  const [charLvl1, setCharLvl1] = useState(1);
  const [charClass2, setCharClass2] = useState('None');
  const [charSub2, setCharSub2] = useState('');
  const [charLvl2, setCharLvl2] = useState(0);

  const [charStats, setCharStats] = useState(() => {
    try {
      const saved = localStorage.getItem(ROLL_STATS_KEY);
      return saved ? JSON.parse(saved) : { str: 14, dex: 13, con: 14, int: 10, wis: 12, cha: 10 };
    } catch (e) {
      return { str: 14, dex: 13, con: 14, int: 10, wis: 12, cha: 10 };
    }
  });

  const [statRollCounts, setStatRollCounts] = useState(() => {
    try {
      const saved = localStorage.getItem(ROLL_COUNTS_KEY);
      return saved ? JSON.parse(saved) : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    } catch (e) {
      return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    }
  });

  const [statRollLogs, setStatRollLogs] = useState({});
  const [charWeaponName, setCharWeaponName] = useState('Longsword');
  const [charArmorName, setCharArmorName] = useState('Leather Armor');
  const [charShield, setCharShield] = useState(false);
  const [charProficiencies, setCharProficiencies] = useState(['athletics', 'intimidation']);

  const activeSessionRef = useRef(null);
  activeSessionRef.current = activeSession;
  const activeCharRef = useRef(null);
  activeCharRef.current = activeCharacter;
  const networkRef = useRef(null);
  networkRef.current = network;

  useEffect(() => {
    const loadedSessions = getSessions().sort((a, b) => b.lastPlayed - a.lastPlayed);
    const loadedChars = getCharacters();
    setSessions(loadedSessions);
    setCharacters(loadedChars);
    const firstUnlocked = loadedChars.find(c => !c.lockedRoomId);
    if (firstUnlocked && !selectedCharId) {
      setSelectedCharId(firstUnlocked.id);
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || !activeCharRef.current) return;
    const party = activeSession.gameState?.party || [];
    const remoteSelf = party.find(p => p.id === activeCharRef.current.id);
    if (remoteSelf) {
      const updatedChar = { ...activeCharRef.current, ...remoteSelf };
      setActiveCharacter(updatedChar);
      setCharacters(saveCharacter(updatedChar));
    }
  }, [activeSession?.gameState?.party]);

  // Keep selected armor & shield legal when switching Primary Class
  useEffect(() => {
    const bg = BACKGROUNDS.find(b => b.name === charBackground) || BACKGROUNDS[0];
    setCharProficiencies([...bg.lockedSkills]);

    const allowedTypes = CLASSES[charClass1]?.armorProf || ['unarmored'];
    const legalArmors = ARMOR_LIST.filter(a => a.starter && allowedTypes.includes(a.type));
    if (!legalArmors.some(a => a.name === charArmorName)) {
      setCharArmorName(legalArmors[legalArmors.length - 1]?.name || 'Unarmored');
    }
    if (!allowedTypes.includes('shields')) {
      setCharShield(false);
    }
  }, [charBackground, charClass1, charClass2]);

  // Enforces strict 3-roll limit per ability score
  const handleRollSingleStat = (statKey) => {
    const currentCount = statRollCounts[statKey] || 0;
    if (currentCount >= 3) return;

    const res = rollStat4d6DropLowest();
    const nextStats = { ...charStats, [statKey]: res.sum };
    const nextCounts = { ...statRollCounts, [statKey]: currentCount + 1 };

    setCharStats(nextStats);
    setStatRollCounts(nextCounts);
    setStatRollLogs(prev => ({ ...prev, [statKey]: res }));
    localStorage.setItem(ROLL_STATS_KEY, JSON.stringify(nextStats));
    localStorage.setItem(ROLL_COUNTS_KEY, JSON.stringify(nextCounts));
  };

  const handleRollAllStats = () => {
    const keys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const nextStats = { ...charStats };
    const nextCounts = { ...statRollCounts };
    const nextLogs = { ...statRollLogs };

    keys.forEach(k => {
      if ((nextCounts[k] || 0) < 3) {
        const res = rollStat4d6DropLowest();
        nextStats[k] = res.sum;
        nextCounts[k] = (nextCounts[k] || 0) + 1;
        nextLogs[k] = res;
      }
    });

    setCharStats(nextStats);
    setStatRollCounts(nextCounts);
    setStatRollLogs(nextLogs);
    localStorage.setItem(ROLL_STATS_KEY, JSON.stringify(nextStats));
    localStorage.setItem(ROLL_COUNTS_KEY, JSON.stringify(nextCounts));
  };

  const handleCreateCharacter = (e) => {
    e.preventDefault();
    if (!charName.trim()) return;

    const pLvl = Math.max(1, Math.min(20, Number(charLvl1) || 1));
    const hasSecondary = charClass2 !== 'None' && charClass2 !== charClass1;
    const sLvl = hasSecondary ? Math.max(1, Math.min(20 - pLvl, Number(charLvl2) || 1)) : 0;
    const totalLevel = pLvl + sLvl;

    const raceObj = RACES.find(r => r.name === charRace) || RACES[0];
    const finalStats = {
      str: charStats.str + (raceObj.bonuses.str || 0),
      dex: charStats.dex + (raceObj.bonuses.dex || 0),
      con: charStats.con + (raceObj.bonuses.con || 0),
      int: charStats.int + (raceObj.bonuses.int || 0),
      wis: charStats.wis + (raceObj.bonuses.wis || 0),
      cha: charStats.cha + (raceObj.bonuses.cha || 0)
    };

    const conMod = calculateMod(finalStats.con);
    const dexMod = calculateMod(finalStats.dex);
    const wisMod = calculateMod(finalStats.wis);

    const allowedTypes = CLASSES[charClass1]?.armorProf || ['unarmored'];
    const legalArmors = ARMOR_LIST.filter(a => a.starter && allowedTypes.includes(a.type));
    const selectedArmor = legalArmors.find(a => a.name === charArmorName) || legalArmors[0] || ARMOR_LIST[0];
    const selectedWeapon = WEAPONS_LIST.find(w => w.name === charWeaponName) || WEAPONS_LIST[0];
    const canShield = allowedTypes.includes('shields') && charShield;
    const classString = hasSecondary ? `${charClass1} ${pLvl} / ${charClass2} ${sLvl}` : `${charClass1} ${pLvl}`;

    const maxHp = calculateMulticlassMaxHP(conMod, charClass1, pLvl, hasSecondary ? charClass2 : 'None', sLvl);
    const acVal = calculateAC(selectedArmor, dexMod, canShield, conMod, wisMod, classString);
    const savingThrows = CLASSES[charClass1]?.savingThrows || ['str', 'con'];

    const tempHero = { primaryClass: charClass1, secondaryClass: hasSecondary ? charClass2 : 'None', level: totalLevel };
    const maxSlots = getMaxSpellSlots(tempHero);

    const newChar = {
      id: `char_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: charName.trim(),
      race: charRace,
      background: charBackground,
      class: classString,
      primaryClass: charClass1,
      primarySubclass: charSub1 || (SUBCLASSES[charClass1]?.[0] ?? ''),
      primaryLevel: pLvl,
      secondaryClass: hasSecondary ? charClass2 : 'None',
      secondarySubclass: hasSecondary ? (charSub2 || (SUBCLASSES[charClass2]?.[0] ?? '')) : '',
      secondaryLevel: sLvl,
      level: totalLevel,
      xp: 0,
      baseStats: finalStats,
      savingThrows,
      armor: selectedArmor,
      hasShield: canShield,
      weapon: selectedWeapon,
      proficiencies: [...charProficiencies],
      hpCurrent: maxHp,
      hpMax: maxHp,
      ac: acVal,
      spellSlotsCurrent: maxSlots,
      spellSlotsMax: maxSlots,
      inventory: ['Adventurer Pack', selectedWeapon.name, selectedArmor.name, ...(canShield ? ['Shield'] : [])],
      gold: 25,
      lockedRoomId: null,
      lockedCampaignName: null
    };

    const nextChars = saveCharacter(newChar);
    setCharacters(nextChars);
    setSelectedCharId(newChar.id);
    setCharName('');

    // Reset 3-roll lock counters for the next character build
    const freshCounts = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const freshStats = { str: 14, dex: 13, con: 14, int: 10, wis: 12, cha: 10 };
    setStatRollCounts(freshCounts);
    setCharStats(freshStats);
    setStatRollLogs({});
    localStorage.setItem(ROLL_COUNTS_KEY, JSON.stringify(freshCounts));
    localStorage.setItem(ROLL_STATS_KEY, JSON.stringify(freshStats));
    setHomeTab('lobby');
  };

  const handleDeleteCharacter = (id) => {
    const nextChars = deleteCharacter(id);
    setCharacters(nextChars);
    if (selectedCharId === id) {
      const nextAvailable = nextChars.find(c => !c.lockedRoomId);
      setSelectedCharId(nextAvailable ? nextAvailable.id : '');
    }
  };

  const handleDeleteSavedSession = (sessionId) => {
    const nextSessions = deleteSession(sessionId);
    setSessions(nextSessions.sort((a, b) => b.lastPlayed - a.lastPlayed));
    setCharacters(getCharacters());
  };

  const runConsecutiveMonsterTurns = (state, combinedTrays, extraSummaries) => {
    if (!state.combatActive || !state.turnQueue?.length || !state.activeMonsters?.length) return;

    let safety = 0;
    while (safety < 12 && state.combatActive && state.turnQueue.length > 0) {
      safety += 1;
      const currentUnit = state.turnQueue[state.currentTurnIndex || 0];
      if (!currentUnit || currentUnit.type !== 'monster') break;

      const liveMob = state.activeMonsters.find(
        m => (m.instanceId || m.id) === currentUnit.id || m.name === currentUnit.name
      );

      if (liveMob && (liveMob.hpCurrent ?? liveMob.hp ?? 0) > 0) {
        const mobTurn = executeAutomatedMonsterTurn(liveMob, state.party);
        state.party = mobTurn.updatedParty;
        if (mobTurn.diceTrays?.length) combinedTrays.push(...mobTurn.diceTrays);
        extraSummaries.push(`[Round ${state.round} — ${liveMob.name}'s Turn] ${mobTurn.actionSummary}`);
        state.journal = [...state.journal, `[Combat Rd ${state.round}] ${mobTurn.actionSummary}`];
      }

      let nextIdx = (state.currentTurnIndex || 0) + 1;
      if (nextIdx >= state.turnQueue.length) {
        nextIdx = 0;
        state.round = (state.round || 1) + 1;
      }
      state.currentTurnIndex = nextIdx;
    }
  };

  const processHostAction = async (actionPayload, currentGameState) => {
    const state = { ...normalizeGameState(currentGameState) };
    const {
      actionType,
      actorId,
      actorName,
      summary,
      character,
      updatedParty,
      updatedMonsters,
      newJournalEntry,
      newLootItem,
      equipItem,
      lootIndex,
      rollFailed = false,
      diceTrays = [],
      skipAi
    } = actionPayload;

    if (actionType === 'SYNC_CHARACTER' && character) {
      const exists = state.party.some(p => p.id === character.id);
      state.party = exists
        ? state.party.map(p => (p.id === character.id ? character : p))
        : [...state.party, character];
      return state;
    }

    // Equip item from Loot Pool or Hero Inventory and recalculate Hero AC/Weapon immediately
    if (actionType === 'EQUIP_ITEM' && equipItem) {
      state.party = state.party.map(p => (p.id === actorId ? equipItemToHero(p, equipItem) : p));
      if (typeof lootIndex === 'number' && state.lootPool[lootIndex]) {
        state.lootPool = state.lootPool.filter((_, idx) => idx !== lootIndex);
      }
      const itemName = typeof equipItem === 'string' ? equipItem : equipItem.name;
      state.journal = [...state.journal, `[Equipped] ${actorName} equipped ${itemName}.`];
      return state;
    }

    // Short Rest (Rolls Hit Die + CON to heal) or Long Rest (Full HP & Spell Slots)
    if (actionType === 'REST') {
      const isLong = actionPayload.restType === 'long';
      const restTrays = [];
      state.party = state.party.map(p => {
        if (isLong) {
          return { ...p, hpCurrent: p.hpMax, spellSlotsCurrent: p.spellSlotsMax || 0 };
        }
        const hd = CLASSES[p.primaryClass]?.hitDie || 8;
        const conMod = calculateMod(p.baseStats?.con ?? 12);
        const healRoll = rollPhysical(hd, 1, conMod, `${p.name} Short Rest Hit Die`);
        const gained = Math.max(1, healRoll.total);
        restTrays.push({ ...healRoll, outcome: `+${gained} HP`, isSuccess: true });
        return { ...p, hpCurrent: Math.min(p.hpMax, (p.hpCurrent || 0) + gained) };
      });
      const restMsg = isLong
        ? 'The party takes a Long Rest (Full HP and Spell Slots restored).'
        : 'The party takes a Short Rest and spends Hit Dice to patch wounds.';
      state.journal = [...state.journal, `[Rest] ${restMsg}`];
      state.storyLog = [
        ...state.storyLog,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Director',
          text: restMsg,
          mechanicalSummary: restMsg,
          diceTrays: restTrays
        }
      ];
      return state;
    }

    const combinedTrays = [...diceTrays];
    const extraSummaries = [];
    const wasInCombat = state.combatActive && state.activeMonsters.length > 0;

    if (Array.isArray(updatedParty)) state.party = updatedParty;

    // Award XP for successful rolls (25 XP) and slain monsters (100 XP each)
    let xpEarned = (!rollFailed && !skipAi) ? 25 : 0;

    if (Array.isArray(updatedMonsters)) {
      const prevCount = state.activeMonsters.length;
      const remaining = updatedMonsters.filter(m => (m.hpCurrent ?? m.hp ?? 0) > 0);
      const killedCount = Math.max(0, prevCount - remaining.length);
      if (killedCount > 0) {
        xpEarned += killedCount * 100;
      }

      state.activeMonsters = remaining;
      const aliveIds = new Set(state.activeMonsters.map(m => m.instanceId || m.id));
      state.turnQueue = (state.turnQueue || []).filter(u => u.type === 'player' || aliveIds.has(u.id));

      if (wasInCombat && state.activeMonsters.length === 0) {
        state.combatActive = false;
        state.turnQueue = [];
        state.currentTurnIndex = 0;
        const lootDrop = rollD100LootTable();
        combinedTrays.push(...lootDrop.diceTrays);
        state.lootPool = [...state.lootPool, lootDrop.item];
        const goldPerHero = Math.max(1, Math.floor(lootDrop.gold / Math.max(1, state.party.length)));
        state.party = state.party.map(p => ({ ...p, gold: (p.gold || 0) + goldPerHero }));
        const victoryMsg = `Combat Victory! Rolled d100 Loot: ${lootDrop.item.name} + ${lootDrop.gold} GP (+${goldPerHero} GP each).`;
        extraSummaries.push(victoryMsg);
        state.journal = [...state.journal, `[Victory & Loot] ${victoryMsg}`];
      }
    }

    if (xpEarned > 0) {
      const lvlCheck = awardXpAndCheckLevelUp(state.party, xpEarned);
      state.party = lvlCheck.updatedParty;
      if (lvlCheck.levelUpTrays.length) combinedTrays.push(...lvlCheck.levelUpTrays);
      if (lvlCheck.levelUpLogs.length) {
        extraSummaries.push(...lvlCheck.levelUpLogs);
        lvlCheck.levelUpLogs.forEach(l => state.journal.push(`[Level Up] ${l}`));
      }
    }

    if (newJournalEntry) state.journal = [...state.journal, newJournalEntry];
    if (newLootItem) state.lootPool = [...state.lootPool, newLootItem];

    if (summary && !skipAi) {
      state.journal = [...state.journal, `[Turn] ${summary}`];
    }

    // Advance turn order (Combat Initiative Queue OR Exploration Party Rotation)
    if (!skipAi) {
      if (state.combatActive && state.activeMonsters.length > 0 && state.turnQueue.length > 0) {
        let nextIdx = (state.currentTurnIndex || 0) + 1;
        if (nextIdx >= state.turnQueue.length) {
          nextIdx = 0;
          state.round = (state.round || 1) + 1;
        }
        state.currentTurnIndex = nextIdx;
        runConsecutiveMonsterTurns(state, combinedTrays, extraSummaries);
      } else if (state.party.length > 0) {
        state.explorationTurnIndex = ((state.explorationTurnIndex || 0) + 1) % state.party.length;
      }
    }

    if (skipAi) return state;

    const fullMechanicalSummary = [summary, ...extraSummaries].filter(Boolean).join(' | ');
    setIsProcessingAi(true);
    try {
      const recentHistory = state.storyLog.slice(-5).map(entry => ({
        role: entry.actor === 'Director' ? 'assistant' : 'user',
        content: entry.mechanicalSummary ? `[${entry.mechanicalSummary}] ${entry.text}` : entry.text
      }));

      const aiRes = await generateNarrativeTurn({
        gameState: state,
        resolvedAction: fullMechanicalSummary,
        rollFailed,
        recentHistory
      });

      if (aiRes.spawnedMonsters?.length) {
        const newlySpawned = [];
        aiRes.spawnedMonsters.forEach(req => {
          const baseMob = getMonster(req.name) || {
            id: req.name.toLowerCase(),
            name: req.name,
            cr: 1,
            ac: 12,
            hp: 15,
            maxHp: 15,
            stats: { str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
            actions: [{ name: 'Strike', attackBonus: 4, damageDice: '1d6', damageBonus: 2 }]
          };
          for (let i = 0; i < req.count; i++) {
            newlySpawned.push({
              ...baseMob,
              instanceId: `mob_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`,
              name: req.count > 1 ? `${baseMob.name} ${i + 1}` : baseMob.name,
              hpCurrent: baseMob.hp
            });
          }
        });

        state.activeMonsters = [...state.activeMonsters, ...newlySpawned];
        const initRes = buildInitiativeQueue(state.party, state.activeMonsters);
        state.combatActive = true;
        state.turnQueue = initRes.queue;
        state.currentTurnIndex = 0;
        state.round = 1;
        combinedTrays.push(...initRes.initiativeTrays);

        const orderStr = initRes.queue.map(u => `${u.name} (${u.initiative})`).join(' -> ');
        extraSummaries.push(`⚔️ AMBUSH! Initiative Order: ${orderStr}`);
        state.journal = [...state.journal, `[Combat Started] Initiative: ${orderStr}`];

        runConsecutiveMonsterTurns(state, combinedTrays, extraSummaries);
      }

      if (aiRes.journalEntries?.length) {
        state.journal = [...state.journal, ...aiRes.journalEntries.map(j => `[Story Note] ${j}`)];
      }

      if (aiRes.lootItems?.length) {
        state.lootPool = [...state.lootPool, ...aiRes.lootItems];
        aiRes.lootItems.forEach(item => {
          state.journal = [...state.journal, `[Loot Discovered] ${item.name} x${item.qty}`];
        });
      }

      // Announce whose turn is next
      const nextTurnActor = state.combatActive && state.turnQueue.length > 0
        ? state.turnQueue[state.currentTurnIndex || 0]?.name
        : state.party[state.explorationTurnIndex || 0]?.name || actorName;

      if (nextTurnActor) {
        extraSummaries.push(`👉 NEXT TURN: ${nextTurnActor}`);
      }

      state.storyLog = [
        ...state.storyLog,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Director',
          text: aiRes.narration,
          mechanicalSummary: [summary, ...extraSummaries].filter(Boolean).join('\n'),
          diceTrays: combinedTrays
        }
      ];
    } catch (err) {
      state.storyLog = [
        ...state.storyLog,
        {
          id: `log_${Date.now()}`,
          timestamp: Date.now(),
          actor: 'System',
          text: `[AI Director Error: ${err.message}]`,
          mechanicalSummary: fullMechanicalSummary,
          diceTrays: combinedTrays
        }
      ];
    } finally {
      setIsProcessingAi(false);
    }

    return state;
  };

  const handleNetworkData = async (data) => {
    const current = activeSessionRef.current;
    if (!current || !data) return;

    if (current.role === 'player' && data.type === 'SYNC_STATE') {
      setActiveSession(prev => ({
        ...prev,
        gameState: normalizeGameState(data.payload, prev?.name)
      }));
      return;
    }

    if (current.role === 'host') {
      if (data.type === 'SYNC_CHARACTER') {
        const nextState = await processHostAction(
          { actionType: 'SYNC_CHARACTER', character: data.payload, skipAi: true },
          current.gameState
        );
        const updated = { ...current, gameState: nextState, lastPlayed: Date.now() };
        setActiveSession(updated);
        saveSession(updated);
        if (networkRef.current) networkRef.current.broadcastState(nextState);
      } else if (data.type === 'DISPATCH_ACTION') {
        const nextState = await processHostAction(data.payload, current.gameState);
        const updated = { ...current, gameState: nextState, lastPlayed: Date.now() };
        setActiveSession(updated);
        saveSession(updated);
        if (networkRef.current) networkRef.current.broadcastState(nextState);
      }
    }
  };

  const dispatchAction = async (actionPayload) => {
    const current = activeSessionRef.current;
    if (!current) return;

    if (current.role === 'host') {
      const nextState = await processHostAction(actionPayload, current.gameState);
      const updated = { ...current, gameState: nextState, lastPlayed: Date.now() };
      setActiveSession(updated);
      saveSession(updated);
      if (networkRef.current) networkRef.current.broadcastState(nextState);
    } else if (networkRef.current) {
      networkRef.current.sendAction('DISPATCH_ACTION', actionPayload);
    }
  };

  const resolveCharacterForRoom = (roomCode, campaignTitle, isExistingSession = false) => {
    const allChars = getCharacters();
    const alreadyLocked = allChars.find(
      c => String(c.lockedRoomId || '').toUpperCase() === String(roomCode).toUpperCase()
    );
    if (alreadyLocked) return alreadyLocked;

    const picked = allChars.find(c => c.id === selectedCharId && !c.lockedRoomId);
    if (!picked) {
      setLobbyError(
        isExistingSession
          ? 'No character locked to this campaign. Select an available hero above or create one in the Character Vault.'
          : 'Select an available (unlocked) hero first, or create a new one in the Character Vault tab.'
      );
      return null;
    }

    const lockedChar = {
      ...picked,
      lockedRoomId: roomCode,
      lockedCampaignName: campaignTitle
    };
    setCharacters(saveCharacter(lockedChar));
    return lockedChar;
  };

  const startHostSession = async (existingSession = null) => {
    setLobbyError('');
    const campaignTitle = existingSession ? existingSession.name : (newCampaignName.trim() || 'Untitled Odyssey');
    const roomId = existingSession?.roomId || existingSession?.roomCode || generateRoomCode();

    const charForRoom = resolveCharacterForRoom(roomId, campaignTitle, Boolean(existingSession));
    if (!charForRoom) return;

    const net = new GameNetwork(true, roomId, handleNetworkData, (errMsg) => {
      setLobbyError(errMsg);
    });
    networkRef.current = net;

    const baseState = normalizeGameState(existingSession?.gameState, campaignTitle);
    const existsInParty = baseState.party.some(p => p.id === charForRoom.id);
    if (!existsInParty) {
      baseState.party = [...baseState.party, charForRoom];
    }

    const isBrandNewStory = !existingSession || baseState.storyLog.length === 0;
    if (isBrandNewStory) {
      baseState.storyLog = [
        {
          id: `init_${Date.now()}`,
          timestamp: Date.now(),
          actor: 'Director',
          text: `Forging a brand-new adventure for "${campaignTitle}"...`,
          mechanicalSummary: `👉 CURRENT TURN: ${charForRoom.name}`,
          diceTrays: []
        }
      ];
    }

    const sessionObj = {
      id: existingSession?.id || `session_${Date.now()}`,
      name: campaignTitle,
      role: 'host',
      roomId,
      roomCode: roomId,
      gameState: baseState,
      lastPlayed: Date.now()
    };

    net.init(() => {
      setNetwork(net);
    });

    setActiveCharacter(charForRoom);
    setActiveSession(sessionObj);
    saveSession(sessionObj);

    // Dynamically generate a unique campaign story & quest hook for every new room
    if (isBrandNewStory) {
      setIsProcessingAi(true);
      try {
        const intro = await generateCampaignIntro({
          campaignName: campaignTitle,
          party: baseState.party
        });
        const readyState = {
          ...baseState,
          storyLog: [
            {
              id: `intro_${Date.now()}`,
              timestamp: Date.now(),
              actor: 'Director',
              text: intro.narration,
              mechanicalSummary: `Adventure Started | 👉 NEXT TURN: ${charForRoom.name}`,
              diceTrays: []
            }
          ],
          journal: [`[Campaign Quest] ${intro.quest}`]
        };
        const updatedSession = { ...sessionObj, gameState: readyState, lastPlayed: Date.now() };
        setActiveSession(updatedSession);
        saveSession(updatedSession);
        if (networkRef.current) networkRef.current.broadcastState(readyState);
      } catch (err) {
        const fallbackState = {
          ...baseState,
          storyLog: [
            {
              id: `intro_err_${Date.now()}`,
              timestamp: Date.now(),
              actor: 'System',
              text: `[Could not generate opening scene: ${err.message}. Check your OpenRouter API key in Settings.]`,
              mechanicalSummary: `👉 NEXT TURN: ${charForRoom.name}`,
              diceTrays: []
            }
          ]
        };
        setActiveSession({ ...sessionObj, gameState: fallbackState });
      } finally {
        setIsProcessingAi(false);
      }
    }
  };

  const startClientJoin = () => {
    setLobbyError('');
    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setLobbyError('Enter a valid 4-letter room code.');
      return;
    }

    const allChars = getCharacters();
    const alreadyLocked = allChars.find(c => String(c.lockedRoomId || '').toUpperCase() === cleanCode);
    const unlockedPick = allChars.find(c => c.id === selectedCharId && !c.lockedRoomId);
    const candidateChar = alreadyLocked || unlockedPick;

    if (!candidateChar) {
      setLobbyError('Select an available character first (or build one in the Character Vault).');
      return;
    }

    setIsConnecting(true);
    const net = new GameNetwork(
      false,
      cleanCode,
      handleNetworkData,
      (errMsg) => {
        setIsConnecting(false);
        setLobbyError(errMsg);
      }
    );
    networkRef.current = net;

    net.init(() => {
      setIsConnecting(false);
      const lockedChar = {
        ...candidateChar,
        lockedRoomId: cleanCode,
        lockedCampaignName: `Room ${cleanCode}`
      };
      setCharacters(saveCharacter(lockedChar));
      setActiveCharacter(lockedChar);
      setNetwork(net);

      const sessionObj = {
        id: `client_${Date.now()}`,
        name: `Room ${cleanCode}`,
        role: 'player',
        roomId: cleanCode,
        gameState: normalizeGameState({ party: [lockedChar] }, `Room ${cleanCode}`),
        lastPlayed: Date.now()
      };
      setActiveSession(sessionObj);
      net.sendAction('SYNC_CHARACTER', lockedChar);
    });
  };

  const handleSaveSettings = () => {
    setApiKey(apiKeyInput);
    setSelectedModel(modelInput);
    setShowSettings(false);
  };

  const handleLeaveSession = () => {
    if (networkRef.current?.peer) {
      networkRef.current.peer.destroy();
    }
    networkRef.current = null;
    setNetwork(null);
    setActiveSession(null);
    setActiveCharacter(null);
  };

  const unlockedCharacters = characters.filter(c => !c.lockedRoomId);
  const currentClassData = CLASSES[charClass1] || CLASSES['Fighter'];
  const allowedArmorTypes = currentClassData.armorProf || ['unarmored'];
  const starterArmorOptions = ARMOR_LIST.filter(a => a.starter && allowedArmorTypes.includes(a.type));
  const canClassUseShield = allowedArmorTypes.includes('shields');

  const secondaryMulticlassBonus = ['Bard', 'Ranger', 'Rogue'].includes(charClass2) ? 1 : 0;
  const maxClassSkills = currentClassData.skillCount + secondaryMulticlassBonus;
  const currentBgData = BACKGROUNDS.find(b => b.name === charBackground) || BACKGROUNDS[0];
  const lockedBgSkills = currentBgData.lockedSkills;
  const combinedSkillPool = Array.from(new Set([
    ...currentClassData.skillPool,
    ...(charClass2 !== 'None' && CLASSES[charClass2] ? CLASSES[charClass2].skillPool : [])
  ]));
  const selectableSkillPool = combinedSkillPool.filter(s => !lockedBgSkills.includes(s));
  const chosenCustomSkills = charProficiencies.filter(s => !lockedBgSkills.includes(s));
  const currentRaceObj = RACES.find(r => r.name === charRace) || RACES[0];
  const allStatsLocked = Object.values(statRollCounts).every(c => c >= 3);

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '12px 16px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ width: '22px', height: '22px', color: '#818cf8' }} />
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>No-Hassle D&D</h1>
          {activeSession && (
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #3730a3', fontFamily: 'monospace' }}>
              ROOM: {activeSession.roomId} ({activeSession.role === 'host' ? 'HOST' : 'PLAYER'})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{ padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
            title="AI Director Settings"
          >
            <Settings style={{ width: '18px', height: '18px' }} />
          </button>
          {activeSession && (
            <button
              onClick={handleLeaveSession}
              style={{ padding: '6px 12px', background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', fontSize: '12px', fontWeight: '600', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ArrowLeft style={{ width: '14px', height: '14px' }} /> Leave
            </button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '800px', width: '100%', margin: '0 auto', padding: '16px', boxSizing: 'border-box', overflowY: 'auto' }}>
        {!activeSession ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#0f172a', padding: '6px', borderRadius: '10px', border: '1px solid #1e293b' }}>
              <button
                onClick={() => { setHomeTab('lobby'); setLobbyError(''); }}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: homeTab === 'lobby' ? '#4f46e5' : 'transparent',
                  color: homeTab === 'lobby' ? '#fff' : '#94a3b8'
                }}
              >
                Campaign Lobby
              </button>
              <button
                onClick={() => { setHomeTab('vault'); setLobbyError(''); }}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: homeTab === 'vault' ? '#4f46e5' : 'transparent',
                  color: homeTab === 'vault' ? '#fff' : '#94a3b8'
                }}
              >
                Character Vault ({characters.length})
              </button>
            </div>

            {lobbyError && (
              <div style={{ padding: '12px', background: '#450a0a', border: '1px solid #dc2626', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
                {lobbyError}
              </div>
            )}

            {homeTab === 'lobby' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
                      Select Available Hero for New Room
                    </span>
                    <button
                      onClick={() => setHomeTab('vault')}
                      style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      + Build New Hero
                    </button>
                  </div>
                  {unlockedCharacters.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#fbbf24' }}>
                      No unlocked heroes available. Tap Character Vault above to create one before starting a new room.
                    </div>
                  ) : (
                    <select
                      value={selectedCharId}
                      onChange={e => setSelectedCharId(e.target.value)}
                      style={{ background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '14px' }}
                    >
                      <option value="">-- Choose an Unlocked Hero --</option>
                      {unlockedCharacters.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.race} — {c.class} | HP: {c.hpCurrent}/{c.hpMax} | AC: {c.ac})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8' }}>
                    <Shield style={{ width: '20px', height: '20px' }} />
                    <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Host a New Campaign (AI Generates Unique World)</h2>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                    Locks your selected hero to this world and calls the AI Director to generate a brand-new opening story and quest hook.
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="NEW CAMPAIGN TITLE (e.g. Ashes of Ironhold)"
                      value={newCampaignName}
                      onChange={e => setNewCampaignName(e.target.value)}
                      style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#fff' }}
                    />
                    <button
                      onClick={() => startHostSession(null)}
                      style={{ padding: '10px 20px', background: '#4f46e5', border: 'none', color: '#fff', fontWeight: '600', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      Host World
                    </button>
                  </div>
                </div>

                <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                    <Users style={{ width: '20px', height: '20px' }} />
                    <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Join a Game (Client Player)</h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="4-LETTER CODE"
                      maxLength={6}
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                      style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', color: '#fff', textTransform: 'uppercase', fontFamily: 'monospace' }}
                    />
                    <button
                      onClick={startClientJoin}
                      disabled={isConnecting}
                      style={{ padding: '10px 24px', background: isConnecting ? '#334155' : '#059669', border: 'none', color: '#fff', fontWeight: '600', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      {isConnecting ? 'Connecting...' : 'Join Room'}
                    </button>
                  </div>
                </div>

                {sessions.length > 0 && (
                  <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', margin: 0 }}>Resume Saved Campaign (Host)</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sessions.map(s => {
                        const code = s.roomId || s.roomCode;
                        const lockedHero = characters.find(c => String(c.lockedRoomId || '').toUpperCase() === String(code || '').toUpperCase());
                        return (
                          <div
                            key={s.id}
                            style={{ padding: '12px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                          >
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '14px', color: '#818cf8' }}>
                                {s.name} {code ? <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>[{code}]</span> : null}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {lockedHero ? `Locked Hero: ${lockedHero.name} (Lvl ${lockedHero.level} ${lockedHero.class})` : 'No hero locked yet'} • {new Date(s.lastPlayed).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => startHostSession(s)}
                                style={{ padding: '6px 12px', background: '#1e1b4b', border: '1px solid #3730a3', color: '#c7d2fe', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                              >
                                <Play style={{ width: '12px', height: '12px' }} /> Host Saved
                              </button>
                              <button
                                onClick={() => handleDeleteSavedSession(s.id)}
                                style={{ padding: '6px 8px', background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                                title="Delete Campaign & Unlock Hero"
                              >
                                <Trash2 style={{ width: '14px', height: '14px' }} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handleCreateCharacter} style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: 'bold', fontSize: '15px' }}>
                    <UserPlus style={{ width: '18px', height: '18px' }} />
                    <span>Forge New 5e Hero (3-Roll Stat Cap & Starter Gear Enforced)</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Hero Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kaelen"
                        value={charName}
                        onChange={e => setCharName(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Race (Applies Stat Bonuses)</label>
                      <select
                        value={charRace}
                        onChange={e => setCharRace(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                      >
                        {RACES.map(r => (
                          <option key={r.name} value={r.name}>
                            {r.name} ({Object.entries(r.bonuses).map(([k, v]) => `+${v} ${k.toUpperCase()}`).join(', ')})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>5e Background (Auto-Locks 2 Skills)</label>
                    <select
                      value={charBackground}
                      onChange={e => setCharBackground(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px' }}
                    >
                      {BACKGROUNDS.map(b => (
                        <option key={b.name} value={b.name}>
                          {b.name} (Locks: {b.lockedSkills.map(s => s.replace(/_/g, ' ')).join(', ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ padding: '12px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b', display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#818cf8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>PRIMARY CLASS</label>
                      <select
                        value={charClass1}
                        onChange={e => {
                          setCharClass1(e.target.value);
                          setCharSub1((SUBCLASSES[e.target.value] || [])[0] || '');
                        }}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
                      >
                        {Object.keys(CLASSES).map(c => <option key={c} value={c}>{c} (d{CLASSES[c].hitDie})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#818cf8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>PRIMARY SUBCLASS</label>
                      <select
                        value={charSub1}
                        onChange={e => setCharSub1(e.target.value)}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
                      >
                        {(SUBCLASSES[charClass1] || []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#818cf8', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>LEVEL</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={charLvl1}
                        onChange={e => setCharLvl1(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b', display: 'grid', gridTemplateColumns: '1fr 1fr 70px', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#34d399', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>SECONDARY CLASS (DUAL TREE)</label>
                      <select
                        value={charClass2}
                        onChange={e => {
                          const val = e.target.value;
                          setCharClass2(val);
                          if (val === 'None') {
                            setCharLvl2(0);
                            setCharSub2('');
                          } else {
                            setCharLvl2(1);
                            setCharSub2((SUBCLASSES[val] || [])[0] || '');
                          }
                        }}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
                      >
                        <option value="None">None (Single Class)</option>
                        {Object.keys(CLASSES).filter(c => c !== charClass1).map(c => <option key={c} value={c}>{c} (d{CLASSES[c].hitDie})</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#34d399', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>SECONDARY SUBCLASS</label>
                      <select
                        disabled={charClass2 === 'None'}
                        value={charSub2}
                        onChange={e => setCharSub2(e.target.value)}
                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px' }}
                      >
                        {charClass2 === 'None' ? <option value="">N/A</option> : (SUBCLASSES[charClass2] || []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#34d399', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>LEVEL</label>
                      <input
                        type="number"
                        disabled={charClass2 === 'None'}
                        min={0}
                        max={19}
                        value={charLvl2}
                        onChange={e => setCharLvl2(Math.max(1, Math.min(20 - charLvl1, parseInt(e.target.value, 10) || 1)))}
                        style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', fontSize: '12px', textAlign: 'center' }}
                      />
                    </div>
                  </div>

                  {/* 4d6 Stat Roller with Strict 3-Roll Lock per Stat */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
                        Initial Ability Scores (Max 3 Rolls Per Stat — Locks After 3rd Roll)
                      </label>
                      <button
                        type="button"
                        disabled={allStatsLocked}
                        onClick={handleRollAllStats}
                        style={{
                          padding: '6px 12px',
                          background: allStatsLocked ? '#1e293b' : '#4f46e5',
                          color: allStatsLocked ? '#64748b' : '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: allStatsLocked ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {allStatsLocked ? '🔒 All Stats Locked' : '🎲 Roll All Unlocked (4d6)'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {Object.entries(charStats).map(([stat, val]) => {
                        const raceBonus = currentRaceObj.bonuses[stat] || 0;
                        const totalVal = val + raceBonus;
                        const mod = calculateMod(totalVal);
                        const log = statRollLogs[stat];
                        const usedRolls = statRollCounts[stat] || 0;
                        const rollsLeft = Math.max(0, 3 - usedRolls);
                        const isLocked = rollsLeft === 0;

                        return (
                          <div key={stat} style={{ background: '#020617', border: isLocked ? '1px solid #451a03' : '1px solid #334155', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#818cf8' }}>{stat}</span>
                              <button
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleRollSingleStat(stat)}
                                style={{
                                  padding: '3px 6px',
                                  background: isLocked ? '#1e293b' : '#1e1b4b',
                                  border: isLocked ? '1px solid #334155' : '1px solid #4f46e5',
                                  color: isLocked ? '#64748b' : '#c7d2fe',
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  borderRadius: '4px',
                                  cursor: isLocked ? 'not-allowed' : 'pointer'
                                }}
                              >
                                {isLocked ? '🔒 Locked' : `🎲 (${rollsLeft} left)`}
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>{totalVal}</span>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: mod >= 0 ? '#34d399' : '#f87171' }}>
                                ({mod >= 0 ? `+${mod}` : mod})
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                              Base {val} {raceBonus > 0 ? `+ ${raceBonus} Race` : ''}
                            </div>
                            {log && (
                              <div style={{ fontSize: '9px', color: '#fcd34d', fontFamily: 'monospace' }}>
                                [{log.rawRolls.join(', ')}] drop {log.dropped}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Starter Equipment (Filtered by Class Proficiency & Starter Tier) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Starting Weapon</label>
                      <select
                        value={charWeaponName}
                        onChange={e => setCharWeaponName(e.target.value)}
                        style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '12px' }}
                      >
                        {WEAPONS_LIST.map(w => (
                          <option key={w.name} value={w.name}>
                            {w.name} ({w.damageDice} • {w.finesse ? 'Finesse' : w.ranged ? 'Ranged' : 'Melee'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                        Starting Armor ({charClass1} Allowed)
                      </label>
                      <select
                        value={charArmorName}
                        onChange={e => setCharArmorName(e.target.value)}
                        style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '12px' }}
                      >
                        {starterArmorOptions.map(a => (
                          <option key={a.name} value={a.name}>
                            {a.name} (AC {a.base} • {a.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    {canClassUseShield && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px', background: '#020617', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', height: '38px', boxSizing: 'border-box' }}>
                        <input type="checkbox" checked={charShield} onChange={e => setCharShield(e.target.checked)} />
                        <span>Shield (+2)</span>
                      </label>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 'bold' }}>
                        Pick Class Skills ({chosenCustomSkills.length} / {maxClassSkills} Selected)
                      </span>
                      <span style={{ fontSize: '10px', color: '#34d399' }}>
                        Locked Saves: {(currentClassData.savingThrows || []).map(s => s.toUpperCase()).join(', ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {SKILLS_5E.map(sk => {
                        const isLockedBg = lockedBgSkills.includes(sk.id);
                        const isAllowedByClass = selectableSkillPool.includes(sk.id);
                        const isChosen = chosenCustomSkills.includes(sk.id);
                        const canPickMore = chosenCustomSkills.length < maxClassSkills;

                        if (isLockedBg) {
                          return (
                            <span
                              key={sk.id}
                              style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7' }}
                            >
                              🔒 {sk.name} (Background)
                            </span>
                          );
                        }

                        if (!isAllowedByClass) return null;

                        return (
                          <button
                            type="button"
                            key={sk.id}
                            onClick={() => {
                              if (isChosen) {
                                setCharProficiencies(prev => prev.filter(s => s !== sk.id));
                              } else if (canPickMore) {
                                setCharProficiencies(prev => [...prev, sk.id]);
                              }
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: canPickMore || isChosen ? 'pointer' : 'not-allowed',
                              border: isChosen ? '1px solid #6366f1' : '1px solid #334155',
                              background: isChosen ? '#1e1b4b' : '#0f172a',
                              color: isChosen ? '#c7d2fe' : '#94a3b8',
                              opacity: !isChosen && !canPickMore ? 0.45 : 1
                            }}
                          >
                            {sk.name} {isChosen ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    style={{ padding: '14px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
                  >
                    Save Hero to Vault (Resets Stat Roll Lock for Next Hero)
                  </button>
                </form>

                <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#cbd5e1' }}>Saved Heroes in Vault</h3>
                  {characters.length === 0 ? (
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>No characters forged yet.</p>
                  ) : (
                    characters.map(c => (
                      <div
                        key={c.id}
                        style={{ padding: '12px', background: '#020617', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{c.name}</span>
                            {c.lockedRoomId ? (
                              <span style={{ fontSize: '10px', padding: '2px 6px', background: '#451a03', border: '1px solid #92400e', color: '#fcd34d', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Lock style={{ width: '10px', height: '10px' }} /> Locked: {c.lockedCampaignName || c.lockedRoomId}
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', padding: '2px 6px', background: '#064e3b', color: '#6ee7b7', borderRadius: '4px' }}>
                                Available
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                            {c.race} • Lvl {c.level} {c.class} • HP: {c.hpCurrent}/{c.hpMax} • AC: {c.ac}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCharacter(c.id)}
                          style={{ padding: '6px 8px', background: '#450a0a', border: '1px solid #7f1d1d', color: '#fca5a5', borderRadius: '6px', cursor: 'pointer' }}
                          title="Delete Hero"
                        >
                          <Trash2 style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <PlayerScreen
            network={network}
            gameState={activeSession.gameState}
            activeCharacter={activeCharacter}
            isHost={activeSession.role === 'host'}
            dispatchAction={dispatchAction}
            isProcessingAi={isProcessingAi}
          />
        )}
      </main>

      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 100 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', maxWidth: '420px', width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontWeight: 'bold', fontSize: '15px' }}>
                <Key style={{ width: '18px', height: '18px' }} />
                <span>OpenRouter AI & Model Selector</span>
              </div>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>OpenRouter API Key</label>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', fontSize: '13px', color: '#fff', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Select Uncensored RP Model</label>
                <select
                  value={customModelMode ? 'CUSTOM' : modelInput}
                  onChange={e => {
                    if (e.target.value === 'CUSTOM') {
                      setCustomModelMode(true);
                    } else {
                      setCustomModelMode(false);
                      setModelInput(e.target.value);
                    }
                  }}
                  style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', fontSize: '13px', color: '#fff', boxSizing: 'border-box' }}
                >
                  {UNCENSORED_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  <option value="CUSTOM">-- Custom OpenRouter Model ID --</option>
                </select>
              </div>

              {customModelMode && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Custom Model Slug</label>
                  <input
                    type="text"
                    placeholder="organization/model-name"
                    value={modelInput}
                    onChange={e => setModelInput(e.target.value)}
                    style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '10px', fontSize: '13px', color: '#fff', fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{ padding: '8px 16px', background: '#1e293b', color: '#cbd5e1', fontSize: '13px', fontWeight: '600', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', fontSize: '13px', fontWeight: '600', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Check style={{ width: '14px', height: '14px' }} /> Lock In Model & Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
