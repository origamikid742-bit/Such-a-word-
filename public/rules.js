'use strict';

// The rules page, opened from the home screen, the lobby and the game. Its
// example boards are written like data-board="C_T" and drawn as small tiles.
// Uses byId from client.js and makeTile from game-screen.js.

for (const example of document.querySelectorAll('#rules-dialog [data-board]')) {
  const symbols = [...example.dataset.board];
  example.classList.add('mini-board');
  example.setAttribute('role', 'img');
  example.setAttribute('aria-label', symbols.map((symbol) => (symbol === '_' ? 'blank' : symbol)).join(' '));
  example.replaceChildren(...symbols.map((symbol) => makeTile({ type: symbol === '_' ? 'blank' : symbol })));
}

for (const button of document.querySelectorAll('.open-rules')) {
  button.addEventListener('click', () => {
    byId('rules-dialog').showModal();
    byId('rules-dialog').scrollTop = 0;
  });
}
