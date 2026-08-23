const hudBtn = document.getElementById('sidebar-toggle');
const closeBtn = document.getElementById('close-sidebar');

function getTabButtons() {
  return Array.from(document.querySelectorAll('.tab-btn'));
}

function activateTab(tabName) {
  document
    .querySelectorAll('.tab-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.tab === tabName));
  document
    .querySelectorAll('.tab-panel')
    .forEach((p) => p.classList.remove('active'));

  document.getElementById(`${tabName}-panel`)?.classList.add('active');
}

function cycleTab() {
  const buttons = getTabButtons();
  if (buttons.length === 0) return;

  const currentIndex = buttons.findIndex((b) => b.classList.contains('active'));
  const nextIndex = (currentIndex + 1) % buttons.length;

  activateTab(buttons[nextIndex].dataset.tab);
}

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

export function toggleSidebarTab() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar.classList.contains('collapsed')) return;

  cycleTab();
}

export const initSidebarTabs = () => {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
};

export function initSiderbarHud() {
  hudBtn.addEventListener('click', () => openSidebar());
  closeBtn.addEventListener('click', () => closeSidebar());
}
