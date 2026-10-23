import { getApiKey, getSelectedModel } from './aiConfig.js';
import { getMonstersByCR } from '../data/index.js';

// Generates a unique opening campaign story, setting, and quest hook for every new room
export async function generateCampaignIntro({ campaignName, party = [] }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      narration: `Welcome to "${campaignName}". Add your OpenRouter API key in Settings (top-right gear icon) so the AI Director can generate your world.`,
      quest: `Explore ${campaignName} and uncover its central threat.`
    };
  }

  const partyDesc = party
    .map(p => `${p.name} (Lvl ${p.level} ${p.race} ${p.class}, Background: ${p.background || 'Adventurer'})`)
    .join(', ') || 'a lone adventurer';

  const prompt = `Create a brand-new, gritty dark fantasy D&D 5e opening scene for a campaign titled "${campaignName}" featuring ${partyDesc}.
Rules:
- Invent a fresh location, atmosphere, and immediate conflict or hook (do NOT use Madame Elara or Oakhaven).
- Keep the opening narration to 3-4 immersive sentences ending with an immediate situation for the party to react to.
- Include one <journal>Quest: ...</journal> tag defining the main objective.`;

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
      temperature: 0.85,
      max_tokens: 300,
      stop: ['\n[', '[Player', '[Session']
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter (${response.status})`);
  }

  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content || '';
  const questMatch = raw.match(/<journal>([\s\S]*?)<\/journal>/i);
  const quest = questMatch ? questMatch[1].trim() : `Quest: Survive the trials of ${campaignName}.`;
  const narration = raw
    .replace(/<journal>[\s\S]*?<\/journal>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

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
    ? `CRITICAL ENFORCEMENT: The player's dice roll FAILED ([FAIL] or [MISS]). You MUST enforce failure! NPCs MUST refuse demands, requests for free items/bags of holding/weapons MUST be rejected, and stealth/search/attack failures MUST trigger complications or danger. Do NOT output <loot> tags on a failed roll!`
    : `The player's roll succeeded. Reward clever actions appropriately, but keep loot grounded to their level.`;

  const systemPrompt = `You are the automated Dungeon Master for a D&D 5e campaign ("${gameState.campaignName}").
Strict Rules:
1. Gritty, uncensored dark fantasy storytelling. Write ONLY the DM narration for this single turn (2-4 punchy sentences).
2. NEVER write dialogue or actions for the player, NEVER simulate future turns, and NEVER write "[Session Ended]" or "[Player: ...]".
3. ${failureRule}
4. When a story beat, failed stealth roll, or hostile reaction triggers combat, spawn monsters from the 5e SRD Bestiary using: <spawn name="Exact Monster Name" count="1" />
   Available 5e SRD Monsters for Level ${avgLevel}: ${sampleNames || 'Goblin, Bandit, Wolf, Skeleton, Zombie, Orc, Cultist'}.
5. To log important quest clues or world events, include: <journal>Short note here</journal>
6. Only when a player genuinely earns or discovers a physical item on a SUCCESSFUL roll, include: <loot name="Item Name" qty="1" type="Weapon|Armor|Potion|Gear" />`;

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
[ENGINE DICE & ACTION LOG: ${resolvedAction}]

Narrate the immediate outcome (2-4 sentences, no fake player turns):`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.slice(-5),
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
      max_tokens: 320,
      stop: ['\n[', '[Hy:', '[Player', '[Session', 'Narrate the']
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const rawOutput = payload.choices?.[0]?.message?.content || '';

  const journalEntries = [...rawOutput.matchAll(/<journal>([\s\S]*?)<\/journal>/gi)].map(m => m[1].trim());

  // Hard-block loot tags if the player failed their roll
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

  const cleanNarration = rawOutput
    .replace(/<journal>[\s\S]*?<\/journal>/gi, '')
    .replace(/<loot\s+[^>]*\/>/gi, '')
    .replace(/<spawn\s+[^>]*\/>/gi, '')
    .replace(/\[Session Ended\.?\]/gi, '')
    .trim();

  return {
    narration: cleanNarration || 'The tension in the air thickens.',
    journalEntries,
    lootItems,
    spawnedMonsters
  };
}
