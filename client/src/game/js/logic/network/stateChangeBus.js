const listeners = [];

export function onStateChanged(callback) {
  listeners.push(callback);
}

export function emitStateChanged() {
  listeners.forEach((cb) => cb());
}
