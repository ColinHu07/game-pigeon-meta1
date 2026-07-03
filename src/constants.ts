import type { BallColor } from './types';

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 600;

export const TABLE = {
  outer: { x: 84, y: 28, width: 432, height: 544 },
  play: { x: 121, y: 69, width: 358, height: 462 },
  rail: 31,
  cornerRadius: 13,
};

export const BALL_RADIUS = 8.4;
export const POCKET_RADIUS = 20;
export const CUE_SPEED_MIN = 5.5;
export const CUE_SPEED_MAX = 20.5;

export const POCKETS = [
  { x: TABLE.play.x + 5, y: TABLE.play.y + 5 },
  { x: TABLE.play.x + TABLE.play.width - 5, y: TABLE.play.y + 5 },
  { x: TABLE.play.x + 5, y: TABLE.play.y + TABLE.play.height / 2 },
  { x: TABLE.play.x + TABLE.play.width - 5, y: TABLE.play.y + TABLE.play.height / 2 },
  { x: TABLE.play.x + 5, y: TABLE.play.y + TABLE.play.height - 5 },
  { x: TABLE.play.x + TABLE.play.width - 5, y: TABLE.play.y + TABLE.play.height - 5 },
];

export const BALL_COLORS: Record<number, BallColor> = {
  1: { fill: '#dcb93f', stripe: '#dcb93f', text: '#1f211f' },
  2: { fill: '#2d58b8', stripe: '#2d58b8', text: '#ffffff' },
  3: { fill: '#be463f', stripe: '#be463f', text: '#ffffff' },
  4: { fill: '#7249a7', stripe: '#7249a7', text: '#ffffff' },
  5: { fill: '#d16c2e', stripe: '#d16c2e', text: '#ffffff' },
  6: { fill: '#2d9a68', stripe: '#2d9a68', text: '#ffffff' },
  7: { fill: '#7b3b2f', stripe: '#7b3b2f', text: '#ffffff' },
  8: { fill: '#111111', stripe: '#111111', text: '#ffffff' },
  9: { fill: '#f5f3e7', stripe: '#dcb93f', text: '#1f211f' },
  10: { fill: '#f5f3e7', stripe: '#2d58b8', text: '#ffffff' },
  11: { fill: '#f5f3e7', stripe: '#be463f', text: '#ffffff' },
  12: { fill: '#f5f3e7', stripe: '#7249a7', text: '#ffffff' },
  13: { fill: '#f5f3e7', stripe: '#d16c2e', text: '#ffffff' },
  14: { fill: '#f5f3e7', stripe: '#2d9a68', text: '#ffffff' },
  15: { fill: '#f5f3e7', stripe: '#7b3b2f', text: '#ffffff' },
};
