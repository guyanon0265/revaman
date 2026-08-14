export function initResetActions() {
    const btnResetBoard = document.getElementById('btn-reset-board');
    const btnResetGame = document.getElementById('btn-reset-game');

    if(btnResetBoard) {
        btnResetBoard.addEventListener('click', () => {
            console.log('Reset Board State clicked');
        });
    }

    if(btnResetGame) {
        btnResetGame.addEventListener('click', () => {
            console.log('Reset Game State clicked');
        });
    }
}