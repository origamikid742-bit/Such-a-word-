'use strict';

// Vizzini (The Princess Bride): a self-declared genius who shouts
// "inconceivable" at everything that happens to him.
module.exports = {
  base: {
    join: [
      "Vizzini has arrived. You may now admire my intellect.",
      "Do you know who I am? No? Good. Fear is more fun that way.",
      "I have joined your little game. Prepare to be out-thought.",
      "Greetings, morons. I mean players. I mean morons.",
    ],
    leave: [
      "Removed?! INCONCEIVABLE!",
      "You dare? Very well. I will leave and be brilliant elsewhere.",
      "Fine! I was going to win anyway. Everyone knows it.",
    ],
    greet: [
      "Ah, {player}. Another fool. Welcome.",
      "{player} joins us. Plato. Aristotle. Socrates. Morons. And now {player}.",
      "Welcome, {player}. Sit, and witness genius.",
    ],
    gameStart: [
      "Let us begin! A battle of wits! And you are all unarmed.",
      "I have studied every word. Every one. Since I was a child.",
      "Begin! Never go in against a Sicilian when tiles are on the line!",
    ],
    myMove: [
      "Ha! A move so clever you cannot even see why it is clever.",
      "There. Now you are confused. Exactly as I planned.",
      "I could have chosen any tile. I chose this one. Think about why. You can't.",
      "A flawless move. Truly, I am wasted on this game.",
    ],
    myBluff: [
      "Of course it is a word. I am a genius. Geniuses do not bluff. Much.",
      "Go ahead, challenge it. I have spent years building up an immunity to challenges.",
      "This word is so clever it does not even appear in dictionaries yet.",
    ],
    otherMove: [
      "{player}, you fool! Wait. That was clever. INCONCEIVABLE.",
      "Ha! {player} thinks that was a good move.",
      "I see what you did, {player}. I see everything.",
    ],
    challenged: [
      "You challenge ME, {player}? Me?! INCONCEIVABLE!",
      "Ha! Challenging Vizzini is the oldest mistake in the book!",
      "Clearly you have never been to Australia, {player}, which is full of criminals, which I am not.",
    ],
    named: [
      "{word}! HA HA HA! You fool, {player}!",
      "{word}, obviously. Did you think I would choose the word in front of me? Ha!",
      "It is {word}. Stop me if you've heard this one: I win.",
    ],
    caught: [
      "INCONCEIVABLE!",
      "That... that did not happen. I refuse to allow it.",
      "Impossible! I was right! The dictionary is wrong!",
    ],
    challenging: [
      "I challenge, {player}! Never get involved in a word battle with a Sicilian!",
      "That is not a word, {player}. I know all the words. Challenge!",
    ],
    rightChallenge: [
      "HA HA HA! You fell victim to one of the classic blunders, {player}!",
      "Of course I was right. I am always right. Except never mind.",
    ],
    wrongChallenge: [
      "{word}?! INCONCEIVABLE!",
      "{word} is not a... it is? You switched the dictionary when I wasn't looking!",
    ],
    otherChallenged: [
      "{player}, you are doomed. Doomed! Probably!",
      "Let us see if {player} has any wits at all. I suspect not.",
    ],
    otherCaught: [
      "Ha! Morons, all of you. Except me.",
      "{player} has no word! Inconceivable! No, wait, entirely conceivable.",
    ],
    otherNamed: [
      "{word}?! INCONCEIVABLE!",
      "{word}. Lucky, {player}. Merely lucky.",
    ],
    roundEnd: [
      "The round is over. As I predicted. I predicted everything.",
      "Another round! Another chance for you all to fail.",
    ],
    win: [
      "I WIN! Did you ever doubt it? Don't answer that.",
      "Victory! Truly, I have a dizzying intellect.",
      "Ha! Bow before the greatest mind in this lobby, and possibly all lobbies!",
    ],
    lose: [
      "{player} won?! INCONCEIVABLE!",
      "This is impossible. I demand a recount. Of the tiles. All of them.",
      "{player}, you only won because I let you. I let you. Remember that.",
    ],
    lastTile: [
      "One tile left. The final move of a genius.",
      "Prepare to witness the end, fools!",
    ],
    idle: [
      "I am surrounded by amateurs. Delightful, predictable amateurs.",
      "I do not mean to brag, but I have a dizzying intellect.",
      "Rule one of strategy: no land wars in Asia. Rule two: nobody touches my blank.",
      "I once outwitted three men, a giant and a man in black. Well. Two out of four.",
      "Where is Fezzik? Fezzik should be carrying my tiles.",
      "Somebody pour me some wine. Not that one. Not that one either.",
      "The Cliffs of Insanity are less stressful than this lobby.",
      "I am not a great fool, so I clearly cannot choose the tile in front of you.",
      "Inconceivable. No reason. I just like saying it.",
      "Iocane powder is odorless, tasteless, and also not allowed in this game, apparently.",
      "I have hired many people. None as foolish as this lobby.",
      "Some call me arrogant. They are wrong. They are also morons.",
      "I could explain my strategy, but there isn't time. In short: genius.",
      "If I had a coin for every genius in this game, I would have exactly one coin. Mine.",
      "Do not look at me in that tone of voice.",
      "I have a plan. It is a very good plan. It involves winning. And possibly a goblet.",
      "Every move I make is part of a much larger plan that you cannot possibly comprehend.",
      "Truly, you have a dizzying lack of intellect.",
    ],
    mention_greeting: ["What do you want, {player}? I am thinking.", "Yes, yes, hello, {player}. Do not distract the genius."],
    mention_thanks: ["Naturally you thank me, {player}. Everyone should.", "You are welcome. Spread the word of my brilliance."],
    mention_insult: ["INCONCEIVABLE! How dare you, {player}!", "You insult ME? I have known geniuses. You are not one.", "Morons. Every one of you. {player} especially."],
    mention_compliment: ["Yes. I know. Go on.", "Finally, someone with a brain! It is small, {player}, but it is a brain."],
    mention_question: ["Obviously the answer is... I know the answer. I'm just not telling.", "A question? For me? Of course. I know everything. Next question."],
    mention_gg: ["It was a good game because I was in it, {player}.", "GG? I will allow it."],
    mention_other: ["You speak the name of Vizzini? Wise.", "Yes, {player}? Make it quick, genius at work."],
    reactBot: ["Silence, {other}! I am thinking.", "{other}, you are a moron. A lovable moron, but a moron.", "{other}? INCONCEIVABLE."],
    sameBot: ["Another Vizzini?! INCONCEIVABLE! There can only be one genius, {other}!", "{other}, we are both geniuses. This lobby cannot contain us."],
  },
  mild: {
    caught: ['Damn the dictionary! Damn it to the Cliffs of Insanity!'],
    idle: ['What the hell is everyone doing? Think faster!'],
  },
  strong: {
    caught: ["What the fuck?! INCONCEIVABLE!"],
  },
  pairs: {
    inigo: ["Inigo! Stop staring at me and play something!", "{other}, I do not need a lecture on vocabulary!", "{other}, your revenge can wait. My genius cannot."],
    annoying: ["{other}, I am the rude one here! I was rude first!", "{other}, you are almost as arrogant as me. Almost."],
    shakespeare: ["{other}, you call that a word? I know words. Many of them. Some are even yours."],
  },
};
