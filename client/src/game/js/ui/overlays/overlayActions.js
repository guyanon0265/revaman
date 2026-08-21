import * as lengine from '../../logic/loggingEngine.js';
import { clientState } from '../../logic/state.js';
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
