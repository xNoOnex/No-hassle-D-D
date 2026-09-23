export const STATS = {
  str: { id: 'str', name: 'Strength' },
  dex: { id: 'dex', name: 'Dexterity' },
  con: { id: 'con', name: 'Constitution' },
  int: { id: 'int', name: 'Intelligence' },
  wis: { id: 'wis', name: 'Wisdom' },
  cha: { id: 'cha', name: 'Charisma' }
};

export const SKILLS = {
  athletics: { id: 'athletics', name: 'Athletics', stat: 'str' },
  acrobatics: { id: 'acrobatics', name: 'Acrobatics', stat: 'dex' },
  sleight_of_hand: { id: 'sleight_of_hand', name: 'Sleight of Hand', stat: 'dex' },
  stealth: { id: 'stealth', name: 'Stealth', stat: 'dex' },
  arcana: { id: 'arcana', name: 'Arcana', stat: 'int' },
  history: { id: 'history', name: 'History', stat: 'int' },
  investigation: { id: 'investigation', name: 'Investigation', stat: 'int' },
  nature: { id: 'nature', name: 'Nature', stat: 'int' },
  religion: { id: 'religion', name: 'Religion', stat: 'int' },
  animal_handling: { id: 'animal_handling', name: 'Animal Handling', stat: 'wis' },
  insight: { id: 'insight', name: 'Insight', stat: 'wis' },
  medicine: { id: 'medicine', name: 'Medicine', stat: 'wis' },
  perception: { id: 'perception', name: 'Perception', stat: 'wis' },
  survival: { id: 'survival', name: 'Survival', stat: 'wis' },
  deception: { id: 'deception', name: 'Deception', stat: 'cha' },
  intimidation: { id: 'intimidation', name: 'Intimidation', stat: 'cha' },
  performance: { id: 'performance', name: 'Performance', stat: 'cha' },
  persuasion: { id: 'persuasion', name: 'Persuasion', stat: 'cha' }
};

export const WEAPON_TEMPLATES = {
  unarmed: { name: 'Unarmed Strike', dmgSides: 1, dmgCount: 1 }, // Flat 1 damage + STR mod
  dagger: { name: 'Dagger', dmgSides: 4, dmgCount: 1, prop: 'finesse' }, // d4
  shortsword: { name: 'Shortsword', dmgSides: 6, dmgCount: 1, prop: 'finesse' }, // d6
  longsword: { name: 'Longsword', dmgSides: 8, dmgCount: 1 }, // d8
  greatsword: { name: 'Greatsword', dmgSides: 6, dmgCount: 2 }, // 2d6
  greataxe: { name: 'Greataxe', dmgSides: 12, dmgCount: 1 }, // d12
  shortbow: { name: 'Shortbow', dmgSides: 6, dmgCount: 1, prop: 'ranged' }, // d6
  heavy_crossbow: { name: 'Heavy Crossbow', dmgSides: 10, dmgCount: 1, prop: 'ranged' } // d10
};
