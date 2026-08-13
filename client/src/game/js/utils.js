/*-engine.js-*/
export function classifyType(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('energy')) return 'energy';
    if (t.includes('trainer') || t.includes('item') || t.includes('supporter') || t.includes('stadium') || t.includes('tool')) return 'trainer';
    return 'pokemon';
}

export const ALL_STATUSES = ['BRN', 'PAR', 'PSN', 'FRZ', 'SLP', 'CON'];

export const PILE_ZONES = [
    'p1-deck', 'p1-discard', 'p1-prizes',
    'p2-deck', 'p2-discard', 'p2-prizes',
    'lost-zone'
];

export const ZONE_LABELS = {
    'p1-deck': 'Deck', 'p1-discard': 'Discard', 'p1-prizes': 'Prizes',
    'p2-deck': "Opponent's Deck", 'p2-discard': "Opponent's Discard", 'p2-prizes': "Opponent's Prizes",
    'stadium': 'Stadium', 'lost-zone': 'Lost Zone'
};

/*-ui.js-*/
export const OWNED_SUFFIXES = ['deck', 'hand', 'active', 'bench', 'discard', 'prizes'];
export const SHARED_ZONE_IDS = ['stadium', 'lost-zone', 'table-left', 'table-right'];
export const COUNT_BADGE_SUFFIXES = ['deck', 'hand', 'discard', 'prizes', 'bench'];

/*-ui.js & cardview.js-*/
export function isHidden(card, stateZoneId) {
    if (card.isFaceDown) return true;
    if (stateZoneId.endsWith('-deck') || stateZoneId.endsWith('-prizes')) return true;
    return false;
}

/*-actionmenu.js-*/
export function isPileZone(zone) {
    return PILE_ZONES.includes(zone);
}

const PILE_MENU_PAGES = { deck: 'deck-pile-menu', discard: 'discard-pile-menu', prizes: 'prizes-pile-menu' };

export function pileMenuPageFor(zone) {
    if (zone === 'lost-zone') return 'lost-zone-pile-menu';
    const kind = zone.replace(/^p[12]-/, '');
    return PILE_MENU_PAGES[kind] || null;
}