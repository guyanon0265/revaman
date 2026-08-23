const hudBtn = document.getElementById('sidebar-toggle');
const closeBtn = document.getElementById('close-sidebar');

export function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const targetTab = document.querySelector(
    `.tab-btn[data-tab="${hudBtn.dataset.openTab}"]`
  );
  const wasOpenOnThisTab =
    !sidebar.classList.contains('collapsed') &&
    targetTab?.classList.contains('active');
  if (wasOpenOnThisTab) {
    sidebar.classList.add('collapsed');
    return;
  }
  sidebar.classList.remove('collapsed');
  targetTab?.click();
}

export function closeSidebar() {
  document.getElementById('sidebar').classList.add('collapsed');
}

export function toggleSidebarTab() {}

export function initSiderbarHud() {
  hudBtn.addEventListener('click', () => openSidebar());
  closeBtn.addEventListener('click', () => closeSidebar());
}
