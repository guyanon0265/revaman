import { initSiderbarHud } from './sidebarHud.js';
import { initSidebarTabs } from './sidebarTabs.js';
import { initChatlog } from './chat/chatlog.js';
import { initSidebarMultiplayer } from './multiplayer/multiplayer.js';

export function initSidebar() {
  initSiderbarHud();
  initSidebarTabs();
  initChatlog();
  initSidebarMultiplayer();
}
