import { getApiKey, getSelectedModel } from './aiConfig.js';
import { getMonstersByCR } from '../data/index.js';

// Strips out training-data leaks, wiki hallucinations, and XML tags
function cleanAiNarration(raw = '') {
  return raw
    .replace(/<journal>[\s\S]*?<\/journal>/gi, '')
    .replace(/<loot\s+[^>]*\/>/gi, '')
    .replace(/<spawn\s+[^>]*\/>/gi, '')
    .replace(/\[End of[\s\S]*$/i, '')
    .replace(/\[\[[\s\S]*$/i, '')
    .replace(/Create a new wiki[\s\S]*$/i, '')
    .replace(/\[Session Ended\.?\]/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export async function generateCampaignIntro({ campaignName, party = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      narration: `Welcome to "${campaignName}". Tap the Gear icon in the top-right corner to save your OpenRouter API key so the AI Director can generate your world.`,
      quest: `Explore ${campaignName} and uncover its central threat.`
    };
  }

  const partyDesc = party
    .map(p => `${p.name} (Lvl ${p.level} ${p.race} ${p.class}, Background: ${p.background || 'Adventurer'})`)
    .join(', ') || 'an adventurer';

  const prompt = `You are a master D&D 5e Dungeon Master. Write the opening scene for a brand-new dark fantasy campaign titled "${campaignName}" starring ${partyDesc}.
Formatting Rules:
- Write 2 vivid, atmospheric paragraphs (4 to 6 sentences total).
- Paragraph 1: Establish the gritty setting, atmosphere, and why ${partyDesc} is here.
- Paragraph 2: Present an immediate, concrete encounter, mystery, or NPC interaction happening right in front of them, and end by asking what they do.
- Include exactly one <journal>Quest: ...</journal> tag at the very end.
- Do NOT write meta-labels, wiki pages, or "[End of scene]" notes.`;

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
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 380,
      stop: ['[End of', '[[', 'Create a new wiki', '<|im_end|>', '<|eot_id|>']
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter (${response.status})`);
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content || '';
  const questMatch = raw.match(/<journal>([\s\S]*?)<\/journal>/i);
  const quest = questMatch ? questMatch[1].trim() : `Quest: Survive and uncover the truth of ${campaignName}.`;
  const narration = cleanAiNarration(raw);

  return { narration: narration || `Your journey in ${campaignName} begins.`, quest };
}

export async function generateNarrativeTurn({ gameState, resolvedAction, rollFailed = false, recentHistory = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key missing. Tap the Gear icon in the top bar to save your key.');
  }

  const avgLevel = gameState.party?.length
    ? Math.max(1, Math.round(gameState.party.reduce((s, p) => s + (p.level || 1), 0) / gameState.party.length))
    : 1;

  const crPool = getMonstersByCR(Math.max(1, avgLevel + 1));
  const sampleNames = crPool
    .sort(() => 0.5 - Math.random())
    .slice(0, 25)
    .map(m => `${m.name} (CR ${m.cr})`)
    .join(', ');

  const failureRule = rollFailed
    ? `CRITICAL ENFORCEMENT: The dice roll FAILED ([FAIL] or [MISS]). You MUST narrate a setback, refusal, or complication! NPCs must reject demands, locks stay shut, stealth alerts guards, and attacks miss. Do NOT output <loot> tags on a failed roll.`
    : `The dice roll SUCCEEDED. Narrate how the character's skill or strike pays off and advances the scene.`;

  const systemPrompt = `You are the automated Dungeon Master for a D&D 5e campaign ("${gameState.campaignName}").
Storytelling & Continuity Rules:
1. Write 2 cohesive, immersive paragraphs (4 to 6 sentences total) that flow directly from the previous scene.
2. Paragraph 1: Describe the immediate physical result of the player's action and dice roll, plus any monster counter-attacks listed in the log.
3. Paragraph 2: Advance the scene forward—show how NPCs, enemies, or the environment react, and set up the immediate situation for the next turn.
4. NEVER write actions or dialogue for the players, NEVER output wiki articles or "[End of...]" tags.
5. ${failureRule}
6. If the story triggers a new fight (and Active Hostiles is "None"), spawn monsters from the 5e SRD Bestiary using: <spawn name="Exact Monster Name" count="1" />
   Valid 5e SRD Monsters for Level ${avgLevel}: ${sampleNames || 'Goblin, Bandit, Wolf, Skeleton, Zombie, Orc, Cultist'}.
7. To record a major plot clue, include: <journal>Short clue here</journal>
8. Only when a player genuinely finds or earns an item on a SUCCESSFUL roll, include: <loot name="Item Name" qty="1" type="Weapon|Armor|Potion|Gear" />`;

  const partyList = (gameState.party || [])
    .map(p => `${p.name} (Lvl ${p.level || 1} ${p.race} ${p.class}, HP: ${p.hpCurrent}/${p.hpMax}, AC: ${p.ac})`)
    .join(', ') || 'Solo Adventurer';

  const monsterList = (gameState.activeMonsters || [])
    .map(m => `${m.name} (HP: ${m.hpCurrent}/${m.maxHp}, AC: ${m.ac})`)
    .join(', ') || 'None';

  const contextMessage = `[CAMPAIGN: ${gameState.campaignName}]
[MODE: ${gameState.combatActive ? `COMBAT ROUND ${gameState.round || 1}` : 'EXPLORATION'}]
[PARTY: ${partyList}]
[ACTIVE HOSTILES: ${monsterList}]
[RECENT JOURNAL: ${(gameState.journal || []).slice(-3).join(' | ')}]
[CURRENT TURN DICE & ACTION LOG: ${resolvedAction}]

Write 2 cohesive paragraphs narrating this turn's outcome and setting up the next turn:`;

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
      temperature: 0.75,
      max_tokens: 420,
      stop: ['[End of', '[[', 'Create a new wiki', '<|im_end|>', '<|eot_id|>', '\n[CAMPAIGN:']
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const rawOutput = payload.choices?.[0]?.message?.content || '';

  const journalEntries = [...rawOutput.matchAll(/<journal>([\s\S]*?)<\/journal>/gi)].map(m => m[1].trim());

  const lootItems = rollFailed
    ? []
    : [...rawOutput.matchAll(/<loot\s+([^>]+)\/>/gi)].map(m => {
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

  const cleanNarration = cleanAiNarration(rawOutput);

  return {
    narration: cleanNarration || 'The shadows shift around the party.',
    journalEntries,
    lootItems,
    spawnedMonsters
  };
}
