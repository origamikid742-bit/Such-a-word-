'use strict';

// Every talking personality's chat lines, by personality key (see
// public/bot-personalities.js). Quiet bots have none.
//
// Each file has `base` lines (clean), `mild` and `strong` extras for the
// Mild and Uncensored swearing settings, and `pairs`: special replies to a
// particular personality. Lines are grouped by situation; src/bots/chat.js
// says when each one comes up. Placeholders: {player} (the other person in
// the moment), {word}, {me} (the bot's own name) and {other} (another bot).
module.exports = {
  encouraging: require('./encouraging'),
  annoying: require('./annoying'),
  unsure: require('./unsure'),
  marvin: require('./marvin'),
  rocky: require('./rocky'),
  narrator: require('./narrator'),
  martin: require('./martin'),
  vizzini: require('./vizzini'),
  crazyDave: require('./crazy-dave'),
  doofenshmirtz: require('./doofenshmirtz'),
  zaphod: require('./zaphod'),
  napoleon: require('./napoleon'),
  dobby: require('./dobby'),
  groot: require('./groot'),
  inigo: require('./inigo'),
  gollum: require('./gollum'),
  shakespeare: require('./shakespeare'),
};
