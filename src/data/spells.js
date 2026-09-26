export const SPELLS = {
  // --- CANTRIPS (LEVEL 0) ---
  acid_splash: { 
    id: 'acid_splash', name: 'Acid Splash', level: 0, classes: ['sorcerer', 'wizard', 'fighter', 'rogue'], 
    type: 'save', saveStat: 'con', dmgSides: 6, dmgCount: 1, 
    description: 'Hurl a bubble of acid. Target must succeed on a CON save or take 1d6 acid damage.' 
  },
  chill_touch: { 
    id: 'chill_touch', name: 'Chill Touch', level: 0, classes: ['sorcerer', 'warlock', 'wizard'], 
    type: 'attack', dmgSides: 8, dmgCount: 1, 
    description: 'Create a ghostly hand to attack. 1d8 necrotic damage, and the target cannot regain HP until your next turn.' 
  },
  eldritch_blast: { 
    id: 'eldritch_blast', name: 'Eldritch Blast', level: 0, classes: ['warlock'], 
    type: 'attack', dmgSides: 10, dmgCount: 1, 
    description: 'A beam of crackling energy streaks toward a creature. 1d10 force damage.' 
  },
  fire_bolt: { 
    id: 'fire_bolt', name: 'Fire Bolt', level: 0, classes: ['sorcerer', 'wizard', 'fighter', 'rogue'], 
    type: 'attack', dmgSides: 10, dmgCount: 1, 
    description: 'You hurl a mote of fire. 1d10 fire damage.' 
  },
  light: { 
    id: 'light', name: 'Light', level: 0, classes: ['bard', 'cleric', 'sorcerer', 'wizard'], 
    type: 'utility', 
    description: 'Touch one object. It sheds bright light in a 20-foot radius for 1 hour.' 
  },
  mage_hand: { 
    id: 'mage_hand', name: 'Mage Hand', level: 0, classes: ['bard', 'sorcerer', 'warlock', 'wizard', 'rogue', 'fighter'], 
    type: 'utility', 
    description: 'A spectral, floating hand appears. You can use it to manipulate objects up to 30 feet away.' 
  },
  poison_spray: { 
    id: 'poison_spray', name: 'Poison Spray', level: 0, classes: ['druid', 'sorcerer', 'warlock', 'wizard'], 
    type: 'save', saveStat: 'con', dmgSides: 12, dmgCount: 1, 
    description: 'Project a puff of noxious gas. Target must succeed on a CON save or take 1d12 poison damage.' 
  },
  ray_of_frost: { 
    id: 'ray_of_frost', name: 'Ray of Frost', level: 0, classes: ['sorcerer', 'wizard', 'fighter', 'rogue'], 
    type: 'attack', dmgSides: 8, dmgCount: 1, 
    description: 'A frigid beam of blue-white light. 1d8 cold damage and the target’s speed is reduced by 10 feet.' 
  },
  sacred_flame: { 
    id: 'sacred_flame', name: 'Sacred Flame', level: 0, classes: ['cleric'], 
    type: 'save', saveStat: 'dex', dmgSides: 8, dmgCount: 1, 
    description: 'Flame-like radiance descends. Target must succeed on a DEX save or take 1d8 radiant damage.' 
  },
  shocking_grasp: { 
    id: 'shocking_grasp', name: 'Shocking Grasp', level: 0, classes: ['sorcerer', 'wizard', 'fighter', 'rogue'], 
    type: 'attack', dmgSides: 8, dmgCount: 1, 
    description: 'Lightning springs from your hand. 1d8 lightning damage and target cannot take reactions.' 
  },
  thaumaturgy: { 
    id: 'thaumaturgy', name: 'Thaumaturgy', level: 0, classes: ['cleric'], 
    type: 'utility', 
    description: 'Manifest a minor wonder within range (e.g. booming voice, flickering flames, slamming doors).' 
  },
  vicious_mockery: { 
    id: 'vicious_mockery', name: 'Vicious Mockery', level: 0, classes: ['bard'], 
    type: 'save', saveStat: 'wis', dmgSides: 4, dmgCount: 1, 
    description: 'Unleash a string of insults. Target must succeed on a WIS save or take 1d4 psychic damage.' 
  },

  // --- LEVEL 1 SPELLS ---
  burning_hands: {
    id: 'burning_hands', name: 'Burning Hands', level: 1, classes: ['sorcerer', 'wizard'],
    type: 'save', saveStat: 'dex', dmgSides: 6, dmgCount: 3,
    description: 'A thin sheet of flames shoots forth in a 15-foot cone. DEX save for half of 3d6 fire damage.'
  },
  charm_person: {
    id: 'charm_person', name: 'Charm Person', level: 1, classes: ['bard', 'druid', 'sorcerer', 'warlock', 'wizard'],
    type: 'save', saveStat: 'wis',
    description: 'Attempt to charm a humanoid. It must make a WIS save, doing so with advantage if you are fighting it.'
  },
  cure_wounds: { 
    id: 'cure_wounds', name: 'Cure Wounds', level: 1, classes: ['cleric', 'bard', 'paladin', 'ranger', 'druid'], 
    type: 'heal', dmgSides: 8, dmgCount: 1, 
    description: 'A creature you touch regains hit points equal to 1d8 + your spellcasting modifier.' 
  },
  guiding_bolt: {
    id: 'guiding_bolt', name: 'Guiding Bolt', level: 1, classes: ['cleric'], 
    type: 'attack', dmgSides: 6, dmgCount: 4, 
    description: 'A flash of light streaks toward a creature. 4d6 radiant damage, and the next attack roll against it has advantage.'
  },
  healing_word: {
    id: 'healing_word', name: 'Healing Word', level: 1, classes: ['bard', 'cleric', 'druid'],
    type: 'heal', dmgSides: 4, dmgCount: 1,
    description: 'A creature of your choice within 60 feet regains 1d4 + spellcasting modifier HP. (Bonus Action)'
  },
  inflict_wounds: {
    id: 'inflict_wounds', name: 'Inflict Wounds', level: 1, classes: ['cleric'], 
    type: 'attack', dmgSides: 10, dmgCount: 3, 
    description: 'Make a melee spell attack. On a hit, target takes 3d10 necrotic damage.'
  },
  magic_missile: { 
    id: 'magic_missile', name: 'Magic Missile', level: 1, classes: ['wizard', 'sorcerer'], 
    type: 'auto', dmgSides: 4, dmgCount: 3, staticBonus: 3,
    description: 'Create three glowing darts of magical force. They hit automatically for 1d4+1 damage each.' 
  },
  shield: {
    id: 'shield', name: 'Shield', level: 1, classes: ['sorcerer', 'wizard'],
    type: 'utility',
    description: 'An invisible barrier of magical force appears. You gain +5 to AC until the start of your next turn. (Reaction)'
  },
  sleep: {
    id: 'sleep', name: 'Sleep', level: 1, classes: ['bard', 'sorcerer', 'wizard'],
    type: 'utility', dmgSides: 8, dmgCount: 5,
    description: 'Roll 5d8. Creatures within 20 feet are put to sleep in ascending order of their current hit points up to the rolled total.'
  },
  thunderwave: {
    id: 'thunderwave', name: 'Thunderwave', level: 1, classes: ['bard', 'druid', 'sorcerer', 'wizard'],
    type: 'save', saveStat: 'con', dmgSides: 8, dmgCount: 2,
    description: 'A wave of thunderous force sweeps out in a 15-foot cube. CON save for half of 2d8 thunder damage.'
  },

  // --- LEVEL 2 SPELLS ---
  blindness_deafness: {
    id: 'blindness_deafness', name: 'Blindness/Deafness', level: 2, classes: ['bard', 'cleric', 'sorcerer', 'wizard'],
    type: 'save', saveStat: 'con',
    description: 'Target must make a CON save or be blinded or deafened (your choice) for 1 minute.'
  },
  flaming_sphere: {
    id: 'flaming_sphere', name: 'Flaming Sphere', level: 2, classes: ['druid', 'wizard'],
    type: 'save', saveStat: 'dex', dmgSides: 6, dmgCount: 2,
    description: 'A 5-foot-diameter sphere of fire appears. DEX save for half of 2d6 fire damage. You can move it as a bonus action.'
  },
  hold_person: {
    id: 'hold_person', name: 'Hold Person', level: 2, classes: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'],
    type: 'save', saveStat: 'wis',
    description: 'Choose a humanoid within range. WIS save or be paralyzed for 1 minute.'
  },
  invisibility: {
    id: 'invisibility', name: 'Invisibility', level: 2, classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    type: 'utility',
    description: 'A creature you touch becomes invisible until the spell ends, or until they attack or cast a spell.'
  },
  scorching_ray: {
    id: 'scorching_ray', name: 'Scorching Ray', level: 2, classes: ['sorcerer', 'wizard'],
    type: 'attack', dmgSides: 6, dmgCount: 6,
    description: 'Create three rays of fire and hurl them at targets within range. Each ray deals 2d6 fire damage on a hit. (Rolls 6d6 total).'
  },
  spiritual_weapon: {
    id: 'spiritual_weapon', name: 'Spiritual Weapon', level: 2, classes: ['cleric'],
    type: 'attack', dmgSides: 8, dmgCount: 1,
    description: 'Create a floating, spectral weapon. Make a melee spell attack for 1d8 + modifier force damage. (Bonus Action)'
  },
  web: {
    id: 'web', name: 'Web', level: 2, classes: ['sorcerer', 'wizard'],
    type: 'save', saveStat: 'dex',
    description: 'Conjure a mass of thick, sticky webbing in a 20-foot cube. DEX save or be restrained.'
  },

  // --- LEVEL 3 SPELLS ---
  counterspell: {
    id: 'counterspell', name: 'Counterspell', level: 3, classes: ['sorcerer', 'warlock', 'wizard'],
    type: 'utility',
    description: 'Interrupt a creature in the process of casting a spell. If the spell is 3rd level or lower, it fails and has no effect. (Reaction)'
  },
  dispel_magic: {
    id: 'dispel_magic', name: 'Dispel Magic', level: 3, classes: ['bard', 'cleric', 'druid', 'paladin', 'sorcerer', 'warlock', 'wizard'],
    type: 'utility',
    description: 'Choose one creature, object, or magical effect. Any spell of 3rd level or lower on the target ends.'
  },
  fireball: {
    id: 'fireball', name: 'Fireball', level: 3, classes: ['sorcerer', 'wizard'],
    type: 'save', saveStat: 'dex', dmgSides: 6, dmgCount: 8,
    description: 'A bright streak flashes from your pointing finger and blossoms into an explosion of flame. DEX save for half of 8d6 fire damage.'
  },
  haste: {
    id: 'haste', name: 'Haste', level: 3, classes: ['sorcerer', 'wizard'],
    type: 'utility',
    description: 'Target gains doubled speed, +2 AC, advantage on DEX saves, and an additional action on each of its turns.'
  },
  mass_healing_word: {
    id: 'mass_healing_word', name: 'Mass Healing Word', level: 3, classes: ['cleric'],
    type: 'heal', dmgSides: 4, dmgCount: 1,
    description: 'Up to six creatures of your choice within 60 feet regain 1d4 + spellcasting modifier HP. (Bonus Action)'
  },
  revivify: {
    id: 'revivify', name: 'Revivify', level: 3, classes: ['cleric', 'paladin'],
    type: 'heal', staticBonus: 1,
    description: 'Touch a creature that has died within the last minute. That creature returns to life with 1 hit point.'
  },
  spirit_guardians: {
    id: 'spirit_guardians', name: 'Spirit Guardians', level: 3, classes: ['cleric'],
    type: 'save', saveStat: 'wis', dmgSides: 8, dmgCount: 3,
    description: 'Spirits flit around you to a distance of 15 feet. Enemy speed is halved, and they make a WIS save for half of 3d8 radiant or necrotic damage.'
  },

  // --- LEVEL 4 SPELLS ---
  banishment: {
    id: 'banishment', name: 'Banishment', level: 4, classes: ['cleric', 'paladin', 'sorcerer', 'warlock', 'wizard'],
    type: 'save', saveStat: 'cha',
    description: 'You attempt to send one creature to another plane of existence. Target must succeed on a CHA save or be banished.'
  },
  blight: {
    id: 'blight', name: 'Blight', level: 4, classes: ['druid', 'sorcerer', 'warlock', 'wizard'],
    type: 'save', saveStat: 'con', dmgSides: 8, dmgCount: 8,
    description: 'Necromantic energy washes over a creature. CON save for half of 8d8 necrotic damage. Plant creatures have disadvantage.'
  },
  dimension_door: {
    id: 'dimension_door', name: 'Dimension Door', level: 4, classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    type: 'utility',
    description: 'Teleport yourself from your current location to any other spot within 500 feet. You can bring one willing creature with you.'
  },
  polymorph: {
    id: 'polymorph', name: 'Polymorph', level: 4, classes: ['bard', 'druid', 'sorcerer', 'wizard'],
    type: 'save', saveStat: 'wis',
    description: 'Transform a creature into a new beast form. Unwilling targets must succeed on a WIS save to avoid the effect.'
  },
  wall_of_fire: {
    id: 'wall_of_fire', name: 'Wall of Fire', level: 4, classes: ['druid', 'sorcerer', 'wizard'],
    type: 'save', saveStat: 'dex', dmgSides: 8, dmgCount: 5,
    description: 'Create a wall of flames. Creatures within it make a DEX save for half of 5d8 fire damage.'
  },

  // --- LEVEL 5 SPELLS ---
  cone_of_cold: {
    id: 'cone_of_cold', name: 'Cone of Cold', level: 5, classes: ['sorcerer', 'wizard'],
    type: 'save', saveStat: 'con', dmgSides: 8, dmgCount: 8,
    description: 'A blast of cold air erupts from your hands. Creatures in a 60-foot cone make a CON save for half of 8d8 cold damage.'
  },
  flame_strike: {
    id: 'flame_strike', name: 'Flame Strike', level: 5, classes: ['cleric'],
    type: 'save', saveStat: 'dex', dmgSides: 6, dmgCount: 8,
    description: 'A vertical column of divine fire roars downward. DEX save for half of 8d6 damage (4d6 fire, 4d6 radiant).'
  },
  greater_restoration: {
    id: 'greater_restoration', name: 'Greater Restoration', level: 5, classes: ['bard', 'cleric', 'druid'],
    type: 'utility',
    description: 'Imbue a creature with positive energy to undo a debilitating effect. You can reduce exhaustion or end charms, petrification, curses, or ability score reductions.'
  },
  mass_cure_wounds: {
    id: 'mass_cure_wounds', name: 'Mass Cure Wounds', level: 5, classes: ['bard', 'cleric', 'druid'],
    type: 'heal', dmgSides: 8, dmgCount: 3,
    description: 'A wave of healing energy washes out. Up to six creatures of your choice within 60 feet regain 3d8 + spellcasting modifier hit points.'
  },
  raise_dead: {
    id: 'raise_dead', name: 'Raise Dead', level: 5, classes: ['bard', 'cleric', 'paladin'],
    type: 'heal', staticBonus: 1,
    description: 'Return a dead creature you touch to life with 1 hit point, provided it has been dead no longer than 10 days.'
  }
};
