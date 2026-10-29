'use strict';

const { possibleWords } = require('./possible');

const EVENTS_SHOWN = 12;

const publicTile = ({ id, type }) => ({ id, type });

function countTypes(game, tiles) {
  const counts = Object.fromEntries(Object.keys(game.tileCounts).map((type) => [type, 0]));
  for (const tile of tiles) counts[tile.type] += 1;
  return counts;
}

// For a spectator, every tile not on the board or the discard pile is unseen:
// the bag plus all the players' hands.
function unseenBySpectator(game) {
  const counts = { ...game.tileCounts };
  for (const tile of [...game.board, ...game.discard]) counts[tile.type] -= 1;
  const inHands = game.players.reduce((total, player) => total + player.hand.length, 0) + game.setAside.length;
  return { counts, inBag: game.bag.length, inOtherHands: inHands };
}

// After a challenge, every word that fitted the board, for players to learn from.
function withPossibleWords(game, event) {
  if (!event.pattern || !game.words) return event;
  return { ...event, possible: possibleWords(game.words, event.pattern) };
}

// What one player may see of the game: the board, the face-up discard pile,
// their own hand, how many tiles everyone holds, and their unseen-tile counts.
// Other hands, the bag's contents, traded tiles not yet revealed and the move
// a player has lined up never leave the server.
function gameView(game, playerId, now) {
  const me = game.players.find((player) => player.id === playerId);
  const { lastMove } = game;
  const challengeOpen = (game.phase.name === 'turn' || game.phase.name === 'roundEnding') && lastMove !== null;
  return {
    now,
    round: game.round,
    phase: structuredClone(game.phase),
    board: game.board.map(publicTile),
    pattern: game.pattern(),
    hand: me ? me.hand.map(publicTile) : [],
    players: game.players.map((player) => ({
      id: player.id,
      handCount: player.hand.length,
      missedTurns: player.missedTurns,
      ejected: player.ejected,
      left: player.left,
    })),
    bagCount: game.bag.length,
    discard: { count: game.discard.length, counts: countTypes(game, game.discard) },
    unseen: me ? game.unseenTiles(playerId) : unseenBySpectator(game),
    lastMove: lastMove ? { ...lastMove } : null,
    canChallenge: Boolean(me && !me.ejected && challengeOpen && lastMove.playerId !== playerId),
    events: game.events.slice(-EVENTS_SHOWN).map((event) => withPossibleWords(game, event)),
  };
}

// Everything that has happened in the game so far, for the move history.
// Every event is public: hands and the bag never appear in them.
function gameHistory(game) {
  return game.events.map((event) => withPossibleWords(game, event));
}

module.exports = { gameView, gameHistory };
