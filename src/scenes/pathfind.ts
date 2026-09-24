// Grid A* for tap-to-walk. The map is divided into small cells; obstacles
// mark cells as blocked.

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export class NavGrid {
  readonly cols: number
  readonly rows: number
  readonly blocked: Uint8Array

  constructor(
    readonly width: number,
    readonly height: number,
    readonly cell = 4,
  ) {
    this.cols = Math.ceil(width / cell)
    this.rows = Math.ceil(height / cell)
    this.blocked = new Uint8Array(this.cols * this.rows)
  }

  block(r: Rect, inflate = 0) {
    const c0 = Math.max(0, Math.floor((r.x - inflate) / this.cell))
    const c1 = Math.min(this.cols - 1, Math.floor((r.x + r.w + inflate - 1) / this.cell))
    const r0 = Math.max(0, Math.floor((r.y - inflate) / this.cell))
    const r1 = Math.min(this.rows - 1, Math.floor((r.y + r.h + inflate - 1) / this.cell))
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) this.blocked[y * this.cols + x] = 1
  }

  /** Block cells whose centre lies inside an ellipse (ponds etc.). */
  blockEllipse(cx: number, cy: number, rx: number, ry: number) {
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) {
        const px = (x + 0.5) * this.cell
        const py = (y + 0.5) * this.cell
        const dx = (px - cx) / rx
        const dy = (py - cy) / ry
        if (dx * dx + dy * dy <= 1) this.blocked[y * this.cols + x] = 1
      }
  }

  isFree(cx: number, cy: number) {
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows && !this.blocked[cy * this.cols + cx]
  }

  freeAt(x: number, y: number) {
    return this.isFree(Math.floor(x / this.cell), Math.floor(y / this.cell))
  }

  /** Nearest free cell centre to a world point (spiral search). */
  nearestFree(x: number, y: number): [number, number] | null {
    const cx = Math.floor(x / this.cell)
    const cy = Math.floor(y / this.cell)
    if (this.isFree(cx, cy)) return [x, y]
    for (let r = 1; r < 40; r++) {
      let best: [number, number] | null = null
      let bestD = Infinity
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
          if (!this.isFree(cx + dx, cy + dy)) continue
          const d = dx * dx + dy * dy
          if (d < bestD) {
            bestD = d
            best = [(cx + dx + 0.5) * this.cell, (cy + dy + 0.5) * this.cell]
          }
        }
      if (best) return best
    }
    return null
  }

  private lineFree(ax: number, ay: number, bx: number, by: number) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / (this.cell * 0.5))
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps
      if (!this.freeAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false
    }
    return true
  }

  /** Find a path from a to b. Returns world-space waypoints (excluding start). */
  find(ax: number, ay: number, bx: number, by: number): [number, number][] | null {
    const goal = this.nearestFree(bx, by)
    if (!goal) return null
    ;[bx, by] = goal
    if (this.lineFree(ax, ay, bx, by)) return [[bx, by]]
    const start = this.nearestFree(ax, ay)
    if (!start) return null
    const sx = Math.floor(start[0] / this.cell)
    const sy = Math.floor(start[1] / this.cell)
    const gx = Math.floor(bx / this.cell)
    const gy = Math.floor(by / this.cell)
    const N = this.cols * this.rows
    const gScore = new Float32Array(N).fill(Infinity)
    const came = new Int32Array(N).fill(-1)
    const closed = new Uint8Array(N)
    const open: number[] = []
    const fScore = new Float32Array(N).fill(Infinity)
    const h = (x: number, y: number) => {
      const dx = Math.abs(x - gx)
      const dy = Math.abs(y - gy)
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy)
    }
    const si = sy * this.cols + sx
    gScore[si] = 0
    fScore[si] = h(sx, sy)
    open.push(si)
    let found = -1
    let iter = 0
    while (open.length && iter++ < 20000) {
      // Pop lowest f (linear scan is fine for these grid sizes).
      let bi = 0
      for (let i = 1; i < open.length; i++) if (fScore[open[i]] < fScore[open[bi]]) bi = i
      const cur = open[bi]
      open.splice(bi, 1)
      if (closed[cur]) continue
      closed[cur] = 1
      const cx = cur % this.cols
      const cy = (cur / this.cols) | 0
      if (cx === gx && cy === gy) {
        found = cur
        break
      }
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = cx + dx
          const ny = cy + dy
          if (!this.isFree(nx, ny)) continue
          if (dx && dy && (!this.isFree(cx + dx, cy) || !this.isFree(cx, cy + dy))) continue
          const ni = ny * this.cols + nx
          if (closed[ni]) continue
          const cost = gScore[cur] + (dx && dy ? 1.414 : 1)
          if (cost < gScore[ni]) {
            gScore[ni] = cost
            fScore[ni] = cost + h(nx, ny)
            came[ni] = cur
            open.push(ni)
          }
        }
    }
    if (found < 0) return null
    const cells: [number, number][] = []
    for (let c = found; c !== -1 && c !== si; c = came[c]) {
      cells.push([((c % this.cols) + 0.5) * this.cell, (((c / this.cols) | 0) + 0.5) * this.cell])
    }
    cells.reverse()
    if (cells.length) cells[cells.length - 1] = [bx, by]
    // String-pull: skip waypoints that are directly visible.
    const out: [number, number][] = []
    let px = ax
    let py = ay
    let i = 0
    while (i < cells.length) {
      let j = cells.length - 1
      while (j > i && !this.lineFree(px, py, cells[j][0], cells[j][1])) j--
      out.push(cells[j])
      ;[px, py] = cells[j]
      i = j + 1
    }
    return out
  }
}
