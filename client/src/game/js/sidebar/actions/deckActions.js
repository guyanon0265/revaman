import { runtimeState } from '../../gameboard/logic/state.js';
import { parseDeckCSV } from '../../gameboard/logic/parser.js';
import { renderEntireBoard } from '../../gameboard/ui/render.js';

export function promptForCSVAndParse(slot) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.style.display = 'none';

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      parseDeckCSV(reader.result, slot);
      renderEntireBoard();
    };
    reader.readAsText(file);
  });

  document.body.appendChild(input);
  input.click();
  input.remove();
}

export function initDeckActions() {
  const btnLoadDeck = document.getElementById('btn-load-deck');

  if (btnLoadDeck) {
    btnLoadDeck.addEventListener('click', () => {
      promptForCSVAndParse(runtimeState.mySlot);
    });
  }
}

//-----------------------------
// Missing link to Deck Builder
//-----------------------------

// 1. In browser, I want target="_blank"
// 2. On desktop PWA, mini window
// 3. On mobile PWA, standard redirect
// Possible?

// Yes, this is 100% possible. You can achieve this exact trifecta by writing a smart, unified click handler that explicitly checks the application's environment before deciding how to open the link.
// ## The Logic Breakdown
// Your code needs to check for two distinct criteria:

//    1. Are we inside an installed PWA? We check display-mode: standalone.
//    2. Are we on mobile or desktop? We check navigator.userAgentData.mobile (or use window width as a safe fallback). [1, 2]

// ------------------------------
// ## The Code Solution
// Add this helper function to your app's global JavaScript file:

// function handleSmartLink(url, event) {
//   // Check if the site is running as an installed PWA window
//   const isPWA = window.matchMedia('(display-mode: standalone)').matches;

//   // Check if the current device is a mobile phone/tablet
//   const isMobile = navigator.userAgentData?.mobile ||
//                    window.matchMedia('(max-width: 768px)').matches;

//   if (isPWA) {
//     // We are inside the installed PWA app frame
//     event.preventDefault(); // Stop normal HTML navigation

//     if (isMobile) {
//       // Rule 3: Mobile PWA -> Standard inline redirect
//       window.location.href = url;
//     } else {
//       // Rule 2: Desktop PWA -> Mini utility window
//       window.open(url, '_blank', 'width=800,height=600,noopener,noreferrer');
//     }
//   }

//   // Rule 1: Standard Web Browser -> Do nothing!
//   // The event flows naturally to the HTML link, honoring target="_blank"
// }

// ------------------------------
// ## How to write your HTML
// To keep your code perfectly accessible, searchable by Google, and optimized for standard web users, write a semantic link with target="_blank", and pass the click event directly to your new function:

// <a href="/invoice-details" target="_blank" onclick="handleSmartLink(this.href, event)">
//   View Invoice
// </a>

// ------------------------------
// ## How Each Environment Responds to this Setup

// * In a standard Web Browser (Chrome/Safari/Firefox): isPWA evaluates to false. The JavaScript function exits instantly without touching the event. The browser naturally executes the HTML default: opening a standard new browser tab via target="_blank". [3, 4]
// * In the Desktop PWA App Window: isPWA evaluates to true and isMobile evaluates to false. The JavaScript blocks the default link event and forces a floating, independent mini-window wrapper onto the user's desktop.
// * In the Mobile PWA App Window: isPWA evaluates to true and isMobile evaluates to true. The JavaScript blocks the link event and safely overwrites window.location.href, forcing a clean, seamless in-app page redirect.
