export function initGameActions() {
  const btnSetup = document.getElementById('btn-setup');
  const btnShowHand = document.getElementById('btn-show-hand');

  if(btnSetup) {
    btnSetup.addEventListener('click', () => {
      console.log('Set Up clicked');
    });
  }

  if(btnShowHand) {
    btnShowHand.addEventListener('click', () => {
      if (btnShowHand.textContent === 'Show Hand') {
        btnShowHand.textContent = 'Hide Hand';
      } else {
        btnShowHand.textContent = 'Show Hand';
      }
    });
  }

}