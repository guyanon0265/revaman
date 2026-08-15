/**
 * PTCG Sandbox — Deck Builder Engine
 * State Management & UI Synchronization Layer
 */

// 1. Core State Array - Keeps your structural deck configuration safe
let deckState = {
  name: '',
  cardbackUrl: 'https://images.pokemontcg.io/back.png',
  cards: [
    // Demo seeding structure matching the application schema
    {
      id: '1',
      qty: 2,
      name: 'Pikachu',
      type: 'Pokémon',
      url: 'https://images.pokemontcg.io',
    },
    {
      id: '2',
      qty: 4,
      name: 'Charizard ex',
      type: 'Pokémon',
      url: 'https://images.pokemontcg.io',
    },
  ],
};

// Tracks which card data block is actively being manipulated in the modal view
let activeEditingCardId = null;

// 2. DOM Node Element Caches
const rowsContainer = document.getElementById('rows-container');
const cardCountStat = document.getElementById('card-count-stat');
const deckNameInput = document.getElementById('deck-name-input');
const deckCardbackInput = document.getElementById('deck-cardback-input');
const btnAddRow = document.getElementById('btn-add-row');
const btnSaveDeck = document.getElementById('btn-save-deck-builder');

// Create Popup Component Elements Dynamically to avoid messy global HTML footprints
let popupElement = null;
let backdropElement = null;

/**
 * Renders data memory arrays down into fading layout rows inside container boxes
 */
/**
 * Renders data memory arrays down into fading layout rows inside container boxes
 */
function renderDeckRows() {
  if (!rowsContainer) return;

  // Clear the active DOM block safely
  rowsContainer.innerHTML = '';

  let totalCardsCount = 0;

  if (deckState.cards.length === 0) {
    rowsContainer.innerHTML = `<p class="hint" style="text-align:center; padding: 20px;">No cards added yet. Click "+ Add Card Row" to begin.</p>`;
    cardCountStat.textContent = '0 cards';
    return;
  }

  deckState.cards.forEach((card) => {
    totalCardsCount += parseInt(card.qty) || 0;

    // Construct structural card list rows
    const row = document.createElement('div');
    row.className = 'faded-card-row';
    row.setAttribute('data-card-id', card.id);

    row.innerHTML = `
            <div class="card-meta-left">
                <span class="card-qty-badge">${card.qty}x</span>
                <span class="card-title-text">${card.name || 'Unnamed Card'}</span>
            </div>
            <div class="card-art-right">
                <img src="${card.url || '../assets/logo.png'}" alt="" onerror="this.src='../assets/logo.png'">
            </div>
            <button class="row-delete-btn" aria-label="Delete card">&times;</button>
        `;

    // Click action to trigger the editing drawer
    row.addEventListener('click', (e) => {
      // Do not open the drawer if they tapped the delete button
      if (e.target.classList.contains('row-delete-btn')) return;
      openCardDetailsDrawer(card.id);
    });

    // Click action for the row delete button
    const deleteBtn = row.querySelector('.row-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevents triggering the row's click event

      // Remove the card from the state array
      deckState.cards = deckState.cards.filter((c) => c.id !== card.id);

      // Close drawer if we happened to be editing this exact card
      if (activeEditingCardId === card.id) {
        closeCardDetailsDrawer();
      }

      // Re-render display layout
      renderDeckRows();
    });

    rowsContainer.appendChild(row);
  });

  // Sync running count metrics
  cardCountStat.textContent = `${totalCardsCount} card${totalCardsCount === 1 ? '' : 's'}`;
}

/**
 * Spawns structural Modal and Overlay backdrops safely inside the lower DOM profile
 */
function initializeDetailPopupMarkup() {
  // Prevent double instantiation loops
  if (document.getElementById('js-card-drawer-popup')) return;

  // Build Dimming Backdrop Frame
  backdropElement = document.createElement('div');
  backdropElement.className = 'popup-backdrop';
  document.body.appendChild(backdropElement);

  // Build Info Floating Content Window
  popupElement = document.createElement('div');
  popupElement.id = 'js-card-drawer-popup';
  popupElement.className = 'card-details-popup';
  document.body.appendChild(popupElement);

  // Dismiss layouts if a user taps empty space outside modules
  backdropElement.addEventListener('click', closeCardDetailsDrawer);
}

/**
 * Binds active state details into layout configurations inside drawer nodes
 * @param {string} cardId
 */
function openCardDetailsDrawer(cardId) {
  const card = deckState.cards.find((c) => c.id === cardId);
  if (!card) return;

  activeEditingCardId = cardId;
  initializeDetailPopupMarkup();

  // Map content structures cleanly into active element containers
  popupElement.innerHTML = `
        <div class="popup-grid">
            <button class="popup-close-btn" id="js-close-popup-btn">✕</button>
            
            <div class="popup-image-container">
                <img src="${card.url || '../assets/logo.png'}" alt="Preview" id="popup-preview-img" onerror="this.src='../assets/logo.png'">
            </div>

            <div class="popup-fields-container">
                <div class="popup-row-split">
                    <div>
                        <label for="popup-qty">Quantity</label>
                        <input type="number" id="popup-qty" value="${card.qty}" min="0" max="59">
                    </div>
                    <div>
                        <label for="popup-type">Card Type</label>
                        <select id="popup-type">
                            <option value="Pokémon" ${card.type === 'Pokémon' ? 'selected' : ''}>Pokémon</option>
                            <option value="Trainer" ${card.type === 'Trainer' ? 'selected' : ''}>Trainer</option>
                            <option value="Energy" ${card.type === 'Energy' ? 'selected' : ''}>Energy</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label for="popup-name">Card Name</label>
                    <input type="text" id="popup-name" value="${card.name || ''}" placeholder="e.g. Pikachu">
                </div>

                <div>
                    <label for="popup-url">Artwork Image URL</label>
                    <input type="text" id="popup-url" value="${card.url || ''}" placeholder="https://pokemontcg.io...">
                </div>
            </div>
        </div>
    `;

  // Highlight active list rows visually underneath overlays
  document.querySelectorAll('.faded-card-row').forEach((r) => {
    r.classList.toggle(
      'selected-row-highlight',
      r.getAttribute('data-card-id') === cardId
    );
  });

  // Activate visual slide animations via CSS triggers
  backdropElement.classList.add('active');
  popupElement.classList.add('active');

  // Register active event observation systems within input modifications
  document
    .getElementById('js-close-popup-btn')
    .addEventListener('click', closeCardDetailsDrawer);
  document
    .getElementById('popup-qty')
    .addEventListener('input', syncPopupToState);
  document
    .getElementById('popup-type')
    .addEventListener('change', syncPopupToState);
  document
    .getElementById('popup-name')
    .addEventListener('input', syncPopupToState);
  document
    .getElementById('popup-url')
    .addEventListener('input', syncPopupToState);
}

/**
 * Updates individual card data fields directly inside active layout memories
 */
function syncPopupToState() {
  if (!activeEditingCardId) return;

  const card = deckState.cards.find((c) => c.id === activeEditingCardId);
  if (!card) return;

  // Fetch dynamic string mutations
  const newQty = parseInt(document.getElementById('popup-qty').value);
  const newName = document.getElementById('popup-name').value;
  const newType = document.getElementById('popup-type').value;
  const newUrl = document.getElementById('popup-url').value;

  // Handle rapid row deletion sequences if numbers drop cleanly to zero
  if (newQty === 0) {
    deckState.cards = deckState.cards.filter(
      (c) => c.id !== activeEditingCardId
    );
    closeCardDetailsDrawer();
    renderDeckRows();
    return;
  }

  // Mutate inner state objects safely
  card.qty = isNaN(newQty) ? 1 : newQty;
  card.name = newName;
  card.type = newType;
  card.url = newUrl;

  // Dynamically update image source previews inside open modals
  const previewImg = document.getElementById('popup-preview-img');
  if (previewImg) previewImg.src = newUrl || '../assets/logo.png';

  // Refresh row tracking elements without forcefully resetting form focus rules
  renderDeckRows();
}

/**
 * Slides modal panels away smoothly via transitions
 */
function closeCardDetailsDrawer() {
  if (popupElement) popupElement.classList.remove('active');
  if (backdropElement) backdropElement.classList.remove('active');

  document.querySelectorAll('.faded-card-row').forEach((r) => {
    r.classList.remove('selected-row-highlight');
  });

  activeEditingCardId = null;
}

// 3. Event Initializers
if (btnAddRow) {
  btnAddRow.addEventListener('click', () => {
    const newCardId = String(Date.now());
    const newCard = {
      id: newCardId,
      qty: 1,
      name: 'New Card',
      type: 'Pokémon',
      url: '',
    };

    deckState.cards.push(newCard);
    renderDeckRows();

    // Auto-open modal straight into newly instantiated objects
    openCardDetailsDrawer(newCardId);
  });
}

if (btnSaveDeck) {
  btnSaveDeck.addEventListener('click', () => {
    deckState.name = deckNameInput ? deckNameInput.value : '';
    deckState.cardbackUrl = deckCardbackInput ? deckCardbackInput.value : '';

    console.log('Saving deck layout state:', deckState);
    alert(`Deck "${deckState.name || 'Untitled'}" saved successfully!`);
  });
}

// Global Core Bootstrap Initialization Sequence
document.addEventListener('DOMContentLoaded', () => {
  // Prefill details inputs from foundational state targets
  if (deckNameInput) deckNameInput.value = deckState.name;
  if (deckCardbackInput) deckCardbackInput.value = deckState.cardbackUrl;

  renderDeckRows();
});
