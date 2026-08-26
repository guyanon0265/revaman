export const settings = {
  allowSpectators: false,
  buttonSide: 'right',
  theme: 'default',
  defaultTab: 'actions',
};

const STORAGE_KEY = 'revaman-settings';

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    console.log('Failed to save settings.');
  }
}

const VALID_THEMES = ['default', 'dark', 'light'];
const VALID_TABS = ['chat', 'actions', 'multiplayer'];

function applyButtonSide(side) {
  document.querySelector('.hud-dock')?.setAttribute('button-side', side);
  document.getElementById('sidebar')?.setAttribute('button-side', side);
  document.getElementById('action-menu')?.setAttribute('button-side', side);
  document.getElementById('pile-browser')?.setAttribute('button-side', side);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('local-theme', theme);
}

function applyDefaultTab(tabName) {
  document
    .getElementById('sidebar-toggle')
    ?.setAttribute('data-open-tab', tabName);
}

export function initSettingsZone() {
  const stored = loadStoredSettings();

  const spectatorsSwitch = document.getElementById('spectators-switch');
  const sidebarSideSwitch = document.getElementById('sidebar-side-switch');
  const themeSelect = document.getElementById('theme-select');
  const defaultTabSelect = document.getElementById('sidebar-tab-select');

  if (spectatorsSwitch) {
    settings.allowSpectators =
      typeof stored.allowSpectators === 'boolean'
        ? stored.allowSpectators
        : spectatorsSwitch.checked;
    spectatorsSwitch.checked = settings.allowSpectators;

    spectatorsSwitch.addEventListener('change', () => {
      settings.allowSpectators = spectatorsSwitch.checked;
      saveSettings();
    });
  }

  settings.buttonSide =
    stored.buttonSide === 'left' || stored.buttonSide === 'right'
      ? stored.buttonSide
      : sidebarSideSwitch?.checked
        ? 'left'
        : 'right';
  if (sidebarSideSwitch)
    sidebarSideSwitch.checked = settings.buttonSide === 'left';
  applyButtonSide(settings.buttonSide);

  if (sidebarSideSwitch) {
    sidebarSideSwitch.addEventListener('change', () => {
      settings.buttonSide = sidebarSideSwitch.checked ? 'left' : 'right';
      applyButtonSide(settings.buttonSide);
      saveSettings();
    });
  }

  // FIX: theme is now computed + applied unconditionally (same pattern as
  // buttonSide/defaultTab above). Previously this whole block — including
  // applyTheme() — was gated behind `if (themeSelect)`, so any page without
  // the #theme-select dropdown (e.g. deck.html) never got the persisted
  // theme applied to <html>, even though it was sitting in localStorage.
  settings.theme = VALID_THEMES.includes(stored.theme)
    ? stored.theme
    : VALID_THEMES.includes(themeSelect?.value)
      ? themeSelect.value
      : 'dark';
  applyTheme(settings.theme);

  if (themeSelect) {
    themeSelect.value = settings.theme;
    themeSelect.addEventListener('change', () => {
      settings.theme = themeSelect.value;
      applyTheme(settings.theme);
      saveSettings();
    });
  }

  settings.defaultTab = VALID_TABS.includes(stored.defaultTab)
    ? stored.defaultTab
    : VALID_TABS.includes(defaultTabSelect?.value)
      ? defaultTabSelect.value
      : 'actions';
  applyDefaultTab(settings.defaultTab);

  if (defaultTabSelect) {
    defaultTabSelect.value = settings.defaultTab;
    defaultTabSelect.addEventListener('change', () => {
      settings.defaultTab = defaultTabSelect.value;
      applyDefaultTab(settings.defaultTab);
      saveSettings();
    });
  }
}
