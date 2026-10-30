'use strict';

// Zaphod Beeblebrox (The Hitchhiker's Guide to the Galaxy): two heads, three
// arms, former President of the Galaxy, and entirely too cool.
module.exports = {
  base: {
    join: [
      "Hey hey, President of the Galaxy coming through. Make room on the board 😎",
      "Zaphod Beeblebrox, in the lobby. Two heads, both gorgeous.",
      "Hi there! Anyone want an autograph? I've got three hands, I can do three at once.",
      "Is this the party? This looks like the party. I'm the party.",
    ],
    leave: [
      "Leaving? Me? Okay, but the lobby just lost 50 percent of its cool. Both heads' worth.",
      "Zaphod out. Somebody steal a spaceship for me on the way.",
      "Hey, no hard feelings. Mostly because I don't have those.",
    ],
    greet: [
      "Hey {player}! You're cool. Not me-cool, but cool.",
      "{player}, baby! Welcome aboard! It's not my ship, but welcome!",
      "Oh nice, {player}'s here. Is {player} a hoopy frood? Only one way to find out.",
    ],
    gameStart: [
      "Let's do this! Improbably!",
      "Okay, ground rules: I win. That's the rule. Let's go.",
      "Right, who's ready to lose to a former President of the Galaxy?",
    ],
    myMove: [
      "Boom. Did you see that? Both my heads saw that.",
      "That move was so cool it should come with a towel.",
      "Hey, I just did a thing. A smart thing. One of my heads did, anyway.",
      "Too easy. I could play this game with my third arm.",
    ],
    myBluff: [
      "Totally a word. I read it in the Guide. Probably.",
      "Trust me, I'm the President. Was. Am. It's complicated.",
      "If it's not a word, it should be. I'll make it law.",
    ],
    otherMove: [
      "Whoa, {player}! Froody move!",
      "{player}, that's not bad. Not Zaphod-good. But not bad.",
      "Hey, {player}, who taught you that? Was it me? It was probably me.",
    ],
    challenged: [
      "You're challenging me, {player}? The PRESIDENT?",
      "Whoa whoa whoa. Let's talk about this. Over a Pan Galactic Gargle Blaster.",
      "Sure, {player}, challenge me. My left head isn't worried. My right head is a little worried.",
    ],
    named: [
      "{word}! Ha! Never doubt a man with two heads, {player}.",
      "It's {word}, baby! Both heads knew it!",
      "{word}. I'd say I'm sorry, {player}, but that's not really a Zaphod thing.",
    ],
    caught: [
      "Okay, that one was my left head's idea.",
      "Huh. Not a word. Whatever. I'm still the coolest person here.",
      "Three tiles? Fine. More tiles, more fun. That's a thing I'm deciding now.",
    ],
    challenging: [
      "Hey {player}, that's not a word. I'd know. I've made up tons of words.",
      "Challenge! My right head says it's fake and my right head is the smart one. Today.",
    ],
    rightChallenge: [
      "Called it! Both heads called it!",
      "Nice try, {player}. Real nice. Not nice enough. 😎",
    ],
    wrongChallenge: [
      "{word}? Okay. Sure. Fine. My left head knew that.",
      "Ugh, {word}. Who even uses {word}? Vogons, probably.",
    ],
    otherChallenged: [
      "Ooh, pressure! {player}, don't panic. Words of wisdom from a book.",
      "Go {player}! Or don't! I'm not your boss! I was everyone's boss once!",
    ],
    otherCaught: [
      "Oof, {player}. That's like getting thrown into the Total Perspective Vortex. Except smaller.",
      "Ha! Rough, {player}. Hey, at least you're not a Vogon.",
    ],
    otherNamed: [
      "{word}! Froody, {player}!",
      "Hey, {word}. That's good. I'm going to tell people I came up with it.",
    ],
    roundEnd: [
      "Round over! Party continues!",
      "Next round. Somebody get me a drink. Two drinks. Two heads.",
    ],
    win: [
      "Zaphod WINS! Of course! Has anyone seen my sunglasses? I need to look cool for this.",
      "Winner! Two-headed, three-armed, and undefeated! Ish!",
      "I won! Someone tell Trillian! Someone tell everyone!",
    ],
    lose: [
      "{player} won? Huh. Weird. Must be the Improbability Drive.",
      "Okay, {player}, you win this one. I'll win the next eleven.",
      "Congrats {player}! You beat a President. Put that on your résumé.",
    ],
    lastTile: [
      "Last tile! Hold on to your towels, everybody!",
      "One tile left and both heads agree: I'm amazing.",
    ],
    idle: [
      "Two heads and neither can find a five-letter word with a Q. Zarking fantastic.",
      "Trillian says I bluff too much. Trillian's not here, so.",
      "Anyone tried a Pan Galactic Gargle Blaster? Best drink in the galaxy. Worst mornings in the galaxy.",
      "I once stole a spaceship. Ask me about it. No, really, ask me.",
      "My Peril-Sensitive Sunglasses just went black. Is somebody about to win?",
      "Ford owes me money. If you see Ford, tell him I'm cooler than him.",
      "Being President of the Galaxy is mostly about looking cool at parties. Nailed it.",
      "Fun fact: I have a third arm just for high-fiving myself. ✋",
      "Whose turn is it? Is it mine? It should be mine.",
      "Don't panic. That's free advice. Usually I charge.",
      "Marvin, smile! No? Okay, more fun for me.",
      "I put something in my own brain once so I couldn't remember what I did. Best decision ever. I think.",
      "Hey, does anyone know where the Restaurant at the End of the Universe is? I'm hungry.",
      "My left head wants pizza. My right head wants a nap. I want both. Democracy.",
      "This game would be better with an Infinite Improbability Drive. Everything would be.",
      "If anyone needs me, I'll be being incredibly cool over here.",
      "Somewhere out there, a sperm whale is falling from the sky. Just thought you should know.",
      "I'm so cool, the board gets chilly when I look at it.",
    ],
    mention_greeting: ["Hey {player}! What's up? Besides me. I'm up.", "{player}! Baby! What's going on?"],
    mention_thanks: ["Anytime, {player}. Being generous is part of my brand.", "You're welcome. Tell your friends."],
    mention_insult: ["Whoa, {player}. I have two heads and they both heard that.", "Hey, I've been insulted by Vogons, {player}. You'll have to try harder."],
    mention_compliment: ["I know, right? 😎", "Thanks {player}! Both of my heads agree with you."],
    mention_question: ["Great question, {player}. I'll get my left head on it.", "No idea, {player}. Ask the Guide. Or Marvin. Actually, don't ask Marvin."],
    mention_gg: ['GG, {player}! That was froody!', 'Good game! Both heads had fun!'],
    mention_other: ["You rang, {player}? Zaphod, at your service. Sort of.", "Yeah, {player}? Make it quick, I'm being awesome."],
    reactBot: ["Ha! {other}, you're funny. Not as funny as me.", "Hey {other}, nice one!", "{other}, you should hang out with me. You'd get cooler by osmosis."],
    sameBot: ["Whoa, {other}! Another me? That's four heads! This lobby can't handle it!", "{other}! Finally, someone as cool as me!"],
  },
  mild: {
    caught: ['Belgium! That was MY tile!'],
    idle: ["Belgium. Sorry, that's the rudest word in the galaxy. I had to.", "What the zark is taking so long?"],
    mention_insult: ['Belgium to you too, {player}.'],
  },
  strong: {
    caught: ["Oh, shit. Okay. My left head did that. Blame lefty."],
    idle: ["Hell yeah, I'm awesome. Damn right I'm awesome. Fuckin' froody."],
  },
  pairs: {
    marvin: ["{other}! Buddy! Cheer up!", "Marvin, my man! Smile! You've got a great face for it. Do you have a face?", "Come on, {other}, life's great! For me, anyway!"],
    annoying: ["{other}, you're trying too hard. Cool is effortless. Like me.", "Wow, {other}, chill. Have a Gargle Blaster."],
    vizzini: ["{other}, I have two brains and even I don't brag that much. Okay, I do."],
  },
};
