import * as lengine from '../../logic/loggingEngine.js';
import {
  clearSelection,
  clientState,
  runtimeState,
} from '../../logic/state.js';
import { requestRedo, requestUndo } from '../../networkSync.js';
import { isPileZone } from '../../utils.js';
import { notifyCardReplaced, openActionMenu } from '../overlays/actionMenu.js';
import { openDemoDecks } from '../overlays/demoSelector.js';
import { closeAllOverlays } from '../overlays/overlays.js';
import {
  openPileBrowser,
  refreshPileBrowser,
} from '../overlays/pileBrowser.js';
import { refreshViewAttached } from '../overlays/viewAttached.js';
import { renderEntireBoard } from '../render.js';

function promptForCSV(slot) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.style.display = 'none';

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      lengine.loadDeck(reader.result, slot);
      renderEntireBoard();
    };
    reader.readAsText(file);
  });

  document.body.appendChild(input);
  input.click();
  input.remove();
}

export function toggleOpponentHand() {
  const btnShowOppHand = document.getElementById('btn-show-opp-hand');
  clientState.showOpponentHand = !clientState.showOpponentHand;

  if (!runtimeState.isSpectator) {
    lengine.logAction(
      `${clientState.showOpponentHand ? 'is' : 'stopped'} viewing Opponent's Hand.`
    );
  }

  btnShowOppHand.textContent = clientState.showOpponentHand
    ? 'Hide Opponent Hand'
    : 'Show Opponent Hand';

  renderEntireBoard();
}

export function switchSeatView() {
  if (runtimeState.mode !== 'solo' && !runtimeState.isSpectator) return;

  const oldMySlot = runtimeState.mySlot;

  runtimeState.mySlot = runtimeState.oppSlot;
  runtimeState.oppSlot = oldMySlot;

  renderEntireBoard();
}

export function flipCoin() {
  lengine.flipCoin();
}

function loadUserDeck(slot, mode) {
  if (mode === 'demo') {
    openDemoDecks(slot);
  } else {
    promptForCSV(slot);
  }
}

export function loadPlayerDeck(mode) {
  loadUserDeck(runtimeState.mySlot, mode);
}

export function loadOpponentDeck(mode) {
  loadUserDeck(runtimeState.oppSlot, mode);
}

export function openDeckBuilder() {
  const url = '../deck/deck.html';

  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

  const isMobile =
    navigator.userAgentData?.mobile === true ||
    window.matchMedia('(max-width: 768px)').matches;

  if (!isPWA) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  if (isMobile) {
    window.location.href = url;
    return;
  }

  window.open(url, '_blank', 'width=800,height=600,noopener,noreferrer');
}

export function selectCard(instanceId, zone) {
  clientState.selectedInstanceId = instanceId;
  clientState.selectedZone = zone;
  clientState.selectedKind = 'card';
  renderEntireBoard();
}

export function deselectCard() {
  clearSelection();
  renderEntireBoard();
}

export function attachCard(instanceId, zone) {
  const occupant = lengine.attachCardToTarget(
    clientState.selectedInstanceId,
    clientState.selectedZone,
    instanceId,
    zone
  );

  deselectCard();

  if (occupant) {
    notifyCardReplaced(instanceId, zone, occupant);
  }

  refreshViewAttached();
  return;
}

export function openPile(zone) {
  if (!isPileZone(zone)) return;
  openPileBrowser(zone);
}

export function openCardActions(instanceId, zone) {
  selectCard(instanceId, zone);
  openActionMenu(instanceId, zone);
}

export function shuffleDeck() {
  lengine.shuffleZone(`${runtimeState.mySlot}-deck`);
}

export function moveSelectedCardToZone(zone) {
  lengine.moveCardToZone(
    clientState.selectedInstanceId,
    clientState.selectedZone,
    zone
  );
  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function drawCardFromZone(zone) {
  const ownerSlot = zone.split('-')[0];

  lengine.moveCards(zone, `${ownerSlot}-hand`, 1);

  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function setupBoard() {
  lengine.setup();
  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function discardHand() {
  lengine.discardHand();
  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function mulligan() {}

export function undoAction() {
  if (runtimeState.mode === 'multiplayer') {
    requestUndo();
    return;
  }
  if (lengine.undo()) {
    closeAllOverlays();
    renderEntireBoard();
  }
}

export function redoAction() {
  if (runtimeState.mode === 'multiplayer') {
    requestRedo();
    return;
  }
  if (lengine.redo()) {
    closeAllOverlays();
    renderEntireBoard();
  }
}
