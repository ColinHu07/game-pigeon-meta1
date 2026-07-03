import { describe, expect, it } from 'vitest';
import { POCKETS, TABLE } from '../../src/constants';
import { chooseBotShot } from '../../src/game/bot';
import { createPlayers, createTestBall } from '../../src/game/setup';

describe('chooseBotShot', () => {
  it('chooses an easy clear pocket attempt', () => {
    const players = createPlayers();
    players.bot.group = 'solids';
    players.human.group = 'stripes';
    const balls = [
      createTestBall(0, 240, 420),
      createTestBall(1, TABLE.play.x + 65, TABLE.play.y + 56),
      createTestBall(8, 360, 160),
    ];

    const shot = chooseBotShot({ currentPlayer: 'bot', players, balls, seed: 1 });

    expect(shot.reason).toBe('pocket-attempt');
    expect(shot.targetBallId).toBe(1);
    expect(shot.confidence).toBeGreaterThan(0.4);
  });

  it('avoids a blocked pocket line and falls back safely', () => {
    const players = createPlayers();
    players.bot.group = 'solids';
    players.human.group = 'stripes';
    const target = createTestBall(1, 300, 280);
    const balls = [
      createTestBall(0, 240, 420),
      target,
      ...POCKETS.map((pocket, index) =>
        createTestBall(index + 8, (target.position.x + pocket.x) / 2, (target.position.y + pocket.y) / 2),
      ),
    ];

    const shot = chooseBotShot({ currentPlayer: 'bot', players, balls, seed: 2 });

    expect(shot.reason).toBe('safety-fallback');
    expect(shot.confidence).toBeLessThan(0.1);
  });
});
