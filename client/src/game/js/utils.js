/*-engine.js-*/
export function classifyType(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('energy')) return 'energy';
  if (
    t.includes('trainer') ||
    t.includes('item') ||
    t.includes('supporter') ||
    t.includes('stadium') ||
    t.includes('tool')
  )
    return 'trainer';
  return 'pokemon';
}

export const ALL_STATUSES = ['BRN', 'PAR', 'PSN', 'FRZ', 'SLP', 'CON'];

export const PILE_ZONES = [
  'p1-deck',
  'p1-discard',
  'p1-prizes',
  'p2-deck',
  'p2-discard',
  'p2-prizes',
  'lost-zone',
];

export const ZONE_LABELS = {
  'p1-deck': 'Deck',
  'p1-discard': 'Discard',
  'p1-prizes': 'Prizes',
  'p2-deck': "Opponent's Deck",
  'p2-discard': "Opponent's Discard",
  'p2-prizes': "Opponent's Prizes",
  stadium: 'Stadium',
  'lost-zone': 'Lost Zone',
};

/*-render.js-*/
export const OWNED_SUFFIXES = [
  'deck',
  'hand',
  'active',
  'bench',
  'discard',
  'prizes',
  'table-half',
];
export const SHARED_ZONE_IDS = ['stadium', 'lost-zone'];
export const COUNT_BADGE_SUFFIXES = [
  'deck',
  'hand',
  'discard',
  'prizes',
  'bench',
];

/*-render.js & cardview.js-*/
export function isHidden(card, stateZoneId) {
  if (card.isFaceDown) return true;
  if (stateZoneId.endsWith('-deck') || stateZoneId.endsWith('-prizes'))
    return true;
  return false;
}

/*-actionmenu.js-*/
export function isPileZone(zone) {
  return PILE_ZONES.includes(zone);
}

// ---------------------------------------------------------------------------
// Shared browser grid
// ---------------------------------------------------------------------------
//
// sections: [{ label: string|null, cards: [], kind?: string }, ...]
// options: { onSelect(card, section), onDeselect(card, section), onContextMenu(card, section) }
//
// `kind` is caller-defined and opaque to this function — it's passed
// straight through to the callbacks so a caller with multiple sections
// (e.g. View Attached's Evolutions/Trainers/Energy) can dispatch
// differently per section without needing separate grids or separate
// renderBrowserGrid() calls (which would break single-selection tracking
// across sections).
//
// Empty sections are skipped entirely. Selecting a thumbnail highlights it
// and deselects any previously-selected thumbnail in this grid; clicking
// the already-selected thumbnail deselects it.
export function renderBrowserGrid(targetGridEl, sections, options = {}) {
  const { onSelect, onDeselect, onContextMenu } = options;

  targetGridEl.innerHTML = '';

  let selectedImg = null;

  sections.forEach((section) => {
    if (section.cards.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'browser-section';

    if (section.label) {
      const heading = document.createElement('div');
      heading.className = 'browser-section-label';
      heading.textContent = section.label;
      wrap.appendChild(heading);
    }

    const grid = document.createElement('div');
    grid.className = 'browser-section-grid';

    section.cards.forEach((card) => {
      const img = document.createElement('img');
      img.className = 'browser-thumbnail';
      img.src = card.imageUrl;
      img.alt = card.name;
      img.draggable = false;

      img.addEventListener('click', () => {
        if (selectedImg === img) {
          img.classList.remove('selected');
          selectedImg = null;
          onDeselect?.(card, section);
          return;
        }

        if (selectedImg) selectedImg.classList.remove('selected');

        img.classList.add('selected');
        selectedImg = img;
        onSelect?.(card, section);
      });

      img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        onContextMenu?.(card, section);
      });

      grid.appendChild(img);
    });

    wrap.appendChild(grid);
    targetGridEl.appendChild(wrap);
  });
}
