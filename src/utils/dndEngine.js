import { CLASSES } from '../data/rules5e.js';
import { getRandomSrdLoot } from '../data/index.js';

export const calculateMod = (score = 10) => Math.floor((Number(score) - 10) / 2);

export const calculateProficiency = (totalLevel = 1) =>
  Math.floor((Math.max(1, Number(totalLevel)) - 1) / 4) + 2;

export const rollStat4d6DropLowest = () => {
  const rolls = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];
  const sorted = [...rolls].sort((a, b) => a - b);
  const dropped = sorted[0];
  const kept = sorted.slice(1);
  const sum = kept.reduce((a, b) => a + b, 0);
  return { sum, rawRolls: rolls, dropped, kept };
};

export const calculateAC = (
  armor,
  dexMod = 0,
  hasShield = false,
  conMod = 0,
  wisMod = 0,
  classString = ''
) => {
  let base = 10 + dexMod;
  const isUnarmored = !armor || armor.type === 'unarmored' || armor.name === 'Unarmored';

  if (isUnarmored && classString.includes('Barbarian')) {
    return 10 + dexMod + conMod + (hasShield ? 2 : 0);
  }
  if (isUnarmored && classString.includes('Monk')) {
    return 10 + dexMod + wisMod + (hasShield ? 2 : 0);
  }

  if (armor && !isUnarmored) {
    if (armor.type === 'light') base = (armor.base || 11) + dexMod;
    else if (armor.type === 'medium') base = (armor.base || 14) + Math.min(2, dexMod);
    else if (armor.type === 'heavy') base = (armor.base || 16);
  }
  return base + (hasShield ? 2 : 0);
};

export const calculateMaxHP = (conMod = 0, hitDie = 10, level = 1) => {
  const firstLevel = hitDie + conMod;
  if (level <= 1) return Math.max(1, firstLevel);
  const avgPerLevel = Math.floor(hitDie / 2) + 1 + conMod;
  return Math.max(1, firstLevel + avgPerLevel * (level - 1));
};

export const calculateMulticlassMaxHP = (
  conMod = 0,
  primaryClass = 'Fighter',
  primaryLevel = 1,
  secondaryClass = 'None',
  secondaryLevel = 0
) => {
  const pLvl = Math.max(1, Number(primaryLevel) || 1);
  const sLvl = secondaryClass && secondaryClass !== 'None' ? Math.max(0, Number(secondaryLevel) || 0) : 0;
  const hd1 = CLASSES[primaryClass]?.hitDie || 10;
  const hd2 = CLASSES[secondaryClass]?.hitDie || 8;

  let totalHp = hd1 + conMod;
  if (pLvl > 1) {
    totalHp += (Math.floor(hd1 / 2) + 1 + conMod) * (pLvl - 1);
  }
  if (sLvl > 0) {
    totalHp += (Math.floor(hd2 / 2) + 1 + conMod) * sLvl;
  }
  return Math.max(1, totalHp);
};

export const rollPhysical = (sides, count = 1, modifier = 0, label = '') => {
  const rolls = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const res = Math.floor(Math.random() * sides) + 1;
    rolls.push(res);
    sum += res;
  }
  const total = sum + modifier;
  const isCrit = sides === 20 && count === 1 && rolls[0] === 20;
  const isFumble = sides === 20 && count === 1 && rolls[0] === 1;
  const diceNotation = `${count}d${sides}`;

  return {
    diceLabel: label || diceNotation,
    diceNotation,
    sides,
    count,
    rolls,
    rawRolls: rolls,
    baseSum: sum,
    modifier,
    total,
    isCrit,
    isFumble,
    text: `${label ? `${label} ` : ''}(${diceNotation}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}): [${rolls.join(', ')}]${modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : ''} = ${total}`
  };
};

export const rollD20WithTray = (modifier = 0, rollType = 'normal', label = 'd20 Roll') => {
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;
  let kept = r1;
  let discarded = null;

  if (rollType === 'advantage') {
    kept = Math.max(r1, r2);
    discarded = Math.min(r1, r2);
  } else if (rollType === 'disadvantage') {
    kept = Math.min(r1, r2);
    discarded = Math.max(r1, r2);
  }

  const isCrit = kept === 20;
  const isFumble = kept === 1;
  const total = kept + modifier;

  return {
    diceLabel: label,
    diceNotation: '1d20',
    sides: 20,
    rolls: rollType !== 'normal' ? [r1, r2] : [r1],
    kept,
    keptRoll: kept,
    discarded,
    discardedRoll: discarded,
    rollType,
    modifier,
    total,
    isCrit,
    isFumble,
    text: `${label}: [d20: ${kept}] ${modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`} = ${total}${isCrit ? ' (NAT 20!)' : isFumble ? ' (NAT 1!)' : ''}`
  };
};

export const rollD20 = rollD20WithTray;

export const detectSkillFromText = (text = '') => {
  const t = text.toLowerCase();
  if (t.includes('sneak') || t.includes('hide') || t.includes('stealth') || t.includes('quiet')) return { id: 'stealth', name: 'Stealth', stat: 'dex', dc: 13 };
  if (t.includes('climb') || t.includes('jump') || t.includes('break') || t.includes('kick') || t.includes('lift') || t.includes('grapple')) return { id: 'athletics', name: 'Athletics', stat: 'str', dc: 13 };
  if (t.includes('persuade') || t.includes('convince') || t.includes('negotiate') || t.includes('ask')) return { id: 'persuasion', name: 'Persuasion', stat: 'cha', dc: 13 };
  if (t.includes('lie') || t.includes('bluff') || t.includes('deceive') || t.includes('trick')) return { id: 'deception', name: 'Deception', stat: 'cha', dc: 13 };
  if (t.includes('threaten') || t.includes('intimidate') || t.includes('scare')) return { id: 'intimidation', name: 'Intimidation', stat: 'cha', dc: 13 };
  if (t.includes('search') || t.includes('inspect') || t.includes('examine') || t.includes('trap') || t.includes('clue')) return { id: 'investigation', name: 'Investigation', stat: 'int', dc: 12 };
  if (t.includes('magic') || t.includes('arcane') || t.includes('rune') || t.includes('crystal')) return { id: 'arcana', name: 'Arcana', stat: 'int', dc: 13 };
  if (t.includes('heal') || t.includes('wound') || t.includes('stabilize') || t.includes('medicine')) return { id: 'medicine', name: 'Medicine', stat: 'wis', dc: 12 };
  if (t.includes('track') || t.includes('trail') || t.includes('forage') || t.includes('wilderness')) return { id: 'survival', name: 'Survival', stat: 'wis', dc: 12 };
  if (t.includes('sense') || t.includes('read') || t.includes('motive')) return { id: 'insight', name: 'Insight', stat: 'wis', dc: 12 };
  if (t.includes('lock') || t.includes('pickpocket') || t.includes('steal') || t.includes('disarm')) return { id: 'sleight_of_hand', name: 'Sleight of Hand', stat: 'dex', dc: 14 };
  return { id: 'perception', name: 'Perception', stat: 'wis', dc: 12 };
};

export const executeCheckWithTray = (
  statScore,
  isProficient,
  profBonus,
  rollType = 'normal',
  dc = 12,
  label = 'Skill Check'
) => {
  const mod = calculateMod(statScore) + (isProficient ? profBonus : 0);
  const tray = rollD20WithTray(mod, rollType, label);
  const isSuccess = (tray.total >= dc || tray.isCrit) && !tray.isFumble;
  const fullTray = {
    ...tray,
    target: dc,
    targetLabel: `DC ${dc}`,
    outcome: isSuccess ? (tray.isCrit ? 'CRIT SUCCESS' : 'SUCCESS') : (tray.isFumble ? 'CRIT FAIL' : 'FAIL'),
    isSuccess
  };
  return {
    ...fullTray,
    totalMod: mod,
    targetDC: dc,
    diceTrays: [fullTray],
    summary: `${label}: Rolled ${tray.total} (d20: ${tray.kept} + Mod: ${mod}) vs DC ${dc} [${fullTray.outcome}]`
  };
};

export const executeCheck = executeCheckWithTray;

export const parseDiceString = (diceStr = '1d6') => {
  const cleaned = String(diceStr).replace(/\s+/g, '');
  const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return { count: 1, sides: 6, modifier: 0 };
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0
  };
};

export const parseAndRollDice = (diceStr = '1d6', label = 'Damage') => {
  const parsed = parseDiceString(diceStr);
  return rollPhysical(parsed.sides, parsed.count, parsed.modifier, label);
};

export const resolveAttackWithTray = ({
  attackerName,
  defenderName,
  weaponName = 'Strike',
  attackBonus = 0,
  targetAC = 12,
  damageDice = '1d6',
  damageBonus = 0,
  rollType = 'normal'
}) => {
  const rawHit = rollD20WithTray(attackBonus, rollType, `${attackerName} Attack (${weaponName})`);
  const isCrit = rawHit.isCrit;
  const isFumble = rawHit.isFumble;
  const isHit = !isFumble && (isCrit || rawHit.total >= targetAC);

  const hitTray = {
    ...rawHit,
    target: targetAC,
    targetLabel: `AC ${targetAC}`,
    outcome: isCrit ? 'CRIT HIT!' : isFumble ? 'FUMBLE MISS!' : isHit ? 'HIT' : 'MISS',
    isSuccess: isHit
  };

  const diceTrays = [hitTray];
  let damageTotal = 0;

  if (isHit) {
    const parsed = parseDiceString(damageDice);
    const dmgCount = isCrit ? parsed.count * 2 : parsed.count;
    const totalDmgMod = parsed.modifier + damageBonus;
    const dmgRoll = rollPhysical(
      parsed.sides,
      dmgCount,
      totalDmgMod,
      `${weaponName} ${isCrit ? 'CRIT ' : ''}Damage`
    );
    damageTotal = Math.max(1, dmgRoll.total);
    diceTrays.push({
      ...dmgRoll,
      outcome: `${damageTotal} DMG`,
      isSuccess: true
    });
  }

  return {
    attackerName,
    defenderName,
    hitTray,
    targetAC,
    isHit,
    isCrit,
    isFumble,
    damageTotal,
    diceTrays,
    summary: isHit
      ? `${attackerName} attacks ${defenderName} with ${weaponName}: Rolled ${hitTray.total} (d20: ${hitTray.kept} + ${attackBonus}) vs AC ${targetAC} [HIT${isCrit ? ' - CRIT!' : ''}] -> Deals ${damageTotal} damage!`
      : `${attackerName} attacks ${defenderName} with ${weaponName}: Rolled ${hitTray.total} (d20: ${hitTray.kept} + ${attackBonus}) vs AC ${targetAC} [MISS${isFumble ? ' - FUMBLE!' : ''}].`
  };
};

export const resolveAttack = resolveAttackWithTray;

export const buildInitiativeQueue = (party = [], monsters = []) => {
  const combatants = [];
  const initiativeTrays = [];

  party.forEach(p => {
    const dexMod = calculateMod(p.baseStats?.dex ?? p.dex ?? 10);
    const tray = rollD20WithTray(dexMod, 'normal', `${p.name} Initiative`);
    const taggedTray = { ...tray, outcome: `INIT ${tray.total}`, isSuccess: true };
    initiativeTrays.push(taggedTray);
    combatants.push({
      id: p.id,
      name: p.name || 'Hero',
      type: 'player',
      initiative: tray.total,
      dexMod,
      ac: p.ac || 12
    });
  });

  monsters.forEach(m => {
    const dexMod = calculateMod(m.stats?.dex ?? m.dex ?? 10);
    const tray = rollD20WithTray(dexMod, 'normal', `${m.name} Initiative`);
    const taggedTray = { ...tray, outcome: `INIT ${tray.total}`, isSuccess: true };
    initiativeTrays.push(taggedTray);
    combatants.push({
      id: m.instanceId || m.id,
      name: m.name,
      type: 'monster',
      initiative: tray.total,
      dexMod,
      ac: m.ac || 12
    });
  });

  combatants.sort((a, b) => b.initiative - a.initiative || b.dexMod - a.dexMod);

  return {
    queue: combatants,
    currentIndex: 0,
    round: 1,
    activeCombatant: combatants[0] || null,
    initiativeTrays
  };
};

export const executeAutomatedMonsterTurn = (monster, party = []) => {
  const livingParty = party.filter(p => (p.hpCurrent ?? p.hp ?? 0) > 0);
  if (livingParty.length === 0) {
    return {
      actionSummary: `${monster.name} prowls over the fallen party.`,
      updatedParty: party,
      diceTrays: []
    };
  }

  const target = livingParty[Math.floor(Math.random() * livingParty.length)];
  const actionsList = monster.actions?.length
    ? monster.actions
    : [{ name: 'Strike', attackBonus: 4, damageDice: '1d6', damageBonus: 2 }];
  const action = actionsList[Math.floor(Math.random() * actionsList.length)];

  const attackRes = resolveAttackWithTray({
    attackerName: monster.name,
    defenderName: target.name,
    weaponName: action.name || 'Strike',
    attackBonus: action.attackBonus ?? 4,
    targetAC: target.ac || 12,
    damageDice: action.damageDice || '1d6',
    damageBonus: action.damageBonus ?? 2
  });

  const updatedParty = party.map(p => {
    if (p.id !== target.id) return p;
    const curHp = p.hpCurrent ?? p.hp ?? 12;
    const nextHp = attackRes.isHit ? Math.max(0, curHp - attackRes.damageTotal) : curHp;
    return { ...p, hpCurrent: nextHp, hp: nextHp };
  });

  return {
    actionSummary: attackRes.summary,
    updatedParty,
    diceTrays: attackRes.diceTrays
  };
};

export const rollD100LootTable = () => {
  const d100 = rollPhysical(100, 1, 0, 'Loot Table d100');
  const goldRoll = rollPhysical(20, 2, 10, 'Gold Spoils');
  const item = getRandomSrdLoot();
  return {
    item,
    gold: goldRoll.total,
    diceTrays: [
      { ...d100, outcome: item.name, isSuccess: true },
      { ...goldRoll, outcome: `${goldRoll.total} GP`, isSuccess: true }
    ]
  };
};
