import { BALL_RADIUS, TABLE } from '../constants';
import { add, dot, scale, sub } from '../math';
import type { Ball, Vec2 } from '../types';

export interface GuideLine {
  start: Vec2;
  end: Vec2;
  hitBallId?: number;
  objectLine?: { start: Vec2; end: Vec2 };
}

export function computeGuideLine(balls: Ball[], angleRad: number): GuideLine | undefined {
  const cue = balls.find((ball) => ball.id === 0 && !ball.pocketed);
  if (!cue) return undefined;
  const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
  let bestT = wallIntersection(cue.position, dir);
  let hitBall: Ball | undefined;

  for (const ball of balls) {
    if (ball.id === 0 || ball.pocketed) continue;
    const toBall = sub(ball.position, cue.position);
    const projection = dot(toBall, dir);
    if (projection <= 0) continue;
    const closestSq = dot(toBall, toBall) - projection * projection;
    const radius = BALL_RADIUS * 2.06;
    if (closestSq > radius * radius) continue;
    const offset = Math.sqrt(radius * radius - closestSq);
    const t = projection - offset;
    if (t > 0 && t < bestT) {
      bestT = t;
      hitBall = ball;
    }
  }

  const end = add(cue.position, scale(dir, bestT));
  if (!hitBall) return { start: cue.position, end };

  const objectDir = {
    x: hitBall.position.x - end.x,
    y: hitBall.position.y - end.y,
  };
  const len = Math.hypot(objectDir.x, objectDir.y) || 1;
  const normalized = { x: objectDir.x / len, y: objectDir.y / len };
  const objectEnd = add(hitBall.position, scale(normalized, Math.min(130, wallIntersection(hitBall.position, normalized))));

  return {
    start: cue.position,
    end,
    hitBallId: hitBall.id,
    objectLine: { start: hitBall.position, end: objectEnd },
  };
}

function wallIntersection(start: Vec2, dir: Vec2): number {
  const minX = TABLE.play.x + BALL_RADIUS;
  const maxX = TABLE.play.x + TABLE.play.width - BALL_RADIUS;
  const minY = TABLE.play.y + BALL_RADIUS;
  const maxY = TABLE.play.y + TABLE.play.height - BALL_RADIUS;
  const tx = dir.x > 0 ? (maxX - start.x) / dir.x : (minX - start.x) / dir.x;
  const ty = dir.y > 0 ? (maxY - start.y) / dir.y : (minY - start.y) / dir.y;
  const values = [tx, ty].filter((value) => Number.isFinite(value) && value > 0);
  return Math.min(...values, 1000);
}

