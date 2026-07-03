import { BALL_RADIUS, TABLE } from './constants';
import type { Ball, Vec2 } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, factor: number): Vec2 {
  return { x: v.x * factor, y: v.y * factor };
}

export function angleTo(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function pointInPlay(point: Vec2): boolean {
  return (
    point.x >= TABLE.play.x + BALL_RADIUS &&
    point.x <= TABLE.play.x + TABLE.play.width - BALL_RADIUS &&
    point.y >= TABLE.play.y + BALL_RADIUS &&
    point.y <= TABLE.play.y + TABLE.play.height - BALL_RADIUS
  );
}

export function segmentCircleClear(
  start: Vec2,
  end: Vec2,
  balls: Ball[],
  ignoreIds: number[],
  radius = BALL_RADIUS * 2.05,
): boolean {
  const segment = sub(end, start);
  const lenSq = dot(segment, segment);
  if (lenSq === 0) return true;

  return balls.every((ball) => {
    if (ball.pocketed || ignoreIds.includes(ball.id)) return true;
    const toBall = sub(ball.position, start);
    const t = clamp(dot(toBall, segment) / lenSq, 0, 1);
    const closest = add(start, scale(segment, t));
    return distance(closest, ball.position) > radius;
  });
}

export function copyBalls(balls: Ball[]): Ball[] {
  return balls.map((ball) => ({
    ...ball,
    position: { ...ball.position },
    velocity: { ...ball.velocity },
  }));
}

