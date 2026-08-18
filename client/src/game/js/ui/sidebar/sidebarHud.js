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
  document.querySelectorAll('[data-close-sidebar]').forEach((btn) => {
    btn.addEventListener('click', () =>
      document.getElementById('sidebar').classList.add('collapsed')
    );
  });
}
