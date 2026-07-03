import { describe, expect, it } from 'vitest';
import type { Ball, RulesContext, ShotOutcome } from '../../src/types';
import { resolveShot } from '../../src/game/rules';
import { createPlayers, createTestBall } from '../../src/game/setup';

const balls = (...items: Ball[]) => items;

function context(overrides: Partial<RulesContext> = {}): RulesContext {
  const players = createPlayers();
  return {
    currentPlayer: 'human',
    players,
    ballsBefore: balls(
      createTestBall(0, 280, 420),
      createTestBall(1, 280, 220),
      createTestBall(9, 305, 220),
      createTestBall(8, 330, 220),
    ),
    ballsAfter: balls(
      createTestBall(0, 280, 420),
      createTestBall(1, 280, 220),
      createTestBall(9, 305, 220),
      createTestBall(8, 330, 220),
    ),
    ...overrides,
  };
}

describe('resolveShot', () => {
  it('assigns groups from the first legally potted group', () => {
    const before = context().ballsBefore;
    const after = before.map((ball) => (ball.id === 1 ? { ...ball, pocketed: true } : ball));
    const result = resolveShot(context({ ballsAfter: after }), {
      firstContactId: 1,
      potted: [1],
      cuePocketed: false,
    });

    expect(result.players.human.group).toBe('solids');
    expect(result.players.bot.group).toBe('stripes');
    expect(result.keepsTurn).toBe(true);
    expect(result.nextPlayer).toBe('human');
  });

  it('flags a wrong first contact as a foul and gives ball in hand', () => {
    const players = createPlayers();
    players.human.group = 'solids';
    players.bot.group = 'stripes';

    const result = resolveShot(context({ players }), {
      firstContactId: 9,
      potted: [],
      cuePocketed: false,
    });

    expect(result.foul).toBe(true);
    expect(result.ballInHand).toBe(true);
    expect(result.nextPlayer).toBe('bot');
  });

  it('treats scratches as fouls even when a legal ball drops', () => {
    const before = context().ballsBefore;
    const after = before.map((ball) => (ball.id === 0 || ball.id === 1 ? { ...ball, pocketed: true } : ball));
    const result = resolveShot(context({ ballsAfter: after }), {
      firstContactId: 1,
      potted: [1, 0],
      cuePocketed: true,
    });

    expect(result.foul).toBe(true);
    expect(result.ballInHand).toBe(true);
    expect(result.nextPlayer).toBe('bot');
  });

  it('awards opponent the game when the 8 is potted early', () => {
    const players = createPlayers();
    players.human.group = 'solids';
    players.bot.group = 'stripes';
    const result = resolveShot(context({ players }), {
      firstContactId: 1,
      potted: [8],
      cuePocketed: false,
    });

    expect(result.winner).toBe('bot');
    expect(result.foul).toBe(true);
  });

  it('allows a valid 8-ball win after the player group is clear', () => {
    const players = createPlayers();
    players.human.group = 'solids';
    players.bot.group = 'stripes';
    const before = balls(
      createTestBall(0, 280, 420),
      createTestBall(1, 280, 220, true),
      createTestBall(2, 300, 220, true),
      createTestBall(3, 310, 220, true),
      createTestBall(4, 320, 220, true),
      createTestBall(5, 330, 220, true),
      createTestBall(6, 340, 220, true),
      createTestBall(7, 350, 220, true),
      createTestBall(8, 360, 220),
    );
    const after = before.map((ball) => (ball.id === 8 ? { ...ball, pocketed: true } : ball));

    const result = resolveShot(context({ players, ballsBefore: before, ballsAfter: after }), {
      firstContactId: 8,
      potted: [8],
      cuePocketed: false,
    });

    expect(result.winner).toBe('human');
    expect(result.foul).toBe(false);
  });
});

