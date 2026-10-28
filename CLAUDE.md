# Such A Word

A web version of a bluffing word game for private matches. One person creates a match and shares a link; friends join by opening it. No accounts.

[rules.md](rules.md) is the source of truth for the rules. The summary below is a quick reference: if they ever disagree, rules.md wins, and the summary should be fixed.

## Working agreements

- The owner is a complete beginner with no coding experience. Explain every step in plain language, including anything they must click, approve or type themselves.
- Use boring, widely used technology. No exotic libraries or frameworks.
- Never add anything that needs a paid service (hosting, database, API, domain) without asking first.
- Ask before installing software on the owner's computer.
- Status: **the plan is waiting for approval. Do not build game code until the owner approves it.**

## Rules summary

- 3 to 6 players. 130 tiles: 98 letters (standard Scrabble distribution), 26 blanks, 6 removal tiles. Deal 7 tiles to each player. Hands are hidden, carry over between rounds and have no size limit.
- The **board** is a row of tiles. It is **valid** if at least one word fits it exactly: same length, letters as printed, every blank stands for some letter (and every blank is used).
- On your turn you have 1 minute to make exactly one move. You can't pass. If time runs out, you draw 3 and your turn is skipped.
  1. **Swap**: swap two different tiles on the board (not two blanks, not two of the same letter).
  2. **Replace a letter**: put a letter from your hand on a different board letter; discard the old one, then draw 1.
  3. **Play a letter**: put a letter from your hand on a blank; discard the blank.
  4. **Play a blank**: add a blank from your hand at either end or between two tiles.
  5. **Remove a letter**: play a removal tile on a board letter (never a blank); discard both.
- If none of the five moves is possible, draw one tile at a time until one is.
- Leaving an invalid board is a **bluff**, and bluffing is legal. Any player except the mover may **challenge** the most recent move until the next move is made. The challenged player has 30 seconds to name a fitting word. Whoever is wrong draws 3. Any challenge ends the round, and the loser starts the next round.
- A round also ends by **completion** (the last blank is covered and nobody challenges within 30 seconds) or **stalemate** (every player swaps in a row for a full lap). In both cases the next player in turn order starts.
- **Starting board**: keep 4 blanks aside, draw 2 tiles, shuffle with the blanks, lay all 6 in a row. A drawn removal tile is discarded, leaving 5 tiles. The first player may challenge the starting board before moving.
- **Between rounds**: each player may discard 1 and draw 1. The board and discard pile go back into the bag.
- **Winning**: playing your last tile triggers an automatic challenge. Name a fitting word within 30 seconds to win. Otherwise draw 3, the round ends, and you start the next round.

## Vocabulary

Use these words consistently in code, UI text and conversation.

| Term | Meaning |
| --- | --- |
| Match | One whole game, from lobby to winner. Has a short **match code** that appears in the share link. |
| Host | The player who created the match. Starts the game once 3 to 6 players have joined. |
| Lobby | The waiting screen before the host starts the match. |
| Seat | A player's place in a match: their name, hand and turn position. |
| Seat key | A secret code saved in the player's browser. It lets them get their seat back after a refresh or lost connection, without an account. |
| Rejoin | Reconnecting to your seat using your seat key. |
| Round | Play from one starting board until a challenge, completion or stalemate. A match has many rounds. |
| Turn | One player's chance to make one move, limited to 1 minute. |
| Turn clock | The 1-minute timer, kept by the server. |
| Tile | A letter tile, a blank (`_`) or a removal tile. |
| Hand | The tiles a player holds. Hidden from other players. |
| Bag | Face-down tiles to draw from. |
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
| Word list | The dictionary that decides what counts as a word. |

## Proposed technology (pending approval)

- **Node.js (LTS)** runs the server, written in plain JavaScript.
- **Express** serves the web pages. **Socket.IO** sends live updates between server and players and reconnects automatically.
- **Plain HTML, CSS and JavaScript** in the browser. No framework and no build step.
- The server is the referee: it holds the bag and every hand and checks every move, and it sends each player only their own hand.
- Match state is kept in server memory (no database). A server restart ends the matches in progress.
- Rules are tested with Node's built-in test runner (`node --test`), using the examples from rules.md.
- The code lives on GitHub and is hosted on Render's free web service plan.

## Free hosting limits (Render)

- The server sleeps after 15 minutes with no traffic. The next visitor waits about a minute while it wakes up. An active match keeps it awake.
- Sleeping, restarting or deploying new code wipes matches in progress, because they live in memory. Render can restart free services at any time.
- 750 free instance hours per month, which is enough for one service running all month.
- If the hours or bandwidth run out, the service is suspended until the next month. This is unlikely for a small text-based game.

## Open questions

The answers will be recorded here. Proposed defaults are in brackets.

1. Word list: the NASPA Word List can't be included in an app without a license. [Use ENABLE, a free public-domain list.]
2. Replace a letter: must the new letter differ from the one it replaces? [Yes.]
3. Two challenges at once: [the first one the server receives counts.]
4. Completion: "everyone passes" means every other player clicks "No challenge". [Yes.]
5. Between rounds, the optional discard-1-draw-1: [all players at once, within 20 seconds.]
6. Starting-board challenge: [any other player can type a fitting word; the first valid one counts.]
7. Stuck with an empty bag and empty discard pile: [your turn is skipped.]
8. Fewer than 4 blanks left for a starting board: [use as many as there are.]
9. A player leaves for good: [after 2 minutes away the host can remove them; their tiles go to the discard pile; below 3 players the match ends.]
10. Tile counts: [everyone can see how many tiles each player holds, but not which ones.]
11. Joining late: [only during the lobby; after that, only rejoining an existing seat.]
12. Setup step 2 says "Starting the next round"; the section is called "Between rounds". [Fix the wording in rules.md.]
