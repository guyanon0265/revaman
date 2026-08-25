// ==========================================================================
// deck.js — PTCG Deck Builder
//
// State shape:
//   state.deckName    — string, editable only via the cardback tile
//   state.cardbackUrl — string, the cardback tile's own image URL
//   state.cards       — [{ id, name, type: 'Pokemon'|'Trainer'|'Energy', qty, url }]
//   state.selectedId  — 'cardback' | a card's id
//
// CSV schema (matches uploaded reference decks):
//   QTY,Name,Type,URL
//   A row with Type "Cardback" is special: its Name becomes the deck name
//   and its URL becomes the cardback art. QTY is ignored on that row.
// ==========================================================================

// Shown for the cardback tile/preview whenever state.cardbackUrl is empty.
// Display-only — never written into state.cardbackUrl itself, so it never
// ends up in an exported CSV. Paste whatever image you want as the
// fallback cardback art here.
const DEFAULT_CARDBACK_URL = 'https://images.pokemontcg.io/back.png';

// A real deck (from the uploaded dragapult-deck.csv) used as starting data,
// so the schema below is exercised by real content rather than placeholders.
const DEFAULT_CSV = `QTY,Name,Type,URL
4,Dreepy,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_128_R_EN.png
4,Drakloak,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_129_R_EN.png
2,Dragapult ex,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_130_R_EN.png
2,Duskull,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/PRE/PRE_035_R_EN.png
2,Dusclops,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/PRE/PRE_036_R_EN.png
1,Dusknoir,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/PRE/PRE_037_R_EN.png
1,Budew,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/ASC/ASC_016_R_EN.png
1,Fezandipiti ex,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/ASC/ASC_142_R_EN.png
1,Meowth ex,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/POR/POR_062_R_EN.png
1,Munkidori,Pokémon,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_095_R_EN.png
4,Lillie's Determination,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/MEG/MEG_119_R_EN.png
3,Crispin,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/SCR/SCR_133_R_EN.png
2,Boss's Orders,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/MEG/MEG_114_R_EN.png
1,Dawn,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/PFL/PFL_087_R_EN.png
4,Ultra Ball,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/MEG/MEG_131_R_EN.png
4,Poké Pad,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/POR/POR_081_R_EN.png
4,Buddy-Buddy Poffin,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TEF/TEF_144_R_EN.png
4,Crushing Hammer,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/POR/POR_071_R_EN.png
2,Night Stretcher,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/ASC/ASC_196_R_EN.png
1,Unfair Stamp,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_165_R_EN.png
1,Special Red Card,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/CRI/CRI_082_R_EN.png
1,Handheld Fan,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_150_R_EN.png
1,Team Rocket's Watchtower,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/DRI/DRI_180_R_EN.png
1,Jamming Tower,Trainer,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/TWM/TWM_153_R_EN.png
3,Psychic Energy,Energy,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/MEE/MEE_005_R_EN.png
3,Fire Energy,Energy,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/MEE/MEE_002_R_EN.png
2,Darkness Energy,Energy,https://limitlesstcg.nyc3.digitaloceanspaces.com/tpci/MEE/MEE_007_R_EN.png`;

// --------------------------------------------------------------------------
// Element refs
// --------------------------------------------------------------------------
const grid = document.getElementById('deck-grid');
const nameHeading = document.getElementById('deck-name-heading');
const statsLine = document.getElementById('deck-stats-line');

const previewThumb = document.getElementById('sidebar-preview-thumb');
const previewImg = document.getElementById('sidebar-preview-img');
const previewFallback = document.getElementById('sidebar-preview-fallback');

const nameLabel = document.getElementById('sidebar-name-label');
const nameInput = document.getElementById('sidebar-name-input');
const typeSelect = document.getElementById('sidebar-type-select');
const typeReadonly = document.getElementById('sidebar-type-readonly');
const qtyInput = document.getElementById('sidebar-qty-input');
const urlInput = document.getElementById('sidebar-url-input');

const addBtn = document.getElementById('btn-add-card');
const removeBtn = document.getElementById('btn-remove-card');
const importBtn = document.getElementById('btn-import-csv');
const exportBtn = document.getElementById('btn-export-csv');
const fileInput = document.getElementById('csv-file-input');

// --------------------------------------------------------------------------
// State
// --------------------------------------------------------------------------
const state = {
  deckName: 'New Deck',
  cardbackUrl: '',
  cards: [],
  selectedId: 'cardback',
};

// --------------------------------------------------------------------------
// CSV parsing / export
// --------------------------------------------------------------------------
function splitCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function normalizeType(raw) {
  const t = (raw || '').trim().toLowerCase();
  if (t.startsWith('pok')) return 'Pokemon';
  if (t === 'trainer') return 'Trainer';
  if (t === 'energy') return 'Energy';
  if (t === 'cardback') return 'Cardback';
  return 'Trainer';
}

function typeLetter(type) {
  switch (type) {
    case 'Pokemon':
      return 'P';
    case 'Trainer':
      return 'T';
    case 'Energy':
      return 'E';
    case 'Cardback':
      return 'C';
    default:
      return '?';
  }
}

function slugify(name) {
  return (
    (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'card'
  );
}

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let deckName = '';
  let cardbackUrl = '';
  const cards = [];

  lines.forEach((line, i) => {
    // Skip the header row if present.
    if (
      i === 0 &&
      /^qty,\s*name,\s*type,\s*url$/i.test(line.replace(/\s+/g, ' '))
    )
      return;

    const [qtyStr, name, typeRaw, url] = splitCsvLine(line);
    if (name === undefined) return;
    const type = normalizeType(typeRaw);

    if (type === 'Cardback') {
      deckName = name || deckName;
      cardbackUrl = url || cardbackUrl;
      return;
    }

    cards.push({
      id: uniqueId(slugify(name)),
      name: name || 'New Card',
      type,
      qty: Math.max(0, parseInt(qtyStr, 10) || 0),
      url: url || '',
    });
  });

  return { deckName, cardbackUrl, cards };
}

function escapeCsvField(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCSV() {
  const rows = ['QTY,Name,Type,URL'];
  // Cardback quantity is always exported as 0 — the editor treats it as a
  // non-counted, uneditable field (see requirement in sidebar rendering).
  rows.push(
    [
      0,
      escapeCsvField(state.deckName),
      'Cardback',
      escapeCsvField(state.cardbackUrl),
    ].join(',')
  );
  for (const c of state.cards) {
    rows.push(
      [c.qty, escapeCsvField(c.name), c.type, escapeCsvField(c.url)].join(',')
    );
  }
  const csv = rows.join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(state.deckName) || 'deck'}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --------------------------------------------------------------------------
// Rendering
// --------------------------------------------------------------------------
function sumQty(cards) {
  return cards.reduce((sum, c) => sum + (c.qty || 0), 0);
}

function renderHeader() {
  nameHeading.textContent = state.deckName || 'Untitled Deck';
  const total = sumQty(state.cards);
  const numP = sumQty(state.cards.filter((c) => c.type === 'Pokemon'));
  const numT = sumQty(state.cards.filter((c) => c.type === 'Trainer'));
  const numE = sumQty(state.cards.filter((c) => c.type === 'Energy'));
  statsLine.textContent = `${total} cards \u00B7 ${numP} Pokemon \u00B7 ${numT} Trainers \u00B7 ${numE} Energies`;
}

function findSelectedCard() {
  return state.cards.find((c) => c.id === state.selectedId);
}

// Display-only fallback — state.cardbackUrl itself stays whatever the user
// typed (including empty), so exportCSV() never writes the default in.
function cardbackDisplayUrl() {
  return state.cardbackUrl || DEFAULT_CARDBACK_URL;
}

function makeThumb(url, name, letter) {
  const thumb = document.createElement('div');
  thumb.className = 'deck-card-thumb';

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = name || '';
  if (url) {
    img.src = url;
  } else {
    thumb.classList.add('no-image');
  }
  img.addEventListener('error', () => thumb.classList.add('no-image'));
  img.addEventListener('load', () => {
    if (img.src) thumb.classList.remove('no-image');
  });

  const fallback = document.createElement('span');
  fallback.className = 'thumb-fallback';
  fallback.textContent = letter;

  thumb.append(img, fallback);
  return thumb;
}

function buildCardTile(card) {
  const isSelected = card.id === state.selectedId;
  const letter = typeLetter(card.type);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'deck-card-item' + (isSelected ? ' selected' : '');
  btn.dataset.cardId = card.id;
  btn.setAttribute('aria-pressed', String(isSelected));

  btn.appendChild(makeThumb(card.url, card.name, letter));

  const meta = document.createElement('div');
  meta.className = 'deck-card-meta';

  const nameEl = document.createElement('span');
  nameEl.className = 'deck-card-name';
  nameEl.textContent = card.name || 'Unnamed';

  const row = document.createElement('div');
  row.className = 'qty-type-row';

  const qtyEl = document.createElement('span');
  qtyEl.className = 'deck-card-qty';
  qtyEl.textContent = `${card.qty}\u00D7`;

  const typeEl = document.createElement('span');
  typeEl.className = `deck-card-type type-${letter.toLowerCase()}`;
  typeEl.textContent = letter;

  row.append(qtyEl, typeEl);
  meta.append(nameEl, row);
  btn.appendChild(meta);

  btn.addEventListener('click', () => selectCard(card.id));
  return btn;
}

function buildCardbackTile() {
  const isSelected = state.selectedId === 'cardback';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className =
    'deck-card-item cardback-item' + (isSelected ? ' selected' : '');
  btn.dataset.cardId = 'cardback';
  btn.setAttribute('aria-label', 'Cardback (permanent)');
  btn.setAttribute('aria-pressed', String(isSelected));

  const thumb = makeThumb(cardbackDisplayUrl(), 'Cardback', 'C');
  const pin = document.createElement('span');
  pin.className = 'pin-badge';
  pin.title = 'Permanent \u2014 cannot be removed';
  pin.textContent = '\u{1F4CC}';
  thumb.appendChild(pin);
  btn.appendChild(thumb);

  const meta = document.createElement('div');
  meta.className = 'deck-card-meta';

  const nameEl = document.createElement('span');
  nameEl.className = 'deck-card-name';
  nameEl.textContent = 'Cardback';

  const row = document.createElement('div');
  row.className = 'qty-type-row';
  const typeEl = document.createElement('span');
  typeEl.className = 'deck-card-type type-c';
  typeEl.textContent = 'C';
  row.appendChild(typeEl);

  meta.append(nameEl, row);
  btn.appendChild(meta);

  btn.addEventListener('click', () => selectCard('cardback'));
  return btn;
}

function renderGrid() {
  grid.innerHTML = '';
  grid.appendChild(buildCardbackTile());
  for (const card of state.cards) grid.appendChild(buildCardTile(card));
}

function setPreview(url, name, letter) {
  previewImg.alt = name || '';
  if (url) {
    previewImg.src = url;
    previewThumb.classList.remove('no-image');
  } else {
    previewImg.removeAttribute('src');
    previewThumb.classList.add('no-image');
  }
  previewFallback.textContent = letter;
}

function renderSidebar() {
  if (state.selectedId === 'cardback') {
    nameLabel.textContent = 'Deck Name';
    nameInput.value = state.deckName;

    typeSelect.hidden = true;
    typeReadonly.hidden = false;

    qtyInput.value = 0;
    qtyInput.disabled = true;

    urlInput.value = state.cardbackUrl;
    urlInput.placeholder = 'Leave blank to use the default cardback art';

    setPreview(cardbackDisplayUrl(), 'Cardback', 'C');
    removeBtn.disabled = true;
    return;
  }

  const card = findSelectedCard();
  if (!card) {
    selectCard('cardback');
    return;
  }

  nameLabel.textContent = 'Card Name';
  nameInput.value = card.name;

  typeSelect.hidden = false;
  typeReadonly.hidden = true;
  typeSelect.value = card.type;

  qtyInput.value = card.qty;
  qtyInput.disabled = false;

  urlInput.value = card.url;
  urlInput.placeholder = 'https://images.pokemontcg.io/...';

  setPreview(card.url, card.name, typeLetter(card.type));
  removeBtn.disabled = false;
}

function renderAll() {
  renderHeader();
  renderGrid();
  renderSidebar();
}

// --------------------------------------------------------------------------
// Selection
// --------------------------------------------------------------------------
function selectCard(id) {
  state.selectedId = id;
  renderAll();
}

// --------------------------------------------------------------------------
// Sidebar field edits — mutate state, then refresh the grid/header only.
// Rebuilding the sidebar itself would steal focus from whichever input the
// user is actively typing in.
// --------------------------------------------------------------------------
nameInput.addEventListener('input', () => {
  if (state.selectedId === 'cardback') {
    state.deckName = nameInput.value;
  } else {
    const card = findSelectedCard();
    if (card) card.name = nameInput.value;
  }
  renderHeader();
  renderGrid();
});

typeSelect.addEventListener('change', () => {
  const card = findSelectedCard();
  if (card) card.type = typeSelect.value;
  renderHeader();
  renderGrid();
  setPreview(card?.url, card?.name, typeLetter(card?.type));
});

qtyInput.addEventListener('input', () => {
  if (state.selectedId === 'cardback') return; // disabled, but just in case
  const card = findSelectedCard();
  if (card) card.qty = Math.max(0, parseInt(qtyInput.value, 10) || 0);
  renderHeader();
  renderGrid();
});

urlInput.addEventListener('input', () => {
  if (state.selectedId === 'cardback') {
    state.cardbackUrl = urlInput.value;
    setPreview(cardbackDisplayUrl(), 'Cardback', 'C');
  } else {
    const card = findSelectedCard();
    if (card) card.url = urlInput.value;
    setPreview(urlInput.value, card?.name, typeLetter(card?.type));
  }
  renderGrid();
});

// --------------------------------------------------------------------------
// Actions
// --------------------------------------------------------------------------
addBtn.addEventListener('click', () => {
  const id = uniqueId('card');
  state.cards.push({ id, name: 'New Card', type: 'Pokemon', qty: 1, url: '' });
  selectCard(id);
  nameInput.focus();
  nameInput.select();
});

removeBtn.addEventListener('click', () => {
  if (state.selectedId === 'cardback') return; // guarded (button is also disabled)
  const idx = state.cards.findIndex((c) => c.id === state.selectedId);
  if (idx === -1) return;
  state.cards.splice(idx, 1);
  const next = state.cards[idx] ?? state.cards[idx - 1];
  selectCard(next ? next.id : 'cardback');
});

importBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = parseCSV(String(reader.result));
    state.deckName = parsed.deckName || 'New Deck';
    state.cardbackUrl = parsed.cardbackUrl;
    state.cards = parsed.cards;
    selectCard('cardback');
  };
  reader.readAsText(file);
  fileInput.value = '';
});

exportBtn.addEventListener('click', exportCSV);

// --------------------------------------------------------------------------
// Init
// --------------------------------------------------------------------------
(function init() {
  const parsed = parseCSV(DEFAULT_CSV);
  state.deckName = parsed.deckName || 'Dragapult ex';
  state.cardbackUrl = parsed.cardbackUrl; // intentionally empty -> falls back to DEFAULT_CARDBACK_URL for display
  state.cards = parsed.cards;
  state.selectedId = 'cardback';
  renderAll();
})();
