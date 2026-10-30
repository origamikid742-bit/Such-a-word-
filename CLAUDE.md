# Such A Word

A web version of a bluffing word game for private matches. One person creates a match and shares a link, and friends join by opening it. No accounts.

[rules.md](rules.md) is the rulebook. [Decisions](#decisions) records the owner's changes and the rulings for online play; where they differ from rules.md, the Decisions win. The summary below is a quick reference that already includes them.

## Working agreements

- The owner is a complete beginner with no coding experience. Explain every step in plain language, including anything they must click, approve or type themselves.
- Use boring, widely used technology. No exotic libraries or frameworks.
- Never add anything that needs a paid service (hosting, database, API, domain) without asking first.
- Ask before installing software on the owner's computer or downloading files.
- **Never change the gameplay rules code (`src/game/game.js`, `src/game/tiles.js`, `src/game/words.js`) without asking the owner first.**
- Build one phase of the [Plan](#plan) at a time, and pause after each phase so the owner can try it.
- Before any change bigger than a simple tweak, restate everything the owner asked for in your own words and ask about anything that is even slightly unclear. Wait for their answers before building.
- After any change to the website bigger than a very small tweak, run the automated tests (`npm test`) and make sure they pass before calling it done.

## Rules summary

These are the standard rules. The match settings (decisions 40 to 45) can change the numbers for one match.

- 2 to 6 players. 130 tiles: 98 letters (standard Scrabble distribution), 26 blanks, 6 removal tiles. Deal 7 tiles to each player. Hands are hidden, carry over between rounds and have no size limit.
- The **board** is a row of tiles. It is **valid** if at least one word in the ENABLE word list fits it exactly: same length, letters as printed, every blank stands for some letter (and every blank is used).
- On your turn you have 1 minute to make exactly one move. You can't pass. If time runs out, the move you lined up (chosen but not yet played) is played for you; with nothing lined up, you draw 3 and your turn is skipped. Three missed turns in a row and you are ejected.
  1. **Swap**: swap two different tiles on the board (not two blanks, not two of the same letter).
  2. **Replace a letter**: put a letter from your hand on a board letter that is different from it; discard the old one, then draw 1.
  3. **Play a letter**: put a letter from your hand on a blank; discard the blank.
  4. **Play a blank**: add a blank from your hand at either end or between two tiles.
  5. **Remove a letter**: play a removal tile on a board letter (never a blank, and never the board's last tile); discard both.
- If none of the five moves is possible, the turn is skipped straight away, with a message saying so.
- Leaving an invalid board is a **bluff**, and bluffing is legal. Any player except the mover may **challenge** the most recent move until the next move is made. The challenged player has 30 seconds to name a fitting word. Whoever is wrong draws 3. Any challenge ends the round, and the loser starts the next round.
- A round also ends by **completion** (the last blank is covered and nobody challenges within 30 seconds) or **stalemate** (every player swaps in a row for a full lap). In both cases the next player in turn order starts.
- **Starting board**: the old board goes on the discard pile. Take 4 blanks from the discard pile (then the bag if short), draw 2 tiles from the top of the bag, shuffle them with the blanks, lay all 6 in a row. A drawn removal tile is discarded, leaving 5 tiles, but the board keeps drawing until it has at least 2. The first player may challenge the starting board before moving.
- **Bag and discard pile**: the bag is shuffled once, at the start of the game, and is never reshuffled until it runs out. Then the discard pile is shuffled into it. The discard pile is face up and everyone can look through it.
- **Between rounds**: each player may set 1 tile aside face down and draw 1. When the next round starts, everyone's set-aside tiles go face up onto the discard pile together.
- **Leaving**: a player can leave mid-game. Like an ejection, they're out for good, and their tiles go face up onto the discard pile. The host can also end the game: no winner, and everyone goes back to the lobby.
- **Bots**: the host can add bots in the lobby (decisions 51–57). They follow every rule and see only what a person in their seat would.
- **Winning**: playing your last tile triggers an automatic challenge. Name a fitting word within 30 seconds to win. Otherwise draw 3, the round ends, and you start the next round. A player who is the only one left after ejections or departures also wins.

## Vocabulary

Use these words consistently in code, UI text and conversation.

| Term | Meaning |
| --- | --- |
| Match | One whole game, from lobby to winner. Has a short **match code** that appears in the share link. |
| Host | The player who created the match, or whoever they passed the role to. Starts the game once 2 to 6 players have joined, can remove people, pass the role on and end a game. |
| Lobby | The waiting screen before the host starts the match. |
| Seat | A person's place in a match: their name, icon, wins and (for a player) hand and turn position. |
| Spectator | Someone watching a match instead of playing: they joined after the game started, or when 6 were already playing. Up to 20. They can chat, and get a seat in the next lobby if there's room. |
| Icon | A player's picture: their letter tile (the default), a line drawing or an emoji, on one of 10 pastel colors. |
| Chat | Short messages (up to 500 characters, emojis welcome) from players and spectators. Shown in the chat panel and briefly as a bubble over the sender's icon. |
| Wins | How many games each player has won in this match. |
| Seat key | A secret code saved in the player's browser. It lets them get their seat back after a refresh or lost connection, without an account. |
| Rejoin | Reconnecting to your seat using your seat key. |
| Round | Play from one starting board until a challenge, completion or stalemate. A match has many rounds. |
| Turn | One player's chance to make one move, limited to 1 minute. |
| Turn clock | The 1-minute timer, kept by the server. |
| Lined-up move | The move a player has chosen on their turn but not yet confirmed with Play. Only the server knows it, and it is played for them if their turn clock runs out. |
| Missed turn | A turn where the turn clock ran out with no lined-up move. The player draws 3 and is skipped. |
| Ejection | Automatic removal of a player after 3 missed turns in a row. |
| Leave | A player quitting a game in progress. They are out for good, like an ejection. |
| End game | The host stopping a game for everyone. No winner; everyone goes back to the lobby. |
| Tile | A letter tile, a blank (`_`) or a removal tile. |
| Hand | The tiles a player holds. Hidden from other players. |
| Bag | Face-down tiles to draw from. |
| Bag counter | The yellow bag in the header showing how many tiles are in it. Tapping it shows the unseen tiles. |
| Unseen tiles | For one player: every tile not in their hand, on the board or in the discard pile. That is the bag plus the other players' hands. |
| Discard pile | Used tiles, face up. Shown by the small counter under the bag counter; tapping it lists them. Shuffled back into the bag when the bag runs out. |
| Traded tile | The tile a player sets aside between rounds. Face down until the next round starts, then revealed with everyone else's onto the discard pile. |
| Board | The shared row of tiles everyone changes. |
| Starting board | The board built at the start of each round. |
| Move | One of the five numbered moves: swap, replace a letter, play a letter, play a blank, remove a letter. |
| Valid board | A board that at least one word in the word list fits. |
| Bluff | Leaving an invalid board, on purpose or by accident. Legal. |
| Challenge | Claiming the most recent move left an invalid board. |
| Challenger / challenged player | The player who challenges / the player whose move is challenged. |
| Challenge window | The time during which a move can still be challenged. |
| Naming a word | The challenged player typing a word that fits the board. The server checks it. |
| Possible words | After a challenge, the list of every word that fitted the challenged board. |
| Move history | The panel listing everything that has happened in the current game, round by round. |
| Automatic challenge | The challenge triggered when a player plays their last tile. |
| Completion | Round end when the last blank is covered and nobody challenges. |
| Stalemate | Round end when every player swaps in a row for a full lap. |
| Word list | The dictionary that decides what counts as a word: ENABLE. |
| Match settings | The rules the host picked for this match: hand size, clocks, tile counts, starting board, and the Reshuffle and Force valid switches. Chosen when creating a match, changeable in the lobby. |
| Custom rules | The match settings that differ from the standard rules, listed in the lobby and in the Rules panel. |
| Force valid starting board | A setting that rebuilds the starting board behind the scenes until a word fits it. |
| Bot | A computer player the host adds in the lobby. Has a difficulty and a personality, and plays by the same rules. |
| Personality | How a bot chats and slightly how it plays: Quiet, Encouraging, Annoying, Unsure, or a themed character. |
| Chattiness | How often a bot talks: Muted, Rare, Normal or Chatty. Set by the host for each bot. |
| Profile | The window that opens when you tap a player: their name and wins, and for a bot its personality, difficulty, stats, a mute just for you and the host's controls. |
| Preferences | Each player's own choices, saved in their browser: sound effects and volume, chat on or off, dark mode. Opened with the gear button. |

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

Dark mode (Preferences) swaps these for deep navy-charcoal: page #10151F, cards #182030, board #1D2533, tile #4F87D8, tile-dark #3466B2, chip #2A3850, ink #ECEFF4. Yellow and green stay the same. Every color in `style.css` is a token on `:root`, redefined under `:root[data-theme="dark"]`.

- Tiles are rounded squares with bold white uppercase letters and no point numbers (the game has no scoring). A blank is a pale chip-colored tile with a dark-blue line along the bottom. A removal tile is lavender with a "no" symbol.
- Fonts: Libre Franklin for the interface and Zilla Slab Bold for the title, both free from Google Fonts.
- Short animations make it lively: tiles slide to new places, fly in from the bag (drawing, dealing) or from the seat of the player who played them, and fly to the discard pile when discarded (traded tiles and the tiles of a player who leaves or is ejected pop up over their seat first); the board flashes yellow for a challenge and green or red when it's settled; "+3" or "−1" floats over a seat whose tile count changes; the winner gets confetti. Devices set to reduce motion get none.
- Moves can be made by tapping (a hand tile, then a target; or two board tiles to swap) or by dragging, with a mouse or a finger. Either way a preview appears and Play confirms it. Tapping any highlighted tile of the preview, or any tile in your hand, undoes it (a different hand tile becomes the new pick). A letter or blank in the preview can be dragged to a new spot, or back to the hand to undo.
- Phone first. A very long board wraps onto a second line. A slim bar at the top of the lobby and game holds the watching count (left) and the Chat button with an unread count (right). The game screen has a header row of players (icon, name and tile count; the active player gets the chip color and a 1-minute ring) with the yellow bag in the middle and the discard pile's trash can under it, then a white "last move" banner with a soft shadow, the board row, the possible-words card after a challenge, your hand, "Leave game" (and "End game" for the host), and a bottom bar with a black pill primary button.

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
| `public/client.js` | The browser side: screens, remembering your seat and icon, the lobby with the host's buttons, talking to the server. |
| `public/match-settings.js` | The match settings: ranges, defaults, typing times, the bag size and the custom rules in words. Shared by the browser and the server. |
| `public/settings-screen.js` | The match settings window (create a match, change settings in the lobby), the letter tiles list, the Force valid tip and the custom rules panel. |
| `public/bot-personalities.js` | Bot difficulties, personalities (names, icons, bios, thinking messages, strategy nudges), chattiness and swearing. Shared by the browser and the server. |
| `public/bots-ui.js` | The Add a bot window, everyone's profiles, the host's bot controls and muting a bot just for you. |
| `public/prefs.js` | Preferences: sound, chat and dark mode, saved in the browser. |
| `public/sounds.js` | Sound effects, made by the browser with the Web Audio API (no sound files). |
| `public/icons.js` | The 10 icon colors, 20 line drawings and 24 emojis. Shared by the browser and the server. |
| `public/icon-chooser.js` | Choosing your icon, from the home screen or the lobby. |
| `public/chat.js` | The chat panel, emoji buttons and the bubbles over icons. |
| `public/history.js` | The move history panel: every event of the game, round by round, with the words that fitted. |
| `public/rules.js` | Opens the rules page and draws its example boards. |
| `public/game-screen.js` | The game screen: players and clocks, bag view, board, hand, tap or drag to move with a preview, challenges. |
| `public/motion.js` | Short animations: tiles sliding, flying in and fading out, flashes, floating labels, confetti. |
| `public/drag.js` | Dragging tiles with a mouse or a finger. |
| `public/tutorial.js` | The interactive tutorial on the home screen. Runs in the browser only, with its own practice boards. |
| `src/game/view.js` | What one player may see of a game: never other hands or the bag's contents. |
| `src/game/game.js` | The referee: every rule, from dealing to the winner. It never reads the clock; the server passes in the time. |
| `src/game/tiles.js` | The 130 tiles and shuffling. |
| `src/game/words.js` | Loads the word list and checks whether a word fits the board. |
| `src/bots/vocabulary.js` | A fast word index, and each difficulty's vocabulary (from `data/common-words.txt`). |
| `src/bots/brain.js` | What a bot does: legal moves, judging boards, when to challenge, naming words, trading tiles. |
| `src/bots/driver.js` | Runs the bots on the server: plans each bot's next action and carries it out after a short pause. |
| `src/bots/chat.js` | When bots talk and what they say: reactions to the game, mentions, other bots, quiet moments, cooldowns. |
| `src/bots/lines/` | Every talking personality's chat lines, by situation, with Mild and Uncensored extras and special replies to other personalities. |
| `src/game/estimate.js` | How often a starting board would have a word with given settings, for the Force valid tip. |
| `src/game/possible.js` | Lists every word that fits a board, for the possible-words card after a challenge (first 500, alphabetical). |
| `data/common-words.txt` | The ENABLE words that are common in everyday English, most common first. Made from FrequencyWords (Hermit Dave, CC BY-SA 4.0). |
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
7. No move possible: the turn is skipped straight away (changed by the owner from "draw until a move is possible"), and everyone sees "No move possible, so Ben's turn was skipped." It isn't a missed turn and isn't a swap. It's rare: it happens only when the board can't be swapped (all one kind of tile, or fewer than 2 tiles), you hold no blank, and the board is all blanks while you hold only removal tiles, or the board is empty, or the board is one repeated letter and you hold only that letter. The rules page doesn't mention it.
8. Fewer than 4 blanks available for a starting board: use as many as there are.
9. **Ejection:** a player whose turn clock runs out on 3 of their own turns in a row (drawing 3 each time, 9 in total) is ejected automatically, whether they are away or still clicking around.
   - The count carries across rounds.
   - Making a move, or challenging on your turn, resets the count.
   - A turn cut short by someone else's challenge doesn't count either way.
   - The ejected player's tiles go face up onto the discard pile (changed from "shuffled into the bag" by decision 26), and they can't rejoin.
   - If 2 or more players remain, play continues. If only 1 remains, that player wins.
10. Everyone can see how many tiles each player holds, but not which tiles.
11. New players can join only in the lobby. After that, newcomers watch as spectators (decision 31), and players can only rejoin their existing seat.
12. rules.md's setup step 2 now points to "Between rounds".
13. **Bag view:** the bag counter shows how many tiles are in the bag. Tapping it opens "Unseen tiles", which lists every tile type (A–Z, blank, removal) with the number you can't see: the type's total minus your hand, the board and the discard pile. It notes how many of those are in the bag and how many are in other players' hands. The server computes it separately for each player.
14. **Look:** inspired by Crossplay (see [Look and feel](#look-and-feel)).
15. **Name:** "Such A Word".
16. **Players:** 2 to 6 instead of 3 to 6. With 2 players, the other player is the only one who can challenge, and a stalemate lap is two swaps in a row.
17. **Play again:** after a game ends, any player can press Play again. Everyone returns to the lobby with the same link; new friends can join, players who have gone are dropped after a minute, and the host starts the next game. Players may also leave a finished game.
18. **Stalemate window:** like completion, everyone except the last mover gets a "No challenge" button, and the round ends when all of them pass or after 30 seconds.
19. **Joining by code:** the home screen has a match-code box. Codes can be typed in any case, with spaces or dashes, or pasted as a whole link. The name typed above it is used to join straight away.
20. **Confirming:** risky buttons need a second tap within 3 seconds. The second-tap label is "Confirm Challenge" (or "Confirm Give Up").
21. **Tutorial:** "How to play" on the home screen is a 12-step interactive tutorial with practice boards for every move, two challenge quizzes and a practice win.
22. **Bag rule (owner's rule change):** the bag is not shuffled at the end of a round. The board goes onto the discard pile, the starting board's 4 blanks come from the discard pile first and then the bag, and its 2 tiles come off the top of the bag. The discard pile is shuffled back into the bag only when the bag runs out. Hands and tiles already in the bag are never touched.
23. **Discard pile view:** a counter under the bag counter shows how many tiles are in the discard pile. Tapping it lists every tile type with its count, like the bag view.
24. **Traded tiles:** between rounds, a traded tile is set aside face down. When the next round starts, everyone's traded tiles are revealed at the same time: each pops up over its player's seat, then flies to the discard pile.
25. **Lined-up move at timeout:** while you pick a move on your turn, the server quietly keeps it. If your clock runs out, it is played for you (even if you've disconnected), and it isn't a missed turn. Only with nothing lined up (or a move that's no longer legal) do you draw 3. Nobody else ever sees a lined-up move.
26. **Leaving mid-game:** "Leave game" (with "Confirm Leave") works like an ejection: the player is out, can't rejoin, and their tiles go face up onto the discard pile with an animation from their seat. Leaving while challenged counts as giving up first. Leaving on your turn passes it to the next player; if you were the only one left to answer a challenge or pass, the waiting ends. If the host leaves, the host role passes on. Their name stays on screen marked "Left" until the next lobby. If only 1 player remains, they win.
27. **End game:** the host can end a game in progress ("Confirm End Game"). There is no winner, everyone goes back to the lobby, and players who left are dropped. Everyone sees who ended it.
28. **Possible words after a challenge:** when a move or last-tile challenge is settled, everyone sees "Possible words: …" (nobody named a word) or "Other possible words: …" (leaving out the word that was named), alphabetically, as many as fit in about three lines, then "and X more", which opens the full list (up to the first 500). With none: "No words were possible with this board." A starting-board challenge shows no list when someone names a word, and the "Possible words" list when the board is rebuilt. The card stays until the next move or round.
29. **Move controls:** tapping any hand tile undoes a lined-up move, and a different tile becomes the new pick. A previewed letter or added blank can be dragged to a new spot (onto a blank to play it, onto a letter to replace it) or back to the hand to undo. Swaps and removals are undone by tapping.
30. **Icons:** a circle in one of 10 pastel colors holding the player's letter tile (the default, on a random color), one of 20 line drawings (owl, fox, cat, rocket, cactus, mug, pencil, book, crown, dice, light bulb, paper plane, whale, mushroom, sun, moon, shoe, bike, swimmer, barbell) or one of the 24 chat emojis. Change it by tapping your icon on the home screen or in the lobby; it's remembered in the browser. No pop-up when joining.
31. **Spectators:** joining after the game has started, or when 6 are playing, makes you a spectator (up to 20). Spectators see the board and tile counts but no hands, can chat, and appear in the "watching" count (tap it for the list). In the lobby they take free player seats in the order they came, including after Play again. A spectator away for a minute loses their place.
32. **Chat:** messages of up to 500 characters (raised from 20, then 100, at the owner's request) (an emoji counts as one), text and emojis mixed; tapping one of the 24 emoji buttons adds it to the message. One message a second per person, no word filter. Everyone in the match sees the last 100 in the chat panel; messages of 1 to 3 emojis show bigger. A bubble shows over the sender's icon for 4 seconds, cut to 60 characters with "…" for longer messages (under the watching count for spectators). Visual only: no sounds or vibration.
33. **Win tally:** each player's wins in this match show in the lobby and on the game-over card. Games ended by the host count for nobody.
34. **Host controls:** in the lobby the host can make another player host or remove them ("Confirm Host", "Confirm Remove"). Spectators can be removed at any time, and during a game "Pass host" hands the role to another player. A removed person sees a message and can join again with the link.
35. **Bag and discard counters:** the bag counter is a yellow bag with the count on it; the discard pile counter is a trash can with the count. Tapping them shows the unseen tiles and the discard pile, as before.
36. **Rules page:** "Read the rules" on the home screen and "Rules" in the lobby and game open a one-page summary of the rules (with this file's decisions), with small example boards.
37. **Move history:** the History button at the top of the game opens a panel with every event of the current game, round by round, including each challenge's possible words. It updates while open.
38. **Visual alerts:** when the game needs you (your turn, naming a word, a last chance to challenge, a tile trade), the board glows, the browser tab's title says so ("Your turn · Such A Word") and its icon gets a yellow dot; in a background tab the title blinks. Unread chat messages show in the title as "(2)". Your own clock pulses in its last 10 seconds. No sounds or vibration.
39. **Phone checks:** every screen, panel and window fits a 320-pixel-wide phone without sideways scrolling.
40. **Match settings:** "Create a match" opens a settings screen. "Use default settings" creates the match straight away with the rules above. Otherwise the creator can change: Reshuffle bag every round (off), Starting hand size (1–20, 7), Time per turn (0:10–5:00, 1:00), Challenge time (0:10–5:00, 0:30), Blank tiles (5–50, 26), Removal tiles (5–50, 6), Letter tiles (a sub-menu with every letter, each 1–50, Scrabble counts by default), Blanks on the starting board (2–10, 4), Random tiles on the starting board (1–5, 2) and Force valid starting board (off). Total bag size is shown but can't be edited. Numbers have a slider and a box that accepts digits only; times fill in from the right with the colon added (typing 130 shows 1:30), seconds over 59 carry over (1:75 is 2:15), and a value outside the range snaps to the nearest end. A changed setting shows a circular arrow that restores its default. Warnings appear for turns under 0:20 or over 2:00 and when the bag can't hold 6 players' hands.
41. **Reshuffle bag every round** (off by default): when on, at the start of each new round the old board and the discard pile go back into the bag and the bag is shuffled, then the traded tiles are revealed onto the discard pile as usual. Hands always carry over.
42. **Challenge time** sets every 30-second window: naming a word, the completion and stalemate "No challenge" windows, the starting-board challenge and the automatic challenge. The 20-second tile trade stays 20 seconds.
43. **Settings in the lobby:** each new match starts from the defaults. Within one match, settings carry over to every game until the host changes them. The host can change them in the lobby only (before each game, never mid-game), and everyone gets a notice listing what changed. The lobby always shows a summary of the custom rules ("Default rules" when nothing changed).
44. **Enough tiles to start:** the host can't start unless the bag holds every player's starting hand plus the starting board (blanks and random tiles). The message says what to lower.
45. **Starting board:** the chosen number of blanks (from the discard pile first, then the bag; as many as there are) plus the chosen number of random tiles from the bag. A drawn removal tile is still discarded, but the board keeps drawing until it has at least 2 tiles. With **Force valid starting board** on, the game quietly rebuilds the board until a word fits: it looks for an order of the tiles that makes a word; if none exists it puts the drawn tiles back into the bag at random spots and draws new ones; after many failures it shuffles the discard pile into the bag and tries again; if it still fails it uses the last board and says so. Only the final board is shown. While a board is guaranteed valid, the starting-board challenge isn't offered. On the settings screen, if fewer than half of sample starting boards for the chosen settings would be valid, a pop-up recommends turning Force valid on (once each time the settings cross into that zone).
46. **The last tile can't be removed:** a removal tile can't be played when the board has only 1 tile. A player who then has no other move is skipped with the "No move possible" message (decision 7).
47. **Custom rules panel:** the Rules panel has a "Custom rules for this match" section listing every setting that differs from the defaults, with the default beside it. Spectators see it too.
48. **Preferences:** a gear button on the home screen, in the lobby and in the game opens Preferences, saved in this browser: Sound effects (on/off switch, a slider and a 1–100 box, 50% by default), Chat (on by default; off hides the Chat button, the panel, the bubbles and chat sounds for you only) and Dark mode (off by default).
49. **Dark mode:** deep navy-charcoal backgrounds with the same tile blues slightly brightened, and the yellow and green kept for call-outs.
50. **Sounds** (replaces "no sounds" in decisions 32 and 38): short, soft sounds made in the browser (no sound files): clicks for picking and placing tiles, a slide for swaps, a chime when your turn starts, quiet ticks in your last 5 seconds, a sting for a challenge, a bright chime for a named word, a low thunk for a caught bluff, a whoosh for new rounds and drawing, a pop for chat, a knock when someone joins the lobby, and a fanfare for the winner. Other players' moves are quieter than your own, and only the most important sound plays when several things happen at once.

51. **Bots:** in the lobby the host taps "Add a bot", picks a personality (Quiet by default; a 🎲 Random button picks any other personality, themed ones included) and a difficulty. Bots take player seats (6 players at most, counting bots), can be added only in the lobby, are removed with the usual Remove button, can never be host, keep their settings and wins between games in the same lobby, and never miss turns. The host may start with only bots. If every human player leaves or is put out mid-game, the game ends with no winner; a match with no humans left is deleted. Duplicates are allowed and greet each other.
52. **Bot names and icons:** generic bots get ordinary names that suit their personality (Quiet: Ruth, Walter…; Encouraging: Linda, Gary…; Annoying: Chad, Karen…; Unsure: Kevin, Gerald…); themed bots use the character's name; repeats get "2", "3". Each personality has its own emoji icon and color. The host can rename a bot.
53. **Bot difficulty:** Idiot (nearly random moves, wild challenges, fails easy words), Easy, Medium, Hard (play like people with growing skill and vocabulary) and Expert (knows the whole word list, nearly always leaves a valid board, catches every bluff; practically unbeatable). Vocabularies come from `data/common-words.txt` (word frequency): Idiot ~400 words, Easy ~6,000, Medium ~16,000, Hard every common word plus a fifth of the rest, Expert all of ENABLE. Bots only see what a human in their seat would. Each decision has a time limit so the server never lags.
54. **Bot speed:** about 1–2 seconds per move or decision and about 2 seconds to name a word, with a little variety. While a bot takes its turn, the status line shows a thinking message that suits its personality ("Gollum is whispering to its precious…").
55. **Personalities** (chat style plus a small strategy nudge that never changes how good a bot is): Quiet (never chats; normal play), Encouraging (kind; table talk that sometimes says a word that fits, even during someone's challenge; challenges less; passes quickly), Annoying (rude and cocky; challenges and bluffs more; saltier when losing), Unsure (self-doubting and self-deprecating; plays safe; challenges less; trades more; braver when winning). Themed bots: Marvin, Rocky, the Narrator, Martin, Vizzini, Crazy Dave, Dr. Doofenshmirtz, Zaphod Beeblebrox, Napoleon Dynamite, Dobby, Groot, Inigo Montoya, Gollum and Shakespeare, each with a nudge from its character (see `public/bot-personalities.js`). Lines are original, written in each character's voice, with only brief nods to catchphrases.
56. **Bot chat:** at least 60 lines per talking personality, grouped by situation (moves, challenges, words named, rounds, winning and losing, quiet moments, joining and leaving, other bots, being mentioned), with more off-topic lines than game terms. Bots answer when a human mentions their name (hellos, thanks, insults, compliments, questions, "gg"), react to each other (with special pairs such as Marvin and Zaphod, Vizzini and Inigo, and duplicates), and have per-bot cooldowns plus a shared limit so they never drown out people. Chat off in Preferences hides bot chat too.
57. **Bot settings:** tapping a bot's icon opens its profile (personality, bio, difficulty, stats). The host can change chattiness (Muted, Rare, Normal by default, Chatty), swearing (Clean; Mild by default: damn, hell, crap and in-universe swears; Uncensored: anything except slurs and jokes about real-world groups) and its name at any time, and its difficulty and personality in the lobby. Any player can mute a bot just for themselves from its profile. Tapping a human's icon shows their name and wins.

## Plan

- [x] A. Record decisions.
- [x] B. Multiplayer rooms: create a match, share the link, join, lobby, rejoin, host starts. Theme in place. Automated tests.
- [x] C. Publish together on GitHub and Render. The owner does each click, with an explanation.
- [x] D. Rules engine, with tests built from the rulebook examples.
- [x] E. Playable turns: board, hand, the five moves, turn clock, challenges, bag view, ejection notice.
- [x] F. Full game: completion, stalemate, between rounds, starting-board challenge, automatic challenge, winner, play again.
- [x] Owner's requests after F: join by code, "Confirm Challenge", tap a highlighted tile to undo, drag to play, animations, interactive tutorial, long boards wrap on phones.
- [x] Part 1 of the next requests (rules and moves): bag rule, face-up discard pile, traded tiles revealed together, lined-up moves at timeout, possible words after challenges, leaving and ending a game, better tap and drag controls.
- [x] Part 2 (people): player icons, spectators, chat with emojis, win tally, host controls, bag and trash can counters.
- [x] Part 3 (information and polish, replaces G): rules page in the game and on the home screen, move history, visual alerts, phone checks.
- [x] H. Settings and sound: match settings when creating a match and in the lobby, board setup and Force valid, custom rules panel, Preferences (sound, chat, dark mode), dark mode, sound effects.
- [x] I. Bots: five difficulties, personalities and themed bots with chat, profiles, host controls.
