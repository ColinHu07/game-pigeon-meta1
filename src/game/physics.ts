import Matter from 'matter-js';
import { BALL_RADIUS, CUE_SPEED_MAX, CUE_SPEED_MIN, POCKET_RADIUS, POCKETS, TABLE } from '../constants';
import { clamp, copyBalls, distance, length } from '../math';
import type { Ball, ShotOutcome, ShotRequest, Spin, Vec2 } from '../types';

const { Bodies, Body, Composite, Engine, Events } = Matter;

function ballLabel(id: number): string {
  return `ball:${id}`;
}

function idFromLabel(label: string): number | undefined {
  if (!label.startsWith('ball:')) return undefined;
  return Number(label.slice(5));
}

export class PhysicsSimulation {
  private engine = Engine.create({ gravity: { x: 0, y: 0 } });
  private bodies = new Map<number, Matter.Body>();
  private firstContactId: number | undefined;
  private potted: number[] = [];
  private spin: Spin = { x: 0, y: 0 };
  private spinApplied = false;

  readonly balls: Ball[];

  constructor(balls: Ball[]) {
    this.balls = copyBalls(balls);
    this.engine.gravity.y = 0;
    this.addRails();
    this.addBalls();

    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const a = idFromLabel(pair.bodyA.label);
        const b = idFromLabel(pair.bodyB.label);
        if (a === undefined || b === undefined) continue;
        if (a === 0 || b === 0) {
          const contacted = a === 0 ? b : a;
          this.firstContactId ??= contacted;
          this.applySpinKick();
        }
      }
    });
  }

  applyShot(shot: ShotRequest): void {
    this.spin = shot.spin;
    const cue = this.bodies.get(0);
    if (!cue) return;
    const speed = CUE_SPEED_MIN + clamp(shot.power01, 0, 1) * (CUE_SPEED_MAX - CUE_SPEED_MIN);
    Body.setVelocity(cue, {
      x: Math.cos(shot.angleRad) * speed,
      y: Math.sin(shot.angleRad) * speed,
    });
  }

  step(deltaMs: number): void {
    Engine.update(this.engine, deltaMs);
    for (const [id, body] of this.bodies) {
      const ball = this.balls.find((candidate) => candidate.id === id);
      if (!ball || ball.pocketed) continue;

      const velocity = body.velocity;
      const rolling = Math.max(0.982, 0.996 - length(velocity) * 0.0007);
      Body.setVelocity(body, { x: velocity.x * rolling, y: velocity.y * rolling });

      if (length(body.velocity) < 0.045) {
        Body.setVelocity(body, { x: 0, y: 0 });
      }

      ball.position = { x: body.position.x, y: body.position.y };
      ball.velocity = { x: body.velocity.x, y: body.velocity.y };
      this.tryPocket(ball, body);
    }
  }

  isSettled(): boolean {
    return this.balls.every((ball) => ball.pocketed || length(ball.velocity) < 0.075);
  }

  snapshot(): Ball[] {
    return copyBalls(this.balls);
  }

  outcome(): ShotOutcome {
    return {
      firstContactId: this.firstContactId,
      potted: [...this.potted],
      cuePocketed: this.potted.includes(0),
    };
  }

  private addRails(): void {
    const p = TABLE.play;
    const thickness = 34;
    const railOptions = {
      isStatic: true,
      restitution: 0.92,
      friction: 0,
      label: 'rail',
    };

    Composite.add(this.engine.world, [
      Bodies.rectangle(p.x + p.width / 2, p.y - thickness / 2, p.width, thickness, railOptions),
      Bodies.rectangle(p.x + p.width / 2, p.y + p.height + thickness / 2, p.width, thickness, railOptions),
      Bodies.rectangle(p.x - thickness / 2, p.y + p.height / 2, thickness, p.height, railOptions),
      Bodies.rectangle(p.x + p.width + thickness / 2, p.y + p.height / 2, thickness, p.height, railOptions),
    ]);
  }

  private addBalls(): void {
    for (const ball of this.balls) {
      if (ball.pocketed) continue;
      const body = Bodies.circle(ball.position.x, ball.position.y, BALL_RADIUS, {
        restitution: 0.96,
        friction: 0,
        frictionStatic: 0,
        frictionAir: 0.006,
        density: 0.002,
        label: ballLabel(ball.id),
      });
      this.bodies.set(ball.id, body);
      Composite.add(this.engine.world, body);
    }
  }

  private tryPocket(ball: Ball, body: Matter.Body): void {
    const pocketed = POCKETS.some((pocket) => distance(ball.position, pocket) <= POCKET_RADIUS);
    if (!pocketed) return;
    ball.pocketed = true;
    ball.velocity = { x: 0, y: 0 };
    this.potted.push(ball.id);
    Composite.remove(this.engine.world, body);
    this.bodies.delete(ball.id);
  }

  private applySpinKick(): void {
    if (this.spinApplied) return;
    const cue = this.bodies.get(0);
    if (!cue) return;
    const speed = length(cue.velocity);
    if (speed < 0.1) return;
    const direction: Vec2 = { x: cue.velocity.x / speed, y: cue.velocity.y / speed };
    const tangent: Vec2 = { x: -direction.y, y: direction.x };
    Body.setVelocity(cue, {
      x: cue.velocity.x + tangent.x * this.spin.x * 1.4 - direction.x * this.spin.y * 1.0,
      y: cue.velocity.y + tangent.y * this.spin.x * 1.4 - direction.y * this.spin.y * 1.0,
    });
    this.spinApplied = true;
  }
}

export function simulateShot(
  balls: Ball[],
  shot: ShotRequest,
  maxSteps = 780,
): { balls: Ball[]; outcome: ShotOutcome } {
  const simulation = new PhysicsSimulation(balls);
  simulation.applyShot(shot);
  for (let step = 0; step < maxSteps; step += 1) {
    simulation.step(1000 / 90);
    if (step > 24 && simulation.isSettled()) break;
  }
  return {
    balls: simulation.snapshot(),
    outcome: simulation.outcome(),
  };
}

