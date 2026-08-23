import * as lengine from '../../logic/loggingEngine.js';
import {
  clearSelection,
  clientState,
  gameState,
  runtimeState,
} from '../../logic/state.js';
import { requestRedo, requestUndo } from '../../networkSync.js';
import { notifyCardReplaced, openActionMenu } from '../overlays/actionMenu.js';
import { openDemoDecks } from '../overlays/demoSelector.js';
import { closeAllOverlays } from '../overlays/overlays.js';
import {
  openPileBrowser,
  refreshPileBrowser,
} from '../overlays/pileBrowser.js';
import { refreshViewAttached } from '../overlays/viewAttached.js';
import { renderEntireBoard } from '../render.js';
import { GameLogger } from '../sidebar/chat/chatlog.js';
import { closeSidebar, openSidebar } from '../sidebar/sidebarHud.js';

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

export function hideLostZone() {
  const lostZone = document.getElementById('lost-zone');
  const btnHideLostZone = document.getElementById('btn-hide-lost-zone');

  const isHidden = lostZone.style.display === 'none';

  lostZone.style.display = isHidden ? 'flex' : 'none';
  btnHideLostZone.textContent = isHidden ? 'Hide Lost Zone' : 'Show Lost Zone';
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
  if (runtimeState.mode !== 'solo') return;
  loadUserDeck(runtimeState.oppSlot, mode);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportState() {
  const payload = {
    zones: gameState.zones,
    cardbacks: runtimeState.cardbacks,
  };
  downloadFile(
    `revaman-state-${Date.now()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export function exportLog() {
  const lines = GameLogger.getEntries().map((entry) =>
    entry.username ? `${entry.username} ${entry.text}` : entry.text
  );
  downloadFile(`revaman-log-${Date.now()}.txt`, lines.join('\n'), 'text/plain');
}

export function loadState() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.style.display = 'none';

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        lengine.logSystem('Import failed: not valid JSON.');
        return;
      }

      if (!lengine.importState(parsed)) {
        lengine.logSystem('Import failed: file has no zone data.');
        return;
      }

      clearSelection();
      closeAllOverlays();
      renderEntireBoard();
      refreshPileBrowser();
    };
    reader.readAsText(file);
  });

  document.body.appendChild(input);
  input.click();
  input.remove();
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

export function tokenButton(event) {
  const button = event.currentTarget;

  if (!button.classList.contains('token-btn')) return;

  const name = button.innerHTML;
  const unavailable = button.classList.toggle('token-used');

  lengine.logAction(`${unavailable ? 'used' : 'reset'} their ${name}.`);
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
  openPileBrowser(zone);
}

export function openCardActions(instanceId, zone) {
  selectCard(instanceId, zone);
  openActionMenu(instanceId, zone);
}

export function shuffleDeck() {
  lengine.shuffleZone(`${runtimeState.mySlot}-deck`);
  renderEntireBoard();
  refreshPileBrowser();
}

export function shuffleDiscardIntoDeck() {
  lengine.shuffleDiscardIntoDeck(
    `${runtimeState.mySlot}-discard`,
    `${runtimeState.mySlot}-deck`
  );
  renderEntireBoard();
  refreshPileBrowser();
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

export function moveToDeckBottom() {
  const instanceId = clientState.selectedInstanceId;
  const zone = clientState.selectedZone;

  if (!instanceId || !zone) return;

  lengine.moveToBottomOfDeck(instanceId, zone, `${runtimeState.mySlot}-deck`);

  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function drawCardFromZone(zone) {
  const ownerSlot = zone.split('-')[0];

  lengine.drawCards(zone, `${ownerSlot}-hand`, 1);

  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function drawCardFromPile(pile) {
  drawCardFromZone(`${runtimeState.mySlot}-${pile}`);
}

export function setupBoard() {
  lengine.setup(
    `${runtimeState.mySlot}-deck`,
    `${runtimeState.mySlot}-hand`,
    `${runtimeState.mySlot}-prizes`
  );
  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function mulligan() {
  lengine.mulligan(
    `${runtimeState.mySlot}-deck`,
    `${runtimeState.mySlot}-hand`
  );
  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function discardHand() {
  lengine.discardHand(
    `${runtimeState.mySlot}-hand`,
    `${runtimeState.mySlot}-discard`
  );
  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function endTurn() {
  if (!runtimeState.isSpectator) {
    lengine.logSystem(`Turn - ${runtimeState.usernames[runtimeState.oppSlot]}`);
  }
  clearSelection();
  renderEntireBoard();
  refreshPileBrowser();
}

export function resetBoard() {
  lengine.resetBoard();
  clearSelection();
  closeAllOverlays();
  renderEntireBoard();
}

export function resetGame() {
  lengine.resetGame();
  clearSelection();
  closeAllOverlays();
  renderEntireBoard();
}

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

export function openSidebarPanel() {
  openSidebar();
}

export function closeAllPanels() {
  closeAllOverlays();
  closeSidebar();
}
