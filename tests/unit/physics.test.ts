import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, TABLE } from '../../src/constants';
import { simulateShot } from '../../src/game/physics';
import { createTestBall } from '../../src/game/setup';

describe('physics simulation', () => {
  it('records cue-ball first contact after a direct hit', () => {
    const balls = [createTestBall(0, 300, 420), createTestBall(1, 300, 250)];
    const result = simulateShot(balls, {
      angleRad: -Math.PI / 2,
      power01: 0.45,
      spin: { x: 0, y: 0 },
    });

    expect(result.outcome.firstContactId).toBe(1);
  });

  it('keeps max-power balls within rail bounds when not pocketed', () => {
    const balls = [createTestBall(0, 300, 300), createTestBall(1, 330, 300)];
    const result = simulateShot(balls, {
      angleRad: 0,
      power01: 1,
      spin: { x: 0, y: 0 },
    });

    for (const ball of result.balls) {
      if (ball.pocketed) continue;
      expect(ball.position.x).toBeGreaterThanOrEqual(TABLE.play.x + BALL_RADIUS - 1);
      expect(ball.position.x).toBeLessThanOrEqual(TABLE.play.x + TABLE.play.width - BALL_RADIUS + 1);
      expect(ball.position.y).toBeGreaterThanOrEqual(TABLE.play.y + BALL_RADIUS - 1);
      expect(ball.position.y).toBeLessThanOrEqual(TABLE.play.y + TABLE.play.height - BALL_RADIUS + 1);
    }
  });
});

