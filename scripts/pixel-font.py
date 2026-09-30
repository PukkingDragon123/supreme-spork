"""Turn Mali (from @fontsource) into a true pixel font while keeping its
cmap/GSUB/GPOS/metrics: every glyph outline is rasterized on a PPEM grid,
thresholded, and rebuilt from square pixels."""
import sys, math
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.ttGlyphPen import TTGlyphPen

class FlatPen(BasePen):
    def __init__(self, glyphSet, steps=8):
        super().__init__(glyphSet)
        self.contours = []
        self.cur = None
        self.steps = steps
    def _moveTo(self, p):
        self.cur = [p]
    def _lineTo(self, p):
        self.cur.append(p)
    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            a = (1 - t) ** 2; b = 2 * (1 - t) * t; c = t * t
            self.cur.append((a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]))
    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            mt = 1 - t
            self.cur.append((mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0],
                             mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]))
    def _closePath(self):
        if self.cur and len(self.cur) > 2:
            self.contours.append(self.cur)
        self.cur = None
    _endPath = _closePath

def rasterize(contours, scale, ss, thr):
    """contours in font units -> set of (i, j) pixel cells (y up)."""
    edges = []
    ys = []
    for c in contours:
        pts = [(x * scale, y * scale) for x, y in c]
        n = len(pts)
        for k in range(n):
            x0, y0 = pts[k]; x1, y1 = pts[(k + 1) % n]
            if y0 == y1:
                continue
            edges.append((x0, y0, x1, y1))
            ys += [y0, y1]
    if not edges:
        return set()
    ymin, ymax = math.floor(min(ys)), math.ceil(max(ys))
    cover = {}
    for j in range(ymin, ymax):
        for s in range(ss):
            y = j + (s + 0.5) / ss
            xs = []
            for x0, y0, x1, y1 in edges:
                if (y0 <= y < y1) or (y1 <= y < y0):
                    t = (y - y0) / (y1 - y0)
                    xs.append((x0 + t * (x1 - x0), 1 if y1 > y0 else -1))
            if not xs:
                continue
            xs.sort()
            w = 0
            for k in range(len(xs) - 1):
                w += xs[k][1]
                if w != 0:
                    a, b = xs[k][0], xs[k + 1][0]
                    # accumulate horizontal coverage per pixel column (1/ss row weight)
                    i0 = math.floor(a); i1 = math.floor(b)
                    for i in range(i0, i1 + 1):
                        lo = max(a, i); hi = min(b, i + 1)
                        if hi > lo:
                            cover[(i, j)] = cover.get((i, j), 0) + (hi - lo) / ss
    return {k for k, v in cover.items() if v >= thr}

def rects(cells):
    """Greedy merge of pixel cells into rectangles (x0, y0, x1, y1) in pixel units."""
    rows = {}
    for i, j in cells:
        rows.setdefault(j, []).append(i)
    runs = {}
    for j, xs in rows.items():
        xs.sort()
        start = prev = xs[0]
        out = []
        for x in xs[1:]:
            if x == prev + 1:
                prev = x; continue
            out.append((start, prev + 1)); start = prev = x
        out.append((start, prev + 1))
        runs[j] = out
    result = []
    open_ = {}
    for j in sorted(runs):
        nxt = {}
        for r in runs[j]:
            if r in open_:
                nxt[r] = open_.pop(r)
            else:
                nxt[r] = j
        for r, j0 in open_.items():
            result.append((r[0], j0, r[1], j))
        open_ = nxt
        # rows not contiguous: close runs when a row is skipped
        if j + 1 not in runs:
            for r, j0 in open_.items():
                result.append((r[0], j0, r[1], j + 1))
            open_ = {}
    return result

def main(src, dst, ppem, thr):
    f = TTFont(src)
    upm = f['head'].unitsPerEm
    scale = ppem / upm
    unit = upm / ppem
    gs = f.getGlyphSet()
    glyf = f['glyf']; hmtx = f['hmtx']
    new = {}
    for name in f.getGlyphOrder():
        pen = FlatPen(gs)
        gs[name].draw(pen)
        cells = rasterize(pen.contours, scale, 6, thr)
        tp = TTGlyphPen(None)
        for x0, y0, x1, y1 in rects(cells):
            X0, Y0, X1, Y1 = round(x0 * unit), round(y0 * unit), round(x1 * unit), round(y1 * unit)
            tp.moveTo((X0, Y0)); tp.lineTo((X0, Y1)); tp.lineTo((X1, Y1)); tp.lineTo((X1, Y0)); tp.closePath()
        new[name] = tp.glyph()
    for name, g in new.items():
        glyf[name] = g
    for name in f.getGlyphOrder():
        adv, _ = hmtx[name]
        if adv:
            adv = max(1, round(adv * scale)) * unit
        g = glyf[name]
        g.recalcBounds(glyf)
        hmtx[name] = (round(adv), getattr(g, 'xMin', 0) if g.numberOfContours else 0)
    if 'gasp' in f:
        del f['gasp']
    f['head'].flags |= 0  # keep
    f.flavor = 'woff2'
    f.save(dst)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]))
