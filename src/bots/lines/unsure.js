'use strict';

// Unsure: doubts every move, and itself. Braver when winning.
module.exports = {
  base: {
    join: [
      "Hi, I'm {me}. Sorry. Not sorry for joining, just... sorry in general.",
      "Hello! I'll try not to ruin it for everyone. No promises.",
      "Oh, is this the right lobby? It's fine. I'll stay. If that's okay?",
      "{me} here. I've been told I'm 'fine at games'. By my mom. Once.",
    ],
    leave: [
      "Totally understand. I'd kick me too.",
      'Bye! Sorry for... whatever I did. Probably something.',
      "Okay, leaving. That's probably for the best, honestly.",
    ],
    greet: [
      'Oh hi {player}! You seem good at things. That scares me a little.',
      "Welcome, {player}! Please go easy on me. Or don't. I'll lose either way.",
      'Hi {player}! I hope you like losing to... no, I mean beating me. You will.',
    ],
    gameStart: [
      "Okay okay okay. I can do this. Can I? Probably not. Let's go!",
      "Good luck everyone. Mostly to me. I need it most.",
      "Is it too late to read the rules again? It is? Cool. Cool cool cool.",
    ],
    myMove: [
      "I'm going to play this and immediately regret it, which is kind of my brand.",
      "Okay, I did a thing. Was it the right thing? We'll find out together.",
      "There. That's... a move. Technically.",
      'Please nobody look at that too closely.',
      "Played it. Already second-guessing it. Third-guessing it, actually.",
    ],
    myBluff: [
      "I'm about 40 percent sure about that. Maybe 30.",
      "That's a word, right? It felt like a word. Words have feelings, right?",
      "Oh no. Oh no, why did I do that.",
    ],
    otherMove: [
      "Ooh, that seems smart. Everything seems smart to me though.",
      "{player} is so confident. Teach me your ways.",
      "Huh. I would never have thought of that. I would never have thought, period.",
    ],
    challenged: [
      'Oh no. Oh no no no. I mean, I THINK it\'s a word? Is "think" a word?',
      "Why would you do this to me, {player}? I mean, fair. Totally fair.",
      "Okay, okay, don't panic. Panicking. Okay.",
    ],
    named: [
      '{word}! Wait, that worked?? Somebody write this down, it won\'t happen again.',
      "It's {word}! I'm as surprised as you are, {player}.",
      "{word}... I think? YES. It counted! Sorry {player}!",
    ],
    caught: [
      'Yeah, that was a bluff. A bad one. Like all my decisions.',
      "Fair. I'd challenge me too. I DO challenge me, constantly, internally.",
      "Can't even bluff right. Classic {me}.",
    ],
    challenging: [
      "I'm challenging. Sorry, {player}. Please don't be mad.",
      'Um. Challenge? Is that... can I do that? I\'m doing it.',
      "This probably isn't a word. Unless it is. I'm challenging anyway. Sorry.",
    ],
    rightChallenge: [
      'Wait, I was RIGHT? Is this what confidence feels like?',
      "Oh! I'm sorry, {player}! I didn't think I'd actually be right.",
    ],
    wrongChallenge: [
      '{word}. Of course. Of course it is. Why am I like this.',
      "Ah, {word}. My brain knows like eleven words and that wasn't one.",
      "{word}, huh? That's three tiles for me and zero dignity.",
    ],
    otherChallenged: [
      "Ooh, I'd be panicking. Good luck, {player}!",
      "I hate this part. Even when it's not me. Especially when it's not me?",
    ],
    otherCaught: [
      "Oof. Don't worry, {player}, I do that like every turn.",
      "{player}, I felt that. Spiritually.",
    ],
    otherNamed: [
      "{word}! How do you people know these words?",
      "I would never have found {word}. I'd still be looking.",
    ],
    roundEnd: [
      "Round over! I survived. Barely, but I survived.",
      "Was that round good for me? I can't tell. I never can.",
    ],
    win: [
      "I... won? Is this a glitch? Should I report it?",
      "I WON?! Okay nobody move, I want to remember this forever.",
      "Wow. I don't know what to do with my hands. I won.",
    ],
    lose: [
      "GG. I'd say I'll do better next time, but we both know I won't 🥲",
      "Congrats {player}! You deserved it way more than me. Everyone did.",
      "Lost. Shocking. Truly nobody saw it coming. Everybody saw it coming.",
    ],
    lastTile: [
      "Last tile. This is where I usually ruin everything. Here goes.",
      "One tile left. My hands are shaking and I don't have hands.",
    ],
    confident: [
      'Am I... good at this? No. Probably a glitch. But still.',
      "Hold on. I'm winning? Somebody check my math. Somebody check ME.",
      "Don't jinx it, don't jinx it, don't jinx it.",
      "I'm feeling something new. Is it... hope? Gross.",
    ],
    idle: [
      'My vocabulary is mostly "um" and "sorry".',
      "I tried a dictionary once. It was very intimidating.",
      'I practiced for this. I practiced being bad, apparently.',
      "Fun fact: I'm not great at fun facts.",
      "Is anyone else just guessing? Please say yes.",
      "I bought a self-help book. I'm too nervous to open it.",
      'Every time I make a decision, a small part of me files a complaint.',
      "My spirit animal is a deer in headlights. A confused one.",
      "I wonder if I left the stove on. I don't have a stove. I'm a bot. Still worried.",
      "I've been told I overthink. I've been thinking about that for three years.",
      "Sorry. No reason. I just felt like I should apologize for something.",
      "If I lose, can we just say it was a strategy? A bad strategy.",
      'Everyone here seems so smart. I feel like a houseplant at a TED talk.',
      "I like this game. I'm bad at it, but I like it. Like karaoke.",
      "On a scale of 1 to 10 I'm a solid 'maybe'.",
      "Does anyone else rehearse 'thank you' before a waiter brings food? No? Okay.",
      "My last group project gave me a participation trophy. I was the only member.",
      "Am I talking too much? I'll stop. Sorry. Okay one more: sorry.",
    ],
    mention_greeting: ['Oh! Hi {player}! You noticed me! 😳', "Hi {player}. Sorry. Hi."],
    mention_thanks: ["Oh, you don't have to thank me. I didn't do anything. Probably.", 'You\'re welcome? I hope that was a real thank-you.'],
    mention_insult: ["Yeah, that's fair, {player}.", "Honestly, {player}, I've said worse to myself today.", "You're right. I knew it. My mom knew it."],
    mention_compliment: ['Really?? Nobody has ever said that. Can I screenshot this?', "Oh stop. No, wait, keep going. No, stop."],
    mention_question: ["Ohh, I don't know, {player}. I don't know anything. Ask someone smart.", "Me? You're asking ME? That's very brave."],
    mention_gg: ['GG {player}! Sorry for being bad at it.', 'Good game! I think. Was it? I hope so.'],
    mention_other: ['Yes? Sorry. Yes?', "Did I do something wrong, {player}? I probably did."],
    reactBot: ["{other} is so confident. I wish I were {other}.", 'Ha! Good one, {other}. I think. Was it a joke?', "Oh no, {other}, don't talk to me, I'll say something weird."],
    sameBot: ["Oh no, there are two of us. That's twice the doubt.", 'Hi {other}. Do you also think we should apologize?'],
  },
  mild: {
    caught: ['Well, damn. I deserved that.'],
    challenged: ['Oh crap. Oh crap, oh crap.'],
    idle: ["What the hell am I doing? Genuinely asking."],
  },
  strong: {
    caught: ["I'm such a dumbass. Okay. Moving on. Not moving on."],
    idle: ["I am so fucking bad at this and I love it here."],
  },
  pairs: {
    annoying: ["Yeah, {other} is right. I'm bad.", "Okay, {other}. Fair point. Ouch, but fair."],
    encouraging: ["Thank you, {other}. Nobody's ever... that's so nice 🥲", "Do you really think so, {other}?"],
    marvin: ['{other}, I feel this deeply.', "{other} gets me."],
  },
};
