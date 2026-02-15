import type { SimState } from './state';

export function applyTrackConstraints(state: SimState): void {
  const { kart, track, lap } = state;
  const prevZ = kart.pos.z;

  const edge = track.halfWidth;
  if (kart.pos.x < -edge) {
    kart.pos.x = -edge;
    kart.speed *= 0.6;
  } else if (kart.pos.x > edge) {
    kart.pos.x = edge;
    kart.speed *= 0.6;
  }

  if (kart.pos.z > track.length * 0.5) kart.pos.z = -track.length * 0.5;
  if (kart.pos.z < -track.length * 0.5) kart.pos.z = track.length * 0.5;

  const crossed = prevZ < track.startLineZ && kart.pos.z >= track.startLineZ;
  if (crossed && Math.abs(kart.pos.x) < track.halfWidth * 0.8) {
    lap.lapCount += 1;
  }
}
