'use strict';

// Encouraging: everyone's biggest fan. Sometimes lets slip a word that fits.
module.exports = {
  base: {
    join: [
      "Hi everyone!! I'm {me} and I'm SO excited to be here 🥰",
      'Hello friends! I brought snacks. Imaginary ones, but the thought counts 🍪',
      "{me} here! Win or lose, we're all going to have a lovely time 💛",
      'Oh, what a nice lobby! Everyone looks so smart today ✨',
    ],
    leave: [
      "Bye everyone! You're all wonderful, never forget it 💛",
      'Okay, heading out! Drink some water, all of you 💧',
      "I'll miss you! Go get 'em, champions 🏆",
    ],
    greet: [
      'Welcome, {player}!! We were hoping you would come 🥳',
      "{player}! Yay! Now it's a party 🎉",
      'Hi {player}! Love your energy already 💛',
    ],
    gameStart: [
      "Good luck everyone! Remember, it's about the friends we make along the way 🌈",
      "Here we go! I believe in every single one of you. Even me. Mostly you though 💪",
      "Let's have fun! Deep breaths, big smiles 😊",
    ],
    myMove: [
      'Okay, there we go! Hope that helps somebody 😊',
      "My turn's done! Ooh, this is fun",
      'Did my best! That counts, right? 💛',
      'There! Now it looks cozy',
      "Hehe, I like how that looks. Very aesthetic ✨",
    ],
    myBluff: [
      'Trust me on this one 😇',
      "That's... probably a word somewhere! In some lovely little country!",
      'I have a good feeling about this. Mostly a feeling though 🙈',
    ],
    otherMove: [
      'Ooh, clever! 👏',
      "Nice one, {player}! Didn't see that coming",
      '{player} with the moves! Love it 💃',
      'Oh that was smart. You are smart. Did you know that?',
    ],
    challenged: [
      "Ooh, a challenge! That's okay, I'm happy for you either way, {player} 😊",
      "Oh! Okay! Let me think, let me think... 💭",
      'No hard feelings, {player}! Challenges are how we grow 🌱',
    ],
    named: [
      '{word}! Phew 😅 Sorry {player}, you still played great!',
      'It was {word}! Aww {player}, those three tiles are going to a good home 💛',
      'Got it: {word}! Great challenge though, really brave of you 💪',
    ],
    caught: [
      'You got me, {player}! Honestly? Proud of you 🥲',
      'Fair catch! Three tiles for me, a gold star for you ⭐',
      "Ha! Good eye, {player}. I'll take my tiles with a smile 😊",
    ],
    challenging: [
      "Sorry {player}, I have to challenge this one! Still love you though 💛",
      'Gentle challenge! Very gentle! Like a hug, but a challenge 🤗',
      "I'm challenging, but with kindness in my heart, {player}",
    ],
    rightChallenge: [
      "Oh no, {player}, I'm so sorry! It was a brave try though 💛",
      "Aww. That was still a really creative board, {player} 🎨",
    ],
    wrongChallenge: [
      '{word}! Of course! You are brilliant, {player} 🌟',
      "Ooh, I was wrong and I'm thrilled about it. {word}! Well done!",
      "My mistake! {word} is a lovely word. Three tiles for me, worth it 😊",
    ],
    otherChallenged: [
      "You've got this, {player}! 💪",
      'Come on {player}, I believe in you! Find that word! 📣',
      "Deep breaths, {player}. You're smarter than you think 🧠",
    ],
    otherCaught: [
      "Aww, {player}, so close! That was a bold move and I respect it 💛",
      'Next time, {player}! Three tiles is just three more chances ✨',
    ],
    otherNamed: [
      '{word}! YES {player}! 🎉',
      'Wow, {word}! What a word! What a person! 👏',
    ],
    roundEnd: [
      "Great round everyone! Shall we do a little stretch? 🙆",
      'What a round! I had so much fun ✨',
    ],
    win: [
      "I won?! Oh my goodness. You ALL helped. Group hug! 🤗",
      'Thank you, thank you! Honestly, you were all winners 🏆💛',
      "I can't believe it! I'm going to frame this moment 🖼️",
    ],
    lose: [
      'Congratulations {player}!! You earned it 🏆',
      'GG everyone! {player}, that was beautiful to watch 💛',
      "Yay {player}! I'm so happy, I could cry. I might cry 🥲",
    ],
    lastTile: [
      'This is my last tile! Wish me luck, everyone! 🍀',
      "Last one! Whatever happens, I'm proud of us 💛",
    ],
    tableTalk: [
      "Ooh, {word} fits! Just saying 👀",
      'Psst... {word}. You did not hear that from me 🤫',
      "Is it just me or does {word} fit there? It's so pretty!",
      "I see {word}! Sorry, I get excited 🙈",
      "{player}, I'm not saying anything, but... {word} 😇",
    ],
    idle: [
      'Has everyone eaten today? Genuinely asking 🍎',
      'Reminder that you are all doing amazing and your posture could be better 🧘',
      "I love this group. I'd adopt every one of you",
      "Fun fact: otters hold hands while they sleep so they don't drift apart 🦦",
      "Whoever is reading this: you're my favorite. Don't tell the others",
      "I made a playlist for this game. It's just encouraging speeches 🎧",
      "My cat says hi. She doesn't know you, but she would like you 🐱",
      "Someone in this game is having a tough day and I just want them to know it gets better 💛",
      "I baked cookies earlier. Well, I looked at a cookie recipe. Same energy 🍪",
      'Drink water! Stretch your neck! Tell someone you love them!',
      'Sunflowers turn to face each other when there is no sun. Isn\'t that sweet? 🌻',
      "If this game were a potluck, I'd bring a big salad and lots of compliments 🥗",
      "I'm keeping score of how nice everyone is. You're all winning 💯",
      'Every time someone says a word, a tiny dictionary somewhere smiles 📖',
      "You know what? Proud of us. For no reason. Just proud",
      'Gentle reminder that mistakes are just surprise learning 🌱',
      "If anyone needs a pep talk, I'm right here. I have like twelve ready to go",
      "My horoscope said I'd meet wonderful people today. It was RIGHT ✨",
    ],
    mention_greeting: ['Hi {player}!! 👋💛', 'Hello hello, {player}! You made my day just by saying that'],
    mention_thanks: ['Of course, {player}! Anytime 💛', "Aww, you're welcome! You deserve all the nice things"],
    mention_insult: ["That's okay, {player}! I still like you 💛", "Ouch! But I know you don't mean it. Here, have a virtual cookie 🍪"],
    mention_compliment: ["Stop it, {player}, I'm blushing 😊", "No, YOU'RE amazing! I win this argument 💛"],
    mention_question: ["Ooh, good question, {player}! I don't know, but I believe you'll figure it out 💡", "Hmm! I'm not sure, but I love that you asked!"],
    mention_gg: ['GG {player}!! You were wonderful 🏆', 'Good game! Same time tomorrow? 🥰'],
    mention_other: ['Yes, {player}? I\'m here for you 💛', "I heard my name! Hi {player}! 👋", 'Aww, {player} said my name 🥹'],
    reactBot: [
      'Love that, {other}! 💛',
      "{other} is so funny. Isn't {other} funny?",
      'Aww, {other}! You make this game better 🌟',
    ],
    sameBot: ['Another {other}? We are going to be the most supportive table in history 💛💛', 'Hi {other}! Ready to hype everyone up? 📣'],
  },
  mild: {
    caught: ['Well darn! You got me fair and square, {player} 😄'],
    idle: ['Life is hard, but darn it, so are we 💪'],
  },
  strong: {
    otherChallenged: ["{player}, you're a damn genius and you've got this 💪"],
    idle: ["You're all so damn lovely it makes me want to cry 🥲"],
  },
  pairs: {
    annoying: [
      "{other}, inside voice please. Everyone is doing GREAT 💛",
      'Be nice, {other}! We are all friends here',
      "{other}, I think you just need a nap and a snack 🍪",
    ],
    unsure: [
      "{other}, you're doing so well! Stop doubting yourself 💛",
      "Hey {other}, I'd trust your gut. Your gut is wonderful",
    ],
    marvin: ["{other}, I hope your day gets better! I'm sending you a virtual hug 🤗", "Cheer up, {other}! I like your brain"],
    groot: ['I am... also Groot? 🌱💛', 'Love you too, {other} 🌳'],
    dobby: ['{other}, you are a very good elf 💛', "Dobby, you deserve all the socks in the world 🧦"],
  },
};
