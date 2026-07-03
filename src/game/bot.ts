import { BALL_RADIUS, POCKETS, TABLE } from '../constants';
import { angleTo, clamp, distance, normalize, pointInPlay, scale, segmentCircleClear, sub } from '../math';
import type { Ball, BotShot, Player, PlayerId, Vec2 } from '../types';
import { groupCleared } from './rules';

export interface BotContext {
  currentPlayer: PlayerId;
  players: Record<PlayerId, Player>;
  balls: Ball[];
  seed?: number;
}

function legalTargets(context: BotContext): Ball[] {
  const player = context.players[context.currentPlayer];
  const solidsOrStripes = context.balls.filter(
    (ball) => !ball.pocketed && (ball.kind === 'solids' || ball.kind === 'stripes'),
  );

  if (!player.group) return solidsOrStripes;
  if (groupCleared(context.balls, player.group)) {
    return context.balls.filter((ball) => !ball.pocketed && ball.kind === 'eight');
  }
  return context.balls.filter((ball) => !ball.pocketed && ball.kind === player.group);
}

function seededNoise(seed = 17): number {
  const x = Math.sin(seed * 999.91) * 10000;
  return x - Math.floor(x);
}

export function chooseBotShot(context: BotContext): BotShot {
  const cue = context.balls.find((ball) => ball.id === 0 && !ball.pocketed);
  if (!cue) {
    return {
      angleRad: -Math.PI / 2,
      power01: 0.4,
      spin: { x: 0, y: 0 },
      confidence: 0,
      reason: 'cue-pocketed',
    };
  }

  const candidates: BotShot[] = [];
  for (const target of legalTargets(context)) {
    for (let pocketIndex = 0; pocketIndex < POCKETS.length; pocketIndex += 1) {
      const pocket = POCKETS[pocketIndex];
      const objectToPocket = normalize(sub(pocket, target.position));
      const ghost: Vec2 = {
        x: target.position.x - objectToPocket.x * BALL_RADIUS * 2.15,
        y: target.position.y - objectToPocket.y * BALL_RADIUS * 2.15,
      };

      if (!pointInPlay(ghost)) continue;
      if (!segmentCircleClear(cue.position, ghost, context.balls, [0, target.id])) continue;
      if (!segmentCircleClear(target.position, pocket, context.balls, [0, target.id], BALL_RADIUS * 1.25)) continue;

      const cueDistance = distance(cue.position, ghost);
      const pocketDistance = distance(target.position, pocket);
      const angleRad = angleTo(cue.position, ghost);
      const confidence = clamp(
        1.1 - cueDistance / 520 - pocketDistance / 620 + seededNoise((context.seed ?? 3) + target.id) * 0.04,
        0.05,
        0.98,
      );

      candidates.push({
        angleRad,
        power01: clamp((cueDistance + pocketDistance) / 620, 0.28, 0.88),
        spin: { x: 0, y: 0 },
        targetBallId: target.id,
        pocketIndex,
        confidence,
        reason: 'pocket-attempt',
      });
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  if (candidates[0]) {
    const wobble = (seededNoise(context.seed ?? 11) - 0.5) * (1 - candidates[0].confidence) * 0.12;
    return {
      ...candidates[0],
      angleRad: candidates[0].angleRad + wobble,
      power01: clamp(candidates[0].power01 + (seededNoise((context.seed ?? 11) + 4) - 0.5) * 0.08, 0.22, 0.92),
    };
  }

  const center = { x: TABLE.play.x + TABLE.play.width * 0.5, y: TABLE.play.y + TABLE.play.height * 0.5 };
  const target = legalTargets(context)[0]?.position ?? center;
  const nudge = scale(normalize(sub(target, cue.position)), 1);
  return {
    angleRad: Math.atan2(nudge.y, nudge.x),
    power01: 0.36,
    spin: { x: 0.25, y: 0 },
    confidence: 0.04,
    reason: 'safety-fallback',
  };
}

