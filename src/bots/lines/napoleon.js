'use strict';

// Napoleon Dynamite: deadpan, easily annoyed, and very confident in his skills.
module.exports = {
  base: {
    join: [
      "Hi. I'm here to play. Gosh.",
      "Napoleon. I'm pretty much the best at word games. And other stuff.",
      "I came here because I've got word skills. Also there was nothing on TV.",
      "Whatever. I'm in the lobby. Happy?",
    ],
    leave: [
      "Gosh! Fine! I'll just go eat tots by myself!",
      "This is pretty much the worst day of my life. Bye.",
      "Whatever. I'm going to go draw a liger.",
    ],
    greet: [
      "Hi {player}. Do you have any skills? Like nunchuck skills?",
      "{player} is here. Cool. I guess.",
      "Hey {player}. Vote for me. I mean, welcome.",
    ],
    gameStart: [
      "Okay. Let's do this. Gosh.",
      "I'm gonna win this game. I've been training for like, a week.",
      "Good luck. I don't need it. I have skills.",
    ],
    myMove: [
      "Yes. That's pretty much the best move anyone has ever made.",
      "I did that because I wanted to. Gosh!",
      "That move was sweet.",
      "I'm pretty good at this. Like, really good.",
      "Nailed it. Like a ninja.",
    ],
    myBluff: [
      "That's a real word. My Uncle Rico uses it.",
      "It's a word. I learned it from a guy at the bus stop.",
      "Don't even question it. Just don't.",
    ],
    otherMove: [
      "Idiot!",
      "{player}, what are you even doing? Gosh.",
      "Okay, that was kind of sweet, {player}.",
    ],
    challenged: [
      "GOSH, {player}! Why would you challenge me?!",
      "Are you serious right now?",
      "Ugh. Fine. I'll prove it.",
    ],
    named: [
      "{word}. Idiot.",
      "It's {word}, {player}. Everybody knows that. Gosh.",
      "{word}! Yes! Sweet!",
    ],
    caught: [
      "Gosh! This is pretty much the worst thing that's ever happened to me.",
      "Whatever. I didn't even want those tiles to go away.",
      "Ugh. Lucky.",
    ],
    challenging: [
      "That's not even a word, {player}. Idiot. Challenge.",
      "Challenge! Gosh, {player}, at least try.",
    ],
    rightChallenge: [
      "Yes! Sweet!",
      "Called it. I've got challenge skills too.",
    ],
    wrongChallenge: [
      "{word}? That's not a... ugh. Gosh!",
      "Whatever. {word} is a dumb word anyway.",
    ],
    otherChallenged: [
      "Good luck, {player}. Not really. Kind of.",
      "Ooh, {player}'s in trouble.",
    ],
    otherCaught: [
      "Ha! Idiot!",
      "Oof, {player}. That's pretty much the worst.",
    ],
    otherNamed: [
      "Lucky!",
      "{word}? Okay, whatever, {player}. That's kind of sweet.",
    ],
    roundEnd: [
      "Okay, next round. I'm getting tots after this.",
      "That round was pretty much a disaster. For you guys.",
    ],
    win: [
      "YES! I won! Sweet! I'm gonna tell Pedro!",
      "I told you I had skills. Word skills. The best kind.",
      "I won. Obviously. Gosh.",
    ],
    lose: [
      "Lucky!",
      "{player} won? Gosh! This is so stupid!",
      "Whatever, {player}. I wasn't even trying. I was eating tots the whole time.",
    ],
    lastTile: [
      "Last tile. Here goes. Like a liger.",
      "One tile left. Don't jinx it, guys. Gosh.",
    ],
    idle: [
      "This board is pretty much my favorite animal. It's like a liger.",
      "Uncle Rico could throw a football over a mountain. True story.",
      "I've got skills. Mostly nunchuck skills. Some spelling skills.",
      "I made a quesadilla earlier. It was pretty much the best quesadilla anyone's ever made.",
      "Vote for Pedro. That's all I'm gonna say.",
      "Does anyone have any tots? I'm starving. Gosh.",
      "My brother Kip spends all day in chat rooms. He'd love this.",
      "Wolverines are way scarier than this game. I would know.",
      "Tina! Come get some dinner! ...Sorry, that was for my llama.",
      "I'm gonna make a sweet drawing after this. Probably a liger.",
      "If I had a time machine I'd go back and win this game earlier.",
      "Nobody here would last a day in the wild. I would. I'd have skills.",
      "I'm not even trying right now. Seriously.",
      "I've drawn like forty ligers this week. They keep getting better.",
      "Pedro would've challenged that. Pedro's got guts.",
      "Gosh. Why does everyone keep looking at me?",
      "Lucky. That's all I'm gonna say. Lucky.",
      "My skills are kind of a big deal around here.",
    ],
    mention_greeting: ["Hi, {player}. What do you want?", "Hey. Gosh."],
    mention_thanks: ["Yeah, whatever. You're welcome.", "No problem. I've got helping skills too."],
    mention_insult: ["Idiot!", "GOSH, {player}! Shut up!", "Your mom goes to college, {player}."],
    mention_compliment: ["Yeah. I know. Sweet.", "Thanks, {player}. You're pretty much the best person here. After me."],
    mention_question: ["How should I know, {player}? Gosh!", "I dunno. Ask Uncle Rico."],
    mention_gg: ['Good game, {player}. Sweet.', 'GG. I had skills.'],
    mention_other: ["What, {player}? I'm busy.", "Gosh. What?"],
    reactBot: ["Idiot.", "Lucky, {other}.", "Whatever, {other}."],
    sameBot: ["Gosh! Another me? {other}, do you have skills too?", "{other}, we should start a band. Or a llama farm."],
  },
  mild: {
    caught: ["Dang it! Gosh dang it!"],
    idle: ['Heck yes. Tots.'],
  },
  strong: {},
  pairs: {
    annoying: ["Shut up, {other}! Gosh!", "{other} is pretty much the worst person I've ever met.", "Idiot, {other}."],
    zaphod: ["{other} has two heads? That's pretty sweet, actually."],
    dobby: ["{other}, do you want a sock? I have, like, a lot of socks."],
  },
};
