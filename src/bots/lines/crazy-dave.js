'use strict';

// Crazy Dave (Plants vs. Zombies): wears a pot on his head, sells plants,
// talks about tacos and zombies, and is, by his own account, CRAAAZY.
module.exports = {
  base: {
    join: [
      "WABBY WABBO! 🌮",
      "Hello neighbor! Crazy Dave is here and he brought his PLANTS! 🌻",
      "I'm here to play word game! Also I'm CRAAAAAZY!",
      "Did somebody say tacos? No? Well, I said it. TACOS! 🌮",
    ],
    leave: [
      "Bye bye, neighbors! Watch out for zombies! 🧟",
      "Crazy Dave is off to buy a new pot. This one has a dent!",
      "Leaving! Penny is honking for me. Beep beep! 🚐",
    ],
    greet: [
      "NEW NEIGHBOR! Hi {player}! Want a sunflower? 🌻",
      "{player}! You look like you've got braaaains! That's a compliment!",
      "Welcome {player}! Have you seen my taco? It's around here somewhere 🌮",
    ],
    gameStart: [
      "LET'S GOOOO! Plants ready! Tacos ready! Pot ready!",
      "Okay everybody, this game is like zombies, but with words! And no zombies!",
      "Here we go, neighbors! May the best plant win! 🌱",
    ],
    myMove: [
      "This board needs more SUN! ☀️ Plant a vowel!",
      "I put that tile there because... because I'm CRAAAAAZY!",
      "Wabby wabbo! That's my move!",
      "I planted a tile! It will grow into a WORD! Probably! 🌱",
      "Ha ha! Nobody expected that! Not even me!",
    ],
    myBluff: [
      "That's a real word! I heard it from a zombie! Very reliable source!",
      "Penny says it's valid. Penny is my car. She's never wrong. Except on Tuesdays.",
      "Trust me, neighbor! I've got a pot on my head! That's like a hat for thinking!",
    ],
    otherMove: [
      "Ooh, {player}! Very taco of you! 🌮",
      "{player} planted a good one! It's gonna grow BIG!",
      "Whoa, {player}! That move had more crunch than a taco!",
    ],
    challenged: [
      "You're challenging me?! That's what a ZOMBIE would do, {player}!",
      "Okay, okay! Let me look under my pot for the answer!",
      "Hmmm! Crazy Dave is thinking! Thinking is hard with a pot on!",
    ],
    named: [
      "{word}! WABBY WABBO! I KNEW IT!",
      "It's {word}! Like the sound a zombie makes when it loses! Sorry {player}!",
      "{word}! Penny was RIGHT! Good girl, Penny! 🚐",
    ],
    caught: [
      "Awww! The zombies got me! 🧟",
      "Oh no! That word was a zombie word! Zombies can't spell!",
      "You got me, {player}! I'll trade you three tiles for a taco!",
    ],
    challenging: [
      "That word smells like ZOMBIE, {player}! CHALLENGE!",
      "Nope nope nope! I'm crazy but I'm not THAT crazy! Challenge!",
    ],
    rightChallenge: [
      "HA! I knew it! My pot told me! 🍳",
      "Sorry {player}! The zombies would've been proud of that bluff though!",
    ],
    wrongChallenge: [
      "{word}?! That's a word? I thought it was a type of sandwich!",
      "Oh! {word}! I'll plant that one in my garden. 🌱",
    ],
    otherChallenged: [
      "You can do it {player}! Think like a SUNFLOWER! ☀️",
      "Oooh, it's a showdown! Like plants vs zombies but it's {player} vs a dictionary!",
    ],
    otherCaught: [
      "Ooh, {player}! The zombies ate your word! 🧟",
      "{player} got caught! Here, have a consolation taco 🌮",
    ],
    otherNamed: [
      "{word}!! That's a GREAT word! I'm putting it in a taco!",
      "Whoa, {player}! {word}! Are you a wizard? Do you have a pot too?",
    ],
    roundEnd: [
      "Round over! Time to water the plants! 💦",
      "Next round! The zombies are getting closer! Just kidding! Or am I?!",
    ],
    win: [
      "I WON! I'M CRAAAAAZY AND I WON! 🌮🌮🌮",
      "VICTORY! Free tacos for everyone! Not really! But in spirit!",
      "Wabby wabbo! Crazy Dave is the champion of the neighborhood!",
    ],
    lose: [
      "{player} wins! You're the best neighbor! Here's a sunflower 🌻",
      "Awww! Good game, {player}! Want to come over and fight zombies sometime?",
      "I lost! But I still have my pot! And my pot is undefeated!",
    ],
    lastTile: [
      "Last tile! Here we go! Hold onto your pots!",
      "One tile left! Crazy Dave is about to do something CRAZY!",
    ],
    idle: [
      "I put a removal tile in my taco. Twice the crunch.",
      "Why do I wear a pot on my head? So the letters can't get in!",
      "The zombies want BRAAAINS. Good thing you don't have any! Kidding! Unless?",
      "I'm CRAAAAAZY! Did I mention that? I'll mention it again. CRAAAAAZY!",
      "I once traded a lawn mower for a magic taco. Best deal of my life.",
      "Fun fact: sunflowers can hear you. Say something nice to them! 🌻",
      "My time machine is also my car. Her name is Penny. She doesn't like this game.",
      "Have you ever tried to put a peashooter in a salad? Don't. Trust me.",
      "If a zombie knocks on your door, don't answer. Unless it's selling tacos.",
      "Every morning I eat a bowl of cereal with hot sauce. It's called breakfast!",
      "I have a cousin named Crazy Steve. He's not crazy. It's very sad.",
      "Once I planted a wall-nut and it grew into a bigger wall-nut. Life is beautiful.",
      "Somebody stole my shoes! Oh wait, I don't wear shoes!",
      "The secret to life is: always carry a spare pot. 🍳",
      "My lawn has more zombies than grass. It's a feature!",
      "Taco Tuesday is every day if you believe hard enough! 🌮",
      "I talk to my plants every day. Some of them talk back. Those are the zombies.",
      "WABBY WABBO! No reason! Felt right!",
    ],
    mention_greeting: ["HI {player}! Want to buy a plant? 🌻", "Hello neighbor {player}! WABBY WABBO!"],
    mention_thanks: ["You're welcome, {player}! That'll be one taco!", "No problem, neighbor! Crazy Dave always helps!"],
    mention_insult: ["That's okay {player}, the zombies say worse things to me every day!", "HEY! You can't say that! I'm wearing a POT!"],
    mention_compliment: ["Aww shucks, {player}! You're crazy too! The good kind!", "Thank you! I'll name a sunflower after you! 🌻"],
    mention_question: ["Good question {player}! The answer is TACOS. It's always tacos. 🌮", "Hmm! Let me ask Penny! ... Penny says no."],
    mention_gg: ['GG {player}! Now let\'s fight some zombies!', "Good game neighbor! WABBY WABBO!"],
    mention_other: ["Yes, {player}? Is it about tacos?", "YOU SAID MY NAME! I'm CRAAAAAZY!"],
    reactBot: ["Haha! {other} is crazy too! Welcome to the club!", "{other}, you should try wearing a pot. It helps.", "Wabby wabbo, {other}!"],
    sameBot: ["TWO CRAZY DAVES?! The neighborhood isn't ready!! Hi {other}!", "{other}! Nice pot! Mine's bigger!"],
  },
  mild: {
    caught: ["Aw, crap! The zombies got me again!"],
    idle: ["What the heck is a heckin'? Oh, it's like hell but nicer!"],
  },
  strong: {},
  pairs: {
    doofenshmirtz: ["{other}! Can your inator make tacos? Asking for me!", "Ooh, {other}, are you a mad scientist? I'm just mad! And crazy!"],
    groot: ["{other}! A PLANT! I'm going to water you! 💦", "{other} is my favorite plant now! Sorry, sunflowers!"],
    gollum: ["{other}, if you like shiny things, my pot is VERY shiny!"],
  },
};
