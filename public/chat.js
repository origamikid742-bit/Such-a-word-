'use strict';

// The chat: a side panel with the last 100 messages, emoji buttons and a
// short message box, and bubbles that pop up over the sender's icon for a
// moment. Players and spectators alike can chat. Uses byId, makeElement,
// makeIcon, request, showToast, socket, latestState and currentScreen from
// client.js.

const CHAT_MAX_CHARACTERS = 100;
const CHAT_KEPT_HERE = 100;
const BUBBLE_MS = 4_000;

let chatCode = null; // the match these messages belong to
let chatMessages = [];
let unreadCount = 0;
const bubbles = new Map(); // sender's seat id → their bubble on screen

// Characters as people count them: an emoji or an accented letter is one.
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const charactersOf = (text) => (segmenter ? [...segmenter.segment(text)].map((part) => part.segment) : Array.from(text));

// A message of only one to three emojis is shown bigger, like on a phone.
function isEmojiOnly(text) {
  const compact = text.replace(/\s/g, '');
  return /^(?:\p{Extended_Pictographic}|\p{Emoji_Component})+$/u.test(compact)
    && /\p{Extended_Pictographic}/u.test(compact)
    && charactersOf(compact).length <= 3;
}

const isMine = (message) => message.seatId === latestState?.youId;

// ---------- The panel ----------

function makeChatMessage(message) {
  const mine = isMine(message);
  const item = makeElement('li', 'chat-message');
  item.classList.toggle('is-mine', mine);
  const big = isEmojiOnly(message.text);
  const text = makeElement('p', big ? 'chat-text is-big' : 'chat-text', message.text);
  if (mine) {
    item.append(text);
    return item;
  }
  const who = makeElement('p', 'chat-name', message.name);
  if (message.watching) who.append(makeElement('span', 'chat-watching', ' watching'));
  const body = makeElement('div', 'chat-body');
  body.append(who, text);
  item.append(makeIcon(message.icon, message.name, 28), body);
  return item;
}

function renderChatLog() {
  const log = byId('chat-log');
  log.replaceChildren(...chatMessages.map(makeChatMessage));
  if (chatMessages.length === 0) log.append(makeElement('li', 'chat-empty', 'No messages yet. Say hi!'));
  log.scrollTop = log.scrollHeight;
}

function renderUnread() {
  const badge = byId('chat-unread');
  badge.hidden = unreadCount === 0;
  badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
  byId('chat-button').setAttribute('aria-label', unreadCount ? `Chat, ${unreadCount} new` : 'Chat');
  pageAlert.unread = unreadCount;
  updateTitle(); // in client.js
}

const chatIsOpen = () => !byId('chat-panel').hidden;

function openChat() {
  closeHistory(); // in history.js
  byId('chat-panel').hidden = false;
  byId('chat-backdrop').hidden = false;
  unreadCount = 0;
  renderUnread();
  renderChatLog();
  // On phones, the keyboard would cover the messages, so it waits for a tap.
  if (window.matchMedia('(hover: hover)').matches) byId('chat-input').focus();
}

function closeChat() {
  byId('chat-panel').hidden = true;
  byId('chat-backdrop').hidden = true;
}

// Leaving a match clears its chat from the screen.
function resetChat() {
  chatCode = null;
  chatMessages = [];
  unreadCount = 0;
  renderUnread();
  closeChat();
  for (const bubble of bubbles.values()) bubble.remove();
  bubbles.clear();
}

// ---------- Bubbles over icons ----------

// The icon a message's bubble points at: the sender's seat in the game, their
// row in the lobby, or the watching count for spectators.
function bubbleAnchor(message) {
  if (currentScreen !== 'lobby' && currentScreen !== 'game') return null;
  if (message.watching) return byId('watching-button');
  return document.querySelector(`#screen-${currentScreen} [data-player-id="${CSS.escape(message.seatId)}"] .player-icon`);
}

function showBubble(message) {
  const anchor = bubbleAnchor(message);
  const rect = anchor?.getBoundingClientRect();
  if (!rect || rect.width === 0) return;
  bubbles.get(message.seatId)?.remove();

  const below = message.watching; // the watching count sits at the very top
  const bubble = makeElement('div', 'chat-bubble', message.text);
  bubble.classList.toggle('is-big', isEmojiOnly(message.text));
  bubble.classList.toggle('is-below', below);
  bubble.setAttribute('aria-hidden', 'true');
  document.body.append(bubble);
  const width = bubble.offsetWidth;
  const center = rect.left + rect.width / 2;
  const left = Math.min(Math.max(center, width / 2 + 8), document.documentElement.clientWidth - width / 2 - 8);
  bubble.style.left = `${left + window.scrollX}px`;
  bubble.style.top = `${(below ? rect.bottom + 8 : Math.max(rect.top - 6, bubble.offsetHeight + 4)) + window.scrollY}px`;
  bubble.style.setProperty('--tail', `${center - left}px`);
  bubbles.set(message.seatId, bubble);

  setTimeout(() => {
    bubble.classList.add('is-leaving');
    setTimeout(() => {
      bubble.remove();
      if (bubbles.get(message.seatId) === bubble) bubbles.delete(message.seatId);
    }, 400);
  }, BUBBLE_MS);
}

// ---------- Messages from the server ----------

socket.on('chatHistory', ({ code, messages }) => {
  if (code !== chatCode) unreadCount = 0;
  chatCode = code;
  chatMessages = messages;
  renderUnread();
  if (chatIsOpen()) renderChatLog();
});

socket.on('chat', (message) => {
  chatMessages.push(message);
  if (chatMessages.length > CHAT_KEPT_HERE) chatMessages.shift();
  if (chatIsOpen()) {
    const log = byId('chat-log');
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    log.querySelector('.chat-empty')?.remove();
    log.append(makeChatMessage(message));
    if (atBottom || isMine(message)) log.scrollTop = log.scrollHeight;
  } else if (!isMine(message)) {
    unreadCount += 1;
    renderUnread();
    pulse(byId('chat-button'), 'bump');
  }
  showBubble(message);
});

// ---------- Writing a message ----------

function updateLength() {
  const input = byId('chat-input');
  const characters = charactersOf(input.value);
  if (characters.length > CHAT_MAX_CHARACTERS) input.value = characters.slice(0, CHAT_MAX_CHARACTERS).join('');
  const count = Math.min(characters.length, CHAT_MAX_CHARACTERS);
  byId('chat-length').textContent = `${count}/${CHAT_MAX_CHARACTERS}`;
  byId('chat-length').classList.toggle('is-full', count === CHAT_MAX_CHARACTERS);
}

// Tapping an emoji adds it to the message, if there's room.
function addEmoji(emoji) {
  const input = byId('chat-input');
  if (charactersOf(input.value).length >= CHAT_MAX_CHARACTERS) {
    pulse(byId('chat-length'), 'shake');
    return;
  }
  const at = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? at;
  input.value = input.value.slice(0, at) + emoji + input.value.slice(end);
  const caret = at + emoji.length;
  input.setSelectionRange(caret, caret);
  updateLength();
}

byId('chat-emojis').replaceChildren(...CHAT_EMOJIS.map((emoji) => {
  const button = makeElement('button', 'chat-emoji', emoji);
  button.type = 'button';
  button.setAttribute('aria-label', `Add ${emoji}`);
  // Keeps the keyboard open on phones while tapping emojis.
  button.addEventListener('pointerdown', (event) => event.preventDefault());
  button.addEventListener('click', () => addEmoji(emoji));
  return button;
}));

byId('chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = byId('chat-input');
  const text = input.value.trim();
  if (!text) return;
  const result = await request('sendChat', { text });
  if (!result.ok) {
    showToast(result.message);
    return;
  }
  input.value = '';
  updateLength();
});

byId('chat-input').addEventListener('input', updateLength);
byId('chat-button').addEventListener('click', () => (chatIsOpen() ? closeChat() : openChat()));
byId('chat-close').addEventListener('click', closeChat);
byId('chat-backdrop').addEventListener('click', closeChat);
byId('chat-panel').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeChat();
});
updateLength();
