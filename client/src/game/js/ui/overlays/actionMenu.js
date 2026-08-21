// gameboard/ui/overlays/actionMenu.js — wiring for the #action-menu
// contextual panel.
//
// The Action Menu has two pages: Controls and View Attached.
//
// The root card is captured locally (rootId/rootZone) exactly once, when
// the menu opens via openActionMenu(). Every Controls-tab action reads
// that local capture, never clientState directly — this decouples the
// menu from the board's live selection, so left-clicking a different
// card elsewhere on the board while the menu is open cannot cause a
// control button to silently mutate the wrong card.
//
// Card View is opened alongside the menu and closed alongside it too:
// opening the menu opens Card View on the root card; closing the menu
// (via the X button) closes Card View. Switching to the View Attached
// tab may temporarily swap Card View to an attachment; switching back to
// Controls reverts it to the root card.
//
// Two board operations can replace WHICH card occupies rootZone out from
// under this menu: devolving (handled inside viewAttached.js, which
// calls back into handleRootChanged) and evolving via a board attach
// (handled by click.js calling notifyCardReplaced, exported below).
// Both funnel through the same sync logic.

import { gameState, clientState } from '../../logic/state.js';
import * as lengine from '../../logic/loggingEngine.js';
import { renderEntireBoard } from '../render.js';
import { openCardView, closeCardView } from './cardView.js';
import {
  openViewAttached,
  revertViewAttachedSelection,
  closeViewAttached,
  syncRootIdentity,
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

export function getActionMenuTarget() {
  return { instanceId: rootId, zone: rootZone };
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
    openViewAttached(rootId, rootZone, handleRootChanged);
  }
}

// ============================================================================
// Menu Open / Close
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
// Root card identity changes
// ============================================================================
//
// devolveCard() (called from within View Attached) and attachCardToTarget()
// evolution branch (called from click.js on a board attach) can both
// replace which card occupies this menu's rootZone. Whichever caller
// detects that calls this back with the new card so the menu's own
// bookkeeping (rootId, the header title) stays in sync.

function handleRootChanged(newCard) {
  if (!newCard) return;

  rootId = newCard.instanceId;
  // rootZone is unchanged — both devolve and evolve promote into the
  // same board slot, never a different zone.
  nameEl.textContent = newCard.name;

  // clientState.selectedInstanceId was set once by click.js's
  // contextmenu handler and is otherwise never read by this menu (see
  // module header). But the board's own "selected" highlight is keyed
  // off clientState, and this just changed which card lives at that
  // zone slot — without this, the highlight silently sticks to the
  // stale id and ends up outlining whatever now occupies the slot.
  // This only ever fires while the menu is bound to exactly the slot
  // that changed, so the sync is unconditional: a one-way push
  // reflecting a change WE just caused, not a live read of clientState.
  clientState.selectedInstanceId = newCard.instanceId;
  clientState.selectedZone = rootZone;
  clientState.selectedKind = 'card';
  renderEntireBoard();
}

// Called by click.js after a board attach. attachCardToTarget() now
// returns whatever actually occupies targetZone post-mutation: the same
// card for energy/trainer attaches (occupant.instanceId === targetInstanceId,
// a no-op below), or the newly-evolved card for an evolution attach.
// Guarded so this only acts if the menu is currently bound to exactly
// the slot that changed; if the menu is open on a different card, or
// closed, this is a silent no-op.
export function notifyCardReplaced(oldInstanceId, zone, newCard) {
  if (!newCard || newCard.instanceId === oldInstanceId) return;
  if (rootId !== oldInstanceId || rootZone !== zone) return;

  // Sync viewAttached.js's own parentId BEFORE anyone re-renders its
  // grid (e.g. click.js's subsequent refreshViewAttached() call) —
  // otherwise it's still looking up the old, now-nested-away id.
  syncRootIdentity(oldInstanceId, zone, newCard);
  handleRootChanged(newCard);
}

// ============================================================================
// Controls
// ============================================================================

export function refreshControls() {
  const card = getRootCard();

  if (!card) return;

  document.getElementById('txt-menu-dmg').textContent = card.damage;
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
  // Rotation / Flip
  //
  // These leave the menu (and Card View) open — see prior discussion:
  // closing on every rotate would also tear down Card View as an
  // unwanted side effect now that the two are coupled.
  // ------------------------------------------------------------------------

  if (target.id === 'btn-rotate-break') {
    lengine.toggleBreak(rootId, rootZone);
    renderEntireBoard();
    openCardView(getRootCard()); // image/orientation changed — refresh the stale snapshot
    return;
  }
}

// ============================================================================
// Initialization
// ============================================================================

export function initActionMenu() {
  menuEl.addEventListener('click', handleMenuClick);
}

// Exposed for undo/redo (gameboard/ui/gameActions.js): after a restore,
// this menu — if open — may be bound to a card/zone/state that no
// longer makes sense. Undo/redo can jump state around far more
// drastically than devolve/evolve alone, so rather than trying to
// re-sync every open panel against an arbitrary prior state, undo/redo
// just closes everything.
export { closeMenu as closeActionMenu };
