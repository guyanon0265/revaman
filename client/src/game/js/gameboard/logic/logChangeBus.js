const listeners = [];
export function onLogChanged(callback) {
  listeners.push(callback);
}
export function emitLogChanged(actionText) {
  listeners.forEach((cb) => cb(actionText));
}
