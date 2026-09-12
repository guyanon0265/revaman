import { gameState, clientState } from '../../logic/state.js';
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
    document.getElementById('btn-view-attached').classList.add('active');
    openViewAttached(rootId, rootZone, handleRootChanged);
  }
}

export function togglePage() {
  const controlsPage = document.getElementById('card-controls-tab');

  if (controlsPage.classList.contains('active')) {
    showPage('view-attached-tab');
  } else {
    showPage('card-controls-tab');
  }
}

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

function handleRootChanged(newCard) {
  if (!newCard) return;

  rootId = newCard.instanceId;
  nameEl.textContent = newCard.name;

  clientState.selectedInstanceId = newCard.instanceId;
  clientState.selectedZone = rootZone;
  clientState.selectedKind = 'card';
  renderEntireBoard();
}

export function notifyCardReplaced(oldInstanceId, zone, newCard) {
  if (!newCard || newCard.instanceId === oldInstanceId) return;
  if (rootId !== oldInstanceId || rootZone !== zone) return;
  syncRootIdentity(oldInstanceId, zone, newCard);
  handleRootChanged(newCard);
}

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

function handleMenuClick(e) {
  const target = e.target;

  if (target.id === 'btn-card-controls') {
    showPage('card-controls-tab');
    return;
  }

  if (target.id === 'btn-view-attached') {
    showPage('view-attached-tab');
    return;
  }

  if (target.id === 'btn-action-menu-close') {
    closeMenu();
    return;
  }
}

export function initActionMenu() {
  menuEl.addEventListener('click', handleMenuClick);
}

export { closeMenu as closeActionMenu };
