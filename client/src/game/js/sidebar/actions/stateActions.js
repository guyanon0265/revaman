export function initStateActions() {
  const btnLoadState = document.getElementById('btn-load-state');

  if (btnLoadState) {
    btnLoadState.addEventListener('click', () => {
      console.log('Load Game State clicked');
    });
  }
}
