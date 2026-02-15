import type { InputState, SimState } from './state';
import { tuning } from './tuning';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function getChargeLevel(charge: number): 0 | 1 | 2 | 3 {
  if (charge >= tuning.chargeThresholds[2]) return 3;
  if (charge >= tuning.chargeThresholds[1]) return 2;
  if (charge >= tuning.chargeThresholds[0]) return 1;
  return 0;
}

export function stepKartPhysics(state: SimState, input: InputState, dt: number): void {
  const kart = state.kart;

  const prevDrift = kart.drift.active;
  if (input.drift) {
    kart.drift.active = true;
  } else if (prevDrift) {
    const level = getChargeLevel(kart.drift.charge);
    if (level > 0) {
      kart.turbo.level = level;
      kart.turbo.timer = tuning.turboDurationByLevel[level];
    }
    kart.drift.active = false;
    kart.drift.charge = 0;
    kart.drift.level = 0;
  }

  const speedRatio = clamp(Math.abs(kart.speed) / tuning.maxForwardSpeed, 0, 1);
  const steerFactor = 1 - speedRatio * (1 - tuning.minSteerFactor);
  const steerRate = tuning.baseSteerRate * steerFactor;
  kart.yaw += input.steer * steerRate * dt;

  if (kart.drift.active) {
    kart.drift.angle += input.steer * tuning.driftAngleRate * dt;
    kart.drift.angle = clamp(kart.drift.angle, -tuning.driftAngleMax, tuning.driftAngleMax);
    const driftChargeDelta = dt * (
      tuning.driftChargeRate +
      Math.abs(input.steer) * tuning.driftChargeSteerBonus +
      speedRatio * tuning.driftChargeSpeedBonus
    );
    kart.drift.charge += driftChargeDelta;
    kart.drift.level = getChargeLevel(kart.drift.charge);
  } else {
    const recover = Math.min(Math.abs(kart.drift.angle), tuning.driftAngleRecover * dt);
    kart.drift.angle += kart.drift.angle > 0 ? -recover : recover;
  }

  let acceleration = 0;
  if (input.throttle > 0) acceleration += tuning.accel * input.throttle;
  if (input.brake > 0) {
    if (kart.speed > 0.7) {
      acceleration -= tuning.brake * input.brake;
    } else {
      acceleration -= tuning.accel * 0.8 * input.brake;
    }
  }

  const turboActive = kart.turbo.timer > 0;
  if (turboActive) {
    acceleration += tuning.turboAccelByLevel[kart.turbo.level];
    kart.turbo.timer = Math.max(0, kart.turbo.timer - dt);
    if (kart.turbo.timer === 0) kart.turbo.level = 0;
  }

  acceleration -= kart.speed * tuning.drag;
  kart.speed += acceleration * dt;

  const maxForward = tuning.maxForwardSpeed + tuning.turboMaxSpeedBonus[kart.turbo.level];
  kart.speed = clamp(kart.speed, tuning.maxReverseSpeed, maxForward);

  const movementYaw = kart.yaw + kart.drift.angle;
  const forwardX = Math.sin(movementYaw);
  const forwardZ = Math.cos(movementYaw);
  kart.vel.x = forwardX * kart.speed;
  kart.vel.y = 0;
  kart.vel.z = forwardZ * kart.speed;

  kart.pos.x += kart.vel.x * dt;
  kart.pos.z += kart.vel.z * dt;
}
