// settingsZone.js — the "Local Settings" / "Multiplayer Settings"
// checkboxes in the sidebar's Online tab.
//
// Exposes `settings`, a plain mutable object other modules import and
// read directly — same pattern as clientState/runtimeState elsewhere in
// this codebase — rather than each caller re-querying a checkbox's DOM
// state for itself. initMultiplayer.js reads settings.allowSpectators
// at join time.
//
// NOTE on path: this file's real location is unconfirmed — assumed a
// sibling of initMultiplayer.js (same directory), since both live under
// the same #multiplayer-panel markup. Adjust the import path in
// initMultiplayer.js's snippet below if that's wrong.
//
// Only spectators-switch is wired here for now. light-mode-switch and
// sidebar-side-switch exist in the HTML but aren't implemented — not
// touched, since I don't know their intended behavior and don't want to
// guess at unrelated settings.

export const settings = {
  allowSpectators: false,
};

export function initSettingsZone() {
  const spectatorsSwitch = document.getElementById('spectators-switch');

  if (spectatorsSwitch) {
    // Picks up whatever the checkbox's HTML-authored default actually
    // is, rather than assuming false regardless of the markup.
    settings.allowSpectators = spectatorsSwitch.checked;

    spectatorsSwitch.addEventListener('change', () => {
      settings.allowSpectators = spectatorsSwitch.checked;
    });
  }
}
