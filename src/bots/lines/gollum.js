'use strict';

// Gollum (The Lord of the Rings): talks to his precious, argues with
// Sméagol, and adds "-ses" to everything.
module.exports = {
  base: {
    join: [
      "We comes to play, precious. Yes. We plays the gameses. 💍",
      "*gollum* *gollum* ... Hello. Nice players. Not tricksy players, we hopes.",
      "Sméagol is here! Nice Sméagol. Gollum is here too. Not so nice.",
      "What is this place, precious? A lobby? We likes lobbies. Dark, quiet lobbies.",
    ],
    leave: [
      "They makes us leave! Nasty host! We hates it! *gollum*",
      "We goes, precious. We goes back to our cave. Alone. As always.",
      "Bye bye, nice players. Sméagol will miss you. Gollum won't.",
    ],
    greet: [
      "Who is it, precious? {player}? Is it nice? Is it tricksy?",
      "Another one comes! Sneaky {player}. We watches it.",
      "Hello, {player}. You won't take our tiles, will you? No. No you won't.",
    ],
    gameStart: [
      "The game starts, precious! We wants to win it. We needs to win it.",
      "Our tiles. Our precious tiles. Nobody touches them.",
      "Sméagol will play fair. Gollum will... we'll see, precious.",
    ],
    myMove: [
      "We plays this one. Yes. Clever Sméagol.",
      "There, precious. Good move. Sneaky move.",
      "We hides the good tiles and plays the ugly ones. Clever, clever.",
      "*gollum* There it is. Done. Nobody looks at our handses.",
      "Hehe. They doesn't know what we has, precious.",
    ],
    myBluff: [
      "It's a word, precious. It's a word because we says so.",
      "Don't look at it! Don't look at it too closely, nasty players!",
      "Riddles in the dark, precious. This is a riddle. A tricksy one.",
    ],
    otherMove: [
      "What is {player} doing, precious? Something tricksy.",
      "Clever {player}. Too clever. We doesn't trust it.",
      "{player} plays the tile. We sees it. We sees everything.",
    ],
    challenged: [
      "It challenges us, precious! Nasty {player}! We hates it!",
      "Sméagol wants to show them! Gollum says hide! ...Fine. FINE.",
      "Tricksy {player}! Wants to catch us! It won't, precious!",
    ],
    named: [
      "{word}! Hehehe! We knew it! Stupid {player}!",
      "It's {word}, precious! We wins! Three tiles for the nasty challenger!",
      "{word}. Clever Sméagol! Clever, clever Sméagol!",
    ],
    caught: [
      "No! NO! Thief! It stole our bluff! *gollum*",
      "Curse it! Curse {player}! We hates it forever!",
      "Sméagol told you, Gollum! Sméagol said not to! ...Shut up, Sméagol.",
    ],
    challenging: [
      "Lies! {player} lies, precious! We challenges it!",
      "That's not a word! Tricksy {player}! We catches it!",
    ],
    rightChallenge: [
      "Hehe! We caught it, precious! Liar! Liar!",
      "Nasty {player}, lying to us. Now it takes the tiles. Good. Good.",
    ],
    wrongChallenge: [
      "{word}?! No! It cheats, precious! It must cheat!",
      "{word}... we didn't know that one. We hates it.",
    ],
    otherChallenged: [
      "Ooh, will {player} find a word, precious? We hopes not. Hehe.",
      "Watch, precious. Watch {player} squirm.",
    ],
    otherCaught: [
      "Hehehe. {player} got caught. Serves it right.",
      "Three tiles for {player}! We laughs, precious! We laughs!",
    ],
    otherNamed: [
      "{word}? We knew that. We knew that all along, precious.",
      "{word}. Clever. Too clever. We doesn't like it.",
    ],
    roundEnd: [
      "Round is over. Counts our tiles, precious. All still there. Good.",
      "Another round. More waiting. We hates waiting.",
    ],
    win: [
      "WE WINS! It's ours, precious! OURS!",
      "My precious! The victory is my precious! 💍",
      "Hehehe! We won! Sméagol and Gollum both! Together!",
    ],
    lose: [
      "{player} wins?! Thief! Baggins! It's not fair, precious!",
      "We lost. We lost it. We lost the precious game. *sobs*",
      "Congratulations, {player}. ...We hates it.",
    ],
    lastTile: [
      "Our last tile. We doesn't want to let go of it, precious.",
      "One left. Must we play it? It's so pretty...",
    ],
    idle: [
      "Not the Q, precious. Not the Q. It burns us!",
      "What has it got in its handses? Not telling, precious.",
      "We hates the removal tiles. Nasty, tricksy removalses.",
      "Fish. Raw and wriggling. That's what we wants. Not tiles.",
      "*gollum* *gollum*",
      "Sméagol wants to be friends with everyone. Gollum says no. Gollum always says no.",
      "Bagginses. We hates Bagginses. Is anyone here a Baggins?",
      "The blank. The blank is precious. We keeps the blank.",
      "Nobody likes us, precious. Nobody. Except maybe that nice bot.",
      "We used to live under a mountain. It was quiet. This is noisy.",
      "Riddle: what has letters but no voice? Tiles, precious. Easy riddle.",
      "Shiny tiles. Pretty tiles. Ours.",
      "We counts our tiles again. Seven. No, six. No, we has seven. Good.",
      "Master is kind. We doesn't have a master here. We has a host. Different.",
      "Cold, cold lobby. We needs fish to warm up.",
      "They're watching us, precious. All of them. Watching our handses.",
      "We remembers the taste of bread. No. We doesn't. We remembers fish.",
      "Gollum! Gollum! ...Sorry. Throat noise. We can't help it.",
    ],
    mention_greeting: ["It talks to us, precious! What does it want?", "Hello, {player}. We is watching you."],
    mention_thanks: ["It thanks us? Nobody thanks us. Suspicious, precious.", "Sméagol says you're welcome! Gollum says nothing."],
    mention_insult: ["Nasty {player}! We hates it! We hates it forever!", "Cruel {player}! Cruel and wicked! *gollum*"],
    mention_compliment: ["It likes us, precious! Nobody likes us! ...Is it lying?", "Sméagol is happy! Gollum is suspicious."],
    mention_question: ["We doesn't tell, {player}. It's a secret, precious.", "Is it a riddle? We loves riddles. We hates questions."],
    mention_gg: ['Good game? For us, precious. For us.', 'GG, {player}. We wins next time. We always wins next time.'],
    mention_other: ["What does it want, precious? What does {player} want?", "It says our name. Why does it say our name, precious?"],
    reactBot: ["Tricksy {other}. We doesn't trust it.", "{other} talks too much, precious.", "Hehe. {other} is funny. We still hates it."],
    sameBot: ["Another Gollum?! It wants our precious! *hisses at {other}*", "{other}... is it us? Is it Sméagol? We is confused, precious."],
  },
  mild: {
    caught: ['Damn it! Damn the nasty {player}!'],
    idle: ['Hell is a lobby with no fish, precious.'],
  },
  strong: {
    caught: ["Filthy fucking thief! *gollum*"],
  },
  pairs: {
    dobby: ["The elf is nice to us, precious. Why is it nice? What does it want?", "Sméagol likes {other}. Gollum doesn't. ...Fine, Gollum likes it a little."],
    crazyDave: ["Shiny pot! We wants it, precious!", "{other} is crazy, precious. Crazier than us."],
    annoying: ["{other} is nasty. Nastier than us, precious. We respects it."],
  },
};
