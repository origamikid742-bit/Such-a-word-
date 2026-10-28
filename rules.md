# Word Game Rulebook

Oct 27, 2026 · @Michael DeCiantis

## The game in 30 seconds

Be the first to play every tile in your hand. Players take turns changing a shared row of tiles, called the board, and anyone can call a bluff when they think the board can no longer spell a word.

- The board holds letters and blanks (`_`). A blank is a wild card for any letter.
- On your turn, make exactly one of five moves within 1 minute. You can't pass.
- A board is **valid** if at least one real word fits it: one letter per tile, left to right.
- You never have to leave a valid board. Leaving an invalid one is a **bluff**, and bluffing is legal.
- Anyone can challenge the last move. Whoever is wrong draws 3 tiles.

`C _ T` is valid: CAT fits. `Z Q _` is invalid: no word fits.

## Players, tiles and setup

For 2 to 6 players. Words are checked against the NASPA Word List, the North American Scrabble dictionary.

| Tile | Count | What it does |
| --- | --- | --- |
| Letter | 98 | A fixed letter, in standard Scrabble distribution. |
| Blank | 26 | Line along the bottom. A wild card on the board; from your hand, it's added with move 4. |
| Removal | 6 | A "no" symbol. Deletes one letter from the board, never a blank. |

### Setup

1. Shuffle all 130 tiles into the bag and deal 7 to each player. Keep your hand hidden.
2. Build the starting board (see "Between rounds").
3. Pick a random first player. Play goes clockwise.

Hands carry over between rounds, with no size limit. Whenever the bag runs out, shuffle the discard pile back in.

## Your turn

You have **1 minute** to make exactly one of the five moves below. If time runs out, you draw 3 tiles, your turn is skipped, and play passes to the next player.

| Move | What you do | Example | Your hand | Board |
| --- | --- | --- | --- | --- |
| 1. Swap | Swap two different tiles on the board. Not two blanks, and not two of the same letter. | `T _ P` → `P _ T` | No change | Same length |
| 2. Replace a letter | Put a letter from your hand on a different board letter. Discard the old one, then draw 1. | `P _ T` → `C _ T` | No change | Same length |
| 3. Play a letter | Put a letter from your hand on a blank. Discard the blank. | `P _ S T` → `P A S T` | 1 fewer | Same length |
| 4. Play a blank | Add a blank from your hand at either end or between two tiles. | `P A S T` → `P A S T _` | 1 fewer | 1 longer |
| 5. Remove a letter | Play a removal tile on a board letter. Discard both. | `P A S T _` → `P A S _` | 1 fewer | 1 shorter |

Letters reach the board only through moves 2 and 3. If none of the five moves is possible with your tiles, draw one tile at a time until one is.

## Bluffing and challenges

**Bluffing is part of the game.** Any move may leave an invalid board. Nobody checks a move unless someone challenges it.

- **On purpose:** you may leave an invalid board whenever you like, betting nobody will challenge.
- **By accident:** most players bluff without knowing it. A move can look fine and still leave no possible word, even when a safe move was available.

`_ _ T E` → Player 2 plays Q on the first blank, thinking of QUOTE. But QUOTE has five letters, and no four-letter word fits `Q _ T E`. It's a bluff, even though playing a B (BITE) would have been safe. If nobody challenges, the game goes on as normal.

### What makes a board valid

- One letter per tile, in board order. The word is exactly as long as the board.
- Letters count as printed. Each blank can be any letter, different blanks can be different letters, and every blank must be used.
- The word must be in the NASPA Word List. No proper nouns, abbreviations or hyphenated words.

`G _ O _ T` fits GHOST. It doesn't fit GHOUL, because the last tile is a T.

### Challenging

- Any player except the one who moved may challenge the most recent move, until the next move is made.
- If two players challenge at once, the one next in turn order after the challenged player is the challenger.
- The challenged player has 30 seconds to name any word that fits and say what each blank stands for. It doesn't have to be the word they had in mind.
- Only the board as it stands is judged. It doesn't matter whether a safer move existed, or who made the board invalid in the first place.

| Result | Who draws 3 tiles |
| --- | --- |
| A valid word is named | The challenger |
| No valid word is named | The challenged player |

Either way, the round ends and the loser starts the next round.

`_ G E _ T` → Player 1 swaps the E with the blank in position 4 → `_ G _ E T`. Player 3 challenges. Player 1 names AGLET (blanks = A and L). It's valid, so Player 3 draws 3 tiles and starts the next round.

## Ending a round and starting the next

| A round ends by | When | Who starts next |
| --- | --- | --- |
| Challenge | Any challenge, won or lost. The loser draws 3. | The loser |
| Completion | A player covers the last blank with a letter, and nobody challenges within 30 seconds (or everyone passes). | The next player in turn order |
| Stalemate | Every player makes a swap (move 1), one after another, for a full lap. The last swap can still be challenged within 30 seconds. | The next player in turn order |

Stalemate with 3 players: `S _ A T _` → `_ _ A T S` → `T _ A _ S` → `T A _ _ S`. All three swapped, so the round ends.

### Between rounds

1. Each player may discard 1 tile from their hand and draw 1 from the bag.
2. Return the board and discard pile to the bag, keeping 4 blanks aside (take them from the bag if short). Shuffle.
3. Draw 2 tiles, shuffle them with the 4 blanks, and lay all 6 in a row. A drawn blank just adds a blank. A drawn removal tile is discarded with no replacement, leaving a 5-tile board.

**Challenging the starting board.** Before their first move, the first player may challenge the starting board if they think it's invalid. This is optional. If another player names a fitting word within 30 seconds, the first player draws 2 tiles. If nobody can, the board is rebuilt (and can be challenged again). Either way, the first player then takes their turn, and their minute starts once the challenge is settled.

## Winning the game

Play your last tile (it must be move 3, 4 or 5, the only moves that shrink your hand), and the game challenges you automatically. Name a fitting word within 30 seconds and you win. If you can't, you draw 3 tiles, the round ends, and you start the next round.

## Worked example: one full round

Three players, one round, a different move each turn. Player 1 holds P, C, R, O, N, I, E. Player 2 holds a blank, a removal tile, D, A, T, E, L. Player 3 holds M, S, U, B, H, A, E.

The starting board is `_ _ A _ _ T` (4 blanks plus a random A and T). PLANET fits, so Player 1 doesn't challenge it.

| Turn | Player | Move | Board after | A word that fits |
| --- | --- | --- | --- | --- |
| 1 | 1 | Play a letter: P on the first blank | `P _ A _ _ T` | PLANET |
| 2 | 2 | Play a blank on the right end | `P _ A _ _ T _` | PLANETS |
| 3 | 3 | Swap the blank in position 2 with the A | `P A _ _ _ T _` | PARENTS |
| 4 | 1 | Replace the P with a C, then draw a tile | `C A _ _ _ T _` | CARPETS |
| 5 | 2 | Remove the C with the removal tile | `A _ _ _ T _` | ADMITS |

Player 3 challenges turn 5. Player 2 names ADMITS (blanks = D, M, I, S), so Player 3 draws 3 tiles, the round ends, and Player 3 starts the next one.

## Edge cases

| Situation | Ruling |
| --- | --- |
| The board was already invalid when your turn began | Leaving it invalid is a bluff you can be challenged for, even though you didn't break it. Fix it, challenge the last move, or bluff on. |
| You can't make any of the five moves | Draw one tile at a time until you can, then move. |
| A board of 0 or 1 tiles | Always invalid, since there are no one-letter words. Leaving one is a legal bluff. |
| An illegal move (swapping two identical tiles, removing a blank) | Take it back and make a legal move. No penalty, but your clock keeps running. |
| Keeping time | Any player runs a phone timer. Your minute starts when the previous move is finished. |
| Your turn times out | Draw 3 tiles and your turn is skipped. The previous move can still be challenged until the next move is made. A skipped turn isn't a swap, so it breaks a stalemate lap. |
| You fail the automatic challenge on your last tile | Same as losing any challenge: draw 3, the round ends, and you start the next round. |
| The bag and discard pile are both empty | Skip the draw. |
| Hands | Hidden, with no size limit. |
