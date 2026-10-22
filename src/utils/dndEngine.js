export const CLASS_HIT_DICE = {
  Barbarian: 12,
  Fighter: 10,
  Paladin: 10,
  Ranger: 10,
  Bard: 8,
  Cleric: 8,
  Druid: 8,
  Monk: 8,
  Rogue: 8,
  Warlock: 8,
  Sorcerer: 6,
  Wizard: 6
};

export const calculateMod = (score = 10) => Math.floor((Number(score) - 10) / 2);

export const calculateProficiency = (totalLevel = 1) => Math.floor((Math.max(1, Number(totalLevel)) - 1) / 4) + 2;

export const calculateAC = (armor, dexMod = 0, hasShield = false) => {
  let base = 10 + dexMod;
  if (armor) {
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
  const hd1 = CLASS_HIT_DICE[primaryClass] || 8;
  const hd2 = CLASS_HIT_DICE[secondaryClass] || 8;

  // Level 1 of primary class gets full hit die
  let totalHp = hd1 + conMod;

  // Additional levels in primary class
  if (pLvl > 1) {
    totalHp += (Math.floor(hd1 / 2) + 1 + conMod) * (pLvl - 1);
  }

  // Levels in secondary class (5e multiclass rules)
  if (sLvl > 0) {
    totalHp += (Math.floor(hd2 / 2) + 1 + conMod) * sLvl;
  }

  return Math.max(1, totalHp);
};

export const rollPhysical = (sides, count = 1, modifier = 0) => {
  const rolls = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const res = Math.floor(Math.random() * sides) + 1;
    rolls.push(res);
    sum += res;
  }
  return {
    total: sum + modifier,
    rawRolls: rolls,
    baseSum: sum,
    modifier,
    sides,
    isCrit: sides === 20 && count === 1 && rolls[0] === 20,
    isFumble: sides === 20 && count === 1 && rolls[0] === 1
  };
};

export const rollD20 = (modifier = 0, rollType = 'normal') => {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  const roll2 = Math.floor(Math.random() * 20) + 1;
  let keptRoll = roll1;
  let discardedRoll = null;

  if (rollType === 'advantage') {
    keptRoll = Math.max(roll1, roll2);
    discardedRoll = Math.min(roll1, roll2);
  } else if (rollType === 'disadvantage') {
    keptRoll = Math.min(roll1, roll2);
    discardedRoll = Math.max(roll1, roll2);
  }

  return {
    total: keptRoll + modifier,
    keptRoll,
    discardedRoll,
    modifier,
    rollType,
    isCrit: keptRoll === 20,
    isFumble: keptRoll === 1
  };
};

export const executeCheck = (statScore, isProficient, profBonus, rollType = 'normal', dc = null) => {
  const mod = calculateMod(statScore) + (isProficient ? profBonus : 0);
  const result = rollD20(mod, rollType);
  return {
    ...result,
    isSuccess: dc !== null ? (result.total >= dc || result.isCrit) && !result.isFumble : null,
    targetDC: dc,
    totalMod: mod
  };
};

export const parseAndRollDice = (diceStr = '1d6') => {
  if (typeof diceStr === 'number') {
    return { total: diceStr, rolls: [diceStr], text: `${diceStr}` };
  }
  const cleaned = String(diceStr).replace(/\s+/g, '');
  const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    const val = parseInt(cleaned, 10) || 0;
    return { total: val, rolls: [val], text: `${val}` };
  }
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  const physical = rollPhysical(sides, count, modifier);
  return {
    total: physical.total,
    rolls: physical.rawRolls,
    modifier,
    text: `${count}d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''} (${physical.rawRolls.join('+')}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''})`
  };
};

export const resolveAttack = ({
  attackerName,
  defenderName,
  attackBonus = 0,
  targetAC = 10,
  damageDice = '1d6',
  damageBonus = 0,
  rollType = 'normal'
}) => {
  const hitRoll = rollD20(attackBonus, rollType);
  const isCrit = hitRoll.isCrit;
  const isFumble = hitRoll.isFumble;
  const isHit = !isFumble && (isCrit || hitRoll.total >= targetAC);

  let damageTotal = 0;
  let damageDetail = '';

  if (isHit) {
    const roll1 = parseAndRollDice(damageDice);
    let dmg = roll1.total + damageBonus;
    damageDetail = roll1.text;
    if (isCrit) {
      const critRoll = parseAndRollDice(damageDice);
      dmg += critRoll.total;
      damageDetail += ` + CRIT ${critRoll.text}`;
    }
    if (damageBonus !== 0) {
      damageDetail += damageBonus > 0 ? `+${damageBonus}` : `${damageBonus}`;
    }
    damageTotal = Math.max(1, dmg);
  }

  return {
    attackerName,
    defenderName,
    hitRoll,
    targetAC,
    isHit,
    isCrit,
    isFumble,
    damageTotal,
    damageDetail,
    summary: isHit
      ? `${attackerName} hit ${defenderName} (Roll: ${hitRoll.total} vs AC ${targetAC}${isCrit ? ' - CRIT' : ''}) for ${damageTotal} damage.`
      : `${attackerName} missed ${defenderName} (Roll: ${hitRoll.total} vs AC ${targetAC}${isFumble ? ' - FUMBLE' : ''}).`
  };
};

export const buildInitiativeQueue = (party = [], monsters = []) => {
  const combatants = [];

  party.forEach(p => {
    const dexMod = calculateMod(p.baseStats?.dex ?? p.dex ?? 10);
    const roll = rollPhysical(20, 1, dexMod);
    combatants.push({
      id: p.id,
      name: p.name || 'Hero',
      type: 'player',
      initiative: roll.total,
      dexMod,
      ac: p.ac || 10,
      hpCurrent: p.hpCurrent ?? p.hp ?? 10,
      hpMax: p.hpMax ?? p.maxHp ?? 10
    });
  });

  monsters.forEach(m => {
    const dexMod = calculateMod(m.stats?.dex ?? m.dex ?? 10);
    const roll = rollPhysical(20, 1, dexMod);
    combatants.push({
      id: m.instanceId || m.id,
      name: m.name,
      type: 'monster',
      initiative: roll.total,
      dexMod,
      ac: m.ac || 10,
      hpCurrent: m.hpCurrent ?? m.hp ?? 10,
      hpMax: m.maxHp ?? m.hp ?? 10,
      actions: m.actions || [{ name: 'Strike', attackBonus: 3, damageDice: '1d6', damageBonus: 1 }]
    });
  });

  combatants.sort((a, b) => b.initiative - a.initiative || b.dexMod - a.dexMod);

  return {
    queue: combatants,
    currentIndex: 0,
    round: 1,
    activeCombatant: combatants[0] || null
  };
};

export const advanceTurn = (combatState) => {
  if (!combatState?.queue?.length) return combatState;
  let nextIndex = combatState.currentIndex + 1;
  let nextRound = combatState.round;

  if (nextIndex >= combatState.queue.length) {
    nextIndex = 0;
    nextRound += 1;
  }

  return {
    ...combatState,
    currentIndex: nextIndex,
    round: nextRound,
    activeCombatant: combatState.queue[nextIndex]
  };
};

export const executeAutomatedMonsterTurn = (monster, party = []) => {
  const livingParty = party.filter(p => (p.hpCurrent ?? p.hp ?? 0) > 0);
  if (livingParty.length === 0) {
    return {
      actionSummary: `${monster.name} stands over the fallen party.`,
      attackResult: null,
      updatedParty: party,
      targetedPlayer: null
    };
  }

  const target = livingParty[Math.floor(Math.random() * livingParty.length)];
  const action = monster.actions?.[0] || { name: 'Strike', attackBonus: 3, damageDice: '1d6', damageBonus: 1 };
  const targetAC = target.ac || 10;

  const attackRes = resolveAttack({
    attackerName: monster.name,
    defenderName: target.name,
    attackBonus: action.attackBonus || 0,
    targetAC,
    damageDice: action.damageDice || '1d6',
    damageBonus: action.damageBonus || 0
  });

  let updatedTarget = { ...target };
  if (attackRes.isHit) {
    const currentHp = updatedTarget.hpCurrent ?? updatedTarget.hp ?? 10;
    const newHp = Math.max(0, currentHp - attackRes.damageTotal);
    updatedTarget = {
      ...updatedTarget,
      hpCurrent: newHp,
      hp: newHp
    };
  }

  const updatedParty = party.map(p => (p.id === updatedTarget.id ? updatedTarget : p));

  return {
    actionSummary: attackRes.summary,
    attackResult: attackRes,
    updatedParty,
    targetedPlayer: updatedTarget
  };
};
