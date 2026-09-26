export const BESTIARY = [
  // --- STORY NPCS & BOSSES ---
  { id: 'm_kargg', name: 'Kargg (Goblin Boss)', ac: 15, hp: 21, str: 14, dex: 14, con: 12, int: 10, wis: 8, cha: 10, actions: [{ name: 'Scimitar', stat: 'str', dmgSides: 6, dmgCount: 1 }] },
  { id: 'm_snarl', name: 'Snarl (Pet Wolf)', ac: 13, hp: 11, str: 12, dex: 15, con: 11, int: 3, wis: 12, cha: 6, actions: [{ name: 'Bite', stat: 'dex', dmgSides: 4, dmgCount: 1 }] },

  // --- STANDARD MOBS (CR 1/8 to CR 1/2) ---
  { id: 'm_bandit', name: 'Bandit', ac: 12, hp: 11, str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10, actions: [{ name: 'Scimitar', stat: 'dex', dmgSides: 6, dmgCount: 1 }] },
  { id: 'm_goblin', name: 'Goblin Scout', ac: 13, hp: 7, str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8, actions: [{ name: 'Shortbow', stat: 'dex', dmgSides: 6, dmgCount: 1 }, { name: 'Scimitar', stat: 'dex', dmgSides: 6, dmgCount: 1 }] },
  { id: 'm_skeleton', name: 'Skeleton', ac: 13, hp: 13, str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5, actions: [{ name: 'Shortsword', stat: 'dex', dmgSides: 6, dmgCount: 1 }, { name: 'Shortbow', stat: 'dex', dmgSides: 6, dmgCount: 1 }] },
  { id: 'm_zombie', name: 'Zombie', ac: 8, hp: 22, str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5, actions: [{ name: 'Slam', stat: 'str', dmgSides: 6, dmgCount: 1 }] },
  { id: 'm_orc', name: 'Orc', ac: 13, hp: 15, str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10, actions: [{ name: 'Greataxe', stat: 'str', dmgSides: 12, dmgCount: 1 }] },

  // --- BRUISERS (CR 1 to CR 3) ---
  { id: 'm_giantspider', name: 'Giant Spider', ac: 14, hp: 26, str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4, actions: [{ name: 'Bite', stat: 'dex', dmgSides: 8, dmgCount: 1 }] },
  { id: 'm_gelatinouscube', name: 'Gelatinous Cube', ac: 6, hp: 84, str: 14, dex: 3, con: 20, int: 1, wis: 6, cha: 1, actions: [{ name: 'Pseudopod', stat: 'str', dmgSides: 6, dmgCount: 3 }] },
  { id: 'm_owlbear', name: 'Owlbear', ac: 13, hp: 59, str: 20, dex: 12, con: 17, int: 3, wis: 12, cha: 7, actions: [{ name: 'Beak', stat: 'str', dmgSides: 10, dmgCount: 1 }, { name: 'Claws', stat: 'str', dmgSides: 8, dmgCount: 2 }] }
];
