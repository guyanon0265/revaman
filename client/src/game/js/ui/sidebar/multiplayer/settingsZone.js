export const settings = {
  allowSpectators: false,
  buttonSide: 'right',
  theme: 'default',
  defaultTab: 'actions',
};

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
  const spectatorsSwitch = document.getElementById('spectators-switch');
  const sidebarSideSwitch = document.getElementById('sidebar-side-switch');
  const themeSelect = document.getElementById('theme-select');
  const defaultTabSelect = document.getElementById('sidebar-tab-select');

  if (spectatorsSwitch) {
    settings.allowSpectators = spectatorsSwitch.checked;
    spectatorsSwitch.addEventListener('change', () => {
      settings.allowSpectators = spectatorsSwitch.checked;
    });
  }

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

  settings.defaultTab = VALID_TABS.includes(defaultTabSelect?.value)
    ? defaultTabSelect.value
    : 'actions';
  applyDefaultTab(settings.defaultTab);

  if (defaultTabSelect) {
    defaultTabSelect.value = settings.defaultTab;
    defaultTabSelect.addEventListener('change', () => {
      settings.defaultTab = defaultTabSelect.value;
      applyDefaultTab(settings.defaultTab);
    });
  }
}
