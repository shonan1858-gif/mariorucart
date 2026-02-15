export type MeshData = {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint16Array;
};

export function createBox(width: number, height: number, depth: number, color: [number, number, number]): MeshData {
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;
  const positions = new Float32Array([
    -w,-h,-d,  w,-h,-d,  w,h,-d, -w,h,-d,
    -w,-h,d,   w,-h,d,   w,h,d,  -w,h,d,
  ]);
  const colors = new Float32Array(8 * 3);
  for (let i = 0; i < 8; i++) {
    colors.set(color, i * 3);
  }
  const indices = new Uint16Array([
    0,1,2, 2,3,0,
    4,5,6, 6,7,4,
    0,4,7, 7,3,0,
    1,5,6, 6,2,1,
    3,2,6, 6,7,3,
    0,1,5, 5,4,0,
  ]);
  return { positions, colors, indices };
}
