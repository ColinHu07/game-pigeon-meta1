import { BALL_RADIUS, TABLE } from '../constants';
import type { Ball, Player, PlayerId } from '../types';

const rackOrder = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];

function kindFor(number: number): Ball['kind'] {
  if (number === 0) return 'cue';
  if (number === 8) return 'eight';
  return number < 8 ? 'solids' : 'stripes';
}

export function createPlayers(): Record<PlayerId, Player> {
  return {
    human: { id: 'human', name: 'You', isBot: false },
    bot: { id: 'bot', name: 'Glass Bot', isBot: true },
  };
}

export function createInitialBalls(): Ball[] {
  const balls: Ball[] = [
    {
      id: 0,
      number: 0,
      kind: 'cue',
      position: {
        x: TABLE.play.x + TABLE.play.width / 2,
        y: TABLE.play.y + TABLE.play.height * 0.72,
      },
      velocity: { x: 0, y: 0 },
      pocketed: false,
    },
  ];

  const startX = TABLE.play.x + TABLE.play.width / 2;
  const startY = TABLE.play.y + TABLE.play.height * 0.3;
  const rowGap = BALL_RADIUS * 1.78;
  const colGap = BALL_RADIUS * 2.04;
  let index = 0;

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const number = rackOrder[index];
      balls.push({
        id: number,
        number,
        kind: kindFor(number),
        position: {
          x: startX + (col - row / 2) * colGap,
          y: startY - row * rowGap,
        },
        velocity: { x: 0, y: 0 },
        pocketed: false,
      });
      index += 1;
    }
  }

  return balls;
}

export function createTestBall(number: number, x: number, y: number, pocketed = false): Ball {
  return {
    id: number,
    number,
    kind: kindFor(number),
    position: { x, y },
    velocity: { x: 0, y: 0 },
    pocketed,
  };
}

