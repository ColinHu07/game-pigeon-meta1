export type PlayerId = 'human' | 'bot';
export type BallGroup = 'solids' | 'stripes';
export type BallKind = 'cue' | BallGroup | 'eight';
export type GamePhase =
  | 'placingCue'
  | 'aiming'
  | 'charging'
  | 'ballsMoving'
  | 'botThinking'
  | 'gameOver';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Spin {
  x: number;
  y: number;
}

export interface Ball {
  id: number;
  number: number;
  kind: BallKind;
  position: Vec2;
  velocity: Vec2;
  pocketed: boolean;
}

export interface Player {
  id: PlayerId;
  name: string;
  group?: BallGroup;
  isBot: boolean;
}

export interface ShotRequest {
  angleRad: number;
  power01: number;
  spin: Spin;
}

export interface ShotOutcome {
  firstContactId?: number;
  potted: number[];
  cuePocketed: boolean;
}

export interface RulesContext {
  currentPlayer: PlayerId;
  players: Record<PlayerId, Player>;
  ballsBefore: Ball[];
  ballsAfter: Ball[];
}

export interface RulesResult {
  nextPlayer: PlayerId;
  players: Record<PlayerId, Player>;
  foul: boolean;
  ballInHand: boolean;
  keepsTurn: boolean;
  winner?: PlayerId;
  message: string;
}

export interface BotShot extends ShotRequest {
  targetBallId?: number;
  pocketIndex?: number;
  confidence: number;
  reason: string;
}

export interface BallColor {
  fill: string;
  stripe: string;
  text: string;
}

export type InputAction =
  | { type: 'aimDelta'; deltaRad: number }
  | { type: 'setAimPoint'; point: Vec2 }
  | { type: 'beginPowerCharge' }
  | { type: 'powerDelta'; delta: number }
  | { type: 'releaseShot' }
  | { type: 'cancel' }
  | { type: 'moveCueBall'; delta: Vec2 }
  | { type: 'placeCueBall'; point: Vec2 }
  | { type: 'confirmCuePlacement' }
  | { type: 'spinDelta'; delta: Spin };
