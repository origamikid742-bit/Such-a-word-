# Such A Word

A web version of a bluffing word game for private matches. One person creates a match and shares a link, and friends join by opening it. No accounts.

[rules.md](rules.md) is the rulebook. [Decisions](#decisions) records the owner's changes and the rulings for online play; where they differ from rules.md, the Decisions win. The summary below is a quick reference that already includes them.

## Working agreements

- The owner is a complete beginner with no coding experience. Explain every step in plain language, including anything they must click, approve or type themselves.
- Use boring, widely used technology. No exotic libraries or frameworks.
- Never add anything that needs a paid service (hosting, database, API, domain) without asking first.
- Ask before installing software on the owner's computer or downloading files.
- Build one phase of the [Plan](#plan) at a time, and pause after each phase so the owner can try it.

## Rules summary

- 2 to 6 players. 130 tiles: 98 letters (standard Scrabble distribution), 26 blanks, 6 removal tiles. Deal 7 tiles to each player. Hands are hidden, carry over between rounds and have no size limit.
- The **board** is a row of tiles. It is **valid** if at least one word in the ENABLE word list fits it exactly: same length, letters as printed, every blank stands for some letter (and every blank is used).
- On your turn you have 1 minute to make exactly one move. You can't pass. If time runs out, you draw 3 and your turn is skipped. Three missed turns in a row and you are ejected.
  1. **Swap**: swap two different tiles on the board (not two blanks, not two of the same letter).
  2. **Replace a letter**: put a letter from your hand on a board letter that is different from it; discard the old one, then draw 1.
  3. **Play a letter**: put a letter from your hand on a blank; discard the blank.
  4. **Play a blank**: add a blank from your hand at either end or between two tiles.
  5. **Remove a letter**: play a removal tile on a board letter (never a blank); discard both.
- If none of the five moves is possible, draw one tile at a time until one is.
- Leaving an invalid board is a **bluff**, and bluffing is legal. Any player except the mover may **challenge** the most recent move until the next move is made. The challenged player has 30 seconds to name a fitting word. Whoever is wrong draws 3. Any challenge ends the round, and the loser starts the next round.
- A round also ends by **completion** (the last blank is covered and nobody challenges within 30 seconds) or **stalemate** (every player swaps in a row for a full lap). In both cases the next player in turn order starts.
- **Starting board**: keep 4 blanks aside, draw 2 tiles, shuffle with the blanks, lay all 6 in a row. A drawn removal tile is discarded, leaving 5 tiles. The first player may challenge the starting board before moving.
- **Between rounds**: each player may discard 1 and draw 1. The board and discard pile go back into the bag.
- **Winning**: playing your last tile triggers an automatic challenge. Name a fitting word within 30 seconds to win. Otherwise draw 3, the round ends, and you start the next round. A player who is the only one left after ejections also wins.

## Vocabulary

Use these words consistently in code, UI text and conversation.

| Term | Meaning |
| --- | --- |
| Match | One whole game, from lobby to winner. Has a short **match code** that appears in the share link. |
| Host | The player who created the match. Starts the game once 2 to 6 players have joined. |
| Lobby | The waiting screen before the host starts the match. |
| Seat | A player's place in a match: their name, hand and turn position. |
| Seat key | A secret code saved in the player's browser. It lets them get their seat back after a refresh or lost connection, without an account. |
| Rejoin | Reconnecting to your seat using your seat key. |
| Round | Play from one starting board until a challenge, completion or stalemate. A match has many rounds. |
| Turn | One player's chance to make one move, limited to 1 minute. |
| Turn clock | The 1-minute timer, kept by the server. |
| Missed turn | A turn where the turn clock ran out. The player draws 3 and is skipped. |
| Ejection | Automatic removal of a player after 3 missed turns in a row. |
| Tile | A letter tile, a blank (`_`) or a removal tile. |
| Hand | The tiles a player holds. Hidden from other players. |
| Bag | Face-down tiles to draw from. |
| Bag counter | The yellow circle in the header showing how many tiles are in the bag. Tapping it shows the unseen tiles. |
| Unseen tiles | For one player: every tile not in their hand, on the board or in the discard pile. That is the bag plus the other players' hands. |
| Discard pile | Used tiles. Shuffled back into the bag when the bag runs out. |
| Board | The shared row of tiles everyone changes. |
| Starting board | The board built at the start of each round. |
| Move | One of the five numbered moves: swap, replace a letter, play a letter, play a blank, remove a letter. |
| Valid board | A board that at least one word in the word list fits. |
| Bluff | Leaving an invalid board, on purpose or by accident. Legal. |
| Challenge | Claiming the most recent move left an invalid board. |
| Challenger / challenged player | The player who challenges / the player whose move is challenged. |
| Challenge window | The time during which a move can still be challenged. |
| Naming a word | The challenged player typing a word that fits the board. The server checks it. |
| Automatic challenge | The challenge triggered when a player plays their last tile. |
| Completion | Round end when the last blank is covered and nobody challenges. |
| Stalemate | Round end when every player swaps in a row for a full lap. |
| Word list | The dictionary that decides what counts as a word: ENABLE. |

## Look and feel

Inspired by NYT's Crossplay; the colors were sampled from its App Store screenshots. Never use NYT's name, logo, characters or fonts.

| Token | Color | Used for |
| --- | --- | --- |
| page | #FFFFFF | Page background |
| board | #F4F0EC | Warm off-white board area |
| tile | #4278C6 | Letter tiles on the board |
| tile-dark | #2A5490 | Your hand, and tiles from the latest move |
| yellow | #FFCC18 | Bag counter, call-outs ("Challenge!") |
| green | #90C648 | Valid word named, success |
| chip | #E0E8F4 | Highlight for the active player |
| ink | #121212 | Text, primary pill buttons |

- Tiles are rounded squares with bold white uppercase letters and no point numbers (the game has no scoring). A blank is a pale chip-colored tile with a dark-blue line along the bottom. A removal tile is lavender with a "no" symbol.
- Fonts: Libre Franklin for the interface and Zilla Slab Bold for the title, both free from Google Fonts.
- Phone first. The game screen has a header row of players (pastel avatar with their initial, name and tile count; the active player gets the chip color and a 1-minute ring) with the yellow bag counter in the middle, then a white "last move" banner with a soft shadow, the board row, your hand, and a bottom bar with a black pill primary button.

## Technology

- Node.js 24 LTS runs the server, written in plain JavaScript.
- Express serves the pages. Socket.IO sends live updates between server and players and reconnects automatically.
- Plain HTML, CSS and JavaScript in the browser. No framework and no build step.
- The server is the referee: it holds the bag and every hand, checks every move, and sends each player only their own hand.
- Match state is kept in server memory (no database). A server restart ends the matches in progress.
- Tests use Node's built-in test runner (`node --test`), with the rules tested against the examples in rules.md.
- The code lives on GitHub and is hosted on Render's free web service plan.

## Running it

- `npm install` once, to download the libraries into `node_modules/`.
- `npm start` runs the game at http://localhost:3000. Stop it with Ctrl+C.
- `npm test` runs the automated tests.

| File | What it does |
| --- | --- |
| `server.js` | Starts the web server and handles messages from players' browsers. |
| `src/matches.js` | Keeps every match in memory: creating, joining, rejoining, starting, cleaning up. |
| `public/index.html` | The single web page, with every screen. |
| `public/style.css` | The look: colors, tiles, buttons. |
| `public/client.js` | The browser side: screens, remembering your seat, talking to the server. |
| `src/game/game.js` | The referee: every rule, from dealing to the winner. It never reads the clock; the server passes in the time. |
| `src/game/tiles.js` | The 130 tiles and shuffling. |
| `src/game/words.js` | Loads the word list and checks whether a word fits the board. |
| `data/enable1.txt` | The ENABLE word list (public domain, from github.com/dolph/dictionary). |
| `test/` | Automated tests, including the rulebook's examples and a random-play check that no tile is ever lost. |

## Where it lives

- Live game: https://suchaword.onrender.com (Render free web service; build `npm install`, start `npm start`).
- Code: https://github.com/origamikid742-bit/Such-a-word- (private). Render redeploys on every push to `main`.
- Every push restarts the live server and ends matches in progress, so push when nobody is mid-match.

## Free hosting limits (Render)

- The server sleeps after 15 minutes with no traffic. The next visitor waits about a minute while it wakes up. An active match keeps it awake.
- Sleeping, restarting or deploying new code wipes matches in progress, because they live in memory. Render can restart free services at any time.
- 750 free instance hours per month, which is enough for one service running all month.
- If the hours or bandwidth run out, the service is suspended until the next month. This is unlikely for a small text-based game.

## Decisions

Answers to the open questions and the owner's later changes. These override rules.md where they differ.

1. Word list: **ENABLE** (public domain) instead of the NASPA Word List, which needs a license.
2. Replace a letter: the new letter must differ from the letter it replaces.
3. Two challenges at once: the first one the server receives counts.
4. Completion: every other player gets a "No challenge" button. The round ends when all of them click it, or after 30 seconds.
5. Between rounds, discard 1 and draw 1: all players at once, within 20 seconds.
6. Starting-board challenge: any other player may type a fitting word, and the first valid one counts.
7. No move possible and both the bag and the discard pile are empty: the turn is skipped. This isn't a missed turn and isn't a swap.
8. Fewer than 4 blanks available for a starting board: use as many as there are.
9. **Ejection:** a player whose turn clock runs out on 3 of their own turns in a row (drawing 3 each time, 9 in total) is ejected automatically, whether they are away or still clicking around.
   - The count carries across rounds.
   - Making a move, or challenging on your turn, resets the count.
   - A turn cut short by someone else's challenge doesn't count either way.
   - The ejected player's tiles are shuffled into the bag, and they can't rejoin.
   - If 2 or more players remain, play continues. If only 1 remains, that player wins.
10. Everyone can see how many tiles each player holds, but not which tiles.
11. New players can join only in the lobby. After that, only rejoining an existing seat is allowed.
12. rules.md's setup step 2 now points to "Between rounds".
13. **Bag view:** the bag counter shows how many tiles are in the bag. Tapping it opens "Unseen tiles", which lists every tile type (A–Z, blank, removal) with the number you can't see: the type's total minus your hand, the board and the discard pile. It notes how many of those are in the bag and how many are in other players' hands. The server computes it separately for each player.
14. **Look:** inspired by Crossplay (see [Look and feel](#look-and-feel)).
15. **Name:** "Such A Word".
16. **Players:** 2 to 6 instead of 3 to 6. With 2 players, the other player is the only one who can challenge, and a stalemate lap is two swaps in a row.

## Plan

- [x] A. Record decisions.
- [x] B. Multiplayer rooms: create a match, share the link, join, lobby, rejoin, host starts. Theme in place. Automated tests.
- [x] C. Publish together on GitHub and Render. The owner does each click, with an explanation.
- [x] D. Rules engine, with tests built from the rulebook examples.
- [ ] E. Playable turns: board, hand, the five moves, turn clock, challenges, bag view, ejection notice.
- [ ] F. Full game: completion, stalemate, between rounds, starting-board challenge, automatic challenge, winner, play again.
- [ ] G. Polish: phone layout, a rules page in the game, clearer messages.
