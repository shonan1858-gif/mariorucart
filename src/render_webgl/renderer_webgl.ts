import type { RenderSnapshot } from '../sim/state';
import { createBox, type MeshData } from './meshes';
import { fragmentSource, vertexSource } from './shaders';

type Mat4 = Float32Array;

function mat4Identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[c + r * 4] =
        a[r * 4] * b[c] +
        a[r * 4 + 1] * b[c + 4] +
        a[r * 4 + 2] * b[c + 8] +
        a[r * 4 + 3] * b[c + 12];
    }
  }
  return out;
}

function mat4Perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = (2 * far * near) * nf;
  return out;
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function mat4LookAt(eye: [number, number, number], target: [number, number, number], up: [number, number, number]): Mat4 {
  const [ex, ey, ez] = eye;
  const [tx, ty, tz] = target;
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  [zx, zy, zz] = normalize(zx, zy, zz);
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  [xx, xy, xz] = normalize(xx, xy, xz);
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  const out = mat4Identity();
  out[0] = xx; out[4] = xy; out[8] = xz;
  out[1] = yx; out[5] = yy; out[9] = yz;
  out[2] = zx; out[6] = zy; out[10] = zz;
  out[12] = -(xx * ex + xy * ey + xz * ez);
  out[13] = -(yx * ex + yy * ey + yz * ez);
  out[14] = -(zx * ex + zy * ey + zz * ez);
  return out;
}

function modelMatrix(pos: [number, number, number], yaw = 0): Mat4 {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const out = mat4Identity();
  out[0] = c; out[2] = -s;
  out[8] = s; out[10] = c;
  out[12] = pos[0]; out[13] = pos[1]; out[14] = pos[2];
  return out;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, vertexSource);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, fragmentSource);
  gl.compileShader(fs);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

class GpuMesh {
  vao: WebGLVertexArrayObject;
  indexCount: number;
  constructor(gl: WebGL2RenderingContext, mesh: MeshData, positionLoc: number, colorLoc: number) {
    this.vao = gl.createVertexArray()!;
    this.indexCount = mesh.indices.length;
    gl.bindVertexArray(this.vao);

    const pbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, pbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

    const cbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, cbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
  }
}

export class WebglRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vpLoc: WebGLUniformLocation;
  private modelLoc: WebGLUniformLocation;
  private meshes: Record<string, GpuMesh>;
  private hud: HTMLDivElement;
  private cameraPos: [number, number, number] = [0, 2.8, 8.8];

  constructor(root: HTMLElement) {
    this.canvas = document.createElement('canvas');
    root.appendChild(this.canvas);
    this.hud = document.createElement('div');
    this.hud.className = 'hud';
    root.appendChild(this.hud);

    const gl = this.canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.program = createProgram(gl);
    gl.useProgram(this.program);

    const positionLoc = gl.getAttribLocation(this.program, 'aPosition');
    const colorLoc = gl.getAttribLocation(this.program, 'aColor');
    this.vpLoc = gl.getUniformLocation(this.program, 'uViewProj')!;
    this.modelLoc = gl.getUniformLocation(this.program, 'uModel')!;

    this.meshes = {
      road: new GpuMesh(gl, createBox(16, 0.04, 240, [0.06, 0.06, 0.06]), positionLoc, colorLoc),
      shoulder: new GpuMesh(gl, createBox(4, 0.03, 240, [0.32, 0.32, 0.32]), positionLoc, colorLoc),
      grass: new GpuMesh(gl, createBox(80, 0.02, 300, [0.13, 0.43, 0.14]), positionLoc, colorLoc),
      guard: new GpuMesh(gl, createBox(0.35, 0.8, 240, [0.68, 0.72, 0.75]), positionLoc, colorLoc),
      mark: new GpuMesh(gl, createBox(0.25, 0.02, 5.5, [1, 1, 1]), positionLoc, colorLoc),
      start: new GpuMesh(gl, createBox(16, 0.021, 1.8, [0.95, 0.95, 0.95]), positionLoc, colorLoc),
      kartBody: new GpuMesh(gl, createBox(1.4, 0.45, 2.2, [0.8, 0.1, 0.1]), positionLoc, colorLoc),
      wheel: new GpuMesh(gl, createBox(0.35, 0.35, 0.2, [0.07, 0.07, 0.07]), positionLoc, colorLoc),
      riderBody: new GpuMesh(gl, createBox(0.42, 0.56, 0.3, [0.12, 0.2, 0.86]), positionLoc, colorLoc),
      riderHead: new GpuMesh(gl, createBox(0.34, 0.34, 0.34, [0.95, 0.82, 0.7]), positionLoc, colorLoc),
    };
  }

  private drawMesh(name: string, m: Mat4): void {
    const mesh = this.meshes[name];
    const gl = this.gl;
    gl.uniformMatrix4fv(this.modelLoc, false, m);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  render(snapshot: RenderSnapshot): void {
    const gl = this.gl;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.5, 0.75, 0.98, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const kart = snapshot.kart;
    const speedNorm = Math.min(Math.abs(kart.speed) / 45, 1);
    const fov = (58 + (78 - 58) * speedNorm) * (Math.PI / 180);

    const backOffset = 6.2;
    const side = Math.sin(kart.yaw);
    const fwd = Math.cos(kart.yaw);
    const target: [number, number, number] = [kart.pos.x + side * 2.2, 0.55, kart.pos.z + fwd * 2.2];
    const wanted: [number, number, number] = [kart.pos.x - side * backOffset, 2.4, kart.pos.z - fwd * backOffset];

    const smooth = 0.12;
    this.cameraPos[0] += (wanted[0] - this.cameraPos[0]) * smooth;
    this.cameraPos[1] += (wanted[1] - this.cameraPos[1]) * smooth;
    this.cameraPos[2] += (wanted[2] - this.cameraPos[2]) * smooth;

    const view = mat4LookAt(this.cameraPos, target, [0, 1, 0]);
    const proj = mat4Perspective(fov, Math.max(width / Math.max(1, height), 0.1), 0.1, 400);
    const vp = mat4Multiply(proj, view);
    gl.uniformMatrix4fv(this.vpLoc, false, vp);

    this.drawMesh('grass', modelMatrix([0, -0.03, 0]));
    this.drawMesh('road', modelMatrix([0, 0, 0]));
    this.drawMesh('shoulder', modelMatrix([-10, 0, 0]));
    this.drawMesh('shoulder', modelMatrix([10, 0, 0]));
    this.drawMesh('guard', modelMatrix([-8.25, 0.4, 0]));
    this.drawMesh('guard', modelMatrix([8.25, 0.4, 0]));

    const count = Math.floor(snapshot.track.length / snapshot.track.segmentSize);
    for (let i = 0; i < count; i++) {
      const z = -snapshot.track.length / 2 + i * snapshot.track.segmentSize;
      this.drawMesh('mark', modelMatrix([0, 0.03, z]));
    }
    this.drawMesh('start', modelMatrix([0, 0.031, snapshot.track.startLineZ]));

    const kartBase: [number, number, number] = [kart.pos.x, 0.36, kart.pos.z];
    this.drawMesh('kartBody', modelMatrix(kartBase, kart.yaw));
    const wheelOffsets: [number, number, number][] = [
      [-0.7, -0.2, -0.75], [0.7, -0.2, -0.75],
      [-0.7, -0.2, 0.75], [0.7, -0.2, 0.75],
    ];
    for (const [x, y, z] of wheelOffsets) {
      const wx = kart.pos.x + x * Math.cos(kart.yaw) + z * Math.sin(kart.yaw);
      const wz = kart.pos.z + z * Math.cos(kart.yaw) - x * Math.sin(kart.yaw);
      this.drawMesh('wheel', modelMatrix([wx, 0.18 + y * 0.15, wz], kart.yaw));
    }
    this.drawMesh('riderBody', modelMatrix([kart.pos.x, 0.85, kart.pos.z - 0.1], kart.yaw));
    this.drawMesh('riderHead', modelMatrix([kart.pos.x, 1.3, kart.pos.z - 0.1], kart.yaw));

    this.hud.textContent = `Speed ${kart.speed.toFixed(1)} | Drift Lv ${kart.drift.level} | Turbo Lv ${kart.turbo.level} | Lap ${snapshot.lap.lapCount}`;
  }
}
