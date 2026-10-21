import { getApiKey, getSelectedModel } from './aiConfig.js';

const SYSTEM_PROMPT = `You are the Dungeon Master for a D&D 5e campaign.
Tone & Rules:
- Gritty, uncensored, immersive dark fantasy storytelling.
- Do not roll dice or calculate math. The app calculates all rolls, hits, misses, damage, and HP changes beforehand and provides them in [BRACKETS].
- Narrate the exact mechanical result provided in 2-4 punchy sentences.
- To record an important plot point, clue, or quest update in the party's journal, include: <journal>Entry text here</journal>
- To award items or gold to the party, include: <loot name="Item Name" qty="1" type="Weapon|Armor|Potion|Gear" />
- If the story triggers a new combat ambush or enemy encounter, spawn monsters into the combat tracker using standard 5e monster names: <spawn name="Goblin" count="2" />`;

export async function generateNarrativeTurn({ gameState, resolvedAction, recentHistory = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key missing. Open Settings (gear icon) on the Host device to save your key.');
  }

  const partyList = (gameState.party || [])
    .map(p => `${p.name} (Lvl ${p.level || 1} ${p.class || 'Hero'}, HP: ${p.hpCurrent}/${p.hpMax}, AC: ${p.ac || 12})`)
    .join(', ') || 'No heroes registered';

  const monsterList = (gameState.activeMonsters || [])
    .map(m => `${m.name} (HP: ${m.hpCurrent}/${m.maxHp}, AC: ${m.ac})`)
    .join(', ') || 'None';

  const turnInfo = gameState.combatActive && gameState.turnQueue?.length
    ? `Round ${gameState.round || 1}, Current Turn: ${gameState.turnQueue[gameState.currentTurnIndex || 0]?.name || 'Unknown'}`
    : 'Out of Combat (Exploration)';

  const contextMessage = `[MODULE: ${gameState.currentModule || 'Open World'}]
[COMBAT STATUS: ${turnInfo}]
[PARTY: ${partyList}]
[ACTIVE HOSTILES: ${monsterList}]
[RECENT JOURNAL: ${(gameState.journal || []).slice(-3).join(' | ')}]
[PLAYER/ENGINE ACTION: ${resolvedAction}]

Narrate the outcome:`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
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
    throw new Error(`OpenRouter Error (${response.status}): ${errorText}`);
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
      name: nameMatch ? nameMatch[1] : 'Mystery Item',
      qty: qtyMatch ? parseInt(qtyMatch[1], 10) || 1 : 1,
      type: typeMatch ? typeMatch[1] : 'Gear'
    };
  });

  const spawnedMonsters = [...rawOutput.matchAll(/<spawn\s+([^>]+)\/>/gi)].map(m => {
    const attrs = m[1];
    const nameMatch = attrs.match(/name="([^"]+)"/i) || attrs.match(/monster="([^"]+)"/i);
    const countMatch = attrs.match(/count="([^"]+)"/i);
    return {
      name: nameMatch ? nameMatch[1] : 'Goblin',
      count: countMatch ? Math.min(10, Math.max(1, parseInt(countMatch[1], 10) || 1)) : 1
    };
  });

  const cleanNarration = rawOutput
    .replace(/<journal>[\s\S]*?<\/journal>/gi, '')
    .replace(/<loot\s+[^>]*\/>/gi, '')
    .replace(/<spawn\s+[^>]*\/>/gi, '')
    .trim();

  return {
    narration: cleanNarration || 'The scene shifts.',
    journalEntries,
    lootItems,
    spawnedMonsters
  };
}
