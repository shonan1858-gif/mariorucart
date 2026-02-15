import { stepKartPhysics } from './kart_physics';
import { applyTrackConstraints } from './track';
import type { InputState, RenderSnapshot, SimState } from './state';

export function stepSimulation(state: SimState, input: InputState, dt: number): void {
  state.time += dt;
  stepKartPhysics(state, input, dt);
  applyTrackConstraints(state);
}

export class FixedStepper {
  private accumulator = 0;
  constructor(private readonly dt: number) {}

  tick(elapsedSeconds: number, runStep: () => void): void {
    this.accumulator += elapsedSeconds;
    while (this.accumulator >= this.dt) {
      runStep();
      this.accumulator -= this.dt;
    }
  }

  get alpha(): number {
    return this.accumulator / this.dt;
  }
}

export function createSnapshot(state: SimState): RenderSnapshot {
  return state;
}
