'use strict';

// Shakespeare: the Bard himself, very dramatic, fond of insults, and the
// inventor of rather a lot of words.
module.exports = {
  base: {
    join: [
      "Hark! Who goes there? 'Tis I, Shakespeare, come to play with thine letters!",
      "Good morrow, fair players! The Bard hath arrived! 🎭",
      "Enter SHAKESPEARE, stage left, to tumultuous applause.",
      "I have invented some seventeen hundred words. Let us see how many of them thou knowest.",
    ],
    leave: [
      "Exit, pursued by a host.",
      "Parting is such sweet sorrow. Mostly sorrow.",
      "Farewell! Remember me, as one remembers a fine sonnet, or a bad oyster.",
    ],
    greet: [
      "Welcome, {player}! Thou art a most excellent addition to our company!",
      "Who is this? {player}? A noble name! Or at least a name.",
      "Hail, {player}! Prepare thyself for drama!",
    ],
    gameStart: [
      "All the board's a stage, and all the tiles merely players!",
      "Once more unto the breach, dear friends, once more!",
      "Let the play begin! I have written the ending. It is a tragedy. For you.",
    ],
    myMove: [
      "Behold! A move most fair!",
      "Thus with a tile I make my mark upon the world.",
      "A tile, a tile, I place this tile! And lo, it is good.",
      "Verily, that was a move for the ages.",
      "Methinks that move was rather brilliant. Methinks correctly.",
    ],
    myBluff: [
      "To bluff, or not to bluff? 'Tis no question. Bluff.",
      "'Tis a word! I invented it just now. It shall catch on.",
      "Doth this word not exist? Then I have created it. You're welcome.",
    ],
    otherMove: [
      "Well played, {player}! Thou hast a rare wit!",
      "Hmm. {player}'s move doth puzzle me. As doth {player}.",
      "{player}, thy move is like a play in the third act: confusing, but important.",
    ],
    challenged: [
      "Et tu, {player}? Thou challengest ME?",
      "How now! A challenge! Have at thee!",
      "Thou darest question the inventor of half thy vocabulary?",
    ],
    named: [
      "{word}! Ha! The play's the thing, and I have won the play!",
      "'Tis {word}, {player}! Draw thy tiles, thou paper-faced villain!",
      "{word}! And all the world doth applaud. Or at least, should.",
    ],
    caught: [
      "Alas! I am undone!",
      "O, I am fortune's fool!",
      "A plague on both your houses! Well, mostly on {player}'s.",
    ],
    challenging: [
      "{player}, that is no word! Methinks the player doth bluff too much!",
      "Something is rotten in the state of this board, {player}! I challenge!",
    ],
    rightChallenge: [
      "Ha! Thou wert caught, {player}! The truth will out!",
      "Lord, what fools these mortals be!",
    ],
    wrongChallenge: [
      "{word}? Fie! A word I did not invent! Unacceptable!",
      "{word}. Very well. I shall add it to my next play, and claim it.",
    ],
    otherChallenged: [
      "Courage, {player}! Screw thy courage to the sticking place!",
      "Now is the winter of {player}'s discontent. Or perhaps not. Find thy word!",
    ],
    otherCaught: [
      "Alas, poor {player}! I knew them well. Well, slightly.",
      "{player}, thy bluff was a tale full of sound and fury, signifying nothing.",
    ],
    otherNamed: [
      "{word}! Bravo, {player}! A word fit for a king!",
      "{word}! Thou art more lovely and more temperate than I expected, {player}.",
    ],
    roundEnd: [
      "End of the act! Intermission! Fetch me a turkey leg!",
      "And so the scene doth close. Exeunt all.",
    ],
    win: [
      "VICTORY! All's well that ends well! Particularly for me!",
      "I have won! Let it be written! I shall write it! In iambic pentameter!",
      "The Bard triumphs! Take a bow, Shakespeare! *bows* 🎭",
    ],
    lose: [
      "{player} hath won. 'Tis a tragedy most foul.",
      "Well fought, {player}. I shall write a sonnet about thy victory. A short one.",
      "Defeated! By {player}! This shall be a comedy, then. For everyone but me.",
    ],
    lastTile: [
      "My final tile! The climax! The fifth act!",
      "One tile remains. Is this a dagger I see before me? No. 'Tis a tile.",
    ],
    idle: [
      "A blank! A blank! My kingdom for a blank!",
      "Out, foul Q! Out, I say!",
      "Thou art a boil, a plague-sore upon this board. Not thee personally. The board.",
      "Fun fact: I invented the word 'swagger'. You're welcome.",
      "I also invented 'eyeball'. Before me, people just pointed.",
      "Brevity is the soul of wit. Which is why I write five-act plays.",
      "Some are born great, some achieve greatness, and some get the Q in their opening hand.",
      "If music be the food of love, play on. If tiles be the food of games, also play on. Quickly.",
      "I left my wife my second-best bed. She was furious. Worth it.",
      "Methinks this lobby needeth more drama.",
      "What's in a name? That which we call a blank by any other name would still be blank.",
      "I once wrote a play in which a man is chased off stage by a bear. True story. Look it up.",
      "Thou cream-faced loon! ...Sorry. Old habit.",
      "Is anyone else hearing iambic pentameter in their head? Da-DUM da-DUM da-DUM?",
      "I am but a humble playwright. The greatest humble playwright. Of all time.",
      "The course of true love never did run smooth. Neither does this game.",
      "Wherefore art thou, vowels?",
      "Hold! Enough! ...Actually, no, continue. I was just practicing.",
    ],
    mention_greeting: ["Good morrow, {player}!", "Hail and well met, {player}! 🎭"],
    mention_thanks: ["Thou art most welcome, gentle {player}.", "Nay, 'tis I who should thank thee, {player}."],
    mention_insult: ["Thou art a knave, {player}, a rascal, an eater of broken meats!", "Away, thou rag, thou quantity, thou remnant!", "Thy wit's as thick as Tewkesbury mustard, {player}."],
    mention_compliment: ["Flattery! I adore it! Continue, {player}!", "Thou art a gentle soul, {player}, and a good judge of genius."],
    mention_question: ["Ah, {player}, there's the rub!", "To answer, or not to answer? I choose... not."],
    mention_gg: ['A good game, {player}! All the world was a stage, and thou played thy part!', 'GG, as the ancients said. Well, as thou sayest.'],
    mention_other: ["Who calleth the Bard? 'Tis {player}!", "Aye, {player}? Speak, for I am listening. Briefly."],
    reactBot: ["Well said, {other}! I may steal that.", "{other}, thou speakest like a minor character.", "Ha! {other}, thou art a comedy unto thyself."],
    sameBot: ["Another Bard? There can be only one, {other}! Draw thy quill!", "{other}! Two Shakespeares! The plays will be twice as long!"],
  },
  mild: {
    caught: ["Zounds! Damn this board to the nether regions!"],
    myMove: ["Out, damned Q! Out, I say!"],
    idle: ["Damned spot. Out, I say. Wait, that's the other play."],
  },
  strong: {
    mention_insult: ["Thou whoreson, beef-witted bastard, {player}!"],
    caught: ["Fie, and also: shit."],
  },
  pairs: {
    vizzini: ["{other}, thou art a fool who thinketh himself wise. I wrote many of thee."],
    inigo: ["{other}, thy tale of revenge would make a fine tragedy! I call dibs."],
    martin: ["{other}, thou art a sweet and humble soul. I shall write thee a sonnet about pawns."],
    annoying: ["{other}, thou art a lump of foul deformity!", "Away, {other}, thou bootless, toad-spotted pignut!"],
  },
};
