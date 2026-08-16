export const initSidebarTabs = () => {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document
        .querySelectorAll('.tab-btn')
        .forEach((b) => b.classList.remove('active'));
      document
        .querySelectorAll('.tab-panel')
        .forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document
        .getElementById(`${btn.dataset.tab}-panel`)
        .classList.add('active');
    });
  });
};
