'use strict';

// A short, hands-on tutorial that runs entirely in this browser: no server and
// no match. Each step explains one idea, and most let the player try it on a
// small practice board, tapping or dragging tiles just like in a real game.
// Uses makeTile, tileSizeFor, moveWithHandTile and moveFromDrop from
// game-screen.js, and the helpers in motion.js and drag.js.

// Words from the ENABLE list that fit the boards the practice moves can make.
const PRACTICE_WORDS = {
  PAT: 'PAT', BAT: 'BAT', HAT: 'HAT', MAT: 'MAT', CAB: 'CAB', CAM: 'CAM', CAT: 'CAT', COT: 'COT',
  _CAT: 'SCAT', C_AT: 'CHAT', CA_T: 'CANT', CAT_: 'CATS', SAT: 'SAT',
};

const TUTORIAL = [
  {
    title: 'Welcome to Such A Word',
    text: [
      'A bluffing word game for 2 to 6 players. Everyone shares one row of tiles, called the board.',
      'On your turn you change the board with one move. The first player to play every tile in their hand wins.',
      'This takes about 2 minutes. Tap Next to start.',
    ],
    board: 'PLAN_T',
    hand: 'AER_!ST',
  },
  {
    title: 'Blanks are wild cards',
    text: [
      'A tile with a line on it is a blank. It can stand for any letter.',
      'A board is valid when at least one real word fits it: one letter per tile, left to right, using every tile.',
    ],
    board: 'C_T',
    task: {
      type: 'word',
      prompt: 'Type a word that fits C _ T.',
      accept: ['CAT', 'COT', 'CUT'],
      success: (word) => `Yes! ${word} fits C _ T, so this board is valid.`,
    },
  },
  {
    title: 'Move 1: Swap two tiles',
    text: ["Swap any two different tiles on the board. You can't swap two blanks or two of the same letter."],
    board: 'TAP',
    task: { type: 'move', moves: ['swap'], prompt: 'Turn T A P into P A T: drag the T onto the P, or tap one and then the other.' },
  },
  {
    title: 'Move 2: Replace a letter',
    text: [
      'Put a letter from your hand on a different letter on the board. The old letter is discarded and you draw a new tile, so your hand stays the same size.',
    ],
    board: 'CAT',
    hand: 'BHM',
    draws: 'E',
    task: { type: 'move', moves: ['replace'], prompt: 'Turn C A T into B A T.' },
  },
  {
    title: 'Move 3: Play a letter',
    text: [
      "Put a letter from your hand on a blank. The blank is discarded and your hand gets smaller. That's how you get rid of tiles!",
    ],
    board: 'C_T',
    hand: 'AOX',
    task: { type: 'move', moves: ['playLetter'], prompt: 'Cover the blank in C _ T.' },
  },
  {
    title: 'Move 4: Add a blank',
    text: ['Add a blank from your hand at either end of the board or between two tiles. The board gets longer and your hand gets smaller.'],
    board: 'CAT',
    hand: '_',
    task: { type: 'move', moves: ['playBlank'], prompt: 'Drag your blank into a gap, or tap it and then one of the dashed gaps.' },
  },
  {
    title: 'Move 5: Remove a letter',
    text: ['A removal tile deletes one letter from the board, never a blank. Both tiles are discarded.'],
    board: 'SCAT',
    hand: '!',
    task: { type: 'move', moves: ['remove'], prompt: 'Remove one letter from S C A T.' },
  },
  {
    title: 'Bluffing is allowed',
    text: [
      "You never have to leave a valid board. Leaving one that no word fits is a bluff, and that's allowed!",
      'But any other player can challenge the last move. Ben just turned _ _ T E into Q _ T E.',
    ],
    board: 'Q_TE',
    task: {
      type: 'choice',
      prompt: 'Can any 4-letter word fit Q _ T E?',
      options: [
        { label: 'Challenge!', good: true, message: "Good call! No word fits Q _ T E. Ben has 30 seconds to name one, can't, and draws 3 tiles." },
        { label: 'Let it go', good: false, message: 'Ben got away with a bluff: no word fits Q _ T E. If you had challenged, Ben would have drawn 3 tiles.' },
      ],
    },
  },
  {
    title: "Challenge only when you're sure",
    text: [
      'If the player you challenge names a word that fits, you draw 3 tiles instead. Either way, a challenge ends the round.',
      'Ana just made G _ O _ T.',
    ],
    board: 'G_O_T',
    task: {
      type: 'choice',
      prompt: 'Challenge Ana, or let it go?',
      options: [
        { label: 'Challenge!', good: false, message: 'Ana names GHOST, so you draw 3 tiles. Ouch!' },
        { label: 'Let it go', good: true, message: 'Smart. GHOST fits, so a challenge would have cost you 3 tiles.' },
      ],
    },
  },
  {
    title: 'Clocks and rounds',
    text: [
      "You have 1 minute for each turn. If time runs out, the move you've lined up is played for you. With nothing lined up, you draw 3 tiles. Miss 3 turns in a row and you're out of the game.",
      'A round ends after a challenge, when someone covers the last blank, or when everyone swaps in a row. Then you may trade one tile, and a new board is dealt.',
      "The yellow bag at the top of the game shows how many tiles are left in it. Tap it to see which tiles you haven't seen yet. Under it, the trash can is the discard pile: tap it to see every used tile, face up.",
    ],
  },
  {
    title: 'Winning',
    text: ['When you play your last tile, the game challenges you automatically. Name a word that fits and you win!'],
    board: 'CAT_',
    hand: 'S',
    task: {
      type: 'move',
      moves: ['playLetter'],
      prompt: 'Play your last tile.',
      then: { prompt: 'That was your last tile! Name a word that fits C A T S to win.', accept: ['CATS'] },
    },
  },
  {
    title: "You're ready!",
    text: [
      'Create a match and send the link to your friends, or join theirs with a match code from the home screen.',
      'In a real game, you see a preview of your move and press Play to confirm it. Have fun, and bluff wisely!',
    ],
    finish: true,
  },
];

let tutorialStep = 0;
let practice = null; // the practice board for the current step
let practiceTileId = 0;

const currentStep = () => TUTORIAL[tutorialStep];
const spacedOut = (pattern) => pattern.split('').join(' ');
const practicePattern = () => practice.board.map((tile) => (isBlankType(tile.type) ? '_' : tile.type)).join('');
const practiceHandTile = () => practice.hand.find((tile) => tile.id === practice.selection.handId) ?? null;

function practiceTiles(picture = '') {
  return [...picture].map((symbol) => ({
    id: `p${++practiceTileId}`,
    type: symbol === '_' ? 'blank' : symbol === '!' ? 'removal' : symbol,
  }));
}

function openTutorial() {
  tutorialStep = 0;
  showScreen('tutorial');
  showTutorialStep();
}

function showTutorialStep() {
  const step = currentStep();
  practice = {
    board: practiceTiles(step.board),
    hand: practiceTiles(step.hand),
    draws: practiceTiles(step.draws),
    selection: emptySelection(),
    stage: step.task?.type ?? null, // 'word', 'move', 'choice', 'lastWord' or 'done'
    highlight: new Set(),
  };

  byId('tutorial-progress').textContent = `Step ${tutorialStep + 1} of ${TUTORIAL.length}`;
  byId('tutorial-dots').replaceChildren(...TUTORIAL.map((_, index) => {
    const dot = makeElement('span');
    dot.classList.toggle('is-done', index <= tutorialStep);
    return dot;
  }));
  byId('tutorial-title').textContent = step.title;
  byId('tutorial-text').replaceChildren(...step.text.map((paragraph) => makeElement('p', '', paragraph)));
  byId('tutorial-board-area').hidden = !step.board;
  byId('tutorial-hand-area').hidden = !step.hand;
  byId('tutorial-finish').hidden = !step.finish;
  byId('tutorial-next').hidden = Boolean(step.finish);
  byId('tutorial-back').disabled = tutorialStep === 0;
  byId('tutorial-feedback').hidden = true;
  byId('tutorial-retry').hidden = true;

  renderPracticeTask();
  renderPractice({ deal: true });
  window.scrollTo(0, 0);
}

// ---------- Drawing the practice board ----------

// Tiles slide to their new places; a tile that was just dropped slides from
// where it was let go. When a step starts, its tiles are dealt one by one.
function renderPractice({ deal = false, dropped = null } = {}) {
  const containers = [byId('tutorial-hand'), byId('tutorial-board')];
  const before = deal ? new Map() : tilePositions(...containers);
  if (dropped?.rect) before.set(String(dropped.tileId), { rect: dropped.rect, copy: null });
  renderPracticeBoard();
  renderPracticeHand();
  animateTiles(before, containers);
}

function renderPracticeBoard() {
  const choosing = practice.stage === 'move';
  const handTile = practiceHandTile();
  const choosingGap = choosing && handTile !== null && isBlankType(handTile.type);
  const tiles = practice.board;
  const element = byId('tutorial-board');
  element.style.setProperty('--tile-size', `${tileSizeFor(tiles.length, choosingGap ? tiles.length + 1 : 0)}px`);

  const children = [];
  tiles.forEach((tile, index) => {
    if (choosingGap) children.push(makePracticeGap(index));
    const button = makeTile(tile, 'button');
    button.dataset.tileId = tile.id;
    button.dataset.drop = 'tile';
    button.dataset.index = index;
    button.setAttribute('aria-label', `Tile ${index + 1}: ${isBlankType(tile.type) ? 'blank' : tile.type}`);
    button.classList.toggle('is-selected', practice.selection.boardIndex === index);
    button.classList.toggle('is-preview', practice.highlight.has(index));
    button.disabled = !choosing;
    button.addEventListener('click', () => practiceBoardTap(index));
    if (choosing) {
      makeDraggable(button, {
        onStart: () => {
          practice.selection = { handId: null, boardIndex: index, move: null };
          return true;
        },
        onDrop: (target, point, rect) => practiceDrop({ kind: 'board', index, tileId: tile.id }, target, point, rect),
      });
    }
    children.push(button);
  });
  if (choosingGap) children.push(makePracticeGap(tiles.length));
  element.replaceChildren(...children);
}

function makePracticeGap(index) {
  const gap = makeElement('button', 'gap-slot');
  gap.type = 'button';
  gap.dataset.drop = 'gap';
  gap.dataset.index = index;
  gap.setAttribute('aria-label', index === 0 ? 'Add the blank at the start'
    : index === practice.board.length ? 'Add the blank at the end'
    : `Add the blank between tiles ${index} and ${index + 1}`);
  gap.addEventListener('click', () => {
    practiceMove({ type: 'playBlank', tileId: practice.selection.handId, index });
  });
  return gap;
}

function renderPracticeHand() {
  const choosing = practice.stage === 'move';
  byId('tutorial-hand').replaceChildren(...practice.hand.map((tile) => {
    const button = makeTile(tile, 'button');
    button.dataset.tileId = tile.id;
    button.classList.toggle('is-selected', practice.selection.handId === tile.id);
    button.disabled = !choosing;
    button.addEventListener('click', () => {
      practice.selection = practice.selection.handId === tile.id
        ? emptySelection()
        : { handId: tile.id, boardIndex: null, move: null };
      renderPractice();
    });
    if (choosing) {
      makeDraggable(button, {
        onStart: () => {
          practice.selection = { handId: tile.id, boardIndex: null, move: null };
          button.classList.add('is-selected');
          renderPracticeBoard(); // shows the gaps when dragging a blank
          return true;
        },
        onDrop: (target, point, rect) => practiceDrop({ kind: 'hand', tile, tileId: tile.id }, target, point, rect),
      });
    }
    return button;
  }));
}

// The prompt, the word box and the answer buttons for the current stage.
function renderPracticeTask() {
  const { task } = currentStep();
  const { stage } = practice;
  const prompt = stage === 'lastWord' ? task.then.prompt : stage && stage !== 'done' ? task.prompt : null;
  byId('tutorial-prompt').hidden = !prompt;
  byId('tutorial-prompt').textContent = prompt ?? '';

  const naming = stage === 'word' || stage === 'lastWord';
  byId('tutorial-word-form').hidden = !naming;
  if (naming) {
    const pattern = practicePattern();
    byId('tutorial-word-hint').textContent = `A ${pattern.length}-letter word that fits ${spacedOut(pattern)}`;
    byId('tutorial-word-input').value = '';
  }

  byId('tutorial-choices').replaceChildren(...(stage === 'choice' ? task.options : []).map((option) => {
    const button = makeElement('button', option.label === 'Challenge!' ? 'btn btn-challenge' : 'btn btn-secondary', option.label);
    button.type = 'button';
    button.addEventListener('click', () => {
      practice.stage = 'done';
      renderPracticeTask();
      practiceFeedback(option.message, option.good ? 'good' : 'bad');
      pulse(byId('tutorial-board-area'), option.good ? 'flash-green' : 'flash-red');
      byId('tutorial-retry').hidden = false;
    });
    return button;
  }));
}

function practiceFeedback(message, kind) {
  const feedback = byId('tutorial-feedback');
  feedback.textContent = message;
  feedback.className = `tutorial-feedback is-${kind}`;
  feedback.hidden = false;
  pulse(feedback, 'rise-in');
}

// ---------- Practice moves ----------

function practiceBoardTap(index) {
  if (practice.stage !== 'move') return;
  const target = practice.board[index];
  const handTile = practiceHandTile();
  const shakeTile = () => pulse(byId('tutorial-board').querySelector(`[data-index="${index}"]`), 'shake');
  if (handTile) {
    const move = moveWithHandTile(handTile, target, index);
    if (typeof move === 'string') {
      practiceFeedback(move, 'hint');
      shakeTile();
      return;
    }
    practiceMove(move);
    return;
  }
  const first = practice.selection.boardIndex;
  if (first === null || first === index) {
    practice.selection = first === index ? emptySelection() : { handId: null, boardIndex: index, move: null };
    renderPractice();
    return;
  }
  if (practice.board[first].type === target.type) {
    practiceFeedback(SAME_TILES_SWAP, 'hint');
    shakeTile();
    return;
  }
  practiceMove({ type: 'swap', a: first, b: index });
}

function practiceDrop(source, target, point, rect) {
  const move = moveFromDrop(source, target, point, practice.board);
  if (typeof move === 'string') {
    practiceFeedback(move, 'hint');
    pulse(target, 'shake');
  }
  if (!move || typeof move === 'string') {
    practice.selection = emptySelection();
    renderPractice();
    return;
  }
  practiceMove(move, { tileId: source.tileId, rect });
}

// Plays a move on the practice board straight away and says what it did.
function practiceMove(move, dropped = null) {
  const { task } = currentStep();
  practice.selection = emptySelection();
  if (!task.moves.includes(move.type)) {
    practiceFeedback(`That's a different move. ${task.prompt}`, 'hint');
    renderPractice();
    return;
  }

  const { board, hand } = practice;
  const handTile = hand.find((tile) => tile.id === move.tileId);
  const takeFromHand = () => hand.splice(hand.indexOf(handTile), 1);
  switch (move.type) {
    case 'swap':
      [board[move.a], board[move.b]] = [board[move.b], board[move.a]];
      practice.highlight = new Set([move.a, move.b]);
      break;
    case 'replace':
      board[move.index] = handTile;
      takeFromHand();
      hand.push(...practice.draws.splice(0, 1));
      practice.highlight = new Set([move.index]);
      break;
    case 'playLetter':
      board[move.index] = handTile;
      takeFromHand();
      practice.highlight = new Set([move.index]);
      break;
    case 'playBlank':
      board.splice(move.index, 0, handTile);
      takeFromHand();
      practice.highlight = new Set([move.index]);
      break;
    case 'remove':
      board.splice(move.index, 1);
      takeFromHand();
      practice.highlight = new Set();
      break;
    default:
      break;
  }

  practice.stage = task.then ? 'lastWord' : 'done';
  renderPractice({ dropped });
  renderPracticeTask();
  const result = describePracticeResult(move);
  practiceFeedback(result.message, result.kind);
  pulse(byId('tutorial-board-area'), result.kind === 'good' ? 'flash-green' : 'flash-yellow');
  byId('tutorial-retry').hidden = practice.stage !== 'done';
}

function describePracticeResult(move) {
  const pattern = practicePattern();
  const spaced = spacedOut(pattern);
  const word = PRACTICE_WORDS[pattern];
  const fits = word ? `${word} fits, so the board is valid.` : 'No word fits that, so leaving it would be a bluff.';
  if (currentStep().task.then) return { kind: 'good', message: `${spaced}. The game now challenges you automatically.` };
  switch (move.type) {
    case 'swap':
      return pattern === 'PAT'
        ? { kind: 'good', message: 'P A T. Nice swap!' }
        : { kind: 'hint', message: `${spaced}: that's a swap, but no word fits. Try again to make P A T.` };
    case 'replace':
      return { kind: word ? 'good' : 'hint', message: `${spaced}. ${fits} You drew a new tile, so you still hold 3.` };
    case 'playLetter':
      return { kind: word ? 'good' : 'hint', message: `${spaced}. ${fits} Your hand is one tile smaller.` };
    case 'playBlank':
      return { kind: 'good', message: `${spaced}. ${fits} The board is one tile longer.` };
    case 'remove':
      return { kind: word ? 'good' : 'hint', message: `${spaced}. ${fits}` };
    default:
      return { kind: 'good', message: spaced };
  }
}

// The same checks the server makes, against the words this step accepts.
function checkPracticeWord(raw, pattern, accept) {
  const word = raw.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(word)) return { ok: false, reason: 'Type a word using letters only.' };
  if (word.length !== pattern.length) {
    return { ok: false, reason: `The board has ${pattern.length} tiles, so the word needs exactly ${pattern.length} letters.` };
  }
  const clash = [...pattern].findIndex((letter, i) => letter !== '_' && letter !== word[i]);
  if (clash !== -1) return { ok: false, reason: `${word} doesn't fit: tile ${clash + 1} is ${pattern[clash]}.` };
  if (!accept.includes(word)) return { ok: false, reason: `${word} isn't in the word list. Try another!` };
  return { ok: true, word };
}

// ---------- Buttons ----------

byId('tutorial-word-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const { task } = currentStep();
  const lastWord = practice.stage === 'lastWord';
  const input = byId('tutorial-word-input');
  const result = checkPracticeWord(input.value, practicePattern(), lastWord ? task.then.accept : task.accept);
  if (!result.ok) {
    practiceFeedback(result.reason, 'bad');
    pulse(input, 'shake');
    return;
  }
  practice.stage = 'done';
  renderPracticeTask();
  if (lastWord) {
    practiceFeedback(`${result.word} fits. You win!`, 'good');
    confetti(byId('tutorial-board-area'));
  } else {
    practiceFeedback(task.success(result.word), 'good');
    pulse(byId('tutorial-board-area'), 'flash-green');
  }
});

byId('tutorial-next').addEventListener('click', () => {
  tutorialStep = Math.min(tutorialStep + 1, TUTORIAL.length - 1);
  showTutorialStep();
});

byId('tutorial-back').addEventListener('click', () => {
  tutorialStep = Math.max(tutorialStep - 1, 0);
  showTutorialStep();
});

byId('tutorial-retry').addEventListener('click', showTutorialStep);
byId('tutorial-restart').addEventListener('click', openTutorial);
byId('tutorial-close').addEventListener('click', goHome);
byId('tutorial-create').addEventListener('click', () => {
  goHome();
  byId('create-name').focus();
});
