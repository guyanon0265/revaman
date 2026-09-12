export function parseDeckCSV(csvText, slot) {
  const cards = [];
  let cardback = null;

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
      cardback = url;
      continue;
    }

    for (let j = 0; j < qty; j++) {
      cards.push({
        instanceId: `card_${crypto.randomUUID()}`,
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

  return { cards, cardback };
}
