import * as lengine from '../../logic/loggingEngine.js';
import { clientState, gameState } from '../../logic/state.js';
import { renderEntireBoard } from '../render.js';
import { getActionMenuTarget, refreshControls } from './actionMenu.js';

export function applyDamage(amount, target = null) {
  if (target === 'menu') {
    target = getActionMenuTarget();
  }
  const instanceId = target?.instanceId ?? clientState.selectedInstanceId;
  const zone = target?.zone ?? clientState.selectedZone;
  if (!instanceId || !zone) return;
  lengine.applyDamageDelta(instanceId, zone, amount);
  refreshControls();
  renderEntireBoard();
}

export function applyCounter(amount, target = null) {
  if (target === 'menu') {
    target = getActionMenuTarget();
  }
  const instanceId = target?.instanceId ?? clientState.selectedInstanceId;
  const zone = target?.zone ?? clientState.selectedZone;
  if (!instanceId || !zone) return;
  lengine.applyCounterDelta(instanceId, zone, amount);
  refreshControls();
  renderEntireBoard();
}

export function applyStatus(status, target = null) {
  if (target === 'menu') {
    target = getActionMenuTarget();
  }
  const instanceId = target?.instanceId ?? clientState.selectedInstanceId;
  const zone = target?.zone ?? clientState.selectedZone;
  if (!instanceId || !zone) return;
  lengine.toggleStatus(instanceId, zone, status);
  refreshControls();
  renderEntireBoard();
}

export function applyAbilityUsed(target = null) {
  if (target === 'menu') {
    target = getActionMenuTarget();
  }
  const instanceId = target?.instanceId ?? clientState.selectedInstanceId;
  const zone = target?.zone ?? clientState.selectedZone;
  if (!instanceId || !zone) return;
  lengine.toggleAbility(instanceId, zone);
  refreshControls();
  renderEntireBoard();
}

export function applyRotation(rotation) {
  const target = getActionMenuTarget();
  if (!target) return;
  const instanceId = target.instanceId;
  const zone = target.zone;
  lengine.setRotation(instanceId, zone, rotation);
  renderEntireBoard();
}

export function cycleRotation() {
  const instanceId = clientState.selectedInstanceId;
  const zone = clientState.selectedZone;
  if (!instanceId || !zone) return;
  const card = gameState.zones[zone]?.find(
    (card) => card.instanceId === instanceId
  );
  if (!card) return;
  const nextRotation = {
    0: 90,
    90: 180,
    180: 270,
    270: 0,
  }[card.rotation ?? 0];
  lengine.setRotation(instanceId, zone, nextRotation);
  renderEntireBoard();
}

export function applyFlip(target = null) {
  if (target === 'menu') {
    target = getActionMenuTarget();
  }
  const instanceId = target?.instanceId ?? clientState.selectedInstanceId;
  const zone = target?.zone ?? clientState.selectedZone;
  if (!instanceId || !zone) return;
  lengine.toggleFlip(instanceId, zone);
  renderEntireBoard();
}
