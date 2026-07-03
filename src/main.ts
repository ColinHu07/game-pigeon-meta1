import './styles.css';
import { GlassPoolGame } from './game/controller';
import { attachInput } from './input';
import { Renderer } from './render';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing game canvas');

const controlSurface = document.querySelector<HTMLButtonElement>('#control-surface');
if (!controlSurface) throw new Error('Missing control surface');

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Canvas 2D is unavailable');

const game = new GlassPoolGame();
const renderer = new Renderer(ctx);
attachInput(canvas, controlSurface, game);
controlSurface.focus();

let last = performance.now();
function frame(now: number): void {
  const delta = Math.min(34, now - last);
  last = now;
  game.update(delta);
  renderer.draw(game.snapshot());
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
