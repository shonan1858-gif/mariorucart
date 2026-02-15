import type { RenderSnapshot } from '../sim/state';

export class Renderer2D {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hud: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.canvas = document.createElement('canvas');
    root.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.hud = document.createElement('div');
    this.hud.className = 'hud';
    root.appendChild(this.hud);
  }

  render(snapshot: RenderSnapshot): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1d6d26';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const scale = Math.min(width / 28, height / 260);
    const roadW = snapshot.track.halfWidth * 2 * scale;
    const roadH = snapshot.track.length * scale;
    const roadTop = (height - roadH) / 2;

    ctx.fillStyle = '#111';
    ctx.fillRect(cx - roadW / 2, roadTop, roadW, roadH);

    ctx.strokeStyle = '#fff';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(cx, roadTop);
    ctx.lineTo(cx, roadTop + roadH);
    ctx.stroke();
    ctx.setLineDash([]);

    const kartX = cx + snapshot.kart.pos.x * scale;
    const kartZ = roadTop + (snapshot.kart.pos.z + snapshot.track.length / 2) * scale;
    ctx.save();
    ctx.translate(kartX, kartZ);
    ctx.rotate(snapshot.kart.yaw);
    ctx.fillStyle = '#d22';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-9, 10);
    ctx.lineTo(9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.hud.textContent = `2D Mode | Speed ${snapshot.kart.speed.toFixed(1)} | Drift ${snapshot.kart.drift.level} | Turbo ${snapshot.kart.turbo.level}`;
  }
}
