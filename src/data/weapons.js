export const WEAPONS = {
  // --- SIMPLE MELEE ---
  club: { name: 'Club', dmgSides: 4, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['light'] },
  dagger: { name: 'Dagger', dmgSides: 4, dmgCount: 1, stat: 'dex', type: 'simple_melee', properties: ['finesse', 'light', 'thrown'] },
  greatclub: { name: 'Greatclub', dmgSides: 8, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['two-handed'] },
  handaxe: { name: 'Handaxe', dmgSides: 6, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['light', 'thrown'] },
  javelin: { name: 'Javelin', dmgSides: 6, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['thrown'] },
  light_hammer: { name: 'Light Hammer', dmgSides: 4, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['light', 'thrown'] },
  mace: { name: 'Mace', dmgSides: 6, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: [] },
  quarterstaff: { name: 'Quarterstaff', dmgSides: 6, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['versatile'] },
  sickle: { name: 'Sickle', dmgSides: 4, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['light'] },
  spear: { name: 'Spear', dmgSides: 6, dmgCount: 1, stat: 'str', type: 'simple_melee', properties: ['thrown', 'versatile'] },

  // --- SIMPLE RANGED ---
  crossbow_light: { name: 'Light Crossbow', dmgSides: 8, dmgCount: 1, stat: 'dex', type: 'simple_ranged', properties: ['ammunition', 'loading', 'two-handed'] },
  dart: { name: 'Dart', dmgSides: 4, dmgCount: 1, stat: 'dex', type: 'simple_ranged', properties: ['finesse', 'thrown'] },
  shortbow: { name: 'Shortbow', dmgSides: 6, dmgCount: 1, stat: 'dex', type: 'simple_ranged', properties: ['ammunition', 'two-handed'] },
  sling: { name: 'Sling', dmgSides: 4, dmgCount: 1, stat: 'dex', type: 'simple_ranged', properties: ['ammunition'] },

  // --- MARTIAL MELEE ---
  battleaxe: { name: 'Battleaxe', dmgSides: 8, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['versatile'] },
  flail: { name: 'Flail', dmgSides: 8, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: [] },
  glaive: { name: 'Glaive', dmgSides: 10, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['heavy', 'reach', 'two-handed'] },
  greataxe: { name: 'Greataxe', dmgSides: 12, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['heavy', 'two-handed'] },
  greatsword: { name: 'Greatsword', dmgSides: 6, dmgCount: 2, stat: 'str', type: 'martial_melee', properties: ['heavy', 'two-handed'] },
  halberd: { name: 'Halberd', dmgSides: 10, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['heavy', 'reach', 'two-handed'] },
  lance: { name: 'Lance', dmgSides: 12, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['reach', 'special'] },
  longsword: { name: 'Longsword', dmgSides: 8, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['versatile'] },
  maul: { name: 'Maul', dmgSides: 6, dmgCount: 2, stat: 'str', type: 'martial_melee', properties: ['heavy', 'two-handed'] },
  morningstar: { name: 'Morningstar', dmgSides: 8, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: [] },
  pike: { name: 'Pike', dmgSides: 10, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['heavy', 'reach', 'two-handed'] },
  rapier: { name: 'Rapier', dmgSides: 8, dmgCount: 1, stat: 'dex', type: 'martial_melee', properties: ['finesse'] },
  scimitar: { name: 'Scimitar', dmgSides: 6, dmgCount: 1, stat: 'dex', type: 'martial_melee', properties: ['finesse', 'light'] },
  shortsword: { name: 'Shortsword', dmgSides: 6, dmgCount: 1, stat: 'dex', type: 'martial_melee', properties: ['finesse', 'light'] },
  trident: { name: 'Trident', dmgSides: 6, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['thrown', 'versatile'] },
  war_pick: { name: 'War Pick', dmgSides: 8, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: [] },
  warhammer: { name: 'Warhammer', dmgSides: 8, dmgCount: 1, stat: 'str', type: 'martial_melee', properties: ['versatile'] },
  whip: { name: 'Whip', dmgSides: 4, dmgCount: 1, stat: 'dex', type: 'martial_melee', properties: ['finesse', 'reach'] },

  // --- MARTIAL RANGED ---
  blowgun: { name: 'Blowgun', dmgSides: 1, dmgCount: 1, stat: 'dex', type: 'martial_ranged', properties: ['ammunition', 'loading'] },
  crossbow_hand: { name: 'Hand Crossbow', dmgSides: 6, dmgCount: 1, stat: 'dex', type: 'martial_ranged', properties: ['ammunition', 'light', 'loading'] },
  crossbow_heavy: { name: 'Heavy Crossbow', dmgSides: 10, dmgCount: 1, stat: 'dex', type: 'martial_ranged', properties: ['ammunition', 'heavy', 'loading', 'two-handed'] },
  longbow: { name: 'Longbow', dmgSides: 8, dmgCount: 1, stat: 'dex', type: 'martial_ranged', properties: ['ammunition', 'heavy', 'two-handed'] },
  net: { name: 'Net', dmgSides: 0, dmgCount: 0, stat: 'dex', type: 'martial_ranged', properties: ['special', 'thrown'] }
};
