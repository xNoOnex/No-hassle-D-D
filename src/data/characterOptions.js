// --- PHASE 1: CORE RACES & CLASSES ---

export const RACES = {
  dragonborn: { id: 'dragonborn', name: 'Dragonborn', speed: 30, statBonuses: { str: 2, cha: 1 }, traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'] },
  dwarf: { id: 'dwarf', name: 'Dwarf', speed: 25, statBonuses: { con: 2 }, traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'] },
  elf: { id: 'elf', name: 'Elf', speed: 30, statBonuses: { dex: 2 }, traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'] },
  gnome: { id: 'gnome', name: 'Gnome', speed: 25, statBonuses: { int: 2 }, traits: ['Darkvision', 'Gnome Cunning'] },
  half_elf: { id: 'half_elf', name: 'Half-Elf', speed: 30, statBonuses: { cha: 2, any1: 1, any2: 1 }, traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'] },
  halfling: { id: 'halfling', name: 'Halfling', speed: 25, statBonuses: { dex: 2 }, traits: ['Lucky', 'Brave', 'Halfling Nimbleness'] },
  half_orc: { id: 'half_orc', name: 'Half-Orc', speed: 30, statBonuses: { str: 2, con: 1 }, traits: ['Darkvision', 'Menacing', 'Relentless Endurance', 'Savage Attacks'] },
  human: { id: 'human', name: 'Human', speed: 30, statBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, traits: [] },
  tiefling: { id: 'tiefling', name: 'Tiefling', speed: 30, statBonuses: { int: 1, cha: 2 }, traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'] }
};

export const CLASSES = {
  barbarian: { id: 'barbarian', name: 'Barbarian', hitDie: 12, primaryStat: 'str', subclasses: {} },
  bard: { id: 'bard', name: 'Bard', hitDie: 8, primaryStat: 'cha', subclasses: {} },
  cleric: { id: 'cleric', name: 'Cleric', hitDie: 8, primaryStat: 'wis', subclasses: {} },
  druid: { id: 'druid', name: 'Druid', hitDie: 8, primaryStat: 'wis', subclasses: {} },
  fighter: { id: 'fighter', name: 'Fighter', hitDie: 10, primaryStat: 'str', subclasses: {} },
  monk: { id: 'monk', name: 'Monk', hitDie: 8, primaryStat: 'dex', subclasses: {} },
  paladin: { id: 'paladin', name: 'Paladin', hitDie: 10, primaryStat: 'str', subclasses: {} },
  ranger: { id: 'ranger', name: 'Ranger', hitDie: 10, primaryStat: 'dex', subclasses: {} },
  rogue: { id: 'rogue', name: 'Rogue', hitDie: 8, primaryStat: 'dex', subclasses: {} },
  sorcerer: { id: 'sorcerer', name: 'Sorcerer', hitDie: 6, primaryStat: 'cha', subclasses: {} },
  warlock: { id: 'warlock', name: 'Warlock', hitDie: 8, primaryStat: 'cha', subclasses: {} },
  wizard: { id: 'wizard', name: 'Wizard', hitDie: 6, primaryStat: 'int', subclasses: {} }
};

// --- CORE ARMOR & GEAR ---

export const ARMOR = {
  // Light (Full DEX bonus)
  padded: { name: 'Padded', base: 11, type: 'light', stealthDisadvantage: true },
  leather: { name: 'Leather', base: 11, type: 'light', stealthDisadvantage: false },
  studded_leather: { name: 'Studded Leather', base: 12, type: 'light', stealthDisadvantage: false },
  
  // Medium (Max +2 DEX bonus)
  hide: { name: 'Hide', base: 12, type: 'medium', stealthDisadvantage: false },
  chain_shirt: { name: 'Chain Shirt', base: 13, type: 'medium', stealthDisadvantage: false },
  scale_mail: { name: 'Scale Mail', base: 14, type: 'medium', stealthDisadvantage: true },
  breastplate: { name: 'Breastplate', base: 14, type: 'medium', stealthDisadvantage: false },
  half_plate: { name: 'Half Plate', base: 15, type: 'medium', stealthDisadvantage: true },
  
  // Heavy (No DEX bonus)
  ring_mail: { name: 'Ring Mail', base: 14, type: 'heavy', stealthDisadvantage: true, minStr: 0 },
  chain_mail: { name: 'Chain Mail', base: 16, type: 'heavy', stealthDisadvantage: true, minStr: 13 },
  splint: { name: 'Splint', base: 17, type: 'heavy', stealthDisadvantage: true, minStr: 15 },
  plate: { name: 'Plate', base: 18, type: 'heavy', stealthDisadvantage: true, minStr: 15 },
  
  // Shield (Adds flat +2 to final calculation)
  shield: { name: 'Shield', bonus: 2 }
};

// --- READY-TO-GO LOOT POOL ---
export const STANDARD_LOOT_POOL = [
  // Consumables (High Weight / Common)
  { id: 'l_01', name: 'Potion of Healing', type: 'Consumable', rarity: 'Common', weight: 100, stats: '2d4+2 HP', description: 'A vial of red liquid that restores hit points.' },
  { id: 'l_02', name: 'Alchemist Fire', type: 'Consumable', rarity: 'Common', weight: 50, stats: '1d4 Fire/turn', description: 'Sticky, adhesive fluid that ignites when exposed to air.' },
  
  // Weapons (Medium Weight / Uncommon)
  { id: 'l_03', name: '+1 Longsword', type: 'Weapon', rarity: 'Uncommon', weight: 20, stats: '1d8+1 Slashing', description: 'A finely crafted blade that never dulls.' },
  { id: 'l_04', name: 'Goggles of Night', type: 'Gear', rarity: 'Uncommon', weight: 15, stats: 'Darkvision 60ft', description: 'Lenses made of dark crystal that allow sight in pitch black.' },
  
  // Artifacts (Low Weight / Rare)
  { id: 'l_05', name: 'Flametongue Dagger', type: 'Weapon', rarity: 'Rare', weight: 5, stats: '1d4 Pierce + 2d6 Fire', description: 'The blade bursts into flames upon speaking the command word.' },
  { id: 'l_06', name: 'Mithral Half Plate', type: 'Armor', rarity: 'Uncommon', weight: 10, stats: 'AC 15 (No Stealth Disadvantage)', description: 'Extremely light and flexible metal armor.' }
];
