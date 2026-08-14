import { initSidebarTabs } from "./sidebarTabs.js";
import { initChatlog } from "./chat/chatlog.js";
import { initActions } from "./actions/initActions.js"
import { initSiderbarHud } from "./sidebar.js";

export function initSidebar() {
    initSiderbarHud();
    initSidebarTabs();
    initChatlog();
    initActions();
}