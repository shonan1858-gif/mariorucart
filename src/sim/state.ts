export type Vec3 = { x: number; y: number; z: number };

export type DriftLevel = 0 | 1 | 2 | 3;

export type InputState = {
  throttle: number;
  brake: number;
  steer: number;
  drift: boolean;
};

export type KartState = {
  pos: Vec3;
  yaw: number;
  vel: Vec3;
  speed: number;
  drift: {
    active: boolean;
    charge: number;
    angle: number;
    level: DriftLevel;
  };
  turbo: {
    timer: number;
    level: DriftLevel;
  };
};

export type TrackState = {
  halfWidth: number;
  length: number;
  startLineZ: number;
  segmentSize: number;
};

export type LapState = {
  lapCount: number;
  checkpointIndex: number;
};

export type SimState = {
  time: number;
  kart: KartState;
  track: TrackState;
  lap: LapState;
};

export type RenderSnapshot = Readonly<SimState>;

export function createInitialState(): SimState {
  return {
    time: 0,
    kart: {
      pos: { x: 0, y: 0, z: 25 },
      yaw: Math.PI,
      vel: { x: 0, y: 0, z: 0 },
      speed: 0,
      drift: {
        active: false,
        charge: 0,
        angle: 0,
        level: 0,
      },
      turbo: {
        timer: 0,
        level: 0,
      },
    },
    track: {
      halfWidth: 8,
      length: 240,
      startLineZ: 20,
      segmentSize: 12,
    },
    lap: {
      lapCount: 0,
      checkpointIndex: 0,
    },
  };
}
