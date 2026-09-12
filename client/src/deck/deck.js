import { initSettingsZone } from '../game/js/ui/sidebar/multiplayer/settingsZone.js';

const DEFAULT_CARDBACK_URL = 'https://images.pokemontcg.io/back.png';
const DRAFT_STORAGE_KEY = 'revaman-deck-builder-draft';

function saveDraft() {
  try {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        deckName: state.deckName,
        cardbackUrl: state.cardbackUrl,
        cards: state.cards,
        selectedId: state.selectedId,
      })
    );
  } catch {
    return null;
  }
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cards)) return null;
    return parsed;
  } catch {
    return null;
  }
}

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
const loadDemoDeckBtn = document.getElementById('btn-load-demo-deck');
const importTextBtn = document.getElementById('btn-import-text');
const importBtn = document.getElementById('btn-import-csv');
const exportBtn = document.getElementById('btn-export-csv');
const fileInput = document.getElementById('csv-file-input');

const demoDeckOverlay = document.getElementById('demo-deck-selector');
const closeDemoDecksBtn = document.getElementById('btn-demo-decks-close');

const textImportOverlay = document.getElementById('text-import-overlay');
const closeTextImportBtn = document.getElementById('btn-text-import-close');
const textImportTextarea = document.getElementById('text-import-textarea');
const textImportConfirmBtn = document.getElementById('btn-text-import-confirm');

const state = {
  deckName: 'New Deck',
  cardbackUrl: '',
  cards: [],
  selectedId: 'cardback',
};

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
  saveDraft();
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

function selectCard(id) {
  state.selectedId = id;
  renderAll();
}

function applyParsedDeck(parsed, fallbackName = 'New Deck') {
  state.deckName = parsed.deckName || fallbackName;
  state.cardbackUrl = parsed.cardbackUrl;
  state.cards = parsed.cards;
  selectCard('cardback');
}

function titleCaseFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

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
  if (state.selectedId === 'cardback') return;
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

addBtn.addEventListener('click', () => {
  const id = uniqueId('card');
  state.cards.push({ id, name: 'New Card', type: 'Pokemon', qty: 1, url: '' });
  selectCard(id);
  nameInput.focus();
  nameInput.select();
});

removeBtn.addEventListener('click', () => {
  if (state.selectedId === 'cardback') return;
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
    applyParsedDeck(parseCSV(String(reader.result)));
  };
  reader.readAsText(file);
  fileInput.value = '';
});

exportBtn.addEventListener('click', exportCSV);

function openDemoDecks() {
  demoDeckOverlay.classList.add('open');
}

function closeDemoDecks() {
  demoDeckOverlay.classList.remove('open');
}

async function loadDemoDeckCsv(deckId) {
  const response = await fetch(`../assets/demo_decks/${deckId}.csv`);
  if (!response.ok) {
    throw new Error(`Failed to load demo deck: ${deckId}`);
  }
  return response.text();
}

async function handleDemoDeckClick(deckId) {
  try {
    const csv = await loadDemoDeckCsv(deckId);
    applyParsedDeck(parseCSV(csv), titleCaseFromSlug(deckId));
    closeDemoDecks();
  } catch (err) {
    console.error('Failed to load demo deck:', err);
  }
}

loadDemoDeckBtn.addEventListener('click', openDemoDecks);
closeDemoDecksBtn.addEventListener('click', closeDemoDecks);

demoDeckOverlay.addEventListener('click', (e) => {
  if (e.target.closest('#btn-demo-decks-close')) return;
  const option = e.target.closest('.demo-card-option');
  if (!option) return;
  handleDemoDeckClick(option.dataset.deckId);
});

function openTextImport() {
  textImportOverlay.classList.add('open');
  textImportTextarea.value = '';
  textImportTextarea.focus();
}

function closeTextImport() {
  textImportOverlay.classList.remove('open');
}

importTextBtn.addEventListener('click', openTextImport);
closeTextImportBtn.addEventListener('click', closeTextImport);

textImportConfirmBtn.addEventListener('click', () => {
  console.log(
    'Import From Text — stubbed, textarea contents:',
    textImportTextarea.value
  );
});

(function init() {
  initSettingsZone();

  const draft = loadDraft();
  if (draft) {
    state.deckName = draft.deckName ?? state.deckName;
    state.cardbackUrl = draft.cardbackUrl ?? state.cardbackUrl;
    state.cards = draft.cards;
    state.selectedId = draft.selectedId ?? state.selectedId;
  }

  renderAll();
})();
