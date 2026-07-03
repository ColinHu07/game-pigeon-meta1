import { CANVAS_HEIGHT, CANVAS_WIDTH } from './constants';
import type { GlassPoolGame } from './game/controller';
import type { InputAction, Vec2 } from './types';

declare global {
  interface Window {
    glassPoolDispatch?: (action: InputAction) => void;
  }
}

export function attachInput(canvas: HTMLCanvasElement, controlSurface: HTMLElement, game: GlassPoolGame): () => void {
  let pointerDown = false;
  let pointerStart: Vec2 | undefined;
  let pointerStartAt = 0;
  let pointerStartedPhase: string | undefined;
  let lastPointerUpAt = 0;

  const dispatch = (action: InputAction) => game.dispatch(action);
  window.glassPoolDispatch = dispatch;

  const canvasPoint = (event: PointerEvent | MouseEvent): Vec2 => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const select = () => {
    const snapshot = game.snapshot();
    dispatch(
      snapshot.phase === 'placingCue'
        ? { type: 'confirmCuePlacement' }
        : snapshot.phase === 'charging'
          ? { type: 'releaseShot' }
          : { type: 'beginPowerCharge' },
    );
  };

  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    canvas.focus();
    controlSurface.focus();
    canvas.setPointerCapture(event.pointerId);
    pointerDown = true;
    pointerStart = canvasPoint(event);
    pointerStartAt = performance.now();
    const snapshot = game.snapshot();
    pointerStartedPhase = snapshot.phase;
    if (snapshot.phase === 'placingCue') {
      dispatch({ type: 'placeCueBall', point: pointerStart });
      return;
    }
    dispatch({ type: 'setAimPoint', point: pointerStart });
    dispatch({ type: 'beginPowerCharge' });
  };

  const onPointerMove = (event: PointerEvent) => {
    event.preventDefault();
    const point = canvasPoint(event);
    const snapshot = game.snapshot();
    if (snapshot.phase === 'placingCue') return;
    dispatch({ type: 'setAimPoint', point });
  };

  const onPointerUp = (event: PointerEvent) => {
    event.preventDefault();
    pointerDown = false;
    lastPointerUpAt = performance.now();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    const point = canvasPoint(event);
    const snapshot = game.snapshot();
    if (snapshot.phase === 'placingCue') {
      dispatch({ type: 'placeCueBall', point });
      return;
    }
    const pointerTravel = pointerStart ? Math.hypot(pointerStart.x - point.x, pointerStart.y - point.y) : 0;
    const wasQuickTap = performance.now() - pointerStartAt < 220 && pointerTravel < 8;

    if (pointerStart && pointerTravel < 5 && !pointerDown) {
      dispatch({ type: 'setAimPoint', point });
    }
    if (wasQuickTap && pointerStartedPhase === 'aiming') {
      return;
    }
    dispatch({ type: 'releaseShot' });
  };

  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    controlSurface.focus();
    if (performance.now() - lastPointerUpAt < 120) return;
    select();
  };

  const pressed = new Set<string>();
  const normalizedKey = (event: KeyboardEvent): string => {
    const key = event.key || event.code;
    if (key === 'Left' || key === 'ArrowLeft') return 'ArrowLeft';
    if (key === 'Right' || key === 'ArrowRight') return 'ArrowRight';
    if (key === 'Up' || key === 'ArrowUp') return 'ArrowUp';
    if (key === 'Down' || key === 'ArrowDown') return 'ArrowDown';
    if (key === 'Return' || key === 'Select' || key === 'OK' || key === 'Accept') return 'Enter';
    if (key === 'Esc' || key === 'GoBack' || key === 'BrowserBack') return 'Escape';
    if (key === ' ' || key === 'Spacebar') return 'Space';
    return event.code || key;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const spinStep = 0.12;
    const powerStep = 0.08;
    const cueMoveStep = event.shiftKey ? 4 : 12;
    const aimStep = event.shiftKey ? 0.025 : 0.07;
    const key = normalizedKey(event);
    if (key === 'Space' && pressed.has(key)) return;
    if (key === 'Enter' && event.repeat) return;
    if (key === 'Space') pressed.add(key);
    const snapshot = game.snapshot();

    if (key === 'ArrowLeft') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: -cueMoveStep, y: 0 } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: -spinStep, y: 0 } }
            : { type: 'aimDelta', deltaRad: -aimStep },
      );
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: cueMoveStep, y: 0 } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: spinStep, y: 0 } }
            : { type: 'aimDelta', deltaRad: aimStep },
      );
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: 0, y: -cueMoveStep } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: 0, y: spinStep } }
            : { type: 'powerDelta', delta: powerStep },
      );
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      dispatch(
        snapshot.phase === 'placingCue'
          ? { type: 'moveCueBall', delta: { x: 0, y: cueMoveStep } }
          : event.shiftKey
            ? { type: 'spinDelta', delta: { x: 0, y: -spinStep } }
            : { type: 'powerDelta', delta: -powerStep },
      );
    } else if (key === 'Space') {
      event.preventDefault();
      dispatch({ type: 'beginPowerCharge' });
    } else if (key === 'Enter') {
      event.preventDefault();
      select();
    } else if (key === 'Escape' || key === 'Backspace') {
      event.preventDefault();
      dispatch({ type: 'cancel' });
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    const key = normalizedKey(event);
    pressed.delete(key);
    if (key === 'Space') {
      event.preventDefault();
      dispatch({ type: 'releaseShot' });
    }
  };

  controlSurface.addEventListener('pointerdown', onPointerDown);
  controlSurface.addEventListener('pointermove', onPointerMove);
  controlSurface.addEventListener('pointerup', onPointerUp);
  controlSurface.addEventListener('click', onClick);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);

  return () => {
    delete window.glassPoolDispatch;
    controlSurface.removeEventListener('pointerdown', onPointerDown);
    controlSurface.removeEventListener('pointermove', onPointerMove);
    controlSurface.removeEventListener('pointerup', onPointerUp);
    controlSurface.removeEventListener('click', onClick);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
  };
}
