export const DEFAULT_CARDBACK = 'https://images.pokemontcg.io/back.png';

export const gameState = {
    zones: {
        'p1-deck': [],
        'p1-hand': [],
        'p1-active': [],
        'p1-bench': [],
        'p1-discard': [],
        'p1-prizes': [],
        'p1-table-half': [],

        'p2-deck': [],
        'p2-hand': [],
        'p2-active': [],
        'p2-bench': [],
        'p2-discard': [],
        'p2-prizes': [],
        'p2-table-half': [],

        'stadium': [],
        'lost-zone': []
    }
};

export function getZone(zoneId) {
    return gameState.zones[zoneId];
}

export const clientState = {
    selectedInstanceId: null,
    selectedZone: null,
    selectedKind: null,
    selectedParentId: null,
    attachmentModeActive: false
}

export function getSelectedCard() {
    if (!clientState.selectedInstanceId || !clientState.selectedZone) return null;
    const zoneArr = gameState.zones[clientState.selectedZone];

    if (clientState.selectedKind === 'card') {
        return zoneArr.find(c => c.instanceId === clientState.selectedInstanceId) || null;
    }

    // Attachment/evolution selection — resolve the parent first, then
    // search its nested arrays.
    const parent = zoneArr.find(c => c.instanceId === clientState.selectedParentId);
    if (!parent) return null;
    return [...parent.energyAttachments, ...parent.trainerAttachments, ...parent.evolutionStack]
        .find(c => c.instanceId === clientState.selectedInstanceId) || null;
}

export function clearSelection() {
    clientState.selectedInstanceId = null;
    clientState.selectedZone = null;
    clientState.selectedKind = null;
    clientState.selectedParentId = null;
    clientState.attachmentModeActive = false;
}

export const runtimeState = {
    mode: 'solo',
    mySlot: 'p1',
    oppSlot: 'p2',
    socket: null,
    usernames: { p1: 'Player 1', p2: 'Player 2' },
    cardbacks: { p1: DEFAULT_CARDBACK, p2: DEFAULT_CARDBACK },
}
