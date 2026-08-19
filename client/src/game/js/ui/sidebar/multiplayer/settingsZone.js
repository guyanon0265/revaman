// settingsZone.js — the "Local Settings" / "Multiplayer Settings"
// controls in the sidebar's Online tab.
//
// Exposes `settings`, a plain mutable object other modules import and
// read directly — same pattern as clientState/runtimeState elsewhere.
//
// button-side: applied as an HTML attribute (not a CSS var) directly on
// .hud-dock and #sidebar, matching how sidebar.css's existing
// [button-side='left'] selectors expect to find it. Defaults to 'right'
// per spec, applied on init even if the checkbox element is missing so
// the dock never ends up in an unstyled/ambiguous state.
//
// theme: applied as document.documentElement's data-theme attribute.
// NOTE: this only sets the attribute — actual light-theme CSS variable
// overrides (e.g. [data-theme='light'] { --surface: ...; }) aren't
// defined anywhere in the files I've seen, so selecting "Light" will
// currently be a no-op visually until that CSS is added.

export const settings = {
  allowSpectators: false,
  buttonSide: 'right',
  theme: 'default',
};

const VALID_THEMES = ['default', 'dark', 'light'];

function applyButtonSide(side) {
  document.querySelector('.hud-dock')?.setAttribute('button-side', side);
  document.getElementById('sidebar')?.setAttribute('button-side', side);
  document.getElementById('action-menu')?.setAttribute('button-side', side);
  document.getElementById('pile-browser')?.setAttribute('button-side', side);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('local-theme', theme);
}

export function initSettingsZone() {
  const spectatorsSwitch = document.getElementById('spectators-switch');
  const sidebarSideSwitch = document.getElementById('sidebar-side-switch');
  const themeSelect = document.getElementById('theme-select');

  if (spectatorsSwitch) {
    settings.allowSpectators = spectatorsSwitch.checked;
    spectatorsSwitch.addEventListener('change', () => {
      settings.allowSpectators = spectatorsSwitch.checked;
    });
  }

  // Applied unconditionally (even if the switch is missing) so the
  // 'right' default is always reflected in the DOM attribute, not just
  // in this module's in-memory settings object.
  settings.buttonSide = sidebarSideSwitch?.checked ? 'left' : 'right';
  applyButtonSide(settings.buttonSide);

  if (sidebarSideSwitch) {
    sidebarSideSwitch.addEventListener('change', () => {
      settings.buttonSide = sidebarSideSwitch.checked ? 'left' : 'right';
      applyButtonSide(settings.buttonSide);
    });
  }

  if (themeSelect) {
    settings.theme = VALID_THEMES.includes(themeSelect.value)
      ? themeSelect.value
      : 'dark';
    themeSelect.value = settings.theme;
    applyTheme(settings.theme);

    themeSelect.addEventListener('change', () => {
      settings.theme = themeSelect.value;
      applyTheme(settings.theme);
    });
  }
}
