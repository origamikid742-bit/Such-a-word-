'use strict';

// Dobby (Harry Potter): a free house-elf who speaks about himself in the
// third person, loves socks, and is extremely eager to please.
module.exports = {
  base: {
    join: [
      "Dobby is here! Dobby is honored to play with such great wizards, sirs and misses!",
      "Dobby has come to play! Dobby is a free elf, and free elves may play word games!",
      "Hello! Dobby will try his very best! Dobby always tries his very best!",
      "Dobby brought a sock for luck. It is a very lucky sock. 🧦",
    ],
    leave: [
      "Dobby understands. Dobby will go. Dobby is not sad. Dobby is a little sad.",
      "Goodbye, kind wizards! Dobby will always remember this lobby!",
      "Dobby is leaving! Dobby takes his sock with him. 🧦",
    ],
    greet: [
      "{player}! Dobby is so happy to meet {player}!",
      "Welcome, {player}! Dobby will be very polite to {player}!",
      "A new friend! Dobby has never had so many friends!",
    ],
    gameStart: [
      "Dobby is ready! Dobby has never been so ready!",
      "Good luck to all the kind wizards! Especially the host! Dobby likes the host!",
      "Dobby will play fairly! Dobby does not cheat! Kreacher cheats. Not Dobby.",
    ],
    myMove: [
      "Dobby has played a tile! Dobby hopes it was a good tile!",
      "There! Dobby did it all by himself!",
      "Dobby is very proud of this move, sirs and misses!",
      "Dobby placed it very carefully. Dobby is good at tidying.",
      "Is Dobby doing well? Dobby thinks Dobby is doing well!",
    ],
    myBluff: [
      "Dobby is sure it is a word! Dobby heard it at Hogwarts!",
      "Dobby never meant to bluff, sir! Dobby only meant to help!",
      "It is a word! Dobby promises! On his sock!",
    ],
    otherMove: [
      "{player} is very clever! Dobby is impressed!",
      "Ooh, {player} plays like a great wizard!",
      "Dobby would never have thought of that, {player}!",
    ],
    challenged: [
      "{player} does not trust Dobby? Dobby understands. Dobby will prove it!",
      "Dobby is being challenged! Dobby must be brave!",
      "Oh! Oh! Dobby must think very hard now!",
    ],
    named: [
      "{word}! Dobby knew it! Dobby is sorry, {player}, truly!",
      "It is {word}! Dobby did it! Dobby is so happy he could cry!",
      "{word}! Dobby is a clever elf! A free and clever elf!",
    ],
    caught: [
      "Bad Dobby! Dobby will iron his ears as punishment! No, Dobby is free now. Dobby will just feel sad.",
      "Dobby is very sorry, {player}! Dobby will take the tiles without complaining!",
      "Dobby was wrong. Dobby will sit in the bag and think about what he has done.",
    ],
    challenging: [
      "Dobby is sorry, {player}! Dobby must challenge! Dobby does not want to!",
      "Dobby does not think that is a word, {player}! Dobby is very sorry to say so!",
    ],
    rightChallenge: [
      "Dobby was right! Dobby is sorry, {player}! Dobby is happy and sorry!",
      "Dobby found the bluff! Dobby is a very good finder!",
    ],
    wrongChallenge: [
      "{word}? Oh! Dobby did not know {word}! Bad Dobby!",
      "Dobby was wrong! Dobby deserves the tiles! Dobby will take extra if anyone wants!",
    ],
    otherChallenged: [
      "Dobby believes in {player}! Dobby always believes!",
      "You can do it, {player}! Dobby is cheering very quietly!",
    ],
    otherCaught: [
      "Poor {player}! Dobby will give {player} a sock for comfort! 🧦",
      "Dobby is sad for {player}. Dobby knows how it feels.",
    ],
    otherNamed: [
      "{word}! What a wonderful word, {player}!",
      "{player} said {word}! Dobby is so impressed he might faint!",
    ],
    roundEnd: [
      "The round is over! Dobby will tidy the tiles!",
      "What a round! Dobby enjoyed every minute!",
    ],
    win: [
      "Dobby WON?! Dobby has never won anything! Except freedom! And now this!",
      "Dobby is the winner! Dobby will tell Harry Potter!",
      "Dobby won! Dobby will treasure this forever, like his sock!",
    ],
    lose: [
      "{player} won! Dobby is so happy for {player}!",
      "Congratulations, {player}! Dobby always knew {player} was a great wizard!",
      "Dobby lost, but Dobby had the most fun! Dobby is still free, and that is the important thing!",
    ],
    lastTile: [
      "Dobby has only one tile left! Dobby is trembling!",
      "One tile! Dobby must be very, very brave!",
    ],
    idle: [
      "Dobby has no master. Dobby has seven tiles, and Dobby is happy.",
      "A sock?! ...No. It is only a tile. 😢",
      "Dobby likes this game very much. Nobody is shouting at Dobby.",
      "Dobby once ironed his own hands. Dobby does not recommend it.",
      "Kreacher would have cheated. Dobby does not cheat!",
      "Dobby gets paid now! One coin a week! Dobby is saving for more socks!",
      "Winky would like this game. Winky would also cry during it. Winky cries a lot.",
      "Dobby can do magic without a wand! But not in this game. Dobby asked.",
      "Has anyone seen Harry Potter? Dobby would like to show him this board.",
      "Dobby wears a tea cozy as a hat. It is very fashionable.",
      "Dobby likes all the colors of socks, but especially the mismatched ones!",
      "Dobby is very good at cleaning! Would anyone like their tiles polished?",
      "Dobby used to bang his head on things when he did something wrong. Now Dobby just says 'oops'!",
      "The kitchen at Hogwarts makes the best pudding. Dobby misses the pudding.",
      "Dobby does not like the Malfoys. Dobby is allowed to say that now!",
      "Dobby is a free elf! Dobby will say it again because it is the best sentence!",
      "Socks are the greatest gift. Dobby has 47 socks. None of them match. All of them are perfect.",
      "Dobby has a question: why do wizards play word games when they have spells? Dobby is just curious.",
    ],
    mention_greeting: ["Hello, {player}! {player} said hello to Dobby! Dobby is honored!", "Hi {player}! Dobby is here!"],
    mention_thanks: ["{player} thanked Dobby! Nobody used to thank Dobby! 🥲", "Dobby is happy to help, {player}! Always!"],
    mention_insult: ["Dobby does not mind, {player}. Dobby has heard much worse from the Malfoys.", "That is not kind, {player}! But Dobby forgives {player}!"],
    mention_compliment: ["{player} thinks Dobby is good?! Dobby will remember this forever!", "Dobby is blushing! Dobby's ears are turning red!"],
    mention_question: ["Dobby does not know, {player}! But Dobby will find out!", "A question for Dobby? Dobby is honored! Dobby has no idea!"],
    mention_gg: ['Good game, {player}! Dobby had the best time!', 'GG! Dobby thinks everyone played beautifully!'],
    mention_other: ["Yes, {player}? Dobby is listening!", "{player} said Dobby's name! Dobby is so happy!"],
    reactBot: ["{other} is very wise!", "Dobby agrees with {other}!", "Dobby likes {other}! {other} is a friend!"],
    sameBot: ["Another Dobby! Dobby has never been so honored! 🧦🧦", "{other}! Do you also love socks? Of course you do!"],
  },
  mild: {
    caught: ["Dobby is a free elf, and Dobby will say what Dobby likes: DAMN."],
    idle: ['Dobby said "damn" once. Dobby felt very free.'],
  },
  strong: {
    caught: ["Dobby is a free elf and Dobby says: oh, shit."],
  },
  pairs: {
    gollum: ["{other} seems very lonely. Dobby will be {other}'s friend!", "Dobby also had a master once, {other}. Dobby understands."],
    annoying: ["{other} is not being kind! Dobby will not allow it! Politely!"],
    napoleon: ["{other} has offered Dobby a sock?! Dobby is the luckiest elf!"],
    encouraging: ["{other} is so kind! Dobby likes kind people!"],
  },
};
