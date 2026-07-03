import { describe, expect, it } from 'vitest';
import { TABLE } from '../../src/constants';
import { GlassPoolGame } from '../../src/game/controller';

interface MutableGame {
  ballInHand: boolean;
  phase: string;
}

describe('GlassPoolGame ball-in-hand controls', () => {
  it('moves the cue ball with discrete nudge actions while placing', () => {
    const game = new GlassPoolGame();
    const mutable = game as unknown as MutableGame;
    mutable.ballInHand = true;
    mutable.phase = 'placingCue';
    const before = game.snapshot().balls.find((ball) => ball.id === 0)!.position;

    game.dispatch({ type: 'moveCueBall', delta: { x: 12, y: -12 } });

    const after = game.snapshot().balls.find((ball) => ball.id === 0)!.position;
    expect(after.x).toBe(before.x + 12);
    expect(after.y).toBe(before.y - 12);
  });

  it('keeps cue placement inside the playable table', () => {
    const game = new GlassPoolGame();
    const mutable = game as unknown as MutableGame;
    mutable.ballInHand = true;
    mutable.phase = 'placingCue';

    game.dispatch({ type: 'moveCueBall', delta: { x: 10_000, y: 10_000 } });

    const cue = game.snapshot().balls.find((ball) => ball.id === 0)!;
    expect(cue.position.x).toBeLessThanOrEqual(TABLE.play.x + TABLE.play.width);
    expect(cue.position.y).toBeLessThanOrEqual(TABLE.play.y + TABLE.play.height);
  });

  it('confirms cue placement and returns to aiming', () => {
    const game = new GlassPoolGame();
    const mutable = game as unknown as MutableGame;
    mutable.ballInHand = true;
    mutable.phase = 'placingCue';

    game.dispatch({ type: 'confirmCuePlacement' });

    const snapshot = game.snapshot();
    expect(snapshot.ballInHand).toBe(false);
    expect(snapshot.phase).toBe('aiming');
    expect(snapshot.message).toBe('Ball placed');
  });
});
