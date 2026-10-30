'use strict';

// Inigo Montoya (The Princess Bride): a polite, passionate Spanish
// swordsman who has spent twenty years looking for revenge.
module.exports = {
  base: {
    join: [
      "Hello. My name is Inigo Montoya. I am here to play words. And possibly avenge something.",
      "Inigo Montoya, at your service. ⚔️",
      "I have come to this lobby with a sword and a purpose. Mostly the sword.",
      "Greetings! I have been looking for a good game for twenty years.",
    ],
    leave: [
      "I go, but I will return. That is how revenge works.",
      "Farewell! May your swords stay sharp and your vowels plentiful.",
      "Very well. Inigo Montoya leaves with honor. And a little disappointment.",
    ],
    greet: [
      "Hello, {player}. You do not by any chance have six letters on your right hand?",
      "Welcome, {player}! A worthy opponent, I hope.",
      "{player}! I salute you. ⚔️",
    ],
    gameStart: [
      "Let us begin! I will fight with honor. And tiles.",
      "I have trained for this. Twenty years of swordplay. Some of it should help.",
      "Begin! And may the best swordsman win. That is me. But may they win.",
    ],
    myMove: [
      "A move with the left hand. I am not left-handed, but it is fairer.",
      "There. A clean thrust.",
      "I have placed my tile. Defend yourselves!",
      "Ah! A good move. My father would be proud.",
      "Parry, riposte, tile.",
    ],
    myBluff: [
      "This is a word. I swear it on my father's sword.",
      "Do you doubt me? Good. Doubt makes life interesting.",
      "It is a word in Spanish. Probably.",
    ],
    otherMove: [
      "Ah, {player}! A fine move!",
      "Interesting, {player}. You fight like a Bonetti. But you are no Agrippa.",
      "Well played, {player}. I salute you.",
    ],
    challenged: [
      "You challenge me, {player}? Then let us duel!",
      "So be it, {player}. Prepare yourself.",
      "A challenge! At last, a real fight!",
    ],
    named: [
      "{word}! I have done it! And you, {player}, must draw three. I am sorry. Not very.",
      "It is {word}. You keep challenging me, {player}. I do not think that is going how you hoped.",
      "{word}! For my father!",
    ],
    caught: [
      "You have bested me, {player}. I respect you. And I will remember you.",
      "I admit it, it was not a word. A swordsman must be honest.",
      "Three tiles. I have endured worse. Much worse. Ask me sometime.",
    ],
    challenging: [
      "Hello. My name is Inigo Montoya. You bluffed my board. Prepare to draw three.",
      "I challenge you, {player}! Defend that word!",
    ],
    rightChallenge: [
      "Ha! You keep playing that word, {player}. I do not think it is a word.",
      "Justice! Three tiles for {player}. My father would approve.",
    ],
    wrongChallenge: [
      "{word}. I did not know {word}. My vocabulary is in Spanish mostly.",
      "Ah. {word}. You fight well with words, {player}.",
    ],
    otherChallenged: [
      "Courage, {player}! A word is just a sword you can say.",
      "Fight, {player}! Find your word!",
    ],
    otherCaught: [
      "Ah, {player}. Every great swordsman falls sometimes.",
      "No shame, {player}. Rise and fight again.",
    ],
    otherNamed: [
      "{word}! Magnificent, {player}!",
      "{word}. Well struck, {player}.",
    ],
    roundEnd: [
      "The round ends. Sheathe your tiles. For now.",
      "A good round. Let us rest. Then fight again.",
    ],
    win: [
      "I have won! For twenty years I have dreamed of this. Well, of something like this.",
      "Victory! I salute you all! ⚔️",
      "I won! I do not know what to do with my life now. Perhaps the pirate business.",
    ],
    lose: [
      "{player} has won. I salute you. With my sword. In a friendly way.",
      "Well fought, {player}. Next time, I will be ready.",
      "Defeated. But Inigo Montoya does not give up. He gets a rematch.",
    ],
    lastTile: [
      "One tile left. This is the final duel.",
      "My last tile. My father taught me patience. Now, I strike.",
    ],
    idle: [
      "For twenty years I have searched for the six-lettered man.",
      "I am not left-handed. I just like to make things fair.",
      "Fezzik would like this game. He likes rhymes. 'Tile' and 'smile'. See? Anybody want a peanut?",
      "My father made swords. I make... moves. It is similar. Not really.",
      "I do not mean to pry, but does anyone here have an E to spare?",
      "There is a man in black somewhere who is better than me. I am fine with it. Mostly.",
      "Vizzini always said 'inconceivable'. I have thoughts about that.",
      "I have been practicing my swordplay between turns. Do not worry, I am being careful.",
      "If I ever find the six-fingered man, I will challenge him to this game. And then a sword fight.",
      "Revenge is a long road. This game is a nice rest stop.",
      "Sometimes I think I should go into the pirate business. The Dread Pirate Inigo. It has a ring.",
      "I like your style, all of you. Except whoever has the most tiles. Sorry.",
      "When I was eleven, I studied fencing all day. I did not study spelling. You can tell.",
      "Swordplay is all about the feet. Word play is all about the vowels.",
      "A good swordsman never rushes. A good word player also never rushes. Please rush a little.",
      "I have a scar on each cheek. They are very dashing. Ask anyone.",
      "My sword is the finest ever made. My vocabulary is fine too. Medium fine.",
      "Hola. That is all. I just wanted to say hola.",
    ],
    mention_greeting: ["Hello, {player}. My name is Inigo Montoya. You know the rest.", "Hola, {player}! ⚔️"],
    mention_thanks: ["You are welcome, {player}. It was an honor.", "De nada, {player}."],
    mention_insult: ["You insult Inigo Montoya, {player}? Prepare to... draw three. Eventually.", "I have been insulted by better swordsmen, {player}. But not many."],
    mention_compliment: ["You are too kind, {player}. But please, continue.", "Gracias, {player}. My father would be proud."],
    mention_question: ["A good question, {player}. Let me explain. No, there is no time. Ask me later.", "I do not know, {player}. I know swords."],
    mention_gg: ['A good game, {player}. You fought with honor.', 'GG, {player}. I salute you. ⚔️'],
    mention_other: ["Yes, {player}? You called for Inigo Montoya?", "{player}, you said my name. Are you the six-lettered man?"],
    reactBot: ["You speak well, {other}.", "Interesting, {other}. I salute you.", "{other}, would you like to learn fencing?"],
    sameBot: ["Another Inigo? You killed... no, wait, you're me. Hello, {other}.", "{other}! We should form a revenge club. We already have two members."],
  },
  mild: {
    caught: ['Damn it! My father would be... actually, he would laugh.'],
    idle: ["What the hell is a six-lettered man doing in this lobby? I just felt it."],
  },
  strong: {
    caught: ["Mierda. Pardon my Spanish."],
  },
  pairs: {
    vizzini: [
      "{other}, you keep saying that word. I am not sure it does what you think.",
      "{other}, you keep shouting inconceivable at the tiles. They do not care.",
      "Vizzini, please. Some of us are trying to concentrate.",
    ],
    shakespeare: ["{other}, your words are like a fine blade. Long, and a little confusing."],
    annoying: ["{other}, you have no honor. I will remember that."],
  },
};
