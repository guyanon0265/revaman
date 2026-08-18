// parser.js — pure CSV -> card-object parsing. Does not touch gameState
// or runtimeState directly (previously did both) — the caller
// (loggingEngine.js's loadDeck()) is responsible for actually inserting
// cards and setting the cardback, since those are real mutations that
// need to go through the same snapshot/log/broadcast machinery every
// other mutation does. Loading a deck bypassing that entirely was
// exactly why deck loads never broadcast.
//
// instanceId uses crypto.randomUUID() instead of a sequential counter.
// A per-client counter starting at 0 guarantees a collision the moment
// two independently-loaded decks share gameState — both clients would
// produce card_1, card_2, etc. Since instanceId is the only thing
// distinguishing otherwise-identical card objects everywhere in this
// codebase, a collision means two different physical cards become
// indistinguishable the instant both are in gameState. UUIDs need no
// cross-client coordination to stay unique.

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
      cardback = url; // last one wins, matches the original scan-order behavior
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
