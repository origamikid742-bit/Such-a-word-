'use strict';

// Bots in the browser: the host's "Add a bot" window, everyone's profiles
// (with a mute just for you, and the host's controls for a bot), and the
// short summary under a bot's name. Uses byId, makeElement, makeIcon,
// request, showToast, latestState and currentScreen from client.js, the bot
// lists in bot-personalities.js and playSound from sounds.js.

const MUTED_STORAGE_KEY = 'such-a-word:muted-bots';

const labelOf = (list, key) => list.find((option) => option.key === key)?.label ?? key;

// "Hard · Annoying" under a bot's name.
function botSummary(bot) {
  return `${labelOf(BOT_DIFFICULTIES, bot.difficulty)} · ${BOT_PERSONALITIES[bot.personality]?.label ?? 'Bot'}`;
}

// ---------- Muting a bot just for you ----------
// Saved in this browser, per match, by seat.

function mutedSeats() {
  try {
    return JSON.parse(readStorage('localStorage', MUTED_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function isMutedForMe(seatId) {
  const code = latestState?.code;
  return Boolean(code && mutedSeats()[code]?.includes(seatId));
}

function setMutedForMe(seatId, muted) {
  const all = mutedSeats();
  const code = latestState.code;
  const list = new Set(all[code] ?? []);
  if (muted) list.add(seatId);
  else list.delete(seatId);
  all[code] = [...list];
  writeStorage('localStorage', MUTED_STORAGE_KEY, JSON.stringify(all));
}

// ---------- Choosing from a few options ----------

// A row of buttons where one is chosen, like Easy / Medium / Hard.
function renderSegmented(container, options, chosen, onChoose) {
  container.replaceChildren(...options.map((option) => {
    const button = makeElement('button', 'segment', option.label);
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', String(option.key === chosen));
    button.addEventListener('click', () => onChoose(option.key));
    return button;
  }));
}

// ---------- Adding a bot ----------

const addBotChoice = { personality: DEFAULT_BOT.personality, difficulty: DEFAULT_BOT.difficulty, chattiness: DEFAULT_BOT.chattiness, swearing: DEFAULT_BOT.swearing };

function personalityCard(key, chosen, onChoose) {
  const personality = BOT_PERSONALITIES[key];
  const card = makeElement('button', 'bot-card');
  card.type = 'button';
  card.setAttribute('role', 'radio');
  card.setAttribute('aria-checked', String(key === chosen));
  card.append(
    makeIcon({ color: personality.icon.color, kind: 'emoji', value: personality.icon.value }, personality.label, 36),
    makeElement('span', 'bot-card-name', personality.label),
  );
  card.title = personality.bio;
  card.addEventListener('click', () => onChoose(key));
  return card;
}

function renderAddBot() {
  const chosen = addBotChoice.personality;
  const basic = BOT_PERSONALITY_KEYS.filter((key) => BOT_PERSONALITIES[key].kind === 'basic');
  const themed = BOT_PERSONALITY_KEYS.filter((key) => BOT_PERSONALITIES[key].kind === 'themed');
  const choose = (key) => {
    addBotChoice.personality = key;
    playSound('pick');
    renderAddBot();
  };
  byId('bot-personalities').replaceChildren(
    makeElement('p', 'bot-group-label', 'Everyday'),
    ...basic.map((key) => personalityCard(key, chosen, choose)),
    makeElement('p', 'bot-group-label', 'Characters'),
    ...themed.map((key) => personalityCard(key, chosen, choose)),
  );
  const personality = BOT_PERSONALITIES[chosen];
  byId('bot-personality-note').textContent = chosen === 'random'
    ? 'A surprise: any personality except Quiet, characters included.'
    : `${personality.bio}${personality.from ? ` (from ${personality.from})` : ''} ${personality.nudge}`;
  renderSegmented(byId('bot-difficulty'), BOT_DIFFICULTIES, addBotChoice.difficulty, (key) => {
    addBotChoice.difficulty = key;
    renderAddBot();
  });
  byId('bot-difficulty-note').textContent = BOT_DIFFICULTIES.find((option) => option.key === addBotChoice.difficulty).description;
  renderSegmented(byId('bot-chattiness'), BOT_CHATTINESS, addBotChoice.chattiness, (key) => {
    addBotChoice.chattiness = key;
    renderAddBot();
  });
  renderSegmented(byId('bot-swearing'), BOT_SWEARING, addBotChoice.swearing, (key) => {
    addBotChoice.swearing = key;
    renderAddBot();
  });
}

// Each time, the window starts on Quiet; the other choices are remembered.
function openAddBot() {
  addBotChoice.personality = DEFAULT_BOT.personality;
  byId('add-bot-error').hidden = true;
  renderAddBot();
  byId('add-bot-dialog').showModal();
  byId('add-bot-dialog').scrollTop = 0;
}

async function addBot(personality) {
  const result = await request('addBot', { ...addBotChoice, personality });
  if (!result.ok) {
    byId('add-bot-error').textContent = result.message;
    byId('add-bot-error').hidden = false;
    return;
  }
  byId('add-bot-dialog').close();
}

byId('add-bot').addEventListener('click', openAddBot);
byId('add-bot-cancel').addEventListener('click', () => byId('add-bot-dialog').close());
byId('add-bot-confirm').addEventListener('click', () => addBot(addBotChoice.personality));
byId('bot-random').addEventListener('click', () => addBot('random'));

// ---------- Profiles ----------

let profileSeatId = null;

const everyone = () => (latestState ? [...latestState.players, ...latestState.spectators] : []);

function openProfile(seatId) {
  profileSeatId = seatId;
  byId('profile-error').hidden = true;
  if (!renderProfile()) return;
  byId('profile-dialog').showModal();
}

// Returns false when that person isn't in the match any more.
function renderProfile() {
  const person = everyone().find((candidate) => candidate.id === profileSeatId);
  if (!person) {
    if (byId('profile-dialog').open) byId('profile-dialog').close();
    return false;
  }
  const { bot } = person;
  const isHost = latestState.youId === latestState.hostId;
  const isYou = person.id === latestState.youId;
  byId('profile-icon').replaceChildren(makeIcon(person.icon, person.name, 64));
  byId('profile-name').textContent = isYou ? `${person.name} (you)` : person.name;

  const facts = [];
  if (bot) {
    const personality = BOT_PERSONALITIES[bot.personality];
    byId('profile-subtitle').textContent = `Bot · ${personality.label}${personality.from ? ` · ${personality.from}` : ''}`;
    byId('profile-bio').textContent = personality.bio;
    facts.push(['Difficulty', `${labelOf(BOT_DIFFICULTIES, bot.difficulty)}: ${BOT_DIFFICULTIES.find((option) => option.key === bot.difficulty).description}`]);
    facts.push(['Play style', personality.nudge]);
    facts.push(['Chattiness', `${labelOf(BOT_CHATTINESS, bot.chattiness)} · swearing ${labelOf(BOT_SWEARING, bot.swearing).toLowerCase()}`]);
    facts.push(['This match', `${plural(person.wins, 'win')}, ${plural(bot.stats.bluffsCaught, 'bluff')} caught, ${plural(bot.stats.wordsNamed, 'word')} named`]);
  } else {
    const watching = latestState.spectators.some((candidate) => candidate.id === person.id);
    byId('profile-subtitle').textContent = [person.id === latestState.hostId ? 'Host' : null, watching ? 'Watching' : 'Player'].filter(Boolean).join(' · ');
    byId('profile-bio').textContent = '';
    facts.push(['This match', plural(person.wins, 'win')]);
  }
  byId('profile-bio').hidden = !byId('profile-bio').textContent;
  byId('profile-facts').replaceChildren(...facts.map(([label, value]) => {
    const item = makeElement('li', 'profile-fact');
    item.append(makeElement('span', 'profile-fact-label', label), makeElement('span', '', value));
    return item;
  }));

  // Muting a bot, just for you.
  byId('profile-mute-row').hidden = !bot || bot.personality === 'quiet';
  byId('profile-mute').setAttribute('aria-checked', String(isMutedForMe(person.id)));

  // The host's controls for a bot.
  const hostControls = Boolean(bot) && isHost;
  byId('profile-host').hidden = !hostControls;
  if (hostControls) renderHostControls(person);
  return true;
}

function renderHostControls(person) {
  const { bot } = person;
  const inLobby = latestState.status === 'lobby';
  const rename = byId('profile-rename');
  if (document.activeElement !== rename) rename.value = person.name;
  byId('profile-lobby-controls').hidden = !inLobby;
  byId('profile-lobby-note').hidden = inLobby;
  byId('profile-remove').hidden = !inLobby;

  const select = byId('profile-personality');
  if (select.options.length === 0) {
    for (const key of BOT_PERSONALITY_KEYS) select.append(new Option(BOT_PERSONALITIES[key].label, key));
  }
  select.value = bot.personality;
  renderSegmented(byId('profile-difficulty'), BOT_DIFFICULTIES, bot.difficulty, (key) => changeBot({ difficulty: key }));
  renderSegmented(byId('profile-chattiness'), BOT_CHATTINESS, bot.chattiness, (key) => changeBot({ chattiness: key }));
  renderSegmented(byId('profile-swearing'), BOT_SWEARING, bot.swearing, (key) => changeBot({ swearing: key }));
}

async function changeBot(changes) {
  const result = await request('updateBot', { seatId: profileSeatId, changes });
  byId('profile-error').hidden = result.ok;
  if (!result.ok) byId('profile-error').textContent = result.message;
}

byId('profile-mute').addEventListener('click', () => {
  setMutedForMe(profileSeatId, !isMutedForMe(profileSeatId));
  renderProfile();
  if (typeof renderChatLog === 'function' && !byId('chat-panel').hidden) renderChatLog(); // in chat.js
});
byId('profile-personality').addEventListener('change', (event) => changeBot({ personality: event.target.value }));
byId('profile-rename-save').addEventListener('click', async () => {
  await changeBot({ name: byId('profile-rename').value });
  byId('profile-rename').blur();
});
byId('profile-rename').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  byId('profile-rename-save').click();
});
byId('profile-remove').addEventListener('click', async () => {
  const result = await request('removeSeat', { seatId: profileSeatId });
  if (!result.ok) {
    byId('profile-error').textContent = result.message;
    byId('profile-error').hidden = false;
    return;
  }
  byId('profile-dialog').close();
});

// The profile stays up to date while it's open.
socket.on('state', () => {
  if (byId('profile-dialog').open) renderProfile();
});
