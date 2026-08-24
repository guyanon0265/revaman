const overlayEl = document.getElementById('information-overlay');

export function openInformation() {
  overlayEl.classList.remove('collapsed');
}

export function closeInformation() {
  overlayEl.classList.add('collapsed');
}

export function toggleInformation() {
  const isOpen = !overlayEl.classList.contains('collapsed');

  if (isOpen) {
    closeInformation();
  } else {
    openInformation();
  }
}

export function handleClick(e) {
  if (e.target.closest('#information-overlay-trigger')) {
    toggleInformation();
    return;
  }

  if (e.target.closest('#btn-information-overlay-close')) {
    closeInformation();
    return;
  }
}

export function initInformationOverlay() {
  document.addEventListener('click', handleClick);
}
