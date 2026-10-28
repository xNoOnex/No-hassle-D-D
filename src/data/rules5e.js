export const ALIGNMENTS_5E = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil'
];

export const SKILLS_5E = [
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

const ALL_SKILL_IDS = SKILLS_5E.map(s => s.id);

export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

export const RACES = [
  { name: 'Human', bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } },
  { name: 'Elf (High)', bonuses: { dex: 2, int: 1 } },
  { name: 'Elf (Wood)', bonuses: { dex: 2, wis: 1 } },
  { name: 'Elf (Drow)', bonuses: { dex: 2, cha: 1 } },
  { name: 'Dwarf (Hill)', bonuses: { con: 2, wis: 1 } },
  { name: 'Dwarf (Mountain)', bonuses: { con: 2, str: 2 } },
  { name: 'Halfling (Lightfoot)', bonuses: { dex: 2, cha: 1 } },
  { name: 'Halfling (Stout)', bonuses: { dex: 2, con: 1 } },
  { name: 'Dragonborn', bonuses: { str: 2, cha: 1 } },
  { name: 'Tiefling', bonuses: { int: 1, cha: 2 } },
  { name: 'Half-Orc', bonuses: { str: 2, con: 1 } },
  { name: 'Gnome (Rock)', bonuses: { int: 2, con: 1 } },
  { name: 'Gnome (Forest)', bonuses: { int: 2, dex: 1 } },
  { name: 'Half-Elf', bonuses: { cha: 2, dex: 1, con: 1 } },
  { name: 'Aasimar', bonuses: { cha: 2, wis: 1 } },
  { name: 'Goliath', bonuses: { str: 2, con: 1 } },
  { name: 'Tabaxi', bonuses: { dex: 2, cha: 1 } },
  { name: 'Genasi (Fire)', bonuses: { con: 2, int: 1 } },
  { name: 'Genasi (Water)', bonuses: { con: 2, wis: 1 } },
  { name: 'Warforged', bonuses: { con: 2, str: 1 } },
  { name: 'Tortle', bonuses: { str: 2, wis: 1 } },
  { name: 'Firbolg', bonuses: { wis: 2, str: 1 } },
  { name: 'Kenku', bonuses: { dex: 2, wis: 1 } },
  { name: 'Lizardfolk', bonuses: { con: 2, wis: 1 } },
  { name: 'Githyanki', bonuses: { str: 2, int: 1 } },
  { name: 'Harengon', bonuses: { dex: 2, wis: 1 } }
];

export const BACKGROUNDS = [
  { name: 'Soldier', lockedSkills: ['athletics', 'intimidation'] },
  { name: 'Criminal', lockedSkills: ['deception', 'stealth'] },
  { name: 'Outlander', lockedSkills: ['athletics', 'survival'] },
  { name: 'Acolyte', lockedSkills: ['insight', 'religion'] },
  { name: 'Sage', lockedSkills: ['arcana', 'history'] },
  { name: 'Charlatan', lockedSkills: ['deception', 'sleight_of_hand'] },
  { name: 'Entertainer', lockedSkills: ['acrobatics', 'performance'] },
  { name: 'Folk Hero', lockedSkills: ['animal_handling', 'survival'] },
  { name: 'Guild Artisan', lockedSkills: ['insight', 'persuasion'] },
  { name: 'Hermit', lockedSkills: ['medicine', 'religion'] },
  { name: 'Noble', lockedSkills: ['history', 'persuasion'] },
  { name: 'Sailor', lockedSkills: ['athletics', 'perception'] },
  { name: 'Urchin', lockedSkills: ['sleight_of_hand', 'stealth'] }
];

export const CLASSES = {
  Barbarian: {
    hitDie: 12,
    casterType: null,
    armorProf: ['unarmored', 'light', 'medium', 'shields'],
    savingThrows: ['str', 'con'],
    skillPool: ['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    skillCount: 2,
    subclasses: ['Berserker', 'Totem Warrior', 'Ancestral Guardian', 'Storm Herald', 'Zealot', 'Beast', 'Wild Magic']
  },
  Fighter: {
    hitDie: 10,
    casterType: 'third',
    armorProf: ['unarmored', 'light', 'medium', 'heavy', 'shields'],
    savingThrows: ['str', 'con'],
    skillPool: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    skillCount: 2,
    subclasses: ['Champion', 'Battle Master', 'Eldritch Knight', 'Arcane Archer', 'Cavalier', 'Samurai', 'Psi Warrior', 'Rune Knight', 'Echo Knight']
  },
  Paladin: {
    hitDie: 10,
    casterType: 'half',
    armorProf: ['unarmored', 'light', 'medium', 'heavy', 'shields'],
    savingThrows: ['wis', 'cha'],
    skillPool: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    subclasses: ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance', 'Oath of Conquest', 'Oath of Redemption', 'Oath of Glory', 'Oath of the Watchers', 'Oathbreaker']
  },
  Ranger: {
    hitDie: 10,
    casterType: 'half',
    armorProf: ['unarmored', 'light', 'medium', 'shields'],
    savingThrows: ['str', 'dex'],
    skillPool: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    skillCount: 3,
    subclasses: ['Hunter', 'Beast Master', 'Gloom Stalker', 'Horizon Walker', 'Monster Slayer', 'Fey Wanderer', 'Swarmkeeper', 'Drakewarden']
  },
  Bard: {
    hitDie: 8,
    casterType: 'full',
    armorProf: ['unarmored', 'light'],
    savingThrows: ['dex', 'cha'],
    skillPool: ALL_SKILL_IDS,
    skillCount: 3,
    subclasses: ['College of Lore', 'College of Valor', 'College of Glamour', 'College of Swords', 'College of Whispers', 'College of Eloquence', 'College of Creation', 'College of Spirits']
  },
  Cleric: {
    hitDie: 8,
    casterType: 'full',
    armorProf: ['unarmored', 'light', 'medium', 'shields'],
    savingThrows: ['wis', 'cha'],
    skillPool: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    subclasses: ['Life Domain', 'Light Domain', 'Nature Domain', 'Tempest Domain', 'Trickery Domain', 'War Domain', 'Knowledge Domain', 'Grave Domain', 'Forge Domain', 'Order Domain', 'Peace Domain', 'Twilight Domain']
  },
  Druid: {
    hitDie: 8,
    casterType: 'full',
    armorProf: ['unarmored', 'light', 'medium', 'shields'],
    savingThrows: ['int', 'wis'],
    skillPool: ['arcana', 'animal_handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    skillCount: 2,
    subclasses: ['Circle of the Land', 'Circle of the Moon', 'Circle of Dreams', 'Circle of the Shepherd', 'Circle of Spores', 'Circle of Stars', 'Circle of Wildfire']
  }
  ,
  Monk: {
    hitDie: 8,
    casterType: null,
    armorProf: ['unarmored'],
    savingThrows: ['str', 'dex'],
    skillPool: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    skillCount: 2,
    subclasses: ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements', 'Way of the Drunken Master', 'Way of the Kensei', 'Way of the Sun Soul', 'Way of Mercy', 'Way of the Astral Self']
  },
  Rogue: {
    hitDie: 8,
    casterType: 'third',
    armorProf: ['unarmored', 'light'],
    savingThrows: ['dex', 'int'],
    skillPool: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight_of_hand', 'stealth'],
    skillCount: 4,
    subclasses: ['Thief', 'Assassin', 'Arcane Trickster', 'Inquisitive', 'Mastermind', 'Scout', 'Swashbuckler', 'Phantom', 'Soulknife']
  },
  Warlock: {
    hitDie: 8,
    casterType: 'pact',
    armorProf: ['unarmored', 'light'],
    savingThrows: ['wis', 'cha'],
    skillPool: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    skillCount: 2,
    subclasses: ['The Archfey', 'The Fiend', 'The Great Old One', 'The Celestial', 'The Hexblade', 'The Fathomless', 'The Genie', 'The Undead']
  },
  Sorcerer: {
    hitDie: 6,
    casterType: 'full',
    armorProf: ['unarmored'],
    savingThrows: ['con', 'cha'],
    skillPool: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    skillCount: 2,
    subclasses: ['Draconic Bloodline', 'Wild Magic', 'Divine Soul', 'Shadow Magic', 'Storm Sorcery', 'Aberrant Mind', 'Clockwork Soul']
  },
  Wizard: {
    hitDie: 6,
    casterType: 'full',
    armorProf: ['unarmored'],
    savingThrows: ['int', 'wis'],
    skillPool: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    skillCount: 2,
    subclasses: ['School of Abjuration', 'School of Conjuration', 'School of Divination', 'School of Enchantment', 'School of Evocation', 'School of Illusion', 'School of Necromancy', 'School of Transmutation', 'Bladesinging', 'War Magic', 'Chronurgy Magic']
  },
  Artificer: {
    hitDie: 8,
    casterType: 'half',
    armorProf: ['unarmored', 'light', 'medium', 'shields'],
    savingThrows: ['con', 'int'],
    skillPool: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'perception', 'sleight_of_hand'],
    skillCount: 2,
    subclasses: ['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith']
  },
  BloodHunter: {
    hitDie: 10,
    casterType: 'third',
    armorProf: ['unarmored', 'light', 'medium', 'shields'],
    savingThrows: ['dex', 'int'],
    skillPool: ['acrobatics', 'arcana', 'athletics', 'history', 'insight', 'investigation', 'religion', 'survival'],
    skillCount: 3,
    subclasses: ['Order of the Ghostslayer', 'Order of the Lycan', 'Order of the Mutant', 'Order of the Profane Soul']
  }
};

export const SUBCLASSES = Object.fromEntries(
  Object.entries(CLASSES).map(([k, v]) => [k, v.subclasses])
);

export const CLASS_HIT_DICE = Object.fromEntries(
  Object.entries(CLASSES).map(([k, v]) => [k, v.hitDie])
);

export const WEAPONS_LIST = [
  { name: 'Club', damageDice: '1d4', stat: 'str', category: 'Simple Melee' },
  { name: 'Dagger', damageDice: '1d4', stat: 'dex', finesse: true, category: 'Simple Melee' },
  { name: 'Greatclub', damageDice: '1d8', stat: 'str', category: 'Simple Melee' },
  { name: 'Handaxe', damageDice: '1d6', stat: 'str', category: 'Simple Melee' },
  { name: 'Javelin', damageDice: '1d6', stat: 'str', category: 'Simple Melee' },
  { name: 'Light Hammer', damageDice: '1d4', stat: 'str', category: 'Simple Melee' },
  { name: 'Mace', damageDice: '1d6', stat: 'str', category: 'Simple Melee' },
  { name: 'Quarterstaff', damageDice: '1d6', stat: 'str', versatile: '1d8', category: 'Simple Melee' },
  { name: 'Sickle', damageDice: '1d4', stat: 'str', category: 'Simple Melee' },
  { name: 'Spear', damageDice: '1d6', stat: 'str', versatile: '1d8', category: 'Simple Melee' },
  { name: 'Light Crossbow', damageDice: '1d8', stat: 'dex', ranged: true, category: 'Simple Ranged' },
  { name: 'Dart', damageDice: '1d4', stat: 'dex', finesse: true, ranged: true, category: 'Simple Ranged' },
  { name: 'Shortbow', damageDice: '1d6', stat: 'dex', ranged: true, category: 'Simple Ranged' },
  { name: 'Sling', damageDice: '1d4', stat: 'dex', ranged: true, category: 'Simple Ranged' },
  { name: 'Battleaxe', damageDice: '1d8', stat: 'str', versatile: '1d10', category: 'Martial Melee' },
  { name: 'Flail', damageDice: '1d8', stat: 'str', category: 'Martial Melee' },
  { name: 'Glaive', damageDice: '1d10', stat: 'str', heavy: true, category: 'Martial Melee' },
  { name: 'Greataxe', damageDice: '1d12', stat: 'str', heavy: true, category: 'Martial Melee' },
  { name: 'Greatsword', damageDice: '2d6', stat: 'str', heavy: true, category: 'Martial Melee' },
  { name: 'Halberd', damageDice: '1d10', stat: 'str', heavy: true, category: 'Martial Melee' },
  { name: 'Lance', damageDice: '1d12', stat: 'str', category: 'Martial Melee' },
  { name: 'Longsword', damageDice: '1d8', stat: 'str', versatile: '1d10', category: 'Martial Melee' },
  { name: 'Maul', damageDice: '2d6', stat: 'str', heavy: true, category: 'Martial Melee' },
  { name: 'Morningstar', damageDice: '1d8', stat: 'str', category: 'Martial Melee' },
  { name: 'Pike', damageDice: '1d10', stat: 'str', heavy: true, category: 'Martial Melee' },
  { name: 'Rapier', damageDice: '1d8', stat: 'dex', finesse: true, category: 'Martial Melee' },
  { name: 'Scimitar', damageDice: '1d6', stat: 'dex', finesse: true, category: 'Martial Melee' },
  { name: 'Shortsword', damageDice: '1d6', stat: 'dex', finesse: true, category: 'Martial Melee' },
  { name: 'Trident', damageDice: '1d6', stat: 'str', versatile: '1d8', category: 'Martial Melee' },
  { name: 'War Pick', damageDice: '1d8', stat: 'str', category: 'Martial Melee' },
  { name: 'Warhammer', damageDice: '1d8', stat: 'str', versatile: '1d10', category: 'Martial Melee' },
  { name: 'Whip', damageDice: '1d4', stat: 'dex', finesse: true, category: 'Martial Melee' },
  { name: 'Blowgun', damageDice: '1d1', stat: 'dex', ranged: true, category: 'Martial Ranged' },
  { name: 'Hand Crossbow', damageDice: '1d6', stat: 'dex', ranged: true, category: 'Martial Ranged' },
  { name: 'Heavy Crossbow', damageDice: '1d10', stat: 'dex', heavy: true, ranged: true, category: 'Martial Ranged' },
  { name: 'Longbow', damageDice: '1d8', stat: 'dex', heavy: true, ranged: true, category: 'Martial Ranged' }
];

export const ARMOR_LIST = [
  { name: 'Unarmored', base: 10, type: 'unarmored', starter: true },
  { name: 'Padded Armor', base: 11, type: 'light', starter: true },
  { name: 'Leather Armor', base: 11, type: 'light', starter: true },
  { name: 'Studded Leather', base: 12, type: 'light', starter: false },
  { name: 'Hide Armor', base: 12, type: 'medium', starter: true },
  { name: 'Chain Shirt', base: 13, type: 'medium', starter: true },
  { name: 'Scale Mail', base: 14, type: 'medium', starter: true },
  { name: 'Breastplate', base: 14, type: 'medium', starter: false },
  { name: 'Half Plate', base: 15, type: 'medium', starter: false },
  { name: 'Ring Mail', base: 14, type: 'heavy', starter: true },
  { name: 'Chain Mail', base: 16, type: 'heavy', starter: true },
  { name: 'Splint Armor', base: 17, type: 'heavy', starter: false },
  { name: 'Plate Armor', base: 18, type: 'heavy', starter: false }
];
