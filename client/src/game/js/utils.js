export const ALL_STATUSES = ['BRN', 'PAR', 'PSN', 'FRZ', 'SLP', 'CON'];

export const PILE_ZONE_IDS = [
  'p1-deck',
  'p1-discard',
  'p1-prizes',
  'p2-deck',
  'p2-discard',
  'p2-prizes',
  'lost-zone',
];

export const PILE_ZONE_LABELS = {
  'p1-deck': 'Deck',
  'p1-discard': 'Discard',
  'p1-prizes': 'Prizes',
  'p2-deck': "Opponent's Deck",
  'p2-discard': "Opponent's Discard",
  'p2-prizes': "Opponent's Prizes",
  'lost-zone': 'Lost Zone',
};

export const SHARED_ZONE_IDS = ['stadium', 'lost-zone'];

export const SHARED_ZONE_LABELS = {
  stadium: 'Stadium',
  'lost-zone': 'Lost Zone',
};

export const OWNED_ZONE_SUFFIXES = [
  'deck',
  'hand',
  'active',
  'bench',
  'discard',
  'prizes',
  'table-half',
];

export const OWNED_ZONE_SUFFIX_LABELS = {
  deck: 'Deck',
  hand: 'Hand',
  active: 'Active',
  bench: 'Bench',
  discard: 'Discard',
  prizes: 'Prizes',
};

export const COUNT_BADGE_SUFFIXES = [
  'deck',
  'hand',
  'discard',
  'prizes',
  'bench',
];

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

export function isPileZone(zone) {
  return PILE_ZONE_IDS.includes(zone);
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
  const { onSelect, onDeselect, onContextMenu, onLongPress } = options;

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

      let longPressTimer = null;
      let longPressTriggered = false;

      img.addEventListener('click', () => {
        if (longPressTriggered) {
          longPressTriggered = false;
          return;
        }

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

      img.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length !== 1) return;

          clearTimeout(longPressTimer);
          longPressTriggered = false;

          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            longPressTriggered = true;

            onLongPress?.(card, section);
          }, 500);
        },
        { passive: true }
      );

      img.addEventListener(
        'touchmove',
        () => {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        },
        { passive: true }
      );

      img.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      });

      img.addEventListener('touchcancel', () => {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      });

      grid.appendChild(img);
    });

    wrap.appendChild(grid);
    targetGridEl.appendChild(wrap);
  });
}
