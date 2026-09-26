export const SPELLS = {
  // --- CANTRIPS (Level 0) ---
  firebolt: { 
    id: 'firebolt', name: 'Fire Bolt', level: 0, classes: ['wizard', 'sorcerer'], 
    type: 'attack', dmgSides: 10, dmgCount: 1, 
    description: 'You hurl a mote of fire at a creature or object within range.' 
  },
  vicious_mockery: { 
    id: 'vicious_mockery', name: 'Vicious Mockery', level: 0, classes: ['bard'], 
    type: 'save', saveStat: 'wis', dmgSides: 4, dmgCount: 1, 
    description: 'Unleash a string of insults. Target must succeed on a Wisdom save or take damage and have disadvantage on its next attack.' 
  },
  sacred_flame: {
    id: 'sacred_flame', name: 'Sacred Flame', level: 0, classes: ['cleric'], 
    type: 'save', saveStat: 'dex', dmgSides: 8, dmgCount: 1, 
    description: 'Flame-like radiance descends on a creature. Target must succeed on a Dexterity save or take radiant damage.'
  },

  // --- 1ST LEVEL SPELLS ---
  cure_wounds: { 
    id: 'cure_wounds', name: 'Cure Wounds', level: 1, classes: ['cleric', 'bard', 'paladin', 'ranger', 'druid'], 
    type: 'heal', dmgSides: 8, dmgCount: 1, 
    description: 'A creature you touch regains hit points equal to 1d8 + your spellcasting ability modifier.' 
  },
  magic_missile: { 
    id: 'magic_missile', name: 'Magic Missile', level: 1, classes: ['wizard', 'sorcerer'], 
    type: 'auto', dmgSides: 4, dmgCount: 3, staticBonus: 3, // 3 darts, 1d4+1 each
    description: 'Create three glowing darts of magical force. Each dart hits a creature of your choice automatically.' 
  },
  guiding_bolt: {
    id: 'guiding_bolt', name: 'Guiding Bolt', level: 1, classes: ['cleric'], 
    type: 'attack', dmgSides: 6, dmgCount: 4, 
    description: 'A flash of light streaks toward a creature. On a hit, the next attack roll made against this target has advantage.'
  },
  inflict_wounds: {
    id: 'inflict_wounds', name: 'Inflict Wounds', level: 1, classes: ['cleric'], 
    type: 'attack', dmgSides: 10, dmgCount: 3, 
    description: 'Make a melee spell attack. On a hit, target takes 3d10 necrotic damage.'
  }
};
