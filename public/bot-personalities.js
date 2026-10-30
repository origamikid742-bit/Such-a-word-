'use strict';

// Bots: their difficulties, personalities and settings. Shared by the
// browser (the add-a-bot window, profiles, thinking messages) and the server
// (names, icons and the small strategy nudges in src/bots/brain.js). What
// each personality says is in src/bots/lines/.

const BOT_DIFFICULTIES = [
  { key: 'idiot', label: 'Idiot', description: 'Plays almost at random. Hilariously bad.' },
  { key: 'easy', label: 'Easy', description: 'A casual player who knows everyday words.' },
  { key: 'medium', label: 'Medium', description: 'A decent player with a good vocabulary.' },
  { key: 'hard', label: 'Hard', description: 'A strong player who bluffs on purpose.' },
  { key: 'expert', label: 'Expert', description: 'Knows every word and catches every bluff. Practically unbeatable.' },
];

const BOT_CHATTINESS = [
  { key: 'muted', label: 'Muted' },
  { key: 'rare', label: 'Rare' },
  { key: 'normal', label: 'Normal' },
  { key: 'chatty', label: 'Chatty' },
];

const BOT_SWEARING = [
  { key: 'clean', label: 'Clean' },
  { key: 'mild', label: 'Mild' },
  { key: 'uncensored', label: 'Uncensored' },
];

const DEFAULT_BOT = { personality: 'quiet', difficulty: 'medium', chattiness: 'normal', swearing: 'mild' };

// Strategy nudges (all small, and smaller still for Expert), read by the bot's brain:
//   challenge   × how likely it is to challenge
//   bluff       × how willing it is to leave a board it doesn't know a word for
//   safe        extra preference for boards it knows a word for over shrinking its hand
//   trade       × how likely it is to trade a tile between rounds
//   randomMove  chance of a random legal move
//   contrarian  chance of skipping its best move for its second best
//   blankLove   preference for adding blanks (longer boards)
//   swapDislike dislike of swapping
//   hostShy     × how likely it is to challenge the host
//   revenge     × how likely it is to challenge whoever last challenged it
//   grudge      × how likely it is to challenge after being challenged this round
//   hoardBlanks dislike of playing its own blanks
//   mistakes    × how often it misjudges a board
//   quickPass   passes "No challenge" quickly
//   pace        × how long it takes to act (cosmetic; still quick)
const BOT_PERSONALITIES = {
  quiet: {
    label: 'Quiet',
    kind: 'basic',
    icon: { color: 5, value: '🤫' },
    names: ['Ruth', 'Walter', 'Edith', 'Harold', 'Agnes', 'Irene', 'Mabel', 'Herbert'],
    bio: 'Never says a word. Just plays.',
    nudge: 'Plays normally.',
    nudges: {},
    thinking: ['{name} is thinking…', '{name} is quietly thinking…', '{name} is studying the board…'],
  },
  encouraging: {
    label: 'Encouraging',
    kind: 'basic',
    icon: { color: 7, value: '🥰' },
    names: ['Linda', 'Pam', 'Gary', 'Doug', 'Brenda', 'Joy', 'Dolly', 'Barb'],
    bio: "Everyone's biggest fan. Sometimes lets slip a word that fits.",
    nudge: 'Challenges a little less, and passes quickly.',
    nudges: { challenge: 0.75, quickPass: true },
    thinking: ['{name} is cheering everyone on…', '{name} is thinking happy thoughts…', '{name} is rooting for you…'],
  },
  annoying: {
    label: 'Annoying',
    kind: 'basic',
    icon: { color: 2, value: '😏' },
    names: ['Chad', 'Brad', 'Tyler', 'Karen', 'Kyle', 'Brayden', 'Trent', 'Becky'],
    bio: 'Cocky, rude and sure of everything. Gets saltier when losing.',
    nudge: 'Challenges more, and bluffs a little more.',
    nudges: { challenge: 1.3, bluff: 1.25 },
    thinking: ['{name} is smirking…', '{name} is pretending not to care…', '{name} is cracking knuckles…', '{name} is rolling their eyes…'],
  },
  unsure: {
    label: 'Unsure',
    kind: 'basic',
    icon: { color: 4, value: '😬' },
    names: ['Kevin', 'Gerald', 'Melvin', 'Nigel', 'Wendell', 'Stuart', 'Darryl', 'Mildred'],
    bio: 'Doubts every move, and itself. Braver when winning.',
    nudge: 'Plays it safe, challenges less, and trades tiles more.',
    nudges: { safe: 0.6, challenge: 0.65, bluff: 0.6, trade: 1.5 },
    thinking: ['{name} is second-guessing…', '{name} is third-guessing…', '{name} is panicking quietly…', '{name} is apologizing in advance…'],
  },
  marvin: {
    label: 'Marvin',
    kind: 'themed',
    from: "The Hitchhiker's Guide to the Galaxy",
    icon: { color: 9, value: '🤖' },
    names: ['Marvin'],
    bio: 'A robot with a brain the size of a planet and no will to use it.',
    nudge: "Challenges a little less. What's the point?",
    nudges: { challenge: 0.8, pace: 1.3 },
    thinking: ['Marvin is thinking… reluctantly', 'Marvin is sighing…', 'Marvin is using a tiny fraction of his brain…'],
  },
  rocky: {
    label: 'Rocky',
    kind: 'themed',
    from: 'Project Hail Mary',
    icon: { color: 1, value: '🪨' },
    names: ['Rocky'],
    bio: 'Brilliant alien engineer. Counts in base six. Good good friend.',
    nudge: 'Careful: prefers boards it knows a word for, and challenges only when sure.',
    nudges: { safe: 0.4, challenge: 0.85 },
    thinking: ['Rocky is thinking, thinking, thinking', 'Rocky is doing math…', 'Rocky is engineering…'],
  },
  narrator: {
    label: 'The Narrator',
    kind: 'themed',
    from: 'The Stanley Parable',
    icon: { color: 6, value: '🚪' },
    names: ['The Narrator'],
    bio: 'Knows exactly what you will do. Is often wrong about it.',
    nudge: 'Sometimes skips the obvious move, just to be contrary.',
    nudges: { contrarian: 0.25 },
    thinking: ['The Narrator is deciding what happens next…', 'The Narrator is rewriting the story…', 'The Narrator is choosing a door…'],
  },
  martin: {
    label: 'Martin',
    kind: 'themed',
    from: 'chess.com',
    icon: { color: 8, value: '♟️' },
    names: ['Martin'],
    bio: 'A friendly beginner who is still learning. Loves chess.',
    nudge: 'Makes the odd accidental bluff.',
    nudges: { mistakes: 1.5 },
    thinking: ['Martin is thinking very hard…', 'Martin is looking for his queen…', 'Martin is calculating one move ahead…'],
  },
  vizzini: {
    label: 'Vizzini',
    kind: 'themed',
    from: 'The Princess Bride',
    icon: { color: 3, value: '🍷' },
    names: ['Vizzini'],
    bio: 'A genius. Ask him. He will tell you.',
    nudge: 'Overconfident: bluffs and challenges more.',
    nudges: { challenge: 1.25, bluff: 1.3 },
    thinking: ['Vizzini is out-thinking everyone…', 'Vizzini is choosing a goblet…', 'Vizzini is being a genius…'],
  },
  crazyDave: {
    label: 'Crazy Dave',
    kind: 'themed',
    from: 'Plants vs. Zombies',
    icon: { color: 0, value: '🌻' },
    names: ['Crazy Dave'],
    bio: 'Wears a pot on his head. Sells plants. Says he is crazy.',
    nudge: 'Now and then makes a completely random move.',
    nudges: { randomMove: 0.1 },
    thinking: ['Crazy Dave is thinking about tacos…', 'Crazy Dave is adjusting his pot…', 'Crazy Dave is talking to Penny…'],
  },
  doofenshmirtz: {
    label: 'Dr. Doofenshmirtz',
    kind: 'themed',
    from: 'Phineas and Ferb',
    icon: { color: 4, value: '🧪' },
    names: ['Doofenshmirtz'],
    bio: 'Evil scientist. Building an -inator for every occasion.',
    nudge: 'Loves elaborate plans: adds blanks and makes long boards.',
    nudges: { blankLove: 0.6 },
    thinking: ['Doofenshmirtz is building an -inator…', 'Doofenshmirtz is monologuing…', 'Doofenshmirtz is checking for platypuses…'],
  },
  zaphod: {
    label: 'Zaphod Beeblebrox',
    kind: 'themed',
    from: "The Hitchhiker's Guide to the Galaxy",
    icon: { color: 0, value: '😎' },
    names: ['Zaphod'],
    bio: 'Two heads, three arms, former President of the Galaxy. Mostly ego.',
    nudge: 'Reckless: bluffs more, and gets bored of swapping.',
    nudges: { bluff: 1.35, swapDislike: 0.6 },
    thinking: ['Zaphod is consulting both heads…', 'Zaphod is admiring himself…', 'Zaphod is thinking (both heads disagree)…'],
  },
  napoleon: {
    label: 'Napoleon Dynamite',
    kind: 'themed',
    from: 'Napoleon Dynamite',
    icon: { color: 0, value: '🦁' },
    names: ['Napoleon'],
    bio: 'Has skills. Nunchuck skills, bow-hunting skills, word skills.',
    nudge: 'Challenges more after being challenged. Gosh.',
    nudges: { grudge: 1.7 },
    thinking: ['Napoleon is thinking… gosh…', 'Napoleon is eating tots…', 'Napoleon is drawing a liger…'],
  },
  dobby: {
    label: 'Dobby',
    kind: 'themed',
    from: 'Harry Potter',
    icon: { color: 7, value: '🧦' },
    names: ['Dobby'],
    bio: 'A free elf. Very loyal. Very, very eager.',
    nudge: 'Hardly ever challenges the host.',
    nudges: { hostShy: 0.3 },
    thinking: ['Dobby is thinking very hard, sir…', 'Dobby is trying his best…', 'Dobby is admiring his sock…'],
  },
  groot: {
    label: 'Groot',
    kind: 'themed',
    from: 'Guardians of the Galaxy',
    icon: { color: 8, value: '🌱' },
    names: ['Groot'],
    bio: 'I am Groot.',
    nudge: 'Gentle: challenges less.',
    nudges: { challenge: 0.75 },
    thinking: ['Groot is… growing', 'Groot is thinking (slowly, like a tree)…', 'Groot is photosynthesizing…'],
  },
  inigo: {
    label: 'Inigo Montoya',
    kind: 'themed',
    from: 'The Princess Bride',
    icon: { color: 2, value: '⚔️' },
    names: ['Inigo'],
    bio: 'A master swordsman on a quest for revenge. Polite about it.',
    nudge: 'More likely to challenge whoever last challenged him.',
    nudges: { revenge: 2 },
    thinking: ['Inigo is planning his revenge…', 'Inigo is practicing his swordplay…', 'Inigo is waiting for the six-lettered man…'],
  },
  gollum: {
    label: 'Gollum',
    kind: 'themed',
    from: 'The Lord of the Rings',
    icon: { color: 9, value: '💍' },
    names: ['Gollum'],
    bio: 'Has a precious. Will not tell you what is in his handses.',
    nudge: 'Hoards his blanks and hardly ever trades.',
    nudges: { hoardBlanks: 0.6, trade: 0.3 },
    thinking: ['Gollum is whispering to its precious…', 'Gollum is arguing with Sméagol…', 'Gollum is counting his tileses…'],
  },
  shakespeare: {
    label: 'Shakespeare',
    kind: 'themed',
    from: 'The Bard himself',
    icon: { color: 3, value: '🎭' },
    names: ['Shakespeare'],
    bio: 'Playwright, poet, inventor of about a thousand words. Very dramatic.',
    nudge: 'Dramatic: adds blanks and bluffs more.',
    nudges: { blankLove: 0.4, bluff: 1.2 },
    thinking: ['Shakespeare is composing a sonnet…', 'Shakespeare is pondering: to bluff, or not…', 'Shakespeare is inventing a word…'],
  },
};

const BOT_PERSONALITY_KEYS = Object.keys(BOT_PERSONALITIES);

const isBotOption = (list, key) => list.some((option) => option.key === key);
const isPersonality = (key) => Object.hasOwn(BOT_PERSONALITIES, key);

// A thinking message for a bot, picked by how long the turn has gone on, so
// it changes now and then without flickering.
function botThinking(personality, name, step = 0) {
  const lines = BOT_PERSONALITIES[personality]?.thinking ?? ['{name} is thinking…'];
  return lines[step % lines.length].replace('{name}', name);
}

if (typeof module !== 'undefined') {
  module.exports = {
    BOT_DIFFICULTIES,
    BOT_CHATTINESS,
    BOT_SWEARING,
    BOT_PERSONALITIES,
    BOT_PERSONALITY_KEYS,
    DEFAULT_BOT,
    isBotOption,
    isPersonality,
    botThinking,
  };
}
