export const SUBCLASSES = {
  // --- BARBARIAN PATHS ---
  barbarian_berserker: { id: 'barbarian_berserker', classId: 'barbarian', name: 'Path of the Berserker', features: ['Frenzy', 'Mindless Rage', 'Intimidating Presence'] },
  barbarian_totem: { id: 'barbarian_totem', classId: 'barbarian', name: 'Path of the Totem Warrior', features: ['Spirit Seeker', 'Totem Spirit', 'Aspect of the Beast'] },

  // --- BARD COLLEGES ---
  bard_lore: { id: 'bard_lore', classId: 'bard', name: 'College of Lore', features: ['Bonus Proficiencies', 'Cutting Words', 'Additional Magical Secrets'] },
  bard_valor: { id: 'bard_valor', classId: 'bard', name: 'College of Valor', features: ['Bonus Proficiencies', 'Combat Inspiration', 'Extra Attack'] },

  // --- CLERIC DOMAINS ---
  cleric_life: { id: 'cleric_life', classId: 'cleric', name: 'Life Domain', features: ['Disciple of Life', 'Preserve Life'] },
  cleric_light: { id: 'cleric_light', classId: 'cleric', name: 'Light Domain', features: ['Warding Flare', 'Radiance of the Dawn'] },
  cleric_war: { id: 'cleric_war', classId: 'cleric', name: 'War Domain', features: ['War Priest', 'Guided Strike'] },
  cleric_trickery: { id: 'cleric_trickery', classId: 'cleric', name: 'Trickery Domain', features: ['Blessing of the Trickster', 'Invoke Duplicity'] },

  // --- DRUID CIRCLES ---
  druid_land: { id: 'druid_land', classId: 'druid', name: 'Circle of the Land', features: ['Bonus Cantrip', 'Natural Recovery', 'Circle Spells'] },
  druid_moon: { id: 'druid_moon', classId: 'druid', name: 'Circle of the Moon', features: ['Combat Wild Shape', 'Circle Forms', 'Primal Strike'] },

  // --- FIGHTER ARCHETYPES ---
  fighter_champion: { id: 'fighter_champion', classId: 'fighter', name: 'Champion', features: ['Improved Critical', 'Remarkable Athlete'] },
  fighter_battlemaster: { id: 'fighter_battlemaster', classId: 'fighter', name: 'Battle Master', features: ['Combat Superiority', 'Maneuvers', 'Student of War'] },
  fighter_eldritch: { id: 'fighter_eldritch', classId: 'fighter', name: 'Eldritch Knight', features: ['Spellcasting', 'Weapon Bond', 'War Magic'] },

  // --- MONK TRADITIONS ---
  monk_open_hand: { id: 'monk_open_hand', classId: 'monk', name: 'Way of the Open Hand', features: ['Open Hand Technique', 'Wholeness of Body'] },
  monk_shadow: { id: 'monk_shadow', classId: 'monk', name: 'Way of Shadow', features: ['Shadow Arts', 'Shadow Step', 'Cloak of Shadows'] },
  monk_elements: { id: 'monk_elements', classId: 'monk', name: 'Way of the Four Elements', features: ['Disciple of the Elements', 'Elemental Disciplines'] },

  // --- PALADIN OATHS ---
  paladin_devotion: { id: 'paladin_devotion', classId: 'paladin', name: 'Oath of Devotion', features: ['Sacred Weapon', 'Turn the Unholy', 'Aura of Devotion'] },
  paladin_ancients: { id: 'paladin_ancients', classId: 'paladin', name: 'Oath of the Ancients', features: ['Nature Wrath', 'Turn the Faithless', 'Aura of Warding'] },
  paladin_vengeance: { id: 'paladin_vengeance', classId: 'paladin', name: 'Oath of Vengeance', features: ['Abjure Enemy', 'Vow of Enmity', 'Relentless Avenger'] },

  // --- RANGER ARCHETYPES ---
  ranger_hunter: { id: 'ranger_hunter', classId: 'ranger', name: 'Hunter', features: ['Hunters Prey', 'Defensive Tactics', 'Multiattack'] },
  ranger_beast: { id: 'ranger_beast', classId: 'ranger', name: 'Beast Master', features: ['Rangers Companion', 'Exceptional Training'] },

  // --- ROGUE ARCHETYPES ---
  rogue_thief: { id: 'rogue_thief', classId: 'rogue', name: 'Thief', features: ['Fast Hands', 'Second-Story Work', 'Supreme Sneak'] },
  rogue_assassin: { id: 'rogue_assassin', classId: 'rogue', name: 'Assassin', features: ['Bonus Proficiencies', 'Assassinate', 'Infiltration Expertise'] },
  rogue_arcane: { id: 'rogue_arcane', classId: 'rogue', name: 'Arcane Trickster', features: ['Spellcasting', 'Mage Hand Legerdemain', 'Magical Ambush'] },

  // --- SORCERER ORIGINS ---
  sorcerer_draconic: { id: 'sorcerer_draconic', classId: 'sorcerer', name: 'Draconic Bloodline', features: ['Dragon Ancestor', 'Draconic Resilience', 'Elemental Affinity'] },
  sorcerer_wild: { id: 'sorcerer_wild', classId: 'sorcerer', name: 'Wild Magic', features: ['Wild Magic Surge', 'Tides of Chaos', 'Bend Luck'] },

  // --- WARLOCK PATRONS ---
  warlock_archfey: { id: 'warlock_archfey', classId: 'warlock', name: 'The Archfey', features: ['Fey Presence', 'Misty Escape', 'Beguiling Defenses'] },
  warlock_fiend: { id: 'warlock_fiend', classId: 'warlock', name: 'The Fiend', features: ['Dark Ones Blessing', 'Dark Ones Own Luck', 'Fiendish Resilience'] },
  warlock_great_old: { id: 'warlock_great_old', classId: 'warlock', name: 'The Great Old One', features: ['Awakened Mind', 'Entropic Ward', 'Thought Shield'] },

  // --- WIZARD SCHOOLS ---
  wizard_evocation: { id: 'wizard_evocation', classId: 'wizard', name: 'School of Evocation', features: ['Evocation Savant', 'Sculpt Spells', 'Potent Cantrip'] },
  wizard_abjuration: { id: 'wizard_abjuration', classId: 'wizard', name: 'School of Abjuration', features: ['Abjuration Savant', 'Arcane Ward', 'Projected Ward'] },
  wizard_necromancy: { id: 'wizard_necromancy', classId: 'wizard', name: 'School of Necromancy', features: ['Necromancy Savant', 'Grim Harvest', 'Undead Thralls'] },
  wizard_divination: { id: 'wizard_divination', classId: 'wizard', name: 'School of Divination', features: ['Divination Savant', 'Portent', 'Expert Divination'] }
};
