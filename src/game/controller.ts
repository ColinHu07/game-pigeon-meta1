import { TABLE } from '../constants';
import { angleTo, clamp, copyBalls, pointInPlay } from '../math';
import type { Ball, GamePhase, InputAction, Player, PlayerId, ShotOutcome, Spin } from '../types';
import { chooseBotShot } from './bot';
import { PhysicsSimulation } from './physics';
import { resolveShot } from './rules';
import { createInitialBalls, createPlayers } from './setup';

export interface GameSnapshot {
  balls: Ball[];
  players: Record<PlayerId, Player>;
  currentPlayer: PlayerId;
  phase: GamePhase;
  aimAngle: number;
  power01: number;
  spin: Spin;
  message: string;
  winner?: PlayerId;
  ballInHand: boolean;
}

export class GlassPoolGame {
  private balls = createInitialBalls();
  private players = createPlayers();
  private currentPlayer: PlayerId = 'human';
  private phase: GamePhase = 'aiming';
  private aimAngle = -Math.PI / 2;
  private power01 = 0.42;
  private spin: Spin = { x: 0, y: 0 };
  private message = 'Break shot';
  private winner: PlayerId | undefined;
  private ballInHand = false;
  private simulation: PhysicsSimulation | undefined;
  private ballsBeforeShot: Ball[] = [];
  private botTimer = 0;
  private chargeElapsed = 0;

  snapshot(): GameSnapshot {
    return {
      balls: copyBalls(this.balls),
      players: {
        human: { ...this.players.human },
        bot: { ...this.players.bot },
      },
      currentPlayer: this.currentPlayer,
      phase: this.phase,
      aimAngle: this.aimAngle,
      power01: this.power01,
      spin: { ...this.spin },
      message: this.message,
      winner: this.winner,
      ballInHand: this.ballInHand,
    };
  }

  dispatch(action: InputAction): void {
    if (this.phase === 'gameOver') {
      if (action.type === 'cancel') this.reset();
      return;
    }

    if (this.currentPlayer !== 'human' && action.type !== 'cancel') return;

    switch (action.type) {
      case 'aimDelta':
        if (this.phase === 'aiming' || this.phase === 'charging') {
          this.aimAngle += action.deltaRad;
        }
        break;
      case 'setAimPoint':
        if (this.phase === 'aiming' || this.phase === 'charging') {
          const cue = this.balls.find((ball) => ball.id === 0 && !ball.pocketed);
          if (cue) this.aimAngle = angleTo(cue.position, action.point);
        }
        break;
      case 'beginPowerCharge':
        if (this.phase === 'aiming') {
          this.phase = 'charging';
          this.chargeElapsed = 0;
          this.power01 = 0.12;
        }
        break;
      case 'powerDelta':
        if (this.phase === 'aiming' || this.phase === 'charging') {
          this.power01 = clamp(this.power01 + action.delta, 0.08, 1);
        }
        break;
      case 'releaseShot':
        if (this.phase === 'charging' || this.phase === 'aiming') {
          this.startShot({ angleRad: this.aimAngle, power01: this.power01, spin: this.spin });
        }
        break;
      case 'placeCueBall':
        if (this.ballInHand && pointInPlay(action.point) && this.canPlaceCue(action.point)) {
          this.placeCue(action.point);
          this.confirmCuePlacement();
        }
        break;
      case 'moveCueBall':
        if (this.phase === 'placingCue' && this.ballInHand) {
          this.moveCue(action.delta);
        }
        break;
      case 'confirmCuePlacement':
        if (this.phase === 'placingCue' && this.ballInHand) {
          this.confirmCuePlacement();
        }
        break;
      case 'spinDelta':
        if (this.phase === 'aiming' || this.phase === 'charging') {
          this.spin = {
            x: clamp(this.spin.x + action.delta.x, -1, 1),
            y: clamp(this.spin.y + action.delta.y, -1, 1),
          };
        }
        break;
      case 'cancel':
        if (this.phase === 'charging') {
          this.phase = 'aiming';
          this.power01 = 0.2;
        } else {
          this.reset();
        }
        break;
    }
  }

  update(deltaMs: number): void {
    if (this.phase === 'charging') {
      this.chargeElapsed += deltaMs;
      const cycle = (this.chargeElapsed % 1700) / 1700;
      this.power01 = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
    }

    if (this.phase === 'ballsMoving' && this.simulation) {
      const steps = Math.max(1, Math.ceil(deltaMs / (1000 / 90)));
      for (let i = 0; i < steps; i += 1) {
        this.simulation.step(deltaMs / steps);
      }
      this.balls = this.simulation.snapshot();
      if (this.simulation.isSettled()) this.finishShot(this.simulation.outcome());
    }

    if (this.phase === 'botThinking') {
      this.botTimer -= deltaMs;
      if (this.botTimer <= 0) {
        const shot = chooseBotShot({
          currentPlayer: 'bot',
          players: this.players,
          balls: this.balls,
          seed: Date.now() % 1000,
        });
        this.aimAngle = shot.angleRad;
        this.power01 = shot.power01;
        this.spin = shot.spin;
        this.startShot(shot);
      }
    }
  }

  reset(): void {
    this.balls = createInitialBalls();
    this.players = createPlayers();
    this.currentPlayer = 'human';
    this.phase = 'aiming';
    this.aimAngle = -Math.PI / 2;
    this.power01 = 0.42;
    this.spin = { x: 0, y: 0 };
    this.message = 'Break shot';
    this.winner = undefined;
    this.ballInHand = false;
    this.simulation = undefined;
  }

  private startShot(shot: { angleRad: number; power01: number; spin: Spin }): void {
    const cue = this.balls.find((ball) => ball.id === 0 && !ball.pocketed);
    if (!cue) return;
    this.ballsBeforeShot = copyBalls(this.balls);
    this.simulation = new PhysicsSimulation(this.balls);
    this.simulation.applyShot(shot);
    this.phase = 'ballsMoving';
    this.message = `${this.players[this.currentPlayer].name} shoots`;
  }

  private finishShot(outcome: ShotOutcome): void {
    this.simulation = undefined;
    const result = resolveShot(
      {
        currentPlayer: this.currentPlayer,
        players: this.players,
        ballsBefore: this.ballsBeforeShot,
        ballsAfter: this.balls,
      },
      outcome,
    );

    this.players = result.players;
    this.currentPlayer = result.nextPlayer;
    this.ballInHand = result.ballInHand;
    this.winner = result.winner;
    this.message = result.message;

    if (this.winner) {
      this.phase = 'gameOver';
      this.message = `${this.players[this.winner].name} wins`;
    } else if (this.ballInHand && this.currentPlayer === 'human') {
      this.phase = 'placingCue';
      this.reviveCueAtSafeSpot();
    } else if (this.currentPlayer === 'bot') {
      if (this.ballInHand) this.placeCue(this.botCuePlacement());
      this.phase = 'botThinking';
      this.botTimer = 650;
    } else {
      this.phase = 'aiming';
    }

    this.power01 = 0.32;
  }

  private reviveCueAtSafeSpot(): void {
    const cue = this.balls.find((ball) => ball.id === 0);
    if (!cue || !cue.pocketed) return;
    cue.pocketed = false;
    cue.position = this.safeCueSpot();
    cue.velocity = { x: 0, y: 0 };
  }

  private botCuePlacement(): { x: number; y: number } {
    const cue = this.balls.find((ball) => ball.id === 0);
    if (cue?.pocketed) cue.pocketed = false;
    return this.safeCueSpot(TABLE.play.y + TABLE.play.height * 0.72);
  }

  private safeCueSpot(preferredY = TABLE.play.y + TABLE.play.height * 0.72): { x: number; y: number } {
    const centerX = TABLE.play.x + TABLE.play.width / 2;
    const candidates = [
      { x: centerX, y: preferredY },
      { x: centerX - 35, y: preferredY },
      { x: centerX + 35, y: preferredY },
      { x: centerX, y: TABLE.play.y + TABLE.play.height * 0.5 },
    ];
    return candidates.find((point) => this.canPlaceCue(point)) ?? candidates[0];
  }

  private placeCue(point: { x: number; y: number }): void {
    const cue = this.balls.find((ball) => ball.id === 0);
    if (!cue) return;
    cue.pocketed = false;
    cue.position = point;
    cue.velocity = { x: 0, y: 0 };
  }

  private moveCue(delta: { x: number; y: number }): void {
    const cue = this.balls.find((ball) => ball.id === 0);
    if (!cue || cue.pocketed) return;
    const next = {
      x: clamp(cue.position.x + delta.x, TABLE.play.x + 9, TABLE.play.x + TABLE.play.width - 9),
      y: clamp(cue.position.y + delta.y, TABLE.play.y + 9, TABLE.play.y + TABLE.play.height - 9),
    };
    if (pointInPlay(next) && this.canPlaceCue(next)) {
      this.placeCue(next);
    }
  }

  private confirmCuePlacement(): void {
    const cue = this.balls.find((ball) => ball.id === 0 && !ball.pocketed);
    if (!cue || !pointInPlay(cue.position) || !this.canPlaceCue(cue.position)) return;
    this.ballInHand = false;
    this.phase = 'aiming';
    this.message = 'Ball placed';
  }

  private canPlaceCue(point: { x: number; y: number }): boolean {
    return this.balls.every((ball) => {
      if (ball.id === 0 || ball.pocketed) return true;
      return Math.hypot(ball.position.x - point.x, ball.position.y - point.y) > 19;
    });
  }
}
