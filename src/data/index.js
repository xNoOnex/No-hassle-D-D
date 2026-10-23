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
    : (Array.isArray(raw.armor_class) ? raw.armor_class[0]?.value || 12 : (raw.ac || 12));

  const hpVal = raw.hit_points || raw.hp || 15;

  const actions = (raw.actions || []).map(act => ({
    name: act.name || 'Strike',
    desc: act.desc || '',
    attackBonus: act.attack_bonus ?? 4,
    damageDice: act.damage?.[0]?.damage_dice || (raw.dmgSides ? `1d${raw.dmgSides}` : '1d6'),
    damageBonus: act.damage?.[0]?.damage_bonus ?? 2
  })).filter(a => a.name);

  return {
    id: raw.index || raw.id || raw.name.toLowerCase().replace(/\s+/g, '_'),
    name: raw.name,
    type: raw.type || 'beast',
    size: raw.size || 'Medium',
    cr: raw.challenge_rating ?? raw.cr ?? 0.5,
    ac: acVal,
    hp: hpVal,
    maxHp: hpVal,
    stats: {
      str: raw.strength ?? raw.str ?? 12,
      dex: raw.dexterity ?? raw.dex ?? 12,
      con: raw.constitution ?? raw.con ?? 12,
      int: raw.intelligence ?? raw.int ?? 10,
      wis: raw.wisdom ?? raw.wis ?? 10,
      cha: raw.charisma ?? raw.cha ?? 10
    },
    actions: actions.length > 0 ? actions : [{ name: 'Strike', damageDice: '1d6', attackBonus: 4, damageBonus: 2 }]
  };
}

export function normalizeSpell(raw) {
  if (!raw || !raw.name) return null;
  const lvl = raw.level ?? 0;
  const isHeal = /cure wounds|healing word|heal|prayer of healing|mass cure/i.test(raw.name);
  const rawDmg = raw.damage?.damage_at_slot_level?.[String(lvl || 1)]
    || raw.damage?.damage_at_character_level?.['1']
    || (raw.heal_at_slot_level ? raw.heal_at_slot_level[String(lvl || 1)] : null)
    || (isHeal ? '1d8' : null);

  const classList = Array.isArray(raw.classes)
    ? raw.classes.map(c => (typeof c === 'string' ? c : c.name || '').toLowerCase()).filter(Boolean)
    : ['wizard', 'sorcerer', 'warlock', 'cleric', 'druid', 'bard'];

  return {
    id: raw.index || raw.id || raw.name.toLowerCase().replace(/\s+/g, '_'),
    name: raw.name,
    level: lvl,
    school: raw.school?.name || raw.school || 'Evocation',
    castingTime: raw.casting_time || raw.time || '1 action',
    range: raw.range || '60 feet',
    duration: raw.duration || 'Instantaneous',
    desc: Array.isArray(raw.desc) ? raw.desc.join('\n') : (raw.desc || raw.description || ''),
    damageDice: rawDmg,
    isUtility: !rawDmg && !isHeal,
    isHeal,
    classes: classList
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
      if (item?.name) {
        equipmentRegistry.set(item.name.toLowerCase(), {
          name: item.name,
          type: item.equipment_category?.name || item.type || 'Gear',
          desc: Array.isArray(item.desc) ? item.desc.join(' ') : (item.desc || item.description || '')
        });
      }
    }
  });
}

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

export function getAllMonsters() {
  return Array.from(monsterRegistry.values());
}

export function getMonstersByCR(maxCr = 2) {
  return getAllMonsters().filter(m => Number(m.cr) <= maxCr);
}

export function getSpell(name) {
  if (!name) return null;
  return spellRegistry.get(name.trim().toLowerCase()) || null;
}

export function getAllSpells() {
  return Array.from(spellRegistry.values());
}

export function getRandomSrdLoot() {
  const allItems = Array.from(equipmentRegistry.values());
  if (allItems.length === 0) {
    return { name: 'Potion of Healing', qty: 1, type: 'Potion' };
  }
  const picked = allItems[Math.floor(Math.random() * allItems.length)];
  return {
    name: picked.name,
    qty: 1,
    type: picked.type || 'Treasure'
  };
}
