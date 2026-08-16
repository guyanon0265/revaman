const listeners = [];
export function onChatChanged(callback) {
  listeners.push(callback);
}
export function emitChatChanged(text) {
  listeners.forEach((cb) => cb(text));
}
