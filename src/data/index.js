import srdMonsters from './srd_monsters.json';
import srdSpells from './srd_spells.json';
import srdEquipment from './srd_equipment.json';
import srdMagicItems from './srd_magic_items.json';

import { BESTIARY as FALLBACK_BESTIARY } from './bestiary.js';
import { SPELLS as FALLBACK_SPELLS } from './spells.js';
import { WEAPONS as FALLBACK_WEAPONS } from './weapons.js';
import { LOOT as FALLBACK_LOOT } from './loot.js';

const monsterRegistry = new Map();
const spellRegistry = new Map();
const equipmentRegistry = new Map();

export function normalizeMonster(raw) {
  if (!raw || !raw.name) return null;
  const acVal = typeof raw.armor_class === 'number'
    ? raw.armor_class
    : (Array.isArray(raw.armor_class) ? raw.armor_class[0]?.value || 10 : (raw.ac || 10));

  const hpVal = raw.hit_points || raw.hp || 12;

  const actions = (raw.actions || []).map(act => ({
    name: act.name || 'Strike',
    desc: act.desc || '',
    attackBonus: act.attack_bonus ?? 3,
    damageDice: act.damage?.[0]?.damage_dice || (raw.dmgSides ? `1d${raw.dmgSides}` : '1d6'),
    damageBonus: act.damage?.[0]?.damage_bonus ?? 1
  }));

  return {
    id: raw.index || raw.id || raw.name.toLowerCase().replace(/\s+/g, '_'),
    name: raw.name,
    cr: raw.challenge_rating ?? raw.cr ?? 0.5,
    ac: acVal,
    hp: hpVal,
    maxHp: hpVal,
    stats: {
      str: raw.strength ?? raw.str ?? 10,
      dex: raw.dexterity ?? raw.dex ?? 10,
      con: raw.constitution ?? raw.con ?? 10,
      int: raw.intelligence ?? raw.int ?? 10,
      wis: raw.wisdom ?? raw.wis ?? 10,
      cha: raw.charisma ?? raw.cha ?? 10
    },
    actions: actions.length > 0 ? actions : [{ name: 'Strike', damageDice: '1d6', attackBonus: 3, damageBonus: 1 }]
  };
}

export function normalizeSpell(raw) {
  if (!raw || !raw.name) return null;
  return {
    id: raw.index || raw.id || raw.name.toLowerCase().replace(/\s+/g, '_'),
    name: raw.name,
    level: raw.level ?? 0,
    school: raw.school?.name || raw.school || 'Evocation',
    castingTime: raw.casting_time || raw.time || '1 action',
    range: raw.range || '60 feet',
    duration: raw.duration || 'Instantaneous',
    desc: Array.isArray(raw.desc) ? raw.desc.join('\n') : (raw.desc || raw.description || ''),
    damageDice: raw.damage?.damage_at_slot_level?.[String(raw.level || 1)] || raw.damage?.damage_at_character_level?.['1'] || '1d8'
  };
}

export function registerDataset(category, items = []) {
  if (!Array.isArray(items)) return;
  items.forEach(item => {
    if (category === 'monsters') {
      const norm = normalizeMonster(item);
      if (norm?.name) monsterRegistry.set(norm.name.toLowerCase(), norm);
    } else if (category === 'spells') {
      const norm = normalizeSpell(item);
      if (norm?.name) spellRegistry.set(norm.name.toLowerCase(), norm);
    } else if (category === 'equipment') {
      if (item?.name) equipmentRegistry.set(item.name.toLowerCase(), item);
    }
  });
}

// Load fallback local datasets first, then overwrite/expand with full 5e SRD
registerDataset('monsters', FALLBACK_BESTIARY);
registerDataset('monsters', srdMonsters);

registerDataset('spells', FALLBACK_SPELLS);
registerDataset('spells', srdSpells);

registerDataset('equipment', FALLBACK_WEAPONS);
registerDataset('equipment', FALLBACK_LOOT);
registerDataset('equipment', srdEquipment);
registerDataset('equipment', srdMagicItems);

export function getMonster(name) {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (monsterRegistry.has(key)) return monsterRegistry.get(key);
  for (const [k, val] of monsterRegistry.entries()) {
    if (k.includes(key) || key.includes(k)) return val;
  }
  return null;
}

export function getSpell(name) {
  if (!name) return null;
  return spellRegistry.get(name.trim().toLowerCase()) || null;
}

export function getEquipment(name) {
  if (!name) return null;
  return equipmentRegistry.get(name.trim().toLowerCase()) || null;
}

export function getAllMonsters() {
  return Array.from(monsterRegistry.values());
}

export function getAllSpells() {
  return Array.from(spellRegistry.values());
}
