import type { InputState } from './state';

const keys = new Set<string>();

window.addEventListener('keydown', (event) => {
  keys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

function axis(negative: boolean, positive: boolean): number {
  if (negative === positive) return 0;
  return positive ? 1 : -1;
}

export function readInputState(): InputState {
  return {
    throttle: keys.has('KeyW') ? 1 : 0,
    brake: keys.has('KeyS') ? 1 : 0,
    steer: axis(keys.has('KeyA'), keys.has('KeyD')),
    drift: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}
