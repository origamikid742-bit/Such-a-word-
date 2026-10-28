'use strict';

const EVENTS_SHOWN = 12;

const publicTile = ({ id, type }) => ({ id, type });

// What one player may see of the game: the board, their own hand, how many
// tiles everyone holds, and their unseen-tile counts. Other hands and the bag's
// contents never leave the server.
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
    })),
    bagCount: game.bag.length,
    unseen: me ? game.unseenTiles(playerId) : null,
    lastMove: lastMove ? { ...lastMove } : null,
    canChallenge: Boolean(me && !me.ejected && challengeOpen && lastMove.playerId !== playerId),
    events: game.events.slice(-EVENTS_SHOWN),
  };
}

module.exports = { gameView };
