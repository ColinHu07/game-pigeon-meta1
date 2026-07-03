import { BALL_COLORS, BALL_RADIUS, CANVAS_HEIGHT, CANVAS_WIDTH, POCKETS, TABLE } from './constants';
import { computeGuideLine } from './game/guide';
import type { Ball, BallGroup } from './types';
import type { GameSnapshot } from './game/controller';

export class Renderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  draw(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.background();
    this.table();

    if (
      (snapshot.phase === 'aiming' || snapshot.phase === 'charging' || snapshot.phase === 'placingCue') &&
      !snapshot.ballInHand
    ) {
      this.guide(snapshot);
      this.cueStick(snapshot);
    }

    for (const ball of snapshot.balls) this.ball(ball);
    this.hud(snapshot);
  }

  private background(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#cbcdcd');
    gradient.addColorStop(1, '#999c9d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private table(): void {
    const ctx = this.ctx;
    const outer = TABLE.outer;
    const play = TABLE.play;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
    ctx.shadowBlur = 13;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, outer.x, outer.y, outer.width, outer.height, TABLE.cornerRadius);
    ctx.fillStyle = '#eadfca';
    ctx.fill();
    ctx.restore();

    const wood = ctx.createLinearGradient(outer.x, outer.y, outer.x + outer.width, outer.y + outer.height);
    wood.addColorStop(0, '#723c38');
    wood.addColorStop(0.5, '#9b5350');
    wood.addColorStop(1, '#5d302f');
    roundRect(ctx, outer.x + 14, outer.y + 13, outer.width - 28, outer.height - 26, 8);
    ctx.fillStyle = wood;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 222, 194, 0.22)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 16; i += 1) {
      const y = outer.y + 34 + i * 31;
      ctx.beginPath();
      ctx.moveTo(outer.x + 26, y);
      ctx.lineTo(outer.x + outer.width - 26, y + Math.sin(i) * 5);
      ctx.stroke();
    }

    const felt = ctx.createRadialGradient(
      play.x + play.width * 0.48,
      play.y + play.height * 0.42,
      20,
      play.x + play.width / 2,
      play.y + play.height / 2,
      play.height * 0.62,
    );
    felt.addColorStop(0, '#169a87');
    felt.addColorStop(1, '#087665');
    roundRect(ctx, play.x, play.y, play.width, play.height, 4);
    ctx.fillStyle = felt;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(play.x, play.y + play.height * 0.69);
    ctx.lineTo(play.x + play.width, play.y + play.height * 0.69);
    ctx.stroke();

    this.pockets();
    this.diamonds();
  }

  private pockets(): void {
    const ctx = this.ctx;
    for (const pocket of POCKETS) {
      ctx.beginPath();
      ctx.arc(pocket.x, pocket.y, 14.5, 0, Math.PI * 2);
      ctx.fillStyle = '#020403';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pocket.x - 2, pocket.y - 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
    }
  }

  private diamonds(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(244, 232, 204, 0.82)';
    const o = TABLE.outer;
    for (let i = 1; i <= 5; i += 1) {
      const x = o.x + (o.width * i) / 6;
      diamond(ctx, x, o.y + 20, 2.2);
      diamond(ctx, x, o.y + o.height - 20, 2.2);
    }
    for (let i = 1; i <= 5; i += 1) {
      const y = o.y + (o.height * i) / 6;
      diamond(ctx, o.x + 20, y, 2.2);
      diamond(ctx, o.x + o.width - 20, y, 2.2);
    }
  }

  private guide(snapshot: GameSnapshot): void {
    const guide = computeGuideLine(snapshot.balls, snapshot.aimAngle);
    if (!guide) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(guide.start.x, guide.start.y);
    ctx.lineTo(guide.end.x, guide.end.y);
    ctx.stroke();

    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    if (guide.objectLine) {
      ctx.beginPath();
      ctx.moveTo(guide.objectLine.start.x, guide.objectLine.start.y);
      ctx.lineTo(guide.objectLine.end.x, guide.objectLine.end.y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(guide.end.x, guide.end.y, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.stroke();
    ctx.restore();
  }

  private cueStick(snapshot: GameSnapshot): void {
    const cue = snapshot.balls.find((ball) => ball.id === 0 && !ball.pocketed);
    if (!cue) return;
    const ctx = this.ctx;
    const dx = Math.cos(snapshot.aimAngle);
    const dy = Math.sin(snapshot.aimAngle);
    const pullback = 24 + snapshot.power01 * 44;
    const tip = {
      x: cue.position.x - dx * (BALL_RADIUS + pullback),
      y: cue.position.y - dy * (BALL_RADIUS + pullback),
    };
    const butt = {
      x: tip.x - dx * 178,
      y: tip.y - dy * 178,
    };

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3b1712';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(butt.x, butt.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.strokeStyle = '#f17654';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(butt.x + dx * 62, butt.y + dy * 62);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.restore();
  }

  private ball(ball: Ball): void {
    if (ball.pocketed) return;
    const ctx = this.ctx;
    const { x, y } = ball.position;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 2;

    if (ball.id === 0) {
      ctx.fillStyle = '#fbfbf4';
      ctx.beginPath();
      ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const color = BALL_COLORS[ball.number];
    ctx.fillStyle = color.fill;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (ball.kind === 'stripes') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, BALL_RADIUS - 0.4, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = color.stripe;
      ctx.fillRect(x - BALL_RADIUS, y - BALL_RADIUS * 0.42, BALL_RADIUS * 2, BALL_RADIUS * 0.84);
      ctx.restore();
    }

    const shine = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, BALL_RADIUS);
    shine.addColorStop(0, 'rgba(255,255,255,0.7)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f7f4ea';
    ctx.beginPath();
    ctx.arc(x, y, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color.text;
    ctx.font = 'bold 5.5px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ball.number), x, y + 0.2);
    ctx.restore();
  }

  private hud(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    this.playerBadge(28, 54, '#8e61c3', snapshot.currentPlayer === 'human', 'You', snapshot.players.human.group);
    this.playerBadge(572, 54, '#384754', snapshot.currentPlayer === 'bot', 'Bot', snapshot.players.bot.group, true);
    this.powerMeter(snapshot.power01, snapshot.phase === 'charging');
    this.spinWidget(snapshot.spin);
    this.message(snapshot);
  }

  private playerBadge(
    x: number,
    y: number,
    color: string,
    active: boolean,
    label: string,
    group?: BallGroup,
    right = false,
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.46)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = right ? 'right' : 'left';
    ctx.fillText(label, right ? -5 : -15, -35);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -18, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2b892';
    ctx.beginPath();
    ctx.arc(0, -20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2427';
    ctx.fillRect(-9, -31, 18, 7);
    ctx.strokeStyle = active ? '#f4f0e0' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = active ? 3 : 1;
    ctx.beginPath();
    ctx.arc(0, -18, 18, 0, Math.PI * 2);
    ctx.stroke();
    if (group) {
      ctx.fillStyle = group === 'solids' ? '#dcb93f' : '#f5f3e7';
      ctx.beginPath();
      ctx.arc(right ? -7 : 7, 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private powerMeter(power: number, charging: boolean): void {
    const ctx = this.ctx;
    const x = 18;
    const y = 182;
    const h = 190;
    roundRect(ctx, x - 12, y - 14, 24, h + 28, 8);
    ctx.fillStyle = 'rgba(31, 31, 31, 0.72)';
    ctx.fill();
    ctx.fillStyle = '#121212';
    roundRect(ctx, x - 4, y, 8, h, 4);
    ctx.fill();
    const fillHeight = h * power;
    const gradient = ctx.createLinearGradient(0, y + h, 0, y);
    gradient.addColorStop(0, '#8f2c2b');
    gradient.addColorStop(0.45, '#f06d51');
    gradient.addColorStop(1, '#ffd58a');
    ctx.fillStyle = gradient;
    roundRect(ctx, x - 3, y + h - fillHeight, 6, fillHeight, 3);
    ctx.fill();
    if (charging) {
      ctx.strokeStyle = '#fff4d1';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 7, y - 3, 14, h + 6);
    }
  }

  private spinWidget(spin: { x: number; y: number }): void {
    const ctx = this.ctx;
    const x = 558;
    const y = 287;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 7;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#df4240';
    ctx.beginPath();
    ctx.arc(x + spin.x * 10, y - spin.y * 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private message(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    const text = snapshot.phase === 'placingCue' ? 'Place cue ball' : snapshot.message;
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
}

