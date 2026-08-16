import { gameState, DEFAULT_CARDBACK, runtimeState } from './state.js';

let globalIdCounter = 0;

export function parseDeckCSV(csvText, slot) {
  runtimeState.cardbacks[slot] = DEFAULT_CARDBACK; // reset before scanning — avoids stale carryover from a previous deck load
  const deckZone = gameState.zones[`${slot}-deck`];
  const lines = csvText.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.toLowerCase().startsWith('qty,')) continue;

    const columns = line.split(',');
    if (columns.length < 4) continue;

    const qty = parseInt(columns[0].trim());
    const name = columns[1].trim();
    const type = columns[2].trim();
    const url = columns.slice(3).join(',').trim();

    if (type.toLowerCase() === 'cardback') {
      runtimeState.cardbacks[slot] = url; // overrides the default set above
      continue;
    }

    for (let j = 0; j < qty; j++) {
      globalIdCounter++;
      deckZone.push({
        instanceId: `card_${globalIdCounter}`,
        owner: slot,
        name,
        type,
        imageUrl: url,
        damage: 0,
        counter: 0,
        rotation: 0,
        statuses: [],
        abilityUsed: false,
        isFaceDown: false,
        isBreakActive: false,
        energyAttachments: [],
        trainerAttachments: [],
        evolutionStack: [],
      });
    }
  }
}
