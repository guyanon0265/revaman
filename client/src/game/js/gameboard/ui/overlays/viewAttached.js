// gameboard/ui/viewAttached.js
//
// View Attached is a specialized PBrowser view for the attachments of one
// root card.
//
// The root card is captured from clientState exactly once when this view
// opens. Attachment cards are temporary browser selections and do not
// replace the root selection.
//
// The browser itself remains open while Card View is displayed.

import { gameState, clientState } from '../../logic/state.js';
import {
    renderBrowserGrid,
    openPileBrowser,
    closePileBrowser
} from './pileBrowser.js';

let parentId = null;
let parentZone = null;

function getParentCard() {
    if (!parentId || !parentZone) return null;

    return gameState.zones[parentZone]
        ?.find(card => card.instanceId === parentId) || null;
}

function getAttachedCards() {
    const card = getParentCard();

    if (!card) {
        return {
            evolution: [],
            trainers: [],
            energy: []
        };
    }

    return {
        evolution: card.evolutionStack || [],
        trainers: card.trainerAttachments || [],
        energy: card.energyAttachments || []
    };
}

function renderAttachedGrid() {
    const attachments = getAttachedCards();

    const total =
        attachments.evolution.length +
        attachments.trainers.length +
        attachments.energy.length;

    renderBrowserGrid(
        [
            {
                label: 'Evolutions',
                cards: attachments.evolution
            },
            {
                label: 'Trainers',
                cards: attachments.trainers
            },
            {
                label: 'Energy',
                cards: attachments.energy
            }
        ],
        card => {
            // Attachment cards are temporary browser cards.
            //
            // Do NOT replace clientState's root selection with this card.
            // PileBrowser/Card View tracks the temporary viewed card.
        },
        card => {
            // View Attached does not support moving attachments to hand.
            // Its context-menu behavior therefore does nothing.
        }
    );

    return total;
}

export function openViewAttached() {
    parentId = clientState.selectedInstanceId;
    parentZone = clientState.selectedZone;

    if (!parentId || !parentZone) return;

    const card = getParentCard();

    if (!card) {
        parentId = null;
        parentZone = null;
        return;
    }

    renderAttachedGrid();
    openPileBrowser();
}

export function refreshViewAttached() {
    if (!parentId || !parentZone) return;

    const card = getParentCard();

    if (!card) {
        closeViewAttached();
        return;
    }

    renderAttachedGrid();
}

export function closeViewAttached() {
    parentId = null;
    parentZone = null;
    closePileBrowser();
}