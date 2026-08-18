import { gameState, clientState, runtimeState } from '../logic/state.js';
import {
  OWNED_ZONE_SUFFIXES,
  SHARED_ZONE_IDS,
  COUNT_BADGE_SUFFIXES,
} from '../../utils.js';

// DOM element id -> actual gameState.zones key it should render/target.
export function domIdToStateZone(domId) {
  if (domId.startsWith('player-')) {
    const suffix = domId.slice('player-'.length);
    return `${runtimeState.mySlot}-${suffix}`;
  }
  if (domId.startsWith('opp-')) {
    const suffix = domId.slice('opp-'.length);
    return `${runtimeState.oppSlot}-${suffix}`;
  }
  return domId; // stadium / lost-zone / etc
}

function isHidden(card, stateZoneId) {
  if (card.isFaceDown) return true;

  if (stateZoneId === `${runtimeState.oppSlot}-hand`) {
    return !clientState.showOpponentHand;
  }

  if (stateZoneId.endsWith('-deck') || stateZoneId.endsWith('-prizes'))
    return true;
  return false;
}

function buildAttachmentImg(attached, parentInstanceId, extraClass) {
  const img = document.createElement('img');
  img.className = extraClass;
  img.dataset.instanceId = attached.instanceId;
  img.dataset.parentId = parentInstanceId;
  img.draggable = false;
  if (attached.isFaceDown) {
    img.src = runtimeState.cardbacks[attached.owner];
  } else {
    img.src = attached.imageUrl;
  }
  if (attached.instanceId === clientState.selectedInstanceId) {
    img.classList.add('selected-attachment');
  }
  return img;
}

function buildCardEl(card, stateZoneId) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.instanceId = card.instanceId;
  el.dataset.zone = stateZoneId;
  el.style.setProperty('--card-rotate', `${card.rotation}deg`);

  const hidden = isHidden(card, stateZoneId);
  const breakDisplay =
    !hidden && card.isBreakActive && card.evolutionStack.length > 0;
  const previousEvolution = breakDisplay
    ? card.evolutionStack[card.evolutionStack.length - 1]
    : null;

  // Buried evolutions — middle column, vertical stack, most-recently
  // evolved-into on top (last array entry = last DOM child = top,
  // via column-reverse below). Nothing renders here while face-down.
  // While BREAK is active, the immediate previous evolution is already
  // shown full-size as the background image, so it's excluded here to
  // avoid showing it twice.
  const evolutionThumbnails = breakDisplay
    ? card.evolutionStack.slice(0, -1)
    : card.evolutionStack;

  if (!hidden && evolutionThumbnails.length > 0) {
    const evoBox = document.createElement('div');
    evoBox.className = 'evolution-stack';
    evolutionThumbnails.forEach((prev) => {
      evoBox.appendChild(
        buildAttachmentImg(prev, card.instanceId, 'evolution-stack-card')
      );
    });
    el.appendChild(evoBox);
  }

  // Trainer attachments — left column. Nothing renders here while face-down.
  if (!hidden && card.trainerAttachments.length > 0) {
    const trainerBox = document.createElement('div');
    trainerBox.className = 'trainer-attachments';
    card.trainerAttachments.forEach((t) => {
      trainerBox.appendChild(
        buildAttachmentImg(t, card.instanceId, 'trainer-attachment-card')
      );
    });
    el.appendChild(trainerBox);
  }

  const img = document.createElement('img');
  img.className = 'card-face';
  img.draggable = false;

  if (hidden) {
    img.src = runtimeState.cardbacks[card.owner];
    img.alt = 'Face-down card';
  } else if (breakDisplay) {
    img.src = previousEvolution.imageUrl;
    img.alt = previousEvolution.name;
  } else {
    img.src = card.imageUrl;
    img.alt = card.name;
  }

  el.appendChild(img);

  if (breakDisplay) {
    const breakImg = document.createElement('img');
    breakImg.className = 'break-overlay';
    breakImg.draggable = false;
    breakImg.src = card.imageUrl;
    breakImg.alt = card.name;
    el.appendChild(breakImg);
  }

  if (
    !hidden &&
    (card.damage > 0 ||
      card.damage < 0 ||
      card.counter > 0 ||
      card.statuses.length > 0 ||
      card.abilityUsed)
  ) {
    const overlay = document.createElement('div');
    overlay.className = 'card-stats-overlay';

    if (card.damage > 0) {
      const dmg = document.createElement('span');
      dmg.className = 'stat-badge badge-dmg';
      dmg.textContent = card.damage;
      overlay.appendChild(dmg);
    }

    if (card.damage < 0) {
      const ohl = document.createElement('span');
      ohl.className = 'stat-badge badge-ohl';
      ohl.textContent = Math.abs(card.damage);
      overlay.appendChild(ohl);
    }

    if (card.counter > 0) {
      const counter = document.createElement('span');
      counter.className = 'stat-badge badge-counter';
      counter.textContent = card.counter;
      overlay.appendChild(counter);
    }

    card.statuses.forEach((status) => {
      const chip = document.createElement('span');
      chip.className = `stat-badge status-${status.toLowerCase()}`;
      chip.textContent = status;
      overlay.appendChild(chip);
    });

    if (card.abilityUsed) {
      const ability = document.createElement('span');
      ability.className = 'stat-badge badge-ability';
      ability.textContent = 'USED';
      overlay.appendChild(ability);
    }

    el.appendChild(overlay);
  }

  // Energy attachments — right column. Nothing renders here while face-down.
  if (!hidden && card.energyAttachments.length > 0) {
    const energyBox = document.createElement('div');
    energyBox.className = 'energy-attachments';
    card.energyAttachments.forEach((en) => {
      energyBox.appendChild(
        buildAttachmentImg(en, card.instanceId, 'energy-attachment-card')
      );
    });
    el.appendChild(energyBox);
  }

  if (card.instanceId === clientState.selectedInstanceId) {
    el.classList.add('selected');
  }

  return el;
}

export function renderEntireBoard() {
  // Owned zones (deck/hand/active/bench/discard/prizes), both sides
  for (const suffix of OWNED_ZONE_SUFFIXES) {
    const playerContainer = document.getElementById(`player-${suffix}`);
    const oppContainer = document.getElementById(`opp-${suffix}`);

    if (playerContainer) {
      const zoneId = domIdToStateZone(`player-${suffix}`);
      const cardHost = playerContainer;
      cardHost.innerHTML = '';
      (gameState.zones[zoneId] || []).forEach((card) => {
        cardHost.appendChild(buildCardEl(card, zoneId));
      });
      if (COUNT_BADGE_SUFFIXES.includes(suffix)) {
        const badge = document.createElement('span');
        badge.className = 'zone-count-badge';
        badge.textContent = (gameState.zones[zoneId] || []).length;
        playerContainer.appendChild(badge);
      }
    }
    if (oppContainer) {
      const zoneId = domIdToStateZone(`opp-${suffix}`);
      const cardHost = oppContainer;
      cardHost.innerHTML = '';
      (gameState.zones[zoneId] || []).forEach((card) => {
        cardHost.appendChild(buildCardEl(card, zoneId));
      });
      if (COUNT_BADGE_SUFFIXES.includes(suffix)) {
        const badge = document.createElement('span');
        badge.className = 'zone-count-badge';
        badge.textContent = (gameState.zones[zoneId] || []).length;
        oppContainer.appendChild(badge);
      }
    }
  }

  // Shared zones — 1:1 with their DOM id, no translation needed.
  // Only lost-zone gets a count badge here — stadium/table-left/
  // table-right stay without one.
  for (const zoneId of SHARED_ZONE_IDS) {
    const container = document.getElementById(zoneId);
    if (!container) continue;
    container.innerHTML = '';
    (gameState.zones[zoneId] || []).forEach((card) => {
      container.appendChild(buildCardEl(card, zoneId));
    });
    if (zoneId === 'lost-zone') {
      const badge = document.createElement('span');
      badge.className = 'zone-count-badge';
      badge.textContent = (gameState.zones[zoneId] || []).length;
      container.appendChild(badge);
    }
  }
}

export function initRender() {
  renderEntireBoard();
}
