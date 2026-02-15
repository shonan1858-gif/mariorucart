# mariorucart

TypeScript + Vite + WebGL2で作った、MK8DX風のコアドライビング試作です。

## 起動

```bash
npm install
npm run dev
```

- WebGL2: `http://localhost:5173/?renderer=webgl`
- 2D: `http://localhost:5173/?renderer=2d`

## 操作

- `W`: アクセル
- `S`: ブレーキ / 低速時リバース
- `A` / `D`: ステア
- `Shift`: ドリフト（離すとミニターボ判定）
