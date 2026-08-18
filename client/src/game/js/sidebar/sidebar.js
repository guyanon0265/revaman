import { initSidebarTabs } from './sidebarTabs.js';
import { initChatlog } from './chat/chatlog.js';
import { initActions } from './actions/initActions.js';
import { initSiderbarHud } from './sidebarHud.js';
import { initMultiplayerPanel } from './multiplayer/multiplayerEntry.js';
import { initSettingsZone } from './multiplayer/settingsZone.js';

export function initSidebar() {
  initSiderbarHud();
  initSidebarTabs();
  initChatlog();
  initActions();
  initMultiplayerPanel();
  initSettingsZone();
}
