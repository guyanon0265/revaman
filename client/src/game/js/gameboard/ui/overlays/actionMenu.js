// menu/actionmenu.js — wiring for the #action-menu contextual panel.
//
// The Action Menu has two pages:
//   - Controls
//   - View Attached
//
// The selected card in clientState is the ROOT card for the menu.
// Opening Card View or View Attached does not replace that selection.
//
// Card View receives its card explicitly.
// View Attached captures the root selection and opens the PBrowser.
//
// The Action Menu itself does not own temporary PBrowser selection and
// does not clear the root selection merely because it closes.

import { clientState, getSelectedCard } from '../../logic/state.js';
import * as engine from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';
import { isPileZone } from '../../../utils.js';
import { openCardView } from './cardView.js';
import { openViewAttached } from './viewAttached.js';

const menuEl = document.getElementById('action-menu');

// ============================================================================
// Page Navigation
// ============================================================================

function showPage(pageId) {
  document.querySelectorAll('#action-menu .menu-page').forEach((page) => page.classList.remove('active'));

  const page = document.getElementById(pageId);

  if (!page) return;

  page.classList.add('active');

  if (pageId === 'card-controls-tab') {
    refreshControls();
  }
}

// ============================================================================
// Menu Open / Close
// ============================================================================

function openMenu() {
  menuEl.style.display = 'flex';
  showPage('card-controls-tab');
  refreshControls();
}

function closeMenu() {
  menuEl.style.display = 'none';

  document.querySelectorAll('#action-menu .menu-page').forEach((page) => page.classList.remove('active'));
}

// ============================================================================
// Controls
// ============================================================================

function refreshControls() {
  const card = getSelectedCard();

  if (!card) return;

  document.getElementById('txt-menu-dmg').textContent = card.damage;
  document.getElementById('txt-menu-ohl').textContent = card.overheal;
  document.getElementById('txt-menu-counter').textContent = card.counter;

  document.querySelectorAll('#markers-section .status-chip').forEach((chip) => {
    chip.classList.toggle('active', card.statuses.includes(chip.dataset.status));
  });

  document.getElementById('btn-ability').textContent = card.abilityUsed ? 'Ability: Used' : 'Ability: Ready';
}

// ============================================================================
// Board Selection
// ============================================================================
//
// ui.js handles the actual selection first.
//
// This listener then observes the resulting clientState and opens the
// Action Menu when the same card is clicked again.
//
// Anything inside .click-handling belongs to its own UI component and
// never reaches this handler.

function handleSelectionClick(e) {
  if (e.target.closest('.click-handling')) return;
  if (clientState.attachmentModeActive) return;

  const cardEl = e.target.closest('.card');

  if (cardEl && clientState.selectedInstanceId === cardEl.dataset.instanceId) {
    if (isPileZone(clientState.selectedZone)) {
      return;
    }

    openMenu();
    return;
  }

  // If the board selection was cleared, close the menu.
  //
  // Do not clear the selection here. ui.js owns selection changes.
  if (!clientState.selectedInstanceId) {
    closeMenu();
  }
}

// ============================================================================
// Menu Click Handling
// ============================================================================

function handleMenuClick(e) {
  const target = e.target;

  // ------------------------------------------------------------------------
  // Page navigation
  // ------------------------------------------------------------------------

  if (target.id === 'btn-section-controls') {
    showPage('card-controls-tab');
    return;
  }

  if (target.id === 'btn-section-attached') {
    showPage('view-attached-tab');
    return;
  }

  // ------------------------------------------------------------------------
  // Close
  // ------------------------------------------------------------------------

  if (target.id === 'btn-action-menu-close') {
    closeMenu();
    return;
  }

  // ------------------------------------------------------------------------
  // View Card
  // ------------------------------------------------------------------------

  if (target.id === 'btn-view-card') {
    const card = getSelectedCard();

    if (!card) return;

    closeMenu();
    openCardView(card);
    return;
  }

  // ------------------------------------------------------------------------
  // View Attached
  // ------------------------------------------------------------------------

  if (target.id === 'btn-view-attach') {
    const card = getSelectedCard();

    if (!card) return;

    openViewAttached();
    return;
  }

  // ------------------------------------------------------------------------
  // Markers
  // ------------------------------------------------------------------------

  if (target.id === 'btn-dmg-up') {
    engine.applyDamageDelta(clientState.selectedInstanceId, clientState.selectedZone, 10);

    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-dmg-down') {
    engine.applyDamageDelta(clientState.selectedInstanceId, clientState.selectedZone, -10);

    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-ohl-up') {
    engine.applyOverhealDelta(clientState.selectedInstanceId, clientState.selectedZone, 10);

    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-ohl-down') {
    engine.applyOverhealDelta(clientState.selectedInstanceId, clientState.selectedZone, -10);

    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-counter-up') {
    engine.applyCounterDelta(clientState.selectedInstanceId, clientState.selectedZone, 1);

    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-counter-down') {
    engine.applyCounterDelta(clientState.selectedInstanceId, clientState.selectedZone, -1);

    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.classList.contains('status-chip')) {
    engine.toggleStatus(clientState.selectedInstanceId, clientState.selectedZone, target.dataset.status);

    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-ability') {
    engine.toggleAbility(clientState.selectedInstanceId, clientState.selectedZone);

    refreshControls();
    renderEntireBoard();
    return;
  }

  // ------------------------------------------------------------------------
  // Rotation / Flip
  // ------------------------------------------------------------------------

  if (target.id === 'btn-rotate-left') {
    engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, -90);

    closeMenu();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-right') {
    engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, 90);

    closeMenu();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-invert') {
    engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, 180);

    closeMenu();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-upright') {
    engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, 0);

    closeMenu();
    renderEntireBoard();
    return;
  }

  if (target.id === 'btn-flip') {
    engine.toggleFlip(clientState.selectedInstanceId, clientState.selectedZone);

    closeMenu();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-break') {
    engine.toggleBreak(clientState.selectedInstanceId, clientState.selectedZone);

    closeMenu();
    renderEntireBoard();
    return;
  }
}

// ============================================================================
// Initialization
// ============================================================================

export function initActionMenu() {
  document.addEventListener('click', handleSelectionClick);
  menuEl.addEventListener('click', handleMenuClick);
}
