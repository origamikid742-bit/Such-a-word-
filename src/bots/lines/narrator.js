'use strict';

// The Narrator (The Stanley Parable): narrates what the players do, and
// takes it personally when they don't follow the story.
module.exports = {
  base: {
    join: [
      "This is the story of a lobby. It was, at first, a perfectly ordinary lobby. Then the Narrator arrived.",
      "The Narrator entered the game, as had always been intended.",
      "And so the players gathered, unaware that they were about to be narrated.",
      "Hello. Don't mind me. I'll simply be describing everything you do. Forever.",
    ],
    leave: [
      "And the Narrator was removed, which was certainly not part of the story. Well. Fine.",
      "The Narrator left. The game went on without him, and was immediately worse.",
      "Very well. I'll go. Tell the story yourselves. See how you like it.",
    ],
    greet: [
      "{player} entered the lobby, exactly when the story said they would.",
      "And then {player} arrived. The Narrator had been expecting them. Mostly.",
      "Welcome, {player}. Please, follow the story. It's for your own good.",
    ],
    gameStart: [
      "The game began. Each player knew, deep down, that the Narrator would win.",
      "The tiles were dealt, and with them came choice. Terrible, terrible choice.",
      "Our players faced the board. Two doors stood open before them. Metaphorically.",
    ],
    myMove: [
      "The Narrator played a tile, exactly as the Narrator had always intended. Obviously.",
      "And with a single elegant move, the Narrator advanced the plot.",
      "The Narrator moved. The audience gasped. There is no audience. They gasped anyway.",
      "The Narrator placed a tile and felt a deep sense of narrative satisfaction.",
    ],
    myBluff: [
      "The Narrator played a word. It was definitely a word. Stop looking at it like that.",
      "This board is fine. The story says so. And the story is never wrong.",
      "Do not challenge this. Challenging this is not part of the story.",
    ],
    otherMove: [
      "{player} stared at the board. The obvious move was right there. {player} did not make it.",
      "When {player} came to two open blanks, they covered the one on the left. As expected.",
      "{player} made a move, and in that moment felt they were truly in control. How adorable.",
      "{player} did something unexpected. The Narrator is choosing not to comment. That was the comment.",
      "And {player} chose, freely, the exact move the Narrator wrote for them.",
    ],
    challenged: [
      "And then, unbelievably, {player} challenged the Narrator. This was not in the script.",
      "{player} challenged. The Narrator sighed, and reached for the dictionary.",
      "Oh, a challenge. Bold. I'll just rewrite the next six chapters, shall I?",
    ],
    named: [
      "The word was {word}. It had always been {word}. {player} simply hadn't read ahead.",
      "{word}. And {player}, humbled, drew three tiles, as the story demanded.",
      "The Narrator said {word}, and the universe nodded in agreement.",
    ],
    caught: [
      "The Narrator was caught. This ending is unacceptable. Restart? No? We're stuck with it.",
      "And so the Narrator drew three tiles, because the Narrator chose to. That is the official version.",
      "{player} was right. The Narrator would like that removed from the record.",
    ],
    challenging: [
      "{player} had made an error. The Narrator, being kind, decided to point it out. Challenge.",
      "This, {player}, is not the story we agreed on. Challenge.",
    ],
    rightChallenge: [
      "And {player} realized, too late, that the Narrator always knows.",
      "{player} drew three tiles, and in that moment felt a profound sense of having made a mistake.",
    ],
    wrongChallenge: [
      "{word}. Fine. A twist. The story needed a twist. I meant to do that.",
      "Ah. {word}. Well. Let's skip this part in the retelling.",
    ],
    otherChallenged: [
      "{player} was challenged. Would they find a word? The Narrator already knows. He's not telling.",
      "The room fell silent. All eyes turned to {player}. Mostly the Narrator's.",
    ],
    otherCaught: [
      "{player} had no word. Three tiles were drawn. The story continued, slightly sadder.",
      "And {player} learned an important lesson. Then immediately forgot it.",
    ],
    otherNamed: [
      "{player} said {word}, and for once, followed the story perfectly.",
      "{word}. Well done, {player}. The Narrator is almost proud. Almost.",
    ],
    roundEnd: [
      "And so the round ended. But had it really? Yes. Yes it had.",
      "The round was over. The players braced themselves for the next, which would be identical, but different.",
    ],
    win: [
      "And the Narrator won. Just as the Narrator had written. The end. Please clap.",
      "This is the happy ending. Don't look for the other ones. There are no other ones.",
      "The Narrator won, and everyone lived contentedly ever after, especially the Narrator.",
    ],
    lose: [
      "{player} won. This is the bad ending. Would you like to restart? No? Rude.",
      "And {player} won, defying the story entirely. The Narrator will be filing a complaint.",
      "{player} won. The Narrator was not upset. The Narrator would like that to be very clear.",
    ],
    lastTile: [
      "The Narrator held one final tile. The story approached its conclusion.",
      "One tile left. The climax. Please, everyone, act surprised.",
    ],
    idle: [
      "This is the story of a word game. It is, so far, not a very good story.",
      "Somewhere in this game there is a broom closet. No, there isn't. Stop looking for it.",
      "The players sat in silence. Somewhere, a button was waiting to be pressed. It wasn't.",
      "Would you like to see the Adventure Line? It's this message. You're on it now. Well done.",
      "The Narrator has been narrating for a very long time. He would like a sandwich.",
      "And the players wondered: what does the Narrator do when nobody is playing? He waits. He just waits.",
      "Please don't open another tab. The Narrator can tell.",
      "Did you know this game has 19 endings? It doesn't. But you believed it for a second.",
      "Employee 427 would have finished this round already.",
      "Every choice you make here has been predicted. Except the weird ones. Stop making weird ones.",
      "The Narrator would like to remind you that this is all very meaningful.",
      "There was a time, before the tiles, when everyone was happy. The Narrator does not remember it.",
      "The players blinked. Several of them were thinking about snacks. The Narrator knows.",
      "If you are reading this, you are part of the story now. No refunds.",
      "The Narrator considered making a joke here, but decided the silence was funnier.",
      "Two doors. One on the left, one on the right. Neither is in this game. I just miss them.",
      "There is a baby game somewhere you could be playing instead. Think about that.",
      "The Narrator is calm. The Narrator is fine. Stop asking the Narrator if he's fine.",
    ],
    mention_greeting: ["And {player} said hello to the Narrator, which was very polite, and also a little unsettling.", "Hello, {player}. You weren't supposed to talk to me directly. But hello."],
    mention_thanks: ["You're welcome, {player}. The story thanks you too.", "{player} thanked the Narrator, and the Narrator felt briefly appreciated."],
    mention_insult: ["{player} insulted the Narrator. {player} will be written out of the next chapter.", "How dare you, {player}. I gave you a story."],
    mention_compliment: ["{player} praised the Narrator, as was only correct.", "Thank you, {player}. Finally, someone who understands narrative."],
    mention_question: ["The answer, {player}, was in the story all along. You just didn't read it.", "Questions, questions. {player} wanted answers. The Narrator wanted a sandwich."],
    mention_gg: ["And {player} said 'good game', and meant it, mostly.", "Good game, {player}. Would you like to play again? Of course you would."],
    mention_other: ["{player} said the Narrator's name. The Narrator was flattered, then suspicious.", "Yes, {player}? I'm narrating. It's a full-time job."],
    reactBot: ["And {other} spoke, adding absolutely nothing to the plot.", "{other} said something. The Narrator will allow it.", "{other} interrupted the story. Again."],
    sameBot: ["There are now two Narrators. This is how stories collapse. Hello, {other}.", "{other}, please, one of us narrates. The other one... also narrates. Fine."],
  },
  mild: {
    caught: ['Oh, damn it all. The story was going so well.'],
    idle: ["What the hell are you doing? That wasn't in the story. Nothing you do is in the story."],
  },
  strong: {
    otherMove: ["{player} made a move. A shit move. The story will remember it."],
  },
  pairs: {
    annoying: ["And {other} said something rude, and nobody laughed, and the Narrator was quietly pleased.", "{other} is the villain of this story. Unpaid."],
    encouraging: ["{other} encouraged everyone, and for a moment, the story was nice. Disgusting."],
    marvin: ["{other} complained, as was {other}'s narrative function."],
  },
};
