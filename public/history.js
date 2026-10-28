'use strict';

// The move history: everything that has happened in this game, round by
// round, with the words that fitted after each challenge. Uses byId,
// makeElement, request and latestState from client.js, describeEvent and
// wordListParts from game-screen.js, and closeChat from chat.js.

let historyEvents = [];
let historyGameNumber = null;
const openHistoryLists = new Set(); // challenges whose full word list is open

const historyIsOpen = () => !byId('history-panel').hidden;

// Events that stand out in the history.
const BIG_EVENTS = ['challenged', 'challengeSettled', 'startingBoardChallenged', 'startingBoardSettled', 'gameOver', 'roundEnding'];

async function openHistory() {
  closeChat(); // in chat.js
  byId('history-panel').hidden = false;
  byId('chat-backdrop').hidden = false;
  await loadHistory();
}

function closeHistory() {
  byId('history-panel').hidden = true;
  if (byId('chat-panel').hidden) byId('chat-backdrop').hidden = true;
}

async function loadHistory() {
  const result = await request('gameHistory');
  if (!result.ok) {
    byId('history-log').replaceChildren(makeElement('li', 'chat-empty', result.message));
    return;
  }
  historyEvents = result.events;
  historyGameNumber = result.gameNumber;
  renderHistory({ toBottom: true });
}

// Called with each update while the panel is open. New events are added; if
// any were missed (or a new game started), the whole history is fetched again.
function updateHistory(state) {
  if (!historyIsOpen() || !state.game) return;
  const lastSeq = historyEvents.at(-1)?.seq ?? 0;
  const fresh = state.game.events.filter((event) => event.seq > lastSeq);
  if (fresh.length === 0) return;
  if (state.gameNumber !== historyGameNumber || fresh[0].seq !== lastSeq + 1) {
    loadHistory();
    return;
  }
  historyEvents.push(...fresh);
  renderHistory();
}

function renderHistory({ toBottom = false } = {}) {
  const log = byId('history-log');
  const atBottom = toBottom || log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  const items = [];
  for (const event of historyEvents) {
    if (event.type === 'roundStarted') items.push(makeElement('li', 'history-round', `Round ${event.round}`));
    const text = describeEvent(event);
    if (!text) continue;
    const item = makeElement('li', 'history-event');
    item.classList.toggle('is-big', BIG_EVENTS.includes(event.type));
    item.append(makeElement('p', '', text));
    if (event.possible && ['challengeSettled', 'startingBoardRebuilt'].includes(event.type)) {
      const card = makeElement('div', 'word-list');
      const open = openHistoryLists.has(event.seq);
      card.append(...wordListParts(event, {
        open,
        width: log.clientWidth - 48,
        toggle: () => {
          if (open) openHistoryLists.delete(event.seq);
          else openHistoryLists.add(event.seq);
          renderHistory();
        },
      }));
      item.append(card);
    }
    items.push(item);
  }
  if (items.length === 0) items.push(makeElement('li', 'chat-empty', 'Nothing has happened yet.'));
  const scrollTop = log.scrollTop;
  log.replaceChildren(...items);
  log.scrollTop = atBottom ? log.scrollHeight : scrollTop;
}

byId('history-button').addEventListener('click', () => (historyIsOpen() ? closeHistory() : openHistory()));
byId('history-close').addEventListener('click', closeHistory);
byId('chat-backdrop').addEventListener('click', closeHistory);
byId('history-panel').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeHistory();
});
