// CORE MECHANICS
export const calculateMod = (score) => Math.floor((score - 10) / 2);

// UNIVERSAL DICE ROLLER (Handles d2, d4, d6, d8, d10, d12, d20, d100)
export const rollPhysical = (sides, count = 1, modifier = 0) => {
  const rolls = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const result = Math.floor(Math.random() * sides) + 1;
    rolls.push(result);
    sum += result;
  }
  return {
    total: sum + modifier,
    rawRolls: rolls,
    baseSum: sum,
    modifier,
    sides,
    isCrit: sides === 20 && rolls[0] === 20,
    isFumble: sides === 20 && rolls[0] === 1
  };
};

// D20 ROLLER WITH ADVANTAGE/DISADVANTAGE
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
    discardedRoll, // Used for UI display so players see the dropped die
    modifier,
    rollType,
    isCrit: keptRoll === 20,
    isFumble: keptRoll === 1
  };
};

// AUTOMATED STAT/SKILL CHECKS
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

// AUTOMATED COMBAT RESOLUTION (Hit vs AC -> Damage)
export const executeAttack = (hitStatScore, isProficient, profBonus, targetAc, weapon, rollType = 'normal') => {
  const hitMod = calculateMod(hitStatScore) + (isProficient ? profBonus : 0);
  const hitCheck = rollD20(hitMod, rollType);
  
  const isHit = (hitCheck.total >= targetAc || hitCheck.isCrit) && !hitCheck.isFumble;
  
  let damageResult = null;
  if (isHit) {
    // Crits roll the damage dice twice (modifier is only added once)
    const diceCount = hitCheck.isCrit ? weapon.dmgCount * 2 : weapon.dmgCount;
    // Strength/Dex modifier applies to damage
    const dmgMod = calculateMod(hitStatScore) + (weapon.magicBonus || 0);
    
    damageResult = rollPhysical(weapon.dmgSides, diceCount, dmgMod);
  }

  return { hitCheck, isHit, damageResult, targetAc };
};

// AUTOMATED SAVING THROWS (e.g., dodging a fireball)
export const executeSavingThrow = (statScore, isProficient, profBonus, dc, rollType = 'normal') => {
  return executeCheck(statScore, isProficient, profBonus, rollType, dc);
};
