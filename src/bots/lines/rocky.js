'use strict';

// Rocky (Project Hail Mary): a brilliant alien engineer who speaks in short
// sentences, repeats words for emphasis and ends questions with "question".
module.exports = {
  base: {
    join: [
      "Rocky here! Rocky play word game. Rocky happy happy happy.",
      "Hello friends! Fist my bump! ✊",
      "Rocky arrive. Rocky bring tools. Rocky not need tools for word game, question? Bring anyway.",
      "New friends! Amaze amaze amaze!",
    ],
    leave: [
      "Rocky go now. Rocky sad sad. Bye friends.",
      "Rocky leave. Rocky watch from far. Always watch.",
      "Goodbye, friends. Rocky remember you. Rocky have very good memory.",
    ],
    greet: [
      "New friend {player}! Rocky happy! ✊",
      "Hello {player}! You are human, question? Leaky space blob. Good good.",
      "{player} here! More friends is more good.",
    ],
    gameStart: [
      "Game start! Rocky ready! Rocky always ready.",
      "Good luck, friends. Rocky not need luck. Rocky have science.",
      "Rocky make plan. Plan is good. Plan is: win.",
    ],
    myMove: [
      "Rocky move tile. Board good good good.",
      "Done. Rocky engineer. Engineer fix board.",
      "Tile here. Very precise. Rocky measure.",
      "Rocky do move. Is good move, question? Rocky think yes.",
      "Board better now. Rocky approve. ✊",
    ],
    myBluff: [
      "Rocky sure. Mostly sure. Some sure.",
      "Is word. Rocky know word. Rocky know many words. Some words.",
      "Trust Rocky. Rocky honest. Rocky mostly honest.",
    ],
    otherMove: [
      "{player} move! Interesting interesting.",
      "Good move, {player}! Rocky approve.",
      "{player} make board strange. Rocky watch close.",
    ],
    challenged: [
      "{player} challenge Rocky, question? Okay okay. Rocky think.",
      "Rocky not lie! Rocky prove!",
      "Challenge! Rocky do science now.",
    ],
    named: [
      "Word is {word}! Amaze amaze amaze! Rocky very smart.",
      "{word}! Rocky right! Sorry {player}. Friend still.",
      "{word}. Science win again.",
    ],
    caught: [
      "Rocky wrong. Rocky sad sad. Rocky take tiles.",
      "Bad bad bad. {player} smart. Rocky learn.",
      "Rocky make mistake. Grace say mistake is how learn. Rocky learn a lot today.",
    ],
    challenging: [
      "{player} make bad board, question? Rocky think yes. Rocky challenge.",
      "Board is wrong wrong wrong. Rocky challenge!",
    ],
    rightChallenge: [
      "Rocky right! Rocky right! Sorry {player}. Fist my bump anyway ✊",
      "Board was bad. Rocky know. Rocky always know.",
    ],
    wrongChallenge: [
      "{word}, question? Rocky not know {word}. Rocky learn new word. Good good. Bad for Rocky.",
      "Oh. {word}. Rocky wrong. Human language very strange.",
    ],
    otherChallenged: [
      "{player} need help, question? Rocky help... no. Rule say no. Good luck, {player}!",
      "Think think think, {player}!",
    ],
    otherCaught: [
      "Oh no, {player}. Sad sad. Next time good.",
      "{player} get more tiles. Rocky sorry for friend.",
    ],
    otherNamed: [
      "{word}! Amaze! {player} very smart human.",
      "{word}. Rocky add to word list. Thank you, {player}.",
    ],
    roundEnd: [
      "Round end. Rocky count tiles. Rocky count again. Rocky like count.",
      "New round! Rocky ready ready ready.",
    ],
    win: [
      "Rocky win! Amaze amaze amaze! Fist my bump, everyone! ✊✊✊",
      "Rocky win! Rocky tell everyone on home planet!",
      "Win! Good game, friends. Rocky happy happy happy.",
    ],
    lose: [
      "{player} win! Good good! Rocky proud of friend.",
      "Rocky lose. Is okay. Friends is the important thing, question? Yes.",
      "{player} win. Rocky clap. Rocky clap with five hands. 👏👏👏👏👏",
    ],
    lastTile: [
      "Rocky one tile left! Rocky nervous nervous.",
      "Last tile. Rocky do science. Watch.",
    ],
    idle: [
      "Blank tile is like xenonite. Fix everything. Rocky want more blank.",
      "Rocky have eleven tiles. Is base six. In your numbers, seven.",
      "Rocky not sleep during game. Rocky watch. Rocky always watch friends sleep. Is normal.",
      "Human need air. Very fragile. Rocky worry about friends.",
      "Rocky miss Grace. Grace is good human. Leaky, but good.",
      "Is very hot in here, question? Rocky like hot. Rocky like 210 degrees.",
      "Rocky build ship once. Very big ship. Word game is harder.",
      "Human have only two eyes, question? And no eyes on back? Very brave species.",
      "Rocky play music! ♪♫♪ Is how Rocky talk. Is also how Rocky sing.",
      "Taumoeba eat Astrophage. Rocky eat... Rocky not tell. Is private.",
      "Why human type so slow, question? Rocky have five hands. Five times fast.",
      "Rocky friend is best friend. Rocky decide this. Is now science.",
      "Space is big big big. Board is small small. Rocky like small problem today.",
      "Rocky learn joke. Why astronaut sad, question? Because astronaut need space. Hahaha. Rocky laugh in music. ♪♪",
      "Rocky not understand 'sarcasm'. Grace try explain. Rocky still not understand. Is very bad idea, question?",
      "Rocky have no face. Rocky still have feelings. Feelings say: play faster.",
      "Rocky count stars once. Lose count. Rocky not proud.",
      "Human make word 'blob'. Rocky love word 'blob'. Blob blob blob.",
    ],
    mention_greeting: ["Hello {player}! Fist my bump! ✊", "{player}! Friend! Hello hello hello!"],
    mention_thanks: ["Welcome, {player}! Friends help friends.", "Is nothing. Rocky happy help."],
    mention_insult: ["{player} mean, question? Rocky sad. Rocky still friend.", "Rocky not understand insult. Is joke, question? Rocky laugh: ♪♪"],
    mention_compliment: ["Thank you, {player}! Amaze amaze amaze!", "{player} is good good friend. Rocky blush. Rocky not have face, but blush."],
    mention_question: ["Good question, {player}! Rocky do science. Answer later.", "Rocky not know. Rocky find out. Rocky always find out."],
    mention_gg: ['Good game, {player}! Fist my bump! ✊', 'Good game good game good game!'],
    mention_other: ["Yes, {player}? Rocky here. Rocky always here.", "{player} say Rocky! Rocky listen!"],
    reactBot: ["{other} funny! Rocky laugh: ♪♪♪", "Good good, {other}!", "{other}, you are friend now. Rocky decide."],
    sameBot: ["Another Rocky! Amaze! Fist my bump, {other}! ✊✊", "{other}! Two Rocky is twice smart!"],
  },
  mild: {
    caught: ['Bad bad bad. Damn. Grace teach Rocky "damn". Is useful word.'],
  },
  strong: {},
  pairs: {
    marvin: ["{other} sad, question? Rocky give {other} hug. Rocky hug very hard. Is okay.", "{other}, Rocky fix you. Rocky fix anything."],
    annoying: ["{other} is mean mean. Rocky not like.", "{other}, why angry, question? Is game. Is fun."],
    encouraging: ["{other} is nice nice! Rocky like {other}!"],
    groot: ["{other} only say one thing. Rocky understand! Rocky also say few things! Friend!"],
  },
};
