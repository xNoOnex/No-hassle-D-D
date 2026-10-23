import { getApiKey, getSelectedModel } from './aiConfig.js';
import { getMonstersByCR } from '../data/index.js';

export async function generateNarrativeTurn({ gameState, resolvedAction, recentHistory = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key missing. Tap the Gear icon in the top bar to save your key.');
  }

  const avgLevel = gameState.party?.length
    ? Math.max(1, Math.round(gameState.party.reduce((s, p) => s + (p.level || 1), 0) / gameState.party.length))
    : 1;

  // Sample 25 CR-appropriate monsters from the 330+ 5e SRD Bestiary for the AI to pick from
  const crPool = getMonstersByCR(Math.max(1, avgLevel + 1));
  const sampleNames = crPool
    .sort(() => 0.5 - Math.random())
    .slice(0, 25)
    .map(m => `${m.name} (CR ${m.cr})`)
    .join(', ');

  const systemPrompt = `You are the automated Dungeon Master for a D&D 5e campaign.
Rules:
1. Gritty, uncensored, dark fantasy storytelling.
2. NEVER roll dice or invent damage numbers. All player & monster dice rolls, hits, misses, skill checks, and HP updates are pre-calculated by the app engine and handed to you inside [BRACKETS].
3. Narrate the exact mechanical result provided in 2-4 punchy sentences.
4. When a story beat, ambush, or hostile reaction starts a fight (and no monsters are currently active), spawn monsters directly from the 5e SRD Bestiary using: <spawn name="Exact Monster Name" count="1" />
   Available 5e SRD Monsters for Party Level ${avgLevel}: ${sampleNames || 'Goblin, Bandit, Wolf, Skeleton, Zombie, Orc, Cultist'}.
5. To log important quest clues, NPC secrets, or lore in the party journal, include: <journal>Short note here</journal>
6. To grant story rewards or items, include: <loot name="Item Name" qty="1" type="Gear" />`;

  const partyList = (gameState.party || [])
    .map(p => `${p.name} (${p.race} ${p.class}, HP: ${p.hpCurrent}/${p.hpMax}, AC: ${p.ac})`)
    .join(', ') || 'Solo Adventurer';

  const monsterList = (gameState.activeMonsters || [])
    .map(m => `${m.name} (HP: ${m.hpCurrent}/${m.maxHp}, AC: ${m.ac})`)
    .join(', ') || 'None';

  const activeTurnName = gameState.combatActive && gameState.turnQueue?.length
    ? gameState.turnQueue[gameState.currentTurnIndex || 0]?.name || 'Party'
    : 'Exploration (Out of Combat)';

  const contextMessage = `[LOCATION/ACT: ${gameState.currentModule || 'Oakhaven Region'}]
[MODE: ${gameState.combatActive ? `COMBAT ROUND ${gameState.round || 1} (Active Turn: ${activeTurnName})` : 'EXPLORATION'}]
[PARTY: ${partyList}]
[ACTIVE HOSTILES: ${monsterList}]
[RECENT JOURNAL: ${(gameState.journal || []).slice(-3).join(' | ')}]
[ENGINE DICE & ACTION LOG: ${resolvedAction}]

Narrate the outcome vividly:`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.slice(-6),
    { role: 'user', content: contextMessage }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nohasslednd.local',
      'X-Title': 'No-Hassle-DND'
    },
    body: JSON.stringify({
      model: getSelectedModel(),
      messages,
      temperature: 0.8,
      max_tokens: 400
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const rawOutput = payload.choices?.[0]?.message?.content || '';

  const journalEntries = [...rawOutput.matchAll(/<journal>([\s\S]*?)<\/journal>/gi)].map(m => m[1].trim());

  const lootItems = [...rawOutput.matchAll(/<loot\s+([^>]+)\/>/gi)].map(m => {
    const attrs = m[1];
    const nameMatch = attrs.match(/name="([^"]+)"/i);
    const qtyMatch = attrs.match(/qty="([^"]+)"/i);
    const typeMatch = attrs.match(/type="([^"]+)"/i);
    return {
      name: nameMatch ? nameMatch[1] : 'Adventuring Gear',
      qty: qtyMatch ? parseInt(qtyMatch[1], 10) || 1 : 1,
      type: typeMatch ? typeMatch[1] : 'Treasure'
    };
  });

  const spawnedMonsters = [...rawOutput.matchAll(/<spawn\s+([^>]+)\/>/gi)].map(m => {
    const attrs = m[1];
    const nameMatch = attrs.match(/name="([^"]+)"/i) || attrs.match(/monster="([^"]+)"/i);
    const countMatch = attrs.match(/count="([^"]+)"/i);
    return {
      name: nameMatch ? nameMatch[1] : 'Goblin',
      count: countMatch ? Math.min(6, Math.max(1, parseInt(countMatch[1], 10) || 1)) : 1
    };
  });

  const cleanNarration = rawOutput
    .replace(/<journal>[\s\S]*?<\/journal>/gi, '')
    .replace(/<loot\s+[^>]*\/>/gi, '')
    .replace(/<spawn\s+[^>]*\/>/gi, '')
    .trim();

  return {
    narration: cleanNarration || 'The scene unfolds.',
    journalEntries,
    lootItems,
    spawnedMonsters
  };
}
