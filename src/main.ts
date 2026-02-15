import { Renderer2D } from './render_2d/renderer_2d';
import { WebglRenderer } from './render_webgl/renderer_webgl';
import { readInputState } from './sim/input';
import { FixedStepper, createSnapshot, stepSimulation } from './sim/sim';
import { createInitialState } from './sim/state';

const root = document.getElementById('app');
if (!root) throw new Error('App root not found');

const params = new URLSearchParams(window.location.search);
const rendererType = params.get('renderer') ?? 'webgl';

const state = createInitialState();
const stepper = new FixedStepper(1 / 120);

const renderer = rendererType === '2d' ? new Renderer2D(root) : new WebglRenderer(root);

let lastT = performance.now() / 1000;

function frame(nowMs: number): void {
  const now = nowMs / 1000;
  const elapsed = Math.min(0.05, now - lastT);
  lastT = now;

  const input = readInputState();
  stepper.tick(elapsed, () => {
    stepSimulation(state, input, 1 / 120);
  });

  renderer.render(createSnapshot(state));
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
