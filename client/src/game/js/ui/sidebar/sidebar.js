import { initSiderbarHud, initSidebarTabs } from './sidebarHud.js';
import { initChatlog } from './chat/chatlog.js';
import { initSidebarMultiplayer } from './multiplayer/multiplayer.js';

export function initSidebar() {
  initSiderbarHud();
  initSidebarTabs();
  initChatlog();
  initSidebarMultiplayer();
}
