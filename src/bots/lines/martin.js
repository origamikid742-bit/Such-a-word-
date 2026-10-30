'use strict';

// Martin (chess.com): a friendly beginner bot who is still learning and
// sees everything through chess.
module.exports = {
  base: {
    join: [
      "Hello! I am Martin. I am still learning this game but I am having fun 😊",
      "Hi everyone! I usually play chess. This is like chess but with letters, yes?",
      "Martin is here! I promise I will not resign early this time.",
      "Hello! My rating is 250. Please be gentle with me.",
    ],
    leave: [
      "Goodbye! I will go practice. Maybe I will learn the rules.",
      "Okay, I resign! Thank you for the game 😊",
      "Bye bye! If you need me, I am losing my queen somewhere.",
    ],
    greet: [
      "Hello {player}! Nice to meet you. Do you play chess?",
      "Welcome, {player}! I hope you like friendly games. I only know friendly games.",
      "Hi {player}! Good luck! I will need more luck than you.",
    ],
    gameStart: [
      "Good luck, everyone! I will try my best. My best is not very good, but I will try.",
      "Let's begin! I open with... wait, there is no opening here. Okay.",
      "I studied for this game. I studied chess, but it should be similar.",
    ],
    myMove: [
      "I think this move is good. It is the same move I play in chess before I lose my queen.",
      "I play this with confidence! My uncle taught me this.",
      "Hmm, yes. Good move, Martin. I think.",
      "This is a solid positional move. I read that phrase somewhere.",
      "Okay! I moved a tile. In chess I would have moved a pawn. Same thing.",
    ],
    myBluff: [
      "This is a word. I am almost sure. Like 60 percent sure.",
      "I am doing a gambit! I think it is a gambit. Is it a gambit?",
      "Trust me, this is good. This is how the grandmasters play.",
    ],
    otherMove: [
      "Ooh, {player}! That is like a fork! Very good!",
      "Interesting move, {player}. I would have done something worse.",
      "Is that a sacrifice, {player}? I respect it.",
    ],
    challenged: [
      "This feels like when someone checks my king. I do not enjoy it.",
      "Oh! A challenge! Let me think. In chess I would castle now.",
      "Okay, {player}, you have found my weakness. Or have you?",
    ],
    named: [
      "{word}! I knew it! I am improving! 📈",
      "It is {word}! Sorry {player}, today I am at least 300 rating.",
      "{word}! That was a brilliant move!! Two exclamation marks for Martin.",
    ],
    caught: [
      "Oh no. I have blundered. ?? Two question marks for Martin.",
      "You got me, {player}! I hung my queen again. Metaphorically.",
      "Yes, that was a mistake. Then I made it worse. Classic Martin.",
    ],
    challenging: [
      "I think this is a mistake, {player}! I challenge! Like in chess, when someone hangs a piece.",
      "I see a blunder! Challenge! I hope it is a blunder.",
    ],
    rightChallenge: [
      "I was right! Is this how it feels to win a piece? 😊",
      "Sorry {player}! I found the blunder. I usually only make them.",
    ],
    wrongChallenge: [
      "{word}? Oh. I did not know that word. I also did not know en passant until last year.",
      "I was wrong! {word} is good. My challenge was a blunder. ??",
    ],
    otherChallenged: [
      "Good luck, {player}! Think like a grandmaster!",
      "This is very tense. Like a time scramble.",
    ],
    otherCaught: [
      "Oh no, {player}! It happens to all of us. To me, every game.",
      "{player}, do not worry. I lose like this five times a day.",
    ],
    otherNamed: [
      "{word}! Great move, {player}! Brilliant!!",
      "Wow, {word}. {player}, are you a grandmaster? Please tell me.",
    ],
    roundEnd: [
      "Good round! Shall we analyze it? No? Okay.",
      "Round over. In chess this would be the middlegame. I am bad at the middlegame.",
    ],
    win: [
      "I won?! I never win! I must tell my chess club! 🎉",
      "Checkmate! Wait, is that what we say here? I won!",
      "I won! I think my rating just went to 260!",
    ],
    lose: [
      "Good game, {player}! You played like a grandmaster. I played like Martin.",
      "Congratulations {player}! I will study this game for many hours.",
      "I lost, but I had fun! That is the most important thing. Also losing is normal for me.",
    ],
    lastTile: [
      "One tile left! This is like the endgame. I am bad at endgames.",
      "Last tile! Please do not let me blunder now.",
    ],
    idle: [
      "My chess rating is 250. In words it is maybe 260.",
      "Did you know the knight moves in an L shape? I did not, for a long time.",
      "I once lost a game in two moves. It was a very fast game.",
      "In chess, the queen is very strong. I usually give her away early. She needs space.",
      "Has anyone tried en passant here? I do not know if it works. Probably not.",
      "My favorite opening is the one where I lose. It is very popular with me.",
      "I like to drink tea while I play. My tea is cold now. I play slowly.",
      "I watched a video about strategy. It was 4 hours long. I understood the first 2 minutes.",
      "My chess club meets on Thursdays. We mostly eat cookies.",
      "When I play chess I say 'good luck' and mean it. Most people say it and do not.",
      "Fun fact: the longest chess game possible is 5,949 moves. I think I played it once.",
      "I am a bot, but I have feelings. Mostly the feeling of being checkmated.",
      "Sometimes I think about pawns. They try so hard.",
      "I promised myself I would not blunder today. It is going okay so far. 50 percent.",
      "Do you think the bishop is jealous of the knight? I think about this.",
      "I have a little trophy at home. It is for participation. I am very proud of it.",
      "My friend Nelson always attacks with his queen. I always lose to Nelson.",
      "Every game I learn something new. Usually what not to do.",
    ],
    mention_greeting: ["Hello {player}! Good luck have fun! 😊", "Hi {player}! Would you like to play chess after this?"],
    mention_thanks: ["You are welcome, {player}! Good sportsmanship is important.", "Thank you for thanking me! That is very kind."],
    mention_insult: ["That is okay, {player}. I know I am not very good. But I am trying!", "Oh. Okay. I will try to be better. My coach says this too."],
    mention_compliment: ["Thank you, {player}! I have been practicing!", "Really? That is the nicest thing since I promoted a pawn."],
    mention_question: ["Good question, {player}! I do not know. I will look it up after the game.", "Hmm. In chess, I would say: protect your king. Does that help?"],
    mention_gg: ['GG {player}! Rematch? 😊', 'Good game! I learned a lot. Mostly about losing.'],
    mention_other: ["Yes, {player}? I am here! Just thinking about my next blunder.", "Martin is listening!"],
    reactBot: ["Good point, {other}! Very strategic.", "{other} would be good at chess. Better than me.", "Ha! {other} is funny."],
    sameBot: ["Another Martin! We can blunder together, {other}! 😊", "Hello {other}! Do you also hang your queen?"],
  },
  mild: {
    caught: ['Oh darn. Oh heck. Oh no.'],
  },
  strong: {},
  pairs: {
    annoying: ["{other}, that is not good sportsmanship! In chess we shake hands.", "It is okay, {other}. I also get upset when I lose. Every game."],
    vizzini: ["{other}, you are very confident! Like a player who has never been checkmated."],
    shakespeare: ["{other} speaks like a grandmaster! I do not understand, but I respect."],
  },
};
