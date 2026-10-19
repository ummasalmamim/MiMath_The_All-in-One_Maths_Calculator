/* ---------- plotting canvas: functions, polar, parametric, implicit curves ---------- */
(function (MB) {
  'use strict';
  if (!MB.core || !MB.ui) return;
  const U = MB.ui, C = MB.core, el = U.el;
  U.plots = [];

  function ev(code, scope) { try { return C.num(code.evaluate(scope)); } catch (e) { return NaN; } }
  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }
  function labelNum(v, step) {
    if (Math.abs(v) < step * 1e-9) return '0';
    const a = Math.abs(v);
    if (a >= 1e6 || a < 1e-4) return v.toExponential(1).replace('e+', 'e');
    const dec = Math.max(0, Math.min(8, -Math.floor(Math.log10(step) + 1e-9)));
    return v.toFixed(dec);
  }
  function fnum(v) { return Number.isFinite(v) ? C.fmt(v, 5) : '—'; }

  /* legend: always shown for two or more series, with dashed swatches for dashed curves */
  U.legend = function (box, items) {
    box.replaceChildren();
    const shown = items.filter(i => i.visible !== false && i.label);
    if (shown.length < 2) return;
    shown.forEach(it => {
      const col = U.series(it.slot || 0);
      const sw = el('i', { style: it.dash ? 'background:repeating-linear-gradient(90deg,' + col + ' 0 5px,transparent 5px 8px)' : 'background:' + col });
      box.appendChild(el('span', null, [sw, el('span', { text: it.label })]));
    });
  };

  /* key points of function curves inside [x0, x1]: roots, peaks and valleys, crossings, y-intercept */
  U.keyPoints = function (fns, x0, x1) {
    const out = [], N = 1600, dx = (x1 - x0) / N;
    const bisect = (g, a, b) => { let ga = g(a); for (let i = 0; i < 60; i++) { const m = (a + b) / 2, gm = g(m); if ((gm < 0) === (ga < 0)) { a = m; ga = gm; } else b = m; } return (a + b) / 2; };
    const vals = fns.map(f => { const v = new Float64Array(N + 1); for (let i = 0; i <= N; i++) v[i] = f.f(x0 + i * dx); return v; });
    const scale = fns.map((f, k) => { let m = 0; vals[k].forEach(v => { if (Number.isFinite(v) && Math.abs(v) < 1e8) m = Math.max(m, Math.abs(v)); }); return m || 1; });
    const span = x1 - x0, push = (type, x, y, f, label) => {
      if (Math.abs(x) < 1e-6 * span) x = 0;
      if ((type === 'yint' || type === 'cross') && out.some(o => Math.abs(o.x - x) < dx * 3 && Math.abs(o.y - y) < 1e-6 * (1 + Math.abs(y)))) return;
 if (out.filter(o => o.type === type).length < 14 && !out.some(o => o.type === type && Math.abs(o.x - x) < dx * 3 && Math.abs(o.y - y) < 1e-6 * (1 + Math.abs(y)))) out.push({ type, x, y, slot: f.slot, label }); };
    fns.forEach((f, k) => {
      const v = vals[k];
      for (let i = 0; i < N; i++) {
        const a = v[i], b = v[i + 1];
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        if (a === 0 || ((a < 0) !== (b < 0) && b !== 0)) {
          const x = a === 0 ? x0 + i * dx : bisect(f.f, x0 + i * dx, x0 + (i + 1) * dx), y = f.f(x);
          if (Math.abs(y) < 1e-5 * scale[k] || Math.abs(y) < 1e-6) push('root', Math.abs(x) < 1e-9 ? 0 : x, 0, f);
        } else if (b === 0 && i === N - 1) push('root', x0 + N * dx, 0, f);
        if (i > 0 && Number.isFinite(v[i - 1])) {
          const d1 = a - v[i - 1], d2 = b - a;
          if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
            let lo = x0 + (i - 1) * dx, hi = x0 + (i + 1) * dx; const sgn = d1 > 0 ? -1 : 1;
            for (let it = 0; it < 70; it++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (sgn * f.f(m1) < sgn * f.f(m2)) hi = m2; else lo = m1; }
            const x = (lo + hi) / 2, y = f.f(x);
            if (Number.isFinite(y) && Math.abs(y - a) < 0.5 * scale[k] + 1) push(d1 > 0 ? 'max' : 'min', Math.abs(x) < 1e-9 ? 0 : x, y, f);
          }
        }
      }
      if (x0 <= 0 && x1 >= 0) { const y = f.f(0); if (Number.isFinite(y)) push('yint', 0, y, f); }
    });
    for (let p = 0; p < fns.length; p++) for (let q = p + 1; q < fns.length; q++) {
      const g = x => fns[p].f(x) - fns[q].f(x);
      for (let i = 0; i < N; i++) {
        const a = vals[p][i] - vals[q][i], b = vals[p][i + 1] - vals[q][i + 1];
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        if ((a < 0) !== (b < 0) && a !== b) {
          const x = bisect(g, x0 + i * dx, x0 + (i + 1) * dx), y = fns[p].f(x);
          if (Math.abs(g(x)) < 1e-5 * Math.max(scale[p], scale[q])) push('cross', x, y, fns[p]);
        }
      }
    }
    return out;
  };

  class Plot {
    constructor(wrap, o) {
      o = o || {};
      this.wrap = wrap; this.canvas = wrap.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
      this.coordsEl = o.coords || null; this.onView = o.onView || null;
      this.items = []; this.points = []; this.bands = []; this.shade = null; this.markers = [];
      this.cx = 0; this.cy = 0; this.sx = 40; this.sy = 40; this.W = 0; this.H = 0; this.dpr = 1;
      this.hover = null; this.pointers = new Map(); this.moved = 0; this.pending = 0;
      this.tip = el('div', { class: 'plot-tip', hidden: true }); wrap.appendChild(this.tip);
      this.canvas.tabIndex = 0;
      this.bind();
      if (typeof ResizeObserver !== 'undefined') { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(wrap); }
      else { this._rs = () => this.resize(); window.addEventListener('resize', this._rs); }
      U.plots.push(this);
      this.resize();
    }
    destroy() {
      if (this.ro) this.ro.disconnect(); if (this._rs) window.removeEventListener('resize', this._rs);
      U.plots = U.plots.filter(p => p !== this);
    }
    /* ----- data ----- */
    setData(d) {
      d = d || {};
      this.items = (d.items || []).map((it, i) => Object.assign({ visible: true, slot: i }, it));
      this.items.forEach(it => this.prepare(it));
      this.points = d.points || []; this.bands = d.bands || []; this.shade = d.shade || null; this.center = d.center;
      if (this.shade) { try { this.shade._code = C.compile(this.shade.expr); } catch (e) { this.shade = null; } }
      this.markers = []; this.draw();
    }
    prepare(it) {
      it._err = null;
      try {
        if (it.type === 'param') { it._fx = C.compile(it.xe); it._fy = C.compile(it.ye); }
        else it._code = C.compile(it.expr);
      } catch (e) { it._err = C.friendlyError(e); }
    }
    fnOf(it) {
      const code = it._code, sc = { x: 0 };
      return x => { sc.x = x; return ev(code, sc); };
    }
    fnItems() { return this.items.filter(i => i.type === 'fn' && i.visible && !i._err).map(i => ({ f: this.fnOf(i), slot: i.slot, item: i })); }
    /* ----- geometry ----- */
    toPx(x) { return this.W / 2 + (x - this.cx) * this.sx; }
    toPy(y) { return this.H / 2 - (y - this.cy) * this.sy; }
    toX(px) { return this.cx + (px - this.W / 2) / this.sx; }
    toY(py) { return this.cy - (py - this.H / 2) / this.sy; }
    range() { return { xmin: this.toX(0), xmax: this.toX(this.W), ymin: this.toY(this.H), ymax: this.toY(0) }; }
    setRange(x0, x1, y0, y1) {
      if (!(x1 > x0) || !(y1 > y0) || !this.W) return;
      this.cx = (x0 + x1) / 2; this.cy = (y0 + y1) / 2; this.sx = this.W / (x1 - x0); this.sy = this.H / (y1 - y0);
    }
    home() { const h = this.W && this.H ? (10 * this.H / this.W) : 7; this.cx = 0; this.cy = 0; this.sx = this.W / 20; this.sy = this.sx; void h; this.draw(); this.changed(); }
    square() { const s = Math.sqrt(this.sx * this.sy); this.sx = s; this.sy = s; this.draw(); this.changed(); }
    zoom(f, px, py) {
      if (px == null) { px = this.W / 2; py = this.H / 2; }
      const wx = this.toX(px), wy = this.toY(py);
      this.sx = Math.min(1e8, Math.max(1e-8, this.sx * f)); this.sy = Math.min(1e8, Math.max(1e-8, this.sy * f));
      this.cx = wx - (px - this.W / 2) / this.sx; this.cy = wy + (py - this.H / 2) / this.sy;
      this.draw(); this.changed();
    }
    fit() {
      if (!this.W) { this._fitLater = true; return; }
      let x0 = -8, x1 = 8;
      const px = this.points.map(p => p.x).filter(Number.isFinite);
      if (this.center != null && Number.isFinite(this.center)) { x0 = this.center - 8; x1 = this.center + 8; }
      if (px.length) {
        const lo = Math.min.apply(null, px), hi = Math.max.apply(null, px), pad = Math.max(2.5, (hi - lo) * 0.4);
        x0 = Math.min(x0 + 4, lo - pad); x1 = Math.max(x1 - 4, hi + pad);
        if (hi - lo > 0 || px.length) { const mid = (lo + hi) / 2, half = Math.max((hi - lo) / 2 + pad, 4); if (this.center == null) { x0 = mid - half; x1 = mid + half; } }
      }
      const finite = [], fns = this.fnItems();
      fns.forEach(f => { for (let i = 0; i <= 240; i++) { const v = f.f(x0 + (x1 - x0) * i / 240); if (Number.isFinite(v)) finite.push(v); } });
      this.points.forEach(p => { if (Number.isFinite(p.y)) finite.push(p.y); });
      let y0 = -6, y1 = 6;
      if (finite.length) {
        finite.sort((a, b) => a - b);
        const lo = finite[Math.floor(finite.length * 0.03)], hi = finite[Math.ceil(finite.length * 0.97) - 1];
        let span = hi - lo; if (!(span > 1e-9)) span = Math.max(2, Math.abs(hi) * 0.5);
        y0 = lo - span * 0.12; y1 = hi + span * 0.12;
        if (y0 > 0 && y0 < span * 0.6) y0 = -span * 0.08; if (y1 < 0 && -y1 < span * 0.6) y1 = span * 0.08;
      } else if (this.items.some(i => i.type === 'implicit' || i.type === 'polar' || i.type === 'param')) {
        const h = (x1 - x0) / 2 * this.H / this.W; y0 = -h; y1 = h;
      }
      this.setRange(x0, x1, y0, y1);
      if (!fns.length) this.square();
      else { this.draw(); this.changed(); }
    }
    changed() { if (this.onView) { clearTimeout(this._ct); this._ct = setTimeout(() => this.onView(this), 140); } }
    /* ----- sizing ----- */
    resize() {
      const r = this.wrap.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      if (w === this.W && h === this.H && dpr === this.dpr) return;
      const first = !this.W;
      if (this.W) { const rg = this.range(); this.W = w; this.H = h; this.setRange(rg.xmin, rg.xmax, rg.ymin, rg.ymax); }
      else { this.W = w; this.H = h; this.sx = w / 20; this.sy = this.sx; }
      this.dpr = dpr; this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
      if (first && this._fitLater) { this._fitLater = false; this.fit(); return; }
      if (first && !this._fitLater && !this.items.length) this.home();
      this.draw();
    }
    /* ----- drawing ----- */
    draw() {
      if (this.pending) return;
      this.pending = requestAnimationFrame(() => { this.pending = 0; this.paint(); });
    }
    paint() {
      const W = this.W, H = this.H, ctx = this.ctx;
      if (!W || !H) return;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const cs = { surface: U.cssVar('--surface'), grid: U.cssVar('--grid'), axis: U.cssVar('--axis'), ink: U.cssVar('--ink-3'), ink2: U.cssVar('--ink-2'), band: U.cssVar('--band') };
      ctx.fillStyle = cs.surface; ctx.fillRect(0, 0, W, H);
      this.drawGrid(ctx, cs);
      this.drawBands(ctx, cs);
      this.items.forEach(it => { if (it.visible && !it._err) this.drawItem(ctx, it, U.series(it.slot)); });
      this.drawPoints(ctx, cs, this.points, false);
      this.drawPoints(ctx, cs, this.markers, true);
      this.drawHover(ctx, cs);
    }
    drawGrid(ctx, cs) {
      const W = this.W, H = this.H;
      const stx = niceStep(70 / this.sx), sty = niceStep(54 / this.sy), r = this.range();
      ctx.lineWidth = 1; ctx.font = '11px ' + (U.cssVar('--f-mono') || 'monospace');
      ctx.strokeStyle = cs.grid; ctx.beginPath();
      for (let x = Math.ceil(r.xmin / stx) * stx; x <= r.xmax; x += stx) { const p = Math.round(this.toPx(x)) + 0.5; ctx.moveTo(p, 0); ctx.lineTo(p, H); }
      for (let y = Math.ceil(r.ymin / sty) * sty; y <= r.ymax; y += sty) { const p = Math.round(this.toPy(y)) + 0.5; ctx.moveTo(0, p); ctx.lineTo(W, p); }
      ctx.stroke();
      const ax = Math.min(H - 1, Math.max(0, this.toPy(0))), ay = Math.min(W - 1, Math.max(0, this.toPx(0)));
      ctx.strokeStyle = cs.axis; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(0, Math.round(ax) + 0.5); ctx.lineTo(W, Math.round(ax) + 0.5); ctx.moveTo(Math.round(ay) + 0.5, 0); ctx.lineTo(Math.round(ay) + 0.5, H); ctx.stroke();
      ctx.fillStyle = cs.ink; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      const ly = ax > H - 16 ? ax - 15 : ax + 4;
      for (let x = Math.ceil(r.xmin / stx) * stx; x <= r.xmax; x += stx) { if (Math.abs(x) < stx * 1e-6) continue; const px = this.toPx(x); if (px > 12 && px < W - 12) ctx.fillText(labelNum(x, stx), px, ly); }
      ctx.textAlign = ay < 34 ? 'left' : 'right'; ctx.textBaseline = 'middle';
      const lx = ay < 34 ? ay + 6 : ay - 6;
      for (let y = Math.ceil(r.ymin / sty) * sty; y <= r.ymax; y += sty) { if (Math.abs(y) < sty * 1e-6) continue; const py = this.toPy(y); if (py > 8 && py < H - 8) ctx.fillText(labelNum(y, sty), lx, py); }
      if (ax > 0 && ax < H && ay > 0 && ay < W) { ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('0', ay - 5, ax + 4); }
    }
    drawBands(ctx, cs) {
      const H = this.H, W = this.W;
      ctx.fillStyle = cs.band;
      this.bands.forEach(b => {
        const a = b.a === -Infinity || b.a == null ? -10 : this.toPx(b.a), z = b.b === Infinity || b.b == null ? W + 10 : this.toPx(b.b);
        if (b.a === b.b) { ctx.fillRect(this.toPx(b.a) - 1.5, 0, 3, H); return; }
        ctx.fillRect(Math.max(-10, a), 0, Math.min(W + 10, z) - Math.max(-10, a), H);
      });
      if (this.shade) {
        const s = this.shade, a = Math.min(s.a, s.b), b = Math.max(s.a, s.b), f = this.fnOf({ _code: s._code }), y0 = this.toPy(0);
        const n = Math.max(40, Math.ceil((this.toPx(b) - this.toPx(a)) / 2));
        ctx.beginPath(); ctx.moveTo(this.toPx(a), y0);
        for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, y = f(x); ctx.lineTo(this.toPx(x), Number.isFinite(y) ? Math.max(-4 * H, Math.min(5 * H, this.toPy(y))) : y0); }
        ctx.lineTo(this.toPx(b), y0); ctx.closePath(); ctx.fill();
      }
    }
    drawItem(ctx, it, color) {
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.25; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (it.dash) ctx.setLineDash([7, 6]);
      ctx.beginPath();
      const W = this.W, H = this.H;
      if (it.type === 'fn') {
        const f = this.fnOf(it), n = Math.max(300, Math.ceil(W * 0.9));
        let pen = false, pys = 0, pv = 0;
        for (let i = 0; i <= n; i++) {
          const px = i * W / n, v = f(this.toX(px));
          if (!Number.isFinite(v)) { pen = false; continue; }
          let py = this.toPy(v); py = Math.max(-5 * H, Math.min(6 * H, py));
          if (pen && Math.abs(py - pys) > H * 1.2 && v * pv < 0) pen = false;
          if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          pen = true; pys = py; pv = v;
        }
      } else if (it.type === 'polar') {
        const code = it._code, sc = { theta: 0 }, t0 = it.tmin != null ? it.tmin : 0, t1 = it.tmax != null ? it.tmax : 2 * Math.PI, n = 900;
        let pen = false;
        for (let i = 0; i <= n; i++) {
          const t = t0 + (t1 - t0) * i / n; sc.theta = t; const r = ev(code, sc);
          if (!Number.isFinite(r)) { pen = false; continue; }
          const px = this.toPx(r * Math.cos(t)), py = this.toPy(r * Math.sin(t));
          if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py); pen = true;
        }
      } else if (it.type === 'param') {
        const sc = { t: 0 }, t0 = it.tmin != null ? it.tmin : 0, t1 = it.tmax != null ? it.tmax : 2 * Math.PI, n = 1200;
        let pen = false;
        for (let i = 0; i <= n; i++) {
          const t = t0 + (t1 - t0) * i / n; sc.t = t; const x = ev(it._fx, sc), y = ev(it._fy, sc);
          if (!Number.isFinite(x) || !Number.isFinite(y)) { pen = false; continue; }
          const px = this.toPx(x), py = this.toPy(y);
          if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py); pen = true;
        }
      } else if (it.type === 'implicit') {
        const cell = W > 700 ? 6 : 5, nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1, g = new Float64Array(nx * ny), sc = { x: 0, y: 0 }, code = it._code;
        for (let j = 0; j < ny; j++) { sc.y = this.toY(j * cell); for (let i = 0; i < nx; i++) { sc.x = this.toX(i * cell); g[j * nx + i] = ev(code, sc); } }
        const seg = [];
        const cross = (a, b, xa, ya, xb, yb) => {
          if (!Number.isFinite(a) || !Number.isFinite(b) || (a < 0) === (b < 0)) return;
          const t = a / (a - b); seg.push(xa + (xb - xa) * t, ya + (yb - ya) * t);
        };
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
          const a = g[j * nx + i], b = g[j * nx + i + 1], c = g[(j + 1) * nx + i + 1], d = g[(j + 1) * nx + i];
          const x0 = i * cell, y0 = j * cell, x1 = x0 + cell, y1 = y0 + cell;
          seg.length = 0;
          cross(a, b, x0, y0, x1, y0); cross(b, c, x1, y0, x1, y1); cross(d, c, x0, y1, x1, y1); cross(a, d, x0, y0, x0, y1);
          if (seg.length >= 4) { ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]); }
          if (seg.length === 8) { ctx.moveTo(seg[4], seg[5]); ctx.lineTo(seg[6], seg[7]); }
        }
      }
      ctx.stroke(); ctx.restore();
    }
    drawPoints(ctx, cs, pts, small) {
      const W = this.W, H = this.H, many = pts.length > 5 || (W < 500 && pts.length > 2);
      ctx.save();
      pts.forEach(p => {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
        const px = this.toPx(p.x), py = this.toPy(p.y);
        if (px < -10 || px > W + 10 || py < -10 || py > H + 10) return;
        const col = p.slot != null ? U.series(p.slot) : U.cssVar('--ink');
        ctx.beginPath(); ctx.arc(px, py, small ? 4.5 : 5.5, 0, 7);
        ctx.fillStyle = p.hollow || small ? cs.surface : col; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = small ? col : (p.hollow ? col : cs.surface); ctx.stroke();
        if (!small && !many && p.label) {
          ctx.font = '600 11.5px ' + (U.cssVar('--f-mono') || 'monospace'); ctx.textBaseline = 'bottom'; ctx.textAlign = px > W - 90 ? 'right' : 'left';
          const tx = px + (px > W - 90 ? -9 : 9), ty = py - 8, w = ctx.measureText(p.label).width;
          ctx.fillStyle = cs.surface; ctx.globalAlpha = 0.85; ctx.fillRect(ctx.textAlign === 'left' ? tx - 2 : tx - w - 2, ty - 14, w + 4, 17); ctx.globalAlpha = 1;
          ctx.fillStyle = U.cssVar('--ink'); ctx.fillText(p.label, tx, ty);
        }
      });
      ctx.restore();
    }
    drawHover(ctx, cs) {
      const h = this.hover; if (!h || !h.dot) return;
      ctx.save(); ctx.beginPath(); ctx.arc(h.dot.px, h.dot.py, 5, 0, 7); ctx.fillStyle = h.dot.color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = cs.surface; ctx.stroke(); ctx.restore();
    }
    /* ----- interaction ----- */
    nearest(px, py) {
      let best = null, bd = 14;
      this.points.concat(this.markers).forEach(p => {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
        const d = Math.hypot(this.toPx(p.x) - px, this.toPy(p.y) - py);
        if (d < bd) { bd = d; best = { px: this.toPx(p.x), py: this.toPy(p.y), color: p.slot != null ? U.series(p.slot) : U.cssVar('--ink'), text: (p.label || (p.type ? { root: 'zero', max: 'peak', min: 'valley', cross: 'crossing', yint: 'y-intercept' }[p.type] : 'point')) + '  (' + fnum(p.x) + ', ' + fnum(p.y) + ')' }; }
      });
      if (best) return best;
      const x = this.toX(px); bd = 42;
      this.items.forEach(it => {
        if (it.type !== 'fn' || !it.visible || it._err) return;
        const y = this.fnOf(it)(x); if (!Number.isFinite(y)) return;
        const d = Math.abs(this.toPy(y) - py);
        if (d < bd) { bd = d; best = { px, py: this.toPy(y), color: U.series(it.slot), text: (it.label ? it.label + '\n' : '') + '(' + fnum(x) + ', ' + fnum(y) + ')' }; }
      });
      return best;
    }
    trace(px, py) {
      this.hover = { dot: this.nearest(px, py) };
      if (this.coordsEl) this.coordsEl.textContent = 'x = ' + fnum(this.toX(px)) + ',  y = ' + fnum(this.toY(py));
      const d = this.hover.dot;
      if (d) {
        this.tip.hidden = false; this.tip.textContent = '';
        d.text.split('\n').forEach((ln, i) => { const row = el('div'); if (i === 0 && d.text.indexOf('\n') > 0) { row.appendChild(el('i', { style: 'background:' + d.color })); } else if (d.text.indexOf('\n') < 0) row.appendChild(el('i', { style: 'background:' + d.color })); row.appendChild(document.createTextNode(ln)); this.tip.appendChild(row); });
        const tw = this.tip.offsetWidth, th = this.tip.offsetHeight;
        let tx = d.px + 12, ty = d.py - th - 10; if (tx + tw > this.W - 4) tx = d.px - tw - 12; if (ty < 4) ty = d.py + 12;
        this.tip.style.left = Math.max(4, tx) + 'px'; this.tip.style.top = ty + 'px';
      } else this.tip.hidden = true;
      this.draw();
    }
    clearTrace() { this.hover = null; this.tip.hidden = true; this.draw(); }
    bind() {
      const cv = this.canvas;
      const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', e => {
        try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        const [x, y] = pos(e); this.pointers.set(e.pointerId, { x, y, sx: x, sy: y }); this.moved = 0;
        if (this.pointers.size === 2) { const [a, b] = Array.from(this.pointers.values()); this.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      });
      cv.addEventListener('pointermove', e => {
        const [x, y] = pos(e), p = this.pointers.get(e.pointerId);
        if (!p) { if (e.pointerType !== 'touch') this.trace(x, y); return; }
        if (this.pointers.size === 1) {
          const dx = x - p.x, dy = y - p.y; this.moved += Math.abs(dx) + Math.abs(dy);
          if (this.moved > 6) { this.cx -= dx / this.sx; this.cy += dy / this.sy; this.hover = null; this.tip.hidden = true; this.draw(); }
          p.x = x; p.y = y;
        } else if (this.pointers.size === 2) {
          p.x = x; p.y = y; const [a, b] = Array.from(this.pointers.values()), d = Math.hypot(a.x - b.x, a.y - b.y);
          if (this.pinch > 0 && d > 0) this.zoom(d / this.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
          this.pinch = d; this.moved = 99;
        }
      });
      const up = e => {
        const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId);
        if (p && this.pointers.size === 0) {
          if (this.moved <= 6 && e.pointerType === 'touch') this.trace(p.x, p.y); else this.changed();
        }
      };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch' && !this.pointers.size) { if (this.coordsEl) this.coordsEl.textContent = 'Drag to pan. Scroll or pinch to zoom.'; this.clearTrace(); } });
      cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e); this.zoom(Math.exp(-e.deltaY * 0.0016), x, y); }, { passive: false });
      cv.addEventListener('dblclick', e => { const [x, y] = pos(e); this.zoom(1.8, x, y); });
      cv.addEventListener('keydown', e => {
        const k = e.key, step = 40;
        if (k === 'ArrowLeft') this.cx -= step / this.sx; else if (k === 'ArrowRight') this.cx += step / this.sx;
        else if (k === 'ArrowUp') this.cy += step / this.sy; else if (k === 'ArrowDown') this.cy -= step / this.sy;
        else if (k === '+' || k === '=') return (this.zoom(1.25), e.preventDefault());
        else if (k === '-' || k === '_') return (this.zoom(0.8), e.preventDefault());
        else if (k === '0') return (this.home(), e.preventDefault());
        else return;
        e.preventDefault(); this.draw(); this.changed();
      });
    }
  }
  U.Plot = Plot;
  document.addEventListener('mb:theme', () => U.plots.forEach(p => p.draw()));
  document.addEventListener('mb:show', () => requestAnimationFrame(() => U.plots.forEach(p => { p.resize(); p.draw(); })));
})(globalThis.MB = globalThis.MB || {});
