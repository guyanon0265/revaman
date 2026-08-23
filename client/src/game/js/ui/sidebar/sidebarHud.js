const closeBtn = document.getElementById('close-sidebar');

export function closeSidebar() {
  document.getElementById('sidebar').classList.add('collapsed');
}

export function initSiderbarHud() {
  document.querySelectorAll('[data-open-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const targetTab = document.querySelector(
        `.tab-btn[data-tab="${btn.dataset.openTab}"]`
      );
      const wasOpenOnThisTab =
        !sidebar.classList.contains('collapsed') &&
        targetTab?.classList.contains('active');
      if (btn.id === 'sidebar-toggle' && wasOpenOnThisTab) {
        sidebar.classList.add('collapsed');
        return;
      }
      sidebar.classList.remove('collapsed');
      targetTab?.click();
    });
  });

  closeBtn.addEventListener('click', () => closeSidebar());
}
