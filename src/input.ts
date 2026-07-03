import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';
import type { GlassPoolGame } from './game/controller';
import type { InputAction, Vec2 } from './types';

declare global {
  interface Window {
    glassPoolDispatch?: (action: InputAction) => void;
  }
}

export function attachInput(canvas: HTMLCanvasElement, game: GlassPoolGame): () => void {
  let pointerDown = false;
  let pointerStart: Vec2 | undefined;

  const dispatch = (action: InputAction) => game.dispatch(action);
  window.glassPoolDispatch = dispatch;

  const canvasPoint = (event: PointerEvent | MouseEvent): Vec2 => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const onPointerDown = (event: PointerEvent) => {
    canvas.focus();
    canvas.setPointerCapture(event.pointerId);
    pointerDown = true;
    pointerStart = canvasPoint(event);
    const snapshot = game.snapshot();
    if (snapshot.phase === 'placingCue') {
      dispatch({ type: 'placeCueBall', point: pointerStart });
      return;
    }
    dispatch({ type: 'setAimPoint', point: pointerStart });
    dispatch({ type: 'beginPowerCharge' });
  };

  const onPointerMove = (event: PointerEvent) => {
    const point = canvasPoint(event);
    const snapshot = game.snapshot();
    if (snapshot.phase === 'placingCue') return;
    dispatch({ type: 'setAimPoint', point });
  };

  const onPointerUp = (event: PointerEvent) => {
    pointerDown = false;
    canvas.releasePointerCapture(event.pointerId);
    const point = canvasPoint(event);
    const snapshot = game.snapshot();
    if (snapshot.phase === 'placingCue') {
      dispatch({ type: 'placeCueBall', point });
      return;
    }
    if (pointerStart && Math.hypot(pointerStart.x - point.x, pointerStart.y - point.y) < 5 && !pointerDown) {
      dispatch({ type: 'setAimPoint', point });
    }
    dispatch({ type: 'releaseShot' });
  };

  const pressed = new Set<string>();
  const onKeyDown = (event: KeyboardEvent) => {
    const spinStep = 0.12;
    const powerStep = 0.08;
    const cueMoveStep = event.shiftKey ? 4 : 12;
    const aimStep = event.shiftKey ? 0.025 : 0.07;
    if (event.code === 'Space' && pressed.has(event.code)) return;
    if ((event.code === 'Enter' || event.code === 'NumpadEnter') && event.repeat) return;
    if (event.code === 'Space') pressed.add(event.code);
    const snapshot = game.snapshot();

    if (event.code === 'ArrowLeft') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: -cueMoveStep, y: 0 } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: -spinStep, y: 0 } }
            : { type: 'aimDelta', deltaRad: -aimStep },
      );
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: cueMoveStep, y: 0 } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: spinStep, y: 0 } }
            : { type: 'aimDelta', deltaRad: aimStep },
      );
    } else if (event.code === 'ArrowUp') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: 0, y: -cueMoveStep } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: 0, y: spinStep } }
            : { type: 'powerDelta', delta: powerStep },
      );
    } else if (event.code === 'ArrowDown') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: 0, y: cueMoveStep } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: 0, y: -spinStep } }
            : { type: 'powerDelta', delta: -powerStep },
      );
    } else if (event.code === 'Space') {
      event.preventDefault();
      dispatch({ type: 'beginPowerCharge' });
    } else if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'confirmCuePlacement' }
          : snapshot.phase === 'charging'
            ? { type: 'releaseShot' }
            : { type: 'beginPowerCharge' },
      );
    } else if (event.code === 'Escape' || event.code === 'Backspace') {
      event.preventDefault();
      dispatch({ type: 'cancel' });
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    pressed.delete(event.code);
    if (event.code === 'Space') {
      event.preventDefault();
      dispatch({ type: 'releaseShot' });
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    delete window.glassPoolDispatch;
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
