// menu/actionmenu.js — wiring for the #action-menu contextual panel.
//
// The Action Menu has two pages: Controls and View Attached.
//
// The root card is captured locally (rootId/rootZone) exactly once, when
// the menu opens via openCardMenu(). Every Controls-tab action reads that
// local capture, never clientState directly — this decouples the menu
// from the board's live selection, so left-clicking a different card
// elsewhere on the board while the menu is open cannot cause a control
// button to silently mutate the wrong card.
//
// Card View is opened alongside the menu and closed alongside it too:
// opening the menu opens Card View on the root card; closing the menu
// (via the X button) closes Card View. Switching to the View Attached
// tab may temporarily swap Card View to an attachment; switching back to
// Controls reverts it to the root card.

import { gameState } from '../../../gameboard/logic/state.js';
import * as engine from '../../../gameboard/logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';
import { openCardView, closeCardView } from './cardView.js';
import {
  openViewAttached,
  revertViewAttachedSelection,
  closeViewAttached,
} from './viewAttached.js';

const menuEl = document.getElementById('action-menu');
const nameEl = document.getElementById('menu-card-name');

let rootId = null;
let rootZone = null;

function getRootCard() {
  if (!rootId || !rootZone) return null;
  return (
    gameState.zones[rootZone]?.find((c) => c.instanceId === rootId) || null
  );
}

// ============================================================================
// Page Navigation
// ============================================================================

function showPage(pageId) {
  document
    .querySelectorAll('#action-menu .menu-page')
    .forEach((page) => page.classList.remove('active'));

  document
    .querySelectorAll('#action-menu .panel-tab-btn')
    .forEach((btn) => btn.classList.remove('active'));

  const page = document.getElementById(pageId);

  if (!page) return;

  page.classList.add('active');

  if (pageId === 'card-controls-tab') {
    document.getElementById('btn-card-controls').classList.add('active');
    revertViewAttachedSelection();
    refreshControls();
  } else if (pageId === 'view-attached-tab') {
    document.getElementById('btn-view-attach').classList.add('active');
    openViewAttached(rootId, rootZone);
  }
}

// ============================================================================
// Menu Open / Close
// ============================================================================

function closeMenu() {
  menuEl.classList.add('collapsed');

  document
    .querySelectorAll('#action-menu .menu-page')
    .forEach((page) => page.classList.remove('active'));

  closeViewAttached();
  closeCardView();

  rootId = null;
  rootZone = null;
}

// ============================================================================
// Controls
// ============================================================================

function refreshControls() {
  const card = getRootCard();

  if (!card) return;

  document.getElementById('txt-menu-dmg').textContent = card.damage;
  document.getElementById('txt-menu-ohl').textContent = card.overheal;
  document.getElementById('txt-menu-counter').textContent = card.counter;

  document.querySelectorAll('#markers-section .status-chip').forEach((chip) => {
    chip.classList.toggle(
      'active',
      card.statuses.includes(chip.dataset.status)
    );
  });

  document.getElementById('btn-ability').textContent = card.abilityUsed
    ? 'Ability: Used'
    : 'Ability: Ready';
}

// ============================================================================
// Menu Click Handling
// ============================================================================

function handleMenuClick(e) {
  const target = e.target;

  // ------------------------------------------------------------------------
  // Tab navigation
  // ------------------------------------------------------------------------

  if (target.id === 'btn-card-controls') {
    showPage('card-controls-tab');
    return;
  }

  if (target.id === 'btn-view-attach') {
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
  // Markers
  // ------------------------------------------------------------------------

  if (target.id === 'btn-dmg-up') {
    engine.applyDamageDelta(rootId, rootZone, 10);
    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-dmg-down') {
    engine.applyDamageDelta(rootId, rootZone, -10);
    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-ohl-up') {
    engine.applyOverhealDelta(rootId, rootZone, 10);
    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-ohl-down') {
    engine.applyOverhealDelta(rootId, rootZone, -10);
    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-counter-up') {
    engine.applyCounterDelta(rootId, rootZone, 1);
    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-counter-down') {
    engine.applyCounterDelta(rootId, rootZone, -1);
    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.classList.contains('status-chip')) {
    engine.toggleStatus(rootId, rootZone, target.dataset.status);
    refreshControls();
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-ability') {
    engine.toggleAbility(rootId, rootZone);
    refreshControls();
    renderEntireBoard();
    return;
  }

  // ------------------------------------------------------------------------
  // Rotation / Flip
  //
  // NOTE: previously these closed the whole menu after a single click.
  // Changed to leave the menu (and Card View) open, since closing on
  // every rotate now also tears down Card View, which seems like an
  // unwanted side effect once the two are coupled. Flagging this as a
  // deliberate deviation — revert if the old close-on-rotate behavior
  // was actually wanted.
  // ------------------------------------------------------------------------

  if (target.id === 'btn-rotate-left') {
    engine.setRotation(rootId, rootZone, -90);
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-right') {
    engine.setRotation(rootId, rootZone, 90);
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-invert') {
    engine.setRotation(rootId, rootZone, 180);
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-upright') {
    engine.setRotation(rootId, rootZone, 0);
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-flip') {
    engine.toggleFlip(rootId, rootZone);
    renderEntireBoard();
    return;
  }
  if (target.id === 'btn-rotate-break') {
    engine.toggleBreak(rootId, rootZone);
    renderEntireBoard();
    return;
  }
}

// ============================================================================
// Public entry point — called by click.js's contextmenu handler
// ============================================================================

export function openActionMenu(cardId, zone) {
  rootId = cardId;
  rootZone = zone;

  const card = getRootCard();

  if (!card) {
    rootId = null;
    rootZone = null;
    return;
  }

  nameEl.textContent = card.name;
  openCardView(card);

  menuEl.classList.remove('collapsed');
  showPage('card-controls-tab');
}

// ============================================================================
// Initialization
// ============================================================================

export function initActionMenu() {
  menuEl.addEventListener('click', handleMenuClick);
}
