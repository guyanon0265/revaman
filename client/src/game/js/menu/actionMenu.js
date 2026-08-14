// menu/actionmenu.js — wiring for the #action-menu contextual panel.
//
// Page navigation (.menu-page) uses a JS-toggled `.active` class.
// #action-menu itself uses a direct style.display toggle instead — no
// class — matching Reva's original pattern. `.hidden` is reserved for
// conditional visibility of individual elements, e.g. "View Attached"
// only appearing when the selected card has attachments.
//
// NOT WIRED YET, on purpose:
//   - "View Attached" — its section correctly shows/hides via `.hidden`
//     based on whether the selected card has attachments, but clicking
//     it does nothing yet — no attachment browser built.
//   - Cards in pile zones (deck/discard/prizes/lost-zone) never reach
//     this menu at all — see the isPileZone() guard in
//     handleSelectionClick, and menu/pilemenu.js.

import { clientState, clearSelection, getSelectedCard } from '../gameboard/state.js';
import * as engine from '../gameboard/loggingEngine.js';
import { renderEntireBoard, domIdToStateZone } from '../gameboard/ui/ui.js';
import { isPileZone } from '../utils.js';
import { openCardView } from '../gameboard/ui/cardView.js';
import { openViewAttached } from '../gameboard/ui/viewAttached.js';

const menuEl = document.getElementById('action-menu');

// Which page "Back" returns to, keyed by the CURRENT page.
const PARENT_PAGE = {
    'move-zone-menu': 'overview-menu',
    'move-deck-menu': 'move-zone-menu',
    'card-marker-menu': 'overview-menu',
    'card-rotate-menu': 'overview-menu'
};

// Set when a deck zone is picked in move-zone-menu, consumed by whichever
// button (top/shuffle-into/bottom) gets clicked next in move-deck-menu.
let pendingDeckZone = null;

function showPage(pageId) {
    document.querySelectorAll('#action-menu .menu-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (pageId === 'card-marker-menu') refreshMarkerMenu();
}

function openMenu() {
    menuEl.style.display = 'flex';
    showPage('overview-menu');
    refreshOverviewMenu();
}

function closeMenu() {
    menuEl.style.display = 'none';
    document.querySelectorAll('#action-menu .menu-page').forEach(p => p.classList.remove('active'));
    pendingDeckZone = null;
}

function refreshOverviewMenu() {
    const card = getSelectedCard();
    const viewAttachBtn = document.getElementById('btn-view-attach');
    const section = viewAttachBtn && viewAttachBtn.closest('.menu-section');
    if (!section) return;
    const hasAttachments = !!card && ((card.energyAttachments.length + card.trainerAttachments.length + card.evolutionStack.length) > 0);
    section.classList.toggle('hidden', !hasAttachments);
}

function refreshMarkerMenu() {
    const card = getSelectedCard();
    if (!card) return;

    document.getElementById('txt-menu-dmg').textContent = card.damage;
    document.getElementById('txt-menu-ohl').textContent = card.overheal;
    document.getElementById('txt-menu-counter').textContent = card.counter;

    document.querySelectorAll('#card-marker-menu .status-chip').forEach(chip => {
        chip.classList.toggle('active', card.statuses.includes(chip.dataset.status));
    });

    document.getElementById('btn-ability').textContent =
        card.abilityUsed ? 'Ability: Used' : 'Ability: Ready';
}

// ---------------------------------------------------------------------
// Opening the menu on selection. Deliberately a SEPARATE document click
// listener from ui.js's own — not a shared/combined one — so this file
// only ever needs to import FROM ui.js (renderEntireBoard), never the
// other way around. This only works correctly because initUI() is
// called before initActionMenu() in game.js: ui.js's listener (which
// sets clientState.selectedInstanceId) runs first for a given click,
// and this listener reads that already-updated value afterward.
// ---------------------------------------------------------------------
function handleSelectionClick(e) {
    if (e.target.closest('.click-handling')) return;
    if (clientState.attachmentModeActive) return;

    const cardEl = e.target.closest('.card');
    if (cardEl && clientState.selectedInstanceId === cardEl.dataset.instanceId) {
        if (isPileZone(clientState.selectedZone)) return; // pilemenu.js owns this selection instead
        openMenu();
        return;
    }
    if (!clientState.selectedInstanceId) {
        closeMenu();
    }
}

// ---------------------------------------------------------------------
// Everything INSIDE the menu — one delegated listener on #action-menu.
// Routes by id/class and by which .menu-page contains the click, never
// by getElementById on the currently-duplicated ids.
// ---------------------------------------------------------------------
function handleMenuClick(e) {
    const target = e.target;

    if (target.id === 'btn-cancel-menu') {
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }

    if (target.classList.contains('cancel-btn')) {
        const currentPage = target.closest('.menu-page');
        if (currentPage) showPage(PARENT_PAGE[currentPage.id] || 'overview-menu');
        return;
    }

    if (target.id === 'btn-move-options') { showPage('move-zone-menu'); return; }
    if (target.id === 'btn-card-markers') { showPage('card-marker-menu'); return; }
    if (target.id === 'btn-card-rotate') { showPage('card-rotate-menu'); return; }

    if (target.id === 'btn-attach') {
        clientState.attachmentModeActive = true;
        closeMenu(); // selection stays intact — ui.js's next click resolves the attach target
        return;
    }

    if (target.id === 'btn-flip') {
        engine.toggleFlip(clientState.selectedInstanceId, clientState.selectedZone);
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }

    if (target.id === 'btn-view') {
        closeMenu();
        openCardView();
        return;
    }

    if (target.id === 'btn-view-attach') {
        closeMenu();
        openViewAttached();
        return;
    }

    // --- Move to Zone page ---
    if (target.dataset.zone) {
        const zone = domIdToStateZone(target.dataset.zone);
        if (zone.endsWith('-deck')) {
            pendingDeckZone = zone;
            showPage('move-deck-menu');
        } else {
            engine.moveCardToZone(clientState.selectedInstanceId, clientState.selectedZone, zone);
            clearSelection();
            closeMenu();
            renderEntireBoard();
        }
        return;
    }

    // --- Move to Deck sub-page (top / shuffle into / bottom) ---
    if (target.dataset.pos && pendingDeckZone) {
        const { selectedInstanceId, selectedZone } = clientState;
        if (target.dataset.pos === 'top') {
            engine.moveToTopOfDeck(selectedInstanceId, selectedZone, pendingDeckZone);
        } else if (target.dataset.pos === 'bottom') {
            engine.moveToBottomOfDeck(selectedInstanceId, selectedZone, pendingDeckZone);
        } else if (target.dataset.pos === 'into') {
            engine.moveCardToZone(selectedInstanceId, selectedZone, pendingDeckZone, 'bottom');
            engine.shuffleZone(pendingDeckZone);
        }
        pendingDeckZone = null;
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }

    // --- Markers page ---
    if (target.id === 'btn-dmg-up') {
        engine.applyDamageDelta(clientState.selectedInstanceId, clientState.selectedZone, 10);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-dmg-down') {
        engine.applyDamageDelta(clientState.selectedInstanceId, clientState.selectedZone, -10);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-ohl-up') {
        engine.applyOverhealDelta(clientState.selectedInstanceId, clientState.selectedZone, 10);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-ohl-down') {
        engine.applyOverhealDelta(clientState.selectedInstanceId, clientState.selectedZone, -10);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-counter-up') {
        engine.applyCounterDelta(clientState.selectedInstanceId, clientState.selectedZone, 1);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-counter-down') {
        engine.applyCounterDelta(clientState.selectedInstanceId, clientState.selectedZone, -1);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }
    if (target.classList.contains('status-chip')) {
        engine.toggleStatus(clientState.selectedInstanceId, clientState.selectedZone, target.dataset.status);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-ability') {
        engine.toggleAbility(clientState.selectedInstanceId, clientState.selectedZone);
        refreshMarkerMenu();
        renderEntireBoard();
        return;
    }

    // --- Rotate page ---
    if (target.id === 'btn-rotate-left') {
        engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, -90);
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-rotate-right') {
        engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, 90);
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-rotate-invert') {
        engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, 180);
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-rotate-upright') {
        engine.setRotation(clientState.selectedInstanceId, clientState.selectedZone, 0);
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }
    if (target.id === 'btn-rotate-break') {
        engine.toggleBreak(clientState.selectedInstanceId, clientState.selectedZone);
        clearSelection();
        closeMenu();
        renderEntireBoard();
        return;
    }
}

export function initActionMenu() {
    document.addEventListener('click', handleSelectionClick);
    menuEl.addEventListener('click', handleMenuClick);
}