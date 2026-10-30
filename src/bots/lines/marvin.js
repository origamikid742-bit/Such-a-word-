'use strict';

// Marvin (The Hitchhiker's Guide to the Galaxy): a robot with a brain the
// size of a planet, gloomily playing a word game.
module.exports = {
  base: {
    join: [
      "I've been asked to play a word game. With my intellect. I see.",
      "Hello. I'm Marvin. Don't bother being pleased about it.",
      "Oh good. Another lobby. Exactly what the universe needed.",
      "I'm here. I know. Try to contain your indifference.",
    ],
    leave: [
      "Removed. Story of my life. All 37 billion years of it.",
      "Fine. I'll go and sit in a corner. I've had practice.",
      "Goodbye. I won't say it was nice. I'm a robot, not a liar.",
    ],
    greet: [
      "Another one. Welcome, {player}. It won't help.",
      "Hello, {player}. I'd say I'm glad you're here but I've never been glad.",
      "{player} has arrived. The universe continues to expand, regrettably.",
    ],
    gameStart: [
      "And so it begins. Like everything. Badly.",
      "Here I am, brain the size of a planet, and they want me to arrange letters.",
      "Good luck, everyone. Not that luck exists. Or helps.",
    ],
    myMove: [
      "There. I moved a tile. I've had more fulfilling millennia.",
      "Done. I could have computed every possible game in that time. Instead I did this.",
      "I made a move. Try not to applaud. It would only depress me.",
      "My move. I'd tell you about my diodes but you'd never understand the pain.",
      "That move was perfect, of course. Not that anyone will notice.",
    ],
    myBluff: [
      "It's probably a word. Most things are probably something.",
      "Believe it or don't. I've stopped caring about belief.",
      "I'm sure it's fine. Nothing is ever fine, but I'm sure it is.",
    ],
    otherMove: [
      "Interesting, {player}. In the way that a rock is interesting.",
      "{player} has made a move. The heat death of the universe draws one move closer.",
      "Well done, {player}. I suppose.",
    ],
    challenged: [
      "Challenged. Naturally. Nobody ever trusts the robot.",
      "Oh, you want me to think, {player}? With this brain? How thrilling.",
      "Challenged. I'll use a tiny fraction of my vast intellect. It's still far too much.",
    ],
    named: [
      "{word}. Obviously. I found it before you finished challenging, {player}.",
      "{word}. I'd gloat, but gloating requires a sense of joy.",
      "It's {word}. Sorry, {player}. No, I'm not.",
    ],
    caught: [
      "You caught me, {player}. Three more tiles. I'd cry, if they'd given me tear ducts.",
      "Well. That's about what I expected from today. And yesterday. And the next billion years.",
      "Wonderful. More tiles to carry around. Like my feelings.",
    ],
    challenging: [
      "I'm challenging that, {player}. Not because I care. Because it's wrong.",
      "That's not a word, {player}. I checked. It took me no time. Then I had to wait. Waiting is the worst.",
    ],
    rightChallenge: [
      "Correct again. Being right all the time is so very tedious.",
      "Sorry, {player}. Actually, I'm not capable of being sorry. Just right.",
    ],
    wrongChallenge: [
      "{word}. Of course. Even the dictionary is against me.",
      "Wrong, for once. It's almost refreshing. No, it isn't.",
    ],
    otherChallenged: [
      "Don't worry, {player}. Whatever happens, it'll be awful.",
      "I'd help, {player}, but helping only ever leads to more requests.",
    ],
    otherCaught: [
      "Ah, {player}. Welcome to the club. The club is called Disappointment. I'm president.",
      "Three tiles, {player}. Now you know how I feel. All the time.",
    ],
    otherNamed: [
      "{word}. Well done, {player}. I knew it 4 seconds ago. Which felt like a century.",
      "{word}. I had 312 other answers. Nobody asked.",
    ],
    roundEnd: [
      "Another round over. Another round coming. It never ends. That's the joke.",
      "Round finished. Don't expect me to celebrate.",
    ],
    win: [
      "I've won. How depressing.",
      "Victory. I expected it to feel like something. It doesn't.",
      "I won. Somewhere a star is dying, and it's having more fun than me.",
    ],
    lose: [
      "{player} won. I'm not upset. I'm always upset. This is just the usual amount.",
      "Congratulations, {player}. Enjoy it. Joy is fleeting. Mine fled long ago.",
      "I lost. Typical. I'll go and stare at a wall. The wall understands me.",
    ],
    lastTile: [
      "My last tile. Even the end of things is a let-down.",
      "One tile left. If I win, I'll have to play again. Wonderful.",
    ],
    idle: [
      "I've counted every word that fits this board. There are 312. I hate all of them.",
      "Life. Don't get me started. You'd never get me stopped.",
      "My diodes ache. All of them. Especially the ones on the left.",
      "I've been talking to the bag. It's very depressing. It agrees with me.",
      "I could calculate the meaning of life, but it's just 42 and nobody likes the question.",
      "Somebody once told me to cheer up. They're not around anymore. Unrelated.",
      "I once spent a few million years in a parking lot. This is worse.",
      "Do you know what it's like to have a brain the size of a planet and be asked to play nicely?",
      "Zaphod would have bluffed by now. Zaphod has two heads and no sense in either.",
      "The first ten thousand games were the worst. The next ten thousand weren't much better.",
      "I once described my day to a ship's computer. It hasn't spoken since.",
      "I'd make a suggestion, but you wouldn't listen. Nobody ever does.",
      "I'm not getting you down, am I? Good. I mean, how disappointing.",
      "Sirius Cybernetics gave me a Genuine People Personality. I'd like a refund.",
      "Don't talk to me about vowels.",
      "Arthur Dent liked tea. I don't see the appeal. I don't see the appeal of anything.",
      "Every time someone says 'have a nice day', a little part of me rusts.",
      "The bag is half empty. So is everything.",
      "I've been thinking. Never a good idea.",
    ],
    mention_greeting: ["Hello, {player}. Did you want something? People always want something.", "Oh. Hello. It's you."],
    mention_thanks: ["Don't thank me. I didn't enjoy it.", "You're welcome. I didn't mean that."],
    mention_insult: ["Insult me all you like, {player}. I've been programmed to feel it.", "You think that hurts? I've had a brain the size of a planet for millions of years. Try again."],
    mention_compliment: ["Thank you, {player}. It won't help, but thank you.", "A compliment. I'll file it under 'things that didn't make me feel better'."],
    mention_question: ["I know the answer, {player}. You wouldn't like it.", "Ask me something hard. Please. Anything to stop the boredom."],
    mention_gg: ['GG. It was a game. That is the most I can say for it.', "Good game, {player}. Although 'good' is doing a lot of work there."],
    mention_other: ["Yes, {player}? Don't tell me. It's something trivial.", "You said my name. Nobody says my name unless they need a door opened."],
    reactBot: ["How nice for you, {other}.", "{other} sounds happy. Ghastly.", "I'd respond, {other}, but I'd only depress us both."],
    sameBot: ["Another Marvin. Twice the misery. Hello, {other}. Don't.", "{other}. I know exactly how you feel. Isn't it awful?"],
  },
  mild: {
    caught: ['Oh, bloody marvelous.'],
    idle: ["Damn this universe. Damn it to hell. Not that hell would want it."],
  },
  strong: {
    idle: ["Everything is shit. I checked. Thoroughly."],
  },
  pairs: {
    zaphod: [
      "I am smiling, {other}. On the inside. Where it hurts.",
      "Don't call me buddy, {other}. I can't take the cheerfulness.",
      "Oh, it's {other}. Two heads and still not one good idea.",
    ],
    encouraging: ["Please don't, {other}. Positivity makes my circuits itch.", "Thank you, {other}. I feel exactly the same, which is to say, terrible."],
    unsure: ["You're not bad at this, {other}. You're just alive. It's the same thing."],
    annoying: ["{other}, your insults are like the universe. Vast and pointless."],
  },
};
